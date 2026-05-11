'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './WaitlistModal.module.css'

type PackType = 'category' | 'complete'
type State = 'idle' | 'sending' | 'sent' | 'error'

interface OpenArgs { packType: PackType }

declare global {
  interface Window {
    openWaitlistModal?: (args: OpenArgs) => void
  }
}

export default function WaitlistModal() {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [packType, setPackType] = useState<PackType>('category')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setMounted(true)
    window.openWaitlistModal = ({ packType: pt }: OpenArgs) => {
      setPackType(pt)
      setEmail('')
      setState('idle')
      setErrorMsg('')
      setOpen(true)
    }
    return () => { delete window.openWaitlistModal }
  }, [])

  // ESC closes
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // focus the input on open
  useEffect(() => {
    if (open) dialogRef.current?.querySelector('input')?.focus()
  }, [open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          packType,
          locale: typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'de',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'request_failed')
      }
      setState('sent')
    } catch (err) {
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : 'unknown')
    }
  }

  if (!mounted) return null
  if (!open) return null

  const title = packType === 'complete' ? 'Complete Berlin' : 'Category Packs'

  return createPortal(
    <div className={styles.backdrop} onClick={() => setOpen(false)}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="waitlist-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" aria-label="Close" className={styles.close} onClick={() => setOpen(false)}>×</button>
        <h2 id="waitlist-title" className={styles.h2}>Join the waitlist</h2>
        <p className={styles.body}>
          We&apos;ll send you a one-time email when <strong>{title}</strong> is ready. No marketing, no list-rental.
        </p>
        {state === 'sent' ? (
          <p className={styles.success}>You&apos;re on the list. We&apos;ll be in touch.</p>
        ) : (
          <form onSubmit={submit} className={styles.form}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={styles.input}
              aria-label="Email"
              disabled={state === 'sending'}
            />
            <button type="submit" className={styles.submit} disabled={state === 'sending'}>
              {state === 'sending' ? 'Sending…' : 'Notify me'}
            </button>
            {state === 'error' && <p className={styles.error}>Something went wrong: {errorMsg}</p>}
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
