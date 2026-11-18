import type { RateLimitDecision } from './rateLimit';

/* Der Fenster-Begrenzer ist eine Firestore-Transaktion auf ein Dokument je
   Schlüssel. Sechs Karten, die eine Seite auf einmal lädt, kommen von derselben
   IP: sechs Transaktionen auf dasselbe Dokument, und Firestore lässt sie
   nacheinander durch, jede mit Retry und Backoff. Die ersten zwei Bilder eines
   Schwungs kämen nach rund einer halben Sekunde, die vier danach nach 1,5 bis
   2,2 s.

   Deshalb: Läuft für einen Schlüssel gerade eine Prüfung, warten neue Anfragen
   und gehen danach alle zusammen in eine Transaktion (`count`). Höchstens zwei
   Transaktionen je Schwung statt einer je Anfrage, und die Zählung bleibt
   exakt. Die Entscheidung gilt für den ganzen Stapel: Ist das Budget für alle
   zusammen überschritten, wird keiner bedient. */

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
