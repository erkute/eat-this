import 'server-only';

import { getAdminFirestore } from '@/lib/firebase/admin';
import { getPublicMustEatIds } from '@/lib/map/server-initial-map-data';
import { renderPrivateMustEatImage } from './private-image';
import { PRIVATE_MUST_EATS_COLLECTION } from './private-store';

// Die Sprossen, die Geraete tatsaechlich waehlen (gemessen 26.09.2026): 360
// fuer das ganze Profil bei 2x und 3x und den Startseiten-Teaser bei 2x, 440
// fuer den Teaser bei 3x. Andere Breiten rechnet die Route bei Bedarf aus dem
// dann schon geladenen Original.
const WARM_VARIANTS = [360, 440].map((width) => ({ width, quality: 80, webp: true }));
const PARALLEL = 6;

/** Legt jedes Kartenbild samt Firestore-Dokument und Varianten in den
 *  Prozess-Cache und oeffnet dabei die Verbindungen zu Firestore, Bucket und
 *  Sanity. Kein Riegel: die Arbeit ist einmal je Instanz und gedeckelt. */
export async function warmMustEatImages(): Promise<{
  cards: number;
  failedRenders: number;
  firstError?: string;
}> {
  const [snapshot] = await Promise.all([
    getAdminFirestore().collection(PRIVATE_MUST_EATS_COLLECTION).select().get(),
    getPublicMustEatIds(),
  ]);
  const ids = snapshot.docs.map((doc) => doc.id);
  let failedRenders = 0;
  let firstError: string | undefined;
  for (let i = 0; i < ids.length; i += PARALLEL) {
    const results = await Promise.allSettled(
      ids
        .slice(i, i + PARALLEL)
        .flatMap((id) =>
          WARM_VARIANTS.map((variant) => renderPrivateMustEatImage(id, variant, async () => {}))
        )
    );
    for (const result of results) {
      if (result.status === 'fulfilled') continue;
      failedRenders += 1;
      firstError ??=
        result.reason instanceof Error
          ? `${result.reason.name}: ${result.reason.message}`
          : String(result.reason);
    }
  }
  return { cards: ids.length, failedRenders, firstError };
}
