import {useState} from 'react'
import {EyeOpenIcon} from '@sanity/icons'
import {useToast} from '@sanity/ui'
import {type DocumentActionDescription, type DocumentActionProps, useClient} from 'sanity'

const studioEnv = (import.meta as unknown as {
  env: {DEV?: boolean; SANITY_STUDIO_API_BASE?: string}
}).env
const API_BASE: string =
  studioEnv.SANITY_STUDIO_API_BASE ||
  (studioEnv.DEV ? 'http://localhost:3000' : 'https://www.eatthisdot.com')

// Öffnet den aktuellen Stand des Artikels — Entwurf vor veröffentlichter
// Fassung — im Layout der Seite, ohne ihn zu veröffentlichen. Die Route liest
// den Entwurf mit der Sitzung des Redakteurs und gibt einen befristeten Link
// zurück (24 Stunden, danach 404).
export default function NewsPreviewAction(
  props: DocumentActionProps,
): DocumentActionDescription | null {
  const client = useClient({apiVersion: '2024-01-01'})
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  if (props.type !== 'newsArticle') return null

  const fail = (tab: Window | null, message: string) => {
    tab?.close()
    toast.push({status: 'error', title: 'Vorschau fehlgeschlagen', description: message})
  }

  return {
    disabled: !props.ready || busy || (!props.draft && !props.published),
    icon: EyeOpenIcon,
    label: busy ? 'Vorschau wird erstellt …' : 'Vorschau',
    onHandle: async () => {
      const token = client.config().token
      if (!token) {
        fail(null, 'Keine aktive Sanity-Sitzung. Studio neu laden und erneut anmelden.')
        return
      }
      // Den Tab sofort im Klick öffnen: nach dem await wertet Safari ihn als
      // Popup und blockt ihn.
      const tab = window.open('', '_blank')
      if (tab) tab.opener = null
      setBusy(true)
      try {
        const response = await fetch(`${API_BASE}/api/admin/news-preview`, {
          method: 'POST',
          headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
          body: JSON.stringify({id: props.id}),
        })
        const payload = (await response.json().catch(() => ({}))) as {
          path?: string
          message?: string
        }
        if (!response.ok || !payload.path) {
          fail(tab, payload.message || `Server antwortete mit ${response.status}.`)
          return
        }
        const url = `${API_BASE}${payload.path}`
        if (tab) tab.location.href = url
        else window.open(url, '_blank', 'noopener')
      } catch {
        fail(tab, 'Die Seite war nicht erreichbar.')
      } finally {
        setBusy(false)
        props.onComplete()
      }
    },
  }
}
