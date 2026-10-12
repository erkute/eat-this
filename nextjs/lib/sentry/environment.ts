/**
 * Die Umgebung, unter der Sentry ein Ereignis ablegt.
 *
 * Bis zum 02.10.2026 las jede der drei Konfigurationen `NODE_ENV`. Staging
 * läuft aber als Produktions-Build, und so landeten Fehler von Staging in
 * Sentry als `production` — nicht von echten zu unterscheiden. Die App kennt
 * ihre Umgebung schon als `NEXT_PUBLIC_ENV` (`apphosting.yaml`: production,
 * `apphosting.staging.yaml`: staging); Next baut den Wert beim Build in
 * Browser- und Server-Code ein. Lokal ist er leer, dann bleibt es bei
 * `NODE_ENV` (development).
 *
 * Der Zugriff muss wörtlich `process.env.NEXT_PUBLIC_ENV` heißen, sonst
 * ersetzt Next ihn im Browser-Bundle nicht.
 */
export function sentryEnvironment(): string | undefined {
  return process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV;
}

/**
 * Ob überhaupt etwas an Sentry geht: nur auf App Hosting, wo
 * `NEXT_PUBLIC_ENV` gesetzt ist. Lokal liegt die Prod-DSN in `.env.local`,
 * und ohne diese Sperre meldeten Dev-Server, E2E-Läufe und Standalone-Builds
 * aus Arbeitskopien als „production“ ins Prod-Projekt. Im September/Oktober
 * 2026 kamen so in einzelnen Stunden mehrere Hunderttausend Ereignisse an,
 * und das Fehlerkontingent des kostenlosen Plans (5.000/Monat) war ab dem
 * 29.09. täglich aufgebraucht — echte Fehler aus Produktion gingen verloren.
 */
export function sentryEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ENV);
}
