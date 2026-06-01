import { getAdminFirestore } from './admin'

/** Pure extractor: pull a valid homeBezirk slug out of a user-doc data object. */
export function extractHomeBezirk(data: Record<string, unknown> | undefined): string | null {
  const v = data?.homeBezirk
  return typeof v === 'string' && v.length > 0 ? v : null
}

/** Server: read the user's homeBezirk slug, or null. */
export async function getUserHomeBezirk(uid: string): Promise<string | null> {
  const snap = await getAdminFirestore().collection('users').doc(uid).get()
  return extractHomeBezirk(snap.data())
}

/** Server: set the user's homeBezirk slug (merge, never clobbers other fields). */
export async function setUserHomeBezirk(uid: string, bezirkSlug: string): Promise<void> {
  await getAdminFirestore()
    .collection('users')
    .doc(uid)
    .set({ homeBezirk: bezirkSlug }, { merge: true })
}
