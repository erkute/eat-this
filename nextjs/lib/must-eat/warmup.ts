import 'server-only';

import { getAdminFirestore } from '@/lib/firebase/admin';
import { getPublicMustEatIds } from '@/lib/map/server-initial-map-data';
import { getCachedMustEats } from '@/lib/map/cached-sanity';
import { mustEatContentKey } from './contentKey';
import { renderPrivateMustEatImage, primePrivateMustEatImageContent } from './private-image';
import { PRIVATE_MUST_EATS_COLLECTION, readPrivateMustEatContent } from './private-store';

/** Warm published content in one batch and one original to open the Bucket connection.
 * Sanity has a bounded wait; an outage still lets the base cards warm Firestore/Storage. */
export async function warmMustEatImages(): Promise<{ cards: number; firstError?: string }> {
  void getPublicMustEatIds().catch(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const published = getCachedMustEats().then((cards) => cards.map((card) => mustEatContentKey(card._id, card.cardVersion)));
  let ids: string[] | null;
  try {
    ids = await Promise.race([
      published.catch(() => null),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 1500); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  if (ids === null) {
    const snapshot = await getAdminFirestore().collection(PRIVATE_MUST_EATS_COLLECTION).select().get();
    ids = snapshot.docs.map((doc) => doc.id);
    // A slow Sanity response can still warm the selected revisions later.
    void published.then(warmContent).catch(() => undefined);
  }
  return warmContent(ids);
}

async function warmContent(ids: string[]): Promise<{ cards: number; firstError?: string }> {
  if (!ids.length) return { cards: 0 };
  try {
    primePrivateMustEatImageContent(await readPrivateMustEatContent(ids));
  } catch {
    // The image request below also checks the Firestore/Storage connection.
  }
  try {
    // Null variant loads the original without running sharp during startup.
    await renderPrivateMustEatImage(ids[0], null, async () => {});
    return { cards: ids.length };
  } catch (error) {
    return { cards: ids.length, firstError: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
}
