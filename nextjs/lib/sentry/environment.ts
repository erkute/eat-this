/**
 * Die Umgebung, unter der Sentry ein Ereignis ablegt.
 *
 * Nicht `NODE_ENV`: Staging läuft als Produktions-Build, seine Fehler landeten
 * sonst in Sentry als `production`, nicht von echten zu unterscheiden. Die App
 * kennt ihre Umgebung als `NEXT_PUBLIC_ENV` (`apphosting.yaml`: production,
 * `apphosting.staging.yaml`: staging); Next baut den Wert beim Build in
 * Browser- und Server-Code ein. Lokal ist er leer, dann bleibt es bei
 * `NODE_ENV` (development).
 *
 * Der Zugriff muss wörtlich `process.env.NEXT_PUBLIC_ENV` heißen, sonst ersetzt
 * Next ihn im Browser-Bundle nicht.
 */
export function sentryEnvironment(): string | undefined {
  return process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV;
}

/**
 * Ob überhaupt etwas an Sentry geht: nur auf App Hosting, wo `NEXT_PUBLIC_ENV`
 * gesetzt ist. Lokal liegt die Prod-DSN in `.env.local`, und ohne diese Sperre
 * meldeten Dev-Server, E2E-Läufe und Standalone-Builds aus Arbeitskopien als
 * „production“ ins Prod-Projekt; das braucht das Fehlerkontingent in Stunden
 * auf, und echte Fehler gehen verloren.
 */
export function sentryEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ENV);
}

/**
 * Was Sentry über Personen und Anfragen mitschickt, in Browser, Server und
 * Edge gleich: keine IP (im Browser folgt `infer_ip: "never"` aus `userInfo`),
 * keine Cookies, keine Anfrage- und Antwortinhalte, etwa die E-Mail-Adresse
 * aus dem Login, und keine Werte lokaler Variablen.
 */
export const sentryDataCollection = {
  userInfo: false,
  cookies: false,
  httpBodies: [],
  stackFrameVariables: false,
};

/**
 * Der Weg der Browser-Meldungen: über die eigene Domain an den Server, der sie
 * an Sentry weiterreicht, vorbei an Werbeblockern. Browser und Server brauchen
 * denselben Pfad.
 */
export const SENTRY_TUNNEL_PATH = '/monitoring';
