import 'server-only';

import { getAdminFirestore } from '@/lib/firebase/admin';
import { getPublicMustEatIds } from '@/lib/map/server-initial-map-data';
import { renderPrivateMustEatImage, primePrivateMustEatImageContent } from './private-image';
import { PRIVATE_MUST_EATS_COLLECTION, readPrivateMustEatContent } from './private-store';

// Nur Dokumente und Originale, kein sharp. Cloud Run gibt außerhalb von Anfragen
// kaum CPU; der Lauf kommt also vor allem voran, während jemand wartet, und auf
// einer vCPU nimmt er den ersten Besuchern die Rechenzeit (prod 25.10.–03.11.2026:
// Median 495 s). Eine fertige Variante nutzt dafür selten jemandem: die Route
// liefert vor allem 720 und 180, von 29.313 vorgerechneten 360ern wurden 379
// abgerufen, und sharp machte drei Viertel der CPU des Laufs aus. Varianten
// rechnet die Route bei Bedarf.
const PARALLEL = 6;

/** Legt jedes Firestore-Dokument und jedes Original in den Prozess-Cache und
 *  oeffnet dabei die Verbindungen zu Firestore, Bucket und Sanity. Kein Riegel:
 *  die Arbeit ist einmal je Instanz und gedeckelt. */
export async function warmMustEatImages(): Promise<{
  cards: number;
  failedLoads: number;
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
  // Eine gebündelte Abfrage statt einer Firestore-Runde pro Kartenbild.
  // Bei einem defekten Dokument bleibt der Einzelpfad verfügbar, damit
  // weiterhin alle übrigen Karten unabhängig aufgewärmt werden.
  if (ids.length) {
    try {
      primePrivateMustEatImageContent(await readPrivateMustEatContent(ids));
    } catch {
      // renderPrivateMustEatImage erfasst Fehler unten pro Karte.
    }
  }
  let failedLoads = 0;
  let firstError: string | undefined;
  for (let i = 0; i < ids.length; i += PARALLEL) {
    const results = await Promise.allSettled(
      ids.slice(i, i + PARALLEL).map((id) => renderPrivateMustEatImage(id, null, async () => {}))
    );
    for (const result of results) {
      if (result.status === 'fulfilled') continue;
      failedLoads += 1;
      firstError ??=
        result.reason instanceof Error
          ? `${result.reason.name}: ${result.reason.message}`
          : String(result.reason);
    }
  }
  return { cards: ids.length, failedLoads, firstError };
}
