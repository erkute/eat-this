import 'server-only';

import { getAdminFirestore } from '@/lib/firebase/admin';
import { getPublicMustEatIds } from '@/lib/map/server-initial-map-data';
import { renderPrivateMustEatImage, primePrivateMustEatImageContent } from './private-image';
import { PRIVATE_MUST_EATS_COLLECTION, readPrivateMustEatContent } from './private-store';

// Öffnet die Verbindungen zu Firestore, Bucket und Sanity und legt die
// Firestore-Dokumente in den Prozess-Cache. Ein einziges Original reicht, um
// den Bucket aufzuwecken; die übrigen holt die Bild-Route, wenn jemand sie
// anfragt. Sie braucht für ihre Varianten ohnehin sharp, und mit offener
// Verbindung kommt ein Original von 47–159 kB schnell nach.
//
// Alle Originale vorzuladen hat den neuen Instanzen mehr genommen als gegeben.
// Cloud Run gibt außerhalb von Anfragen kaum CPU, darum lief der Lauf nur,
// während Besucher warteten: im Median 5,6 min je Instanz, jede zehnte über
// 23 min (prod 29.10.–05.11.2026, 320 Starts). Solange er lief, brauchten
// Seiten im Median 2,0 s statt 0,4 s und Kartenbilder 4,7 s statt 0,2 s
// (jeweils in den ersten 90 s einer Instanz, prod 03.–05.11.2026).
export async function warmMustEatImages(): Promise<{
  cards: number;
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
  if (!ids.length) return { cards: 0 };
  // Eine gebündelte Abfrage statt einer Firestore-Runde pro Kartenbild.
  // Scheitert sie, liest die Route jedes Dokument einzeln nach.
  try {
    primePrivateMustEatImageContent(await readPrivateMustEatContent(ids));
  } catch {
    // Der Bucket-Abruf unten meldet, ob die Verbindung steht.
  }
  try {
    // Variante null heisst: nur das Original, kein sharp.
    await renderPrivateMustEatImage(ids[0], null, async () => {});
    return { cards: ids.length };
  } catch (error) {
    return {
      cards: ids.length,
      firstError: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  }
}
