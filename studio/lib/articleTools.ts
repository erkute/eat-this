import {useSyncExternalStore} from 'react'
import type {SanityClient} from 'sanity'
import {APP_API_BASE} from './appApi'

// Vorschau und „Mit AI schreiben“ für Artikel. Beides ruft die App mit dem
// Sanity-Token der angemeldeten Person auf; im Studio liegt kein Geheimnis.

type Blocks = Array<Record<string, unknown>>

export interface ArticleDocument {
  _id: string
  contentDe?: Blocks
  excerptDe?: string
  titleDe?: string
}

function sessionToken(client: SanityClient): string {
  const token = client.config().token
  if (!token) throw new Error('Keine aktive Sanity-Sitzung. Studio neu laden und erneut anmelden.')
  return token
}

const bareId = (id: string) => id.replace(/^drafts\./, '')

/**
 * Öffnet den aktuellen Stand — Entwurf vor veröffentlichter Fassung — im
 * Layout der Website, ohne ihn zu veröffentlichen. Der Link gilt 24 Stunden.
 */
export async function openArticlePreview(client: SanityClient, id: string): Promise<void> {
  const token = sessionToken(client)
  // Den Tab im Klick öffnen: nach einem await hält Safari ihn für ein Popup.
  const tab = window.open('', '_blank')
  if (tab) tab.opener = null
  try {
    const response = await fetch(`${APP_API_BASE}/api/admin/news-preview`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({id: bareId(id)}),
    })
    const payload = (await response.json().catch(() => ({}))) as {path?: string; message?: string}
    if (!response.ok || !payload.path)
      throw new Error(payload.message || `Fehler ${response.status}`)
    const url = `${APP_API_BASE}${payload.path}`
    if (tab) tab.location.href = url
    else window.open(url, '_blank', 'noopener')
  } catch (error) {
    tab?.close()
    throw error instanceof TypeError ? new Error('Die Website war nicht erreichbar.') : error
  }
}

export const hasArticleText = (doc: ArticleDocument | null | undefined) =>
  Boolean(doc?.titleDe || doc?.excerptDe || doc?.contentDe?.length)

/**
 * Lässt die App einen Artikel schreiben (Deutsch und Englisch, mit Teaser und
 * Google-Texten). Den Text setzt die App selbst in den Entwurf — er kommt also
 * auch an, wenn hier der Tab inzwischen zu ist. Ohne `replace` füllt sie nur,
 * was noch leer ist.
 */
async function writeArticleWithAi(
  client: SanityClient,
  id: string,
  input: {brief: string; sources: string[]; replace: boolean},
): Promise<{sources: number}> {
  const token = sessionToken(client)
  const {projectId, dataset} = client.config()
  let response: Response
  try {
    response = await fetch(`${APP_API_BASE}/api/admin/generate-news-article`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        brief: input.brief,
        documentId: bareId(id),
        projectId,
        dataset,
        replace: input.replace,
        sourceUrls: input.sources,
      }),
    })
  } catch {
    throw new Error('Die App ist gerade nicht erreichbar.')
  }
  const payload = (await response.json().catch(() => ({}))) as {sources?: number; message?: string}
  if (!response.ok) throw new Error(payload.message || `Fehler ${response.status}`)
  return {sources: payload.sources ?? 0}
}

// Das Schreiben dauert ein paar Minuten. Es läuft im Hintergrund weiter, auch
// wenn man den Artikel verlässt; die Leiste zeigt, welche Artikel gerade
// geschrieben werden (solange das Studio offen bleibt).
const writing = new Set<string>()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useArticleWriting(id: string | undefined): boolean {
  return useSyncExternalStore(subscribe, () => Boolean(id && writing.has(bareId(id))))
}

type Notice = {status: 'success' | 'error'; title: string; description?: string}

export function startArticleWriting(
  client: SanityClient,
  doc: ArticleDocument,
  input: {brief: string; sources: string[]; replace: boolean},
  report: (notice: Notice) => void,
): void {
  const id = bareId(doc._id)
  if (writing.has(id)) return
  writing.add(id)
  emit()
  writeArticleWithAi(client, id, input)
    .then(({sources}) =>
      report({
        status: 'success',
        title: 'Der Entwurf steht',
        description: `${sources} Quellen genutzt. Fakten, Links und Bilder vor dem Veröffentlichen prüfen.`,
      }),
    )
    .catch((error: Error) =>
      report({
        status: 'error',
        title: 'Der Artikel ließ sich nicht schreiben',
        description: error.message,
      }),
    )
    .finally(() => {
      writing.delete(id)
      emit()
    })
}
