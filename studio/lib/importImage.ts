import type {SanityClient} from 'sanity'
import {APP_API_BASE} from './appApi'

export interface ImportedImage {
  assetId: string
  previewUrl: string
  width: number | null
  height: number | null
  /** Gesetzt, wenn der Link auf eine Seite zeigte und deren Vorschaubild kam. */
  pageUrl: string | null
}

/**
 * Lässt die App das Foto hinter einem Link holen und in Sanity hochladen. Die
 * App nimmt dafür den Sanity-Token der angemeldeten Person — hochladen darf
 * also nur, wer es auch im Studio darf.
 */
export async function importImageFromUrl(
  client: SanityClient,
  url: string,
  credit: string,
): Promise<ImportedImage> {
  const {token, projectId, dataset} = client.config()
  if (!token) throw new Error('Keine aktive Sanity-Sitzung. Studio neu laden und erneut anmelden.')

  let res: Response
  try {
    res = await fetch(`${APP_API_BASE}/api/admin/import-image`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({url, credit, projectId, dataset}),
    })
  } catch {
    throw new Error('Die App ist gerade nicht erreichbar. Bitte gleich noch einmal versuchen.')
  }
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      payload.message ??
        (res.status === 404
          ? 'Die Foto-Funktion ist auf der Website noch nicht live.'
          : `Fehler ${res.status}`),
    )
  }
  return payload as ImportedImage
}
