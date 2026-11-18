/* Eine frische Instanz zahlt ihre erste Firestore-Abfrage, ihren ersten
   Bucket-Download und ihre erste Riegel-Transaktion je mit spürbarer
   Verzögerung, und im Kaltpfad der Bild-Route laufen die hintereinander. Alle
   Karten, die auf einer per Autoscaling gestarteten Instanz landen, kämen
   deshalb gemeinsam spät; das Profil feuert alle Karten auf einmal und trifft
   fast immer auch sie.

   Deshalb ruft sich jede Instanz beim Start einmal selbst auf, und die Route
   `/api/warmup` öffnet diese Verbindungen und legt die Kartendokumente in den
   Prozess-Cache (lib/must-eat/warmup). Über HTTP und nicht direkt aus
   register(): die Route läuft in der Server-Schicht, in der `server-only` und
   der Renderer mit seinem Gedächtnis leben; instrumentation.ts wird ohne sie
   gebaut.

   Der Token existiert nur im Speicher dieses Prozesses. Wer die Route von außen
   aufruft, kennt ihn nicht und bekommt 404. */

const TOKEN_KEY = '__eatthisWarmupToken';
const ATTEMPTS = 5;

type WarmupGlobal = typeof globalThis & { [TOKEN_KEY]?: string };

export function warmupToken(): string | undefined {
  return (globalThis as WarmupGlobal)[TOKEN_KEY];
}

export function scheduleSelfWarmup(): void {
  const token = crypto.randomUUID();
  (globalThis as WarmupGlobal)[TOKEN_KEY] = token;
  const url = `http://127.0.0.1:${process.env.PORT ?? 3000}/api/warmup`;

  // register() laeuft, bevor der Server Anfragen annimmt — der Aufruf wartet
  // also ohnehin, bis er bedient wird. Die Wiederholungen fangen den Fall ab,
  // dass der Port noch gar nicht offen ist.
  const attempt = async (n: number): Promise<void> => {
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'x-warmup-token': token } });
      if (!response.ok) console.error('[warmup] failed', response.status);
    } catch {
      if (n < ATTEMPTS) setTimeout(() => void attempt(n + 1), 1000 * n);
      else console.error('[warmup] unreachable');
    }
  };
  setTimeout(() => void attempt(1), 0);
}
