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
