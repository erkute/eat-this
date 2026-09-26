import 'server-only';

import { getAdminFirestore } from '@/lib/firebase/admin';
import { getPublicMustEatIds } from '@/lib/map/server-initial-map-data';
import { renderPrivateMustEatImage } from './private-image';
import { PRIVATE_MUST_EATS_COLLECTION } from './private-store';

// Nur die 360er: die nimmt das ganze Profil bei 2x und 3x (gemessen
// 26.09.2026). Jede weitere Sprosse ist sharp-Arbeit, die auf einer frischen
// Instanz mit den ersten Besuchern um dieselbe vCPU streitet — auf prod lagen
// die 21 Karten eines Profils, das eine neue Instanz traf, bei 8,7–12 s, als
// hier noch 360 und 440 vorgerechnet wurden. Wer die 360er gerade braucht,
// haengt sich an den laufenden Lauf; alles andere rechnet die Route bei Bedarf.
const WARM_VARIANT = { width: 360, quality: 80, webp: true } as const;
const PARALLEL = 6;

/** Legt jedes Kartenbild samt Firestore-Dokument und 360er in den
 *  Prozess-Cache und oeffnet dabei die Verbindungen zu Firestore, Bucket und
 *  Sanity. Kein Riegel: die Arbeit ist einmal je Instanz und gedeckelt. */
export async function warmMustEatImages(): Promise<{
  cards: number;
  failedRenders: number;
  firstError?: string;
}> {
  // Die Sanity-Abfrage ist Beiwerk: sie waermt nur den Cache, den die Route
  // ohnehin selbst fuellt. Auf CPU-armen frischen Instanzen lief sie in ihr
  // Zeitlimit (ESOCKETTIMEDOUT, prod 26.09.2026, zwei von drei Starts) und riss
  // unter `Promise.all` Firestore und Bucket mit.
  void getPublicMustEatIds().catch(() => undefined);
  const snapshot = await getAdminFirestore()
    .collection(PRIVATE_MUST_EATS_COLLECTION)
    .select()
    .get();
  const ids = snapshot.docs.map((doc) => doc.id);
  let failedRenders = 0;
  let firstError: string | undefined;
  for (let i = 0; i < ids.length; i += PARALLEL) {
    const results = await Promise.allSettled(
      ids
        .slice(i, i + PARALLEL)
        .map((id) => renderPrivateMustEatImage(id, WARM_VARIANT, async () => {}))
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
