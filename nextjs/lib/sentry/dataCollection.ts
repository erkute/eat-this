import type { BrowserOptions } from '@sentry/nextjs';

/* Was Sentry neben dem Fehler selbst mitschickt, für Browser, Server und Edge.
 *
 * Ohne diese Angabe sammelt das SDK seit Version 11 Nutzerdaten, Cookies,
 * Header, Request- und Response-Bodies und Datenbankwerte. Das hier ist die
 * zurückhaltende Grundeinstellung aus Sentrys Migrationsleitfaden:
 *
 * - `userInfo: false` heißt keine IP (Betreiber, 02.10.2026): Der Browser
 *   schickt `infer_ip: "never"`, Sentry leitet dann keine IP mehr ab. Browser
 *   und Betriebssystem kommen weiter über den User-Agent an.
 * - keine Cookies, keine Bodies, keine KI-Ein- und -Ausgaben (Remy), keine
 *   Datenbank- oder Queue-Werte.
 * - Header und Query-Parameter nur ohne Weiterleitungs-, IP- und Nutzerfelder.
 */
const PROXY_AND_USER_FIELDS = ['forwarded', '-ip', 'remote-', 'via', '-user'];

export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: { deny: PROXY_AND_USER_FIELDS },
    response: { deny: PROXY_AND_USER_FIELDS },
  },
  httpBodies: [],
  urlQueryParams: { deny: PROXY_AND_USER_FIELDS },
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  graphQL: { document: false, variables: false },
} satisfies NonNullable<BrowserOptions['dataCollection']>;
