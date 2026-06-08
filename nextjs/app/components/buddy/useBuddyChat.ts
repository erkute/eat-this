'use client'
import { useCallback, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import type { BuddyStreamEvent, ChatMessage, SpotCandidate, Locale } from '@/lib/buddy/types'
import { sanitizeLinks } from '@/lib/buddy/stream'

export function parseNdjsonLines(
  buffer: string,
  onEvent: (e: BuddyStreamEvent) => void,
): string {
  const parts = buffer.split('\n')
  const remainder = parts.pop() ?? ''
  for (const line of parts) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      onEvent(JSON.parse(trimmed) as BuddyStreamEvent)
    } catch {
      // ignore malformed line
    }
  }
  return remainder
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'
  const KEY = 'buddySessionId'
  let id = window.localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    window.localStorage.setItem(KEY, id)
  }
  return id
}

export interface BuddyDisplayMessage extends ChatMessage {
  spots?: SpotCandidate[]
}

export function useBuddyChat() {
  const locale = useLocale() as Locale
  const [messages, setMessages] = useState<BuddyDisplayMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const allowedSlugs = useRef<Set<string>>(new Set())

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming) return

      const history: BuddyDisplayMessage[] = [...messages, { role: 'user', content: trimmed }]
      setMessages([...history, { role: 'assistant', content: '' }])
      setIsStreaming(true)
      allowedSlugs.current = new Set()

      const updateAssistant = (mut: (m: BuddyDisplayMessage) => void) =>
        setMessages((prev) => {
          const next = [...prev]
          const last = { ...next[next.length - 1] }
          mut(last)
          next[next.length - 1] = last
          return next
        })

      try {
        const res = await fetch('/api/buddy', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sessionId: getSessionId(),
            locale,
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          }),
        })
        if (res.status === 429) {
          updateAssistant((m) => {
            m.content = locale === 'en'
              ? 'Easy 😅 give me a moment and ask again.'
              : 'Sachte 😅 gib mir kurz und frag gleich nochmal.'
          })
          return
        }
        if (!res.ok || !res.body) throw new Error('request_failed')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let raw = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          buffer = parseNdjsonLines(buffer, (e) => {
            if (e.type === 'text') {
              raw += e.value
              const safe = sanitizeLinks(raw, allowedSlugs.current)
              updateAssistant((m) => {
                m.content = safe
              })
            } else if (e.type === 'spots') {
              for (const s of e.value) allowedSlugs.current.add(s.slug)
              updateAssistant((m) => {
                m.spots = e.value
                m.content = sanitizeLinks(raw, allowedSlugs.current)
              })
            } else if (e.type === 'error') {
              updateAssistant((m) => {
                m.content = locale === 'en'
                  ? 'Sorry — something went wrong. Try again?'
                  : 'Sorry — da ist was schiefgelaufen. Nochmal?'
              })
            }
          })
        }
      } catch {
        updateAssistant((m) => {
          m.content = locale === 'en'
            ? 'Sorry — something went wrong. Try again?'
            : 'Sorry — da ist was schiefgelaufen. Nochmal?'
        })
      } finally {
        setIsStreaming(false)
      }
    },
    [messages, isStreaming, locale],
  )

  return { messages, isStreaming, send }
}
