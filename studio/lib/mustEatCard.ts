import type {SanityClient} from 'sanity'
import {APP_API_BASE} from './appApi'

// Die Karte einer Must Eat liegt geschützt bei der App (Firestore + Storage),
// nicht in Sanity. Das Studio liest und speichert sie über die App, mit dem
// Sanity-Token der angemeldeten Person.

export interface MustEatCardText {
  dish: string
  description: string
  descriptionEn: string
  price: string
}

export interface MustEatCard extends MustEatCardText {
  exists: boolean
  /** Spot, zu dem die gespeicherte Karte gehört. */
  restaurantId: string | null
  preview: string | null
}

/** Nach dem Speichern: die Sperre auf „Veröffentlichen“ prüft neu. */
export const MUST_EAT_CARD_SAVED = 'eat-this:must-eat-card-saved'

/** Format der bisherigen Karten (1026 × 1410). */
export const CARD_RATIO = 1026 / 1410

export class CardRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function call(client: SanityClient, body: FormData | Record<string, unknown>): Promise<MustEatCard> {
  const {token, projectId, dataset} = client.config()
  if (!token) throw new CardRequestError('Keine aktive Sanity-Sitzung. Studio neu laden.', 401)

  const isForm = body instanceof FormData
  if (isForm) {
    body.set('projectId', projectId ?? '')
    body.set('dataset', dataset ?? '')
  }
  let res: Response
  try {
    res = await fetch(`${APP_API_BASE}/api/admin/must-eat-card`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(isForm ? {} : {'Content-Type': 'application/json'}),
      },
      body: isForm ? body : JSON.stringify({...body, projectId, dataset}),
    })
  } catch {
    throw new CardRequestError('Die App ist gerade nicht erreichbar.', 0)
  }
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new CardRequestError(
      payload.message ?? (res.status === 404 ? 'Die Karten-Funktion ist auf der Website noch nicht live.' : `Fehler ${res.status}`),
      res.status,
    )
  }
  return payload as MustEatCard
}

const bareId = (id: string) => id.replace(/^drafts\./, '')

export function readMustEatCard(client: SanityClient, id: string, preview = true): Promise<MustEatCard> {
  return call(client, {id: bareId(id), preview})
}

export function saveMustEatCard(
  client: SanityClient,
  id: string,
  text: MustEatCardText,
  image: File | null,
): Promise<MustEatCard> {
  const form = new FormData()
  form.set('id', bareId(id))
  for (const [key, value] of Object.entries(text)) form.set(key, value)
  if (image) form.set('image', image)
  return call(client, form)
}
