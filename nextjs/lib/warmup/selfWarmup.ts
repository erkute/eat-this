/* Eine frische Instanz zahlt ihre erste Firestore-Abfrage, ihren ersten
   Bucket-Download und ihre erste Riegel-Transaktion mit je 0,7–1,2 s — und im
   Kaltpfad der Bild-Route laufen die hintereinander. Im Prod-Log (25./26.09.2026)
   kamen deshalb alle Karten, die auf einer per Autoscaling gestarteten Instanz
   landeten, gemeinsam erst nach 3,5–4,8 s; die warme Instanz daneben lieferte in
   0,1–1 s. Das Profil feuert 26 Karten auf einmal und trifft fast immer beide.

   Deshalb ruft sich jede Instanz beim Start einmal selbst auf, und die Route
   `/api/warmup` legt die Karten in den Prozess-Cache (lib/must-eat/warmup).
   Ueber HTTP und nicht direkt aus register(): die Route laeuft in der
   Server-Schicht, in der `server-only` und der Renderer mit seinem Gedaechtnis
   leben — instrumentation.ts wird ohne sie gebaut.

   Der Token existiert nur im Speicher dieses Prozesses. Wer die Route von
   aussen aufruft, kennt ihn nicht und bekommt 404. */

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
