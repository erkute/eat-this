import type { RateLimitDecision } from './rateLimitWindow';

/* Der Fenster-Begrenzer ist eine Firestore-Transaktion auf EIN Dokument je
   Schluessel. Sechs Karten, die eine Seite auf einmal laedt, kommen von
   derselben IP — sechs Transaktionen auf dasselbe Dokument, und Firestore
   laesst sie nacheinander durch, jede mit Retry und Backoff. Im
   Produktions-Log der Bild-Route (16.09.2026) kamen die ersten zwei Bilder
   eines Schwungs nach 460 und 607 ms, die vier danach nach 1,5 bis 2,2 s;
   lokal gemessen: 2,2 → 3,1 → 3,9 → 6,7 s fuer vier gleichzeitige.

   Deshalb: Laeuft fuer einen Schluessel gerade eine Pruefung, warten neue
   Anfragen und gehen danach ALLE ZUSAMMEN in eine Transaktion (`count`).
   Hoechstens zwei Transaktionen je Schwung statt einer je Anfrage, und die
   Zaehlung bleibt exakt. Die Entscheidung gilt fuer den ganzen Stapel: ist
   das Budget fuer alle zusammen ueberschritten, wird keiner bedient. */

type Check = (key: string, count: number) => Promise<RateLimitDecision>;

interface Waiting {
  count: number;
  settle: Array<[(decision: RateLimitDecision) => void, (error: unknown) => void]>;
}

export function coalesceRateLimit(check: Check): (key: string) => Promise<RateLimitDecision> {
  const inflight = new Map<string, Promise<RateLimitDecision>>();
  const waiting = new Map<string, Waiting>();

  const run = (key: string, count: number): Promise<RateLimitDecision> => {
    const pending = check(key, count);
    inflight.set(key, pending);
    void pending
      .then(
        () => undefined,
        () => undefined
      )
      .then(() => {
        inflight.delete(key);
        const queued = waiting.get(key);
        if (!queued) return;
        waiting.delete(key);
        run(key, queued.count).then(
          (decision) => queued.settle.forEach(([resolve]) => resolve(decision)),
          (error) => queued.settle.forEach(([, reject]) => reject(error))
        );
      });
    return pending;
  };

  return (key) => {
    if (!inflight.has(key)) return run(key, 1);
    return new Promise((resolve, reject) => {
      const queued = waiting.get(key) ?? { count: 0, settle: [] };
      queued.count += 1;
      queued.settle.push([resolve, reject]);
      waiting.set(key, queued);
    });
  };
}
