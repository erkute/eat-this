import { GoogleAuth } from 'google-auth-library';
import { sinceDay } from '@/lib/admin/stats.server';
import { summarizeSearch, type ApiRow, type SearchResult } from '@/lib/admin/searchConsole';

/**
 * Holt die Suchzahlen aus der Search Console — mit dem Dienstkonto, das die
 * App ohnehin traegt.
 *
 * Lokal ist das das explizite Konto aus `.env.local` (FIREBASE_ADMIN_*), in
 * App Hosting das Compute-Konto des Backends ueber Application Default
 * Credentials — dieselbe Logik wie lib/firebase/admin.ts, nur dass hier ein
 * Google-API-Token mit dem Search-Console-Scope gebraucht wird, kein
 * Firebase-Admin-Handle. Beide Konten muessen in der Search Console als
 * Nutzer der Property eingetragen sein; fehlt das, antwortet Google mit 403,
 * und die Route zeigt statt Zahlen die E-Mail, die freizuschalten ist.
 *
 * Die Search Console API ist im Projekt eat-this-8a13b aktiviert (geprueft
 * 03.09.2026); die Zahlen hinken dem Tag um zwei bis drei Tage nach.
 */

export const SEARCH_CONSOLE_PROPERTY = 'sc-domain:eatthisdot.com';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const ENDPOINT = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
  SEARCH_CONSOLE_PROPERTY
)}/searchAnalytics/query`;
/** Eine Stunde: die Search Console aktualisiert einmal am Tag, und das
 *  Kontingent (1.200 Abfragen je Minute) soll nicht am Dashboard haengen. */
const CACHE_MS = 60 * 60 * 1000;
const ROW_LIMIT = 500;

let authClient: GoogleAuth | null = null;

function getAuth(): GoogleAuth {
  if (authClient) return authClient;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  authClient =
    clientEmail && privateKey
      ? new GoogleAuth({
          scopes: [SCOPE],
          credentials: { client_email: clientEmail, private_key: privateKey },
        })
      : new GoogleAuth({ scopes: [SCOPE] });
  return authClient;
}

async function identityOf(auth: GoogleAuth): Promise<string | null> {
  try {
    const credentials = await auth.getCredentials();
    return credentials.client_email ?? null;
  } catch {
    return null;
  }
}

interface QueryBody {
  startDate: string;
  endDate: string;
  dimensions: string[];
  rowLimit: number;
  /** `all` nimmt die frischen, noch nicht endgueltigen Tage mit. */
  dataState: 'all';
}

async function query(auth: GoogleAuth, body: QueryBody): Promise<ApiRow[]> {
  const client = await auth.getClient();
  const response = await client.request<{ rows?: ApiRow[] }>({
    url: ENDPOINT,
    method: 'POST',
    data: body,
  });
  return response.data.rows ?? [];
}

function statusOf(error: unknown): number | null {
  const candidate = error as { response?: { status?: number }; status?: number; code?: unknown };
  if (typeof candidate?.response?.status === 'number') return candidate.response.status;
  if (typeof candidate?.status === 'number') return candidate.status;
  const code = Number(candidate?.code);
  return Number.isFinite(code) && code >= 100 ? code : null;
}

const cache = new Map<string, { at: number; result: SearchResult }>();

/**
 * @param days  Laenge des Zeitraums, endet mit `today`.
 * @param today Heutiger Kalendertag (Berlin), YYYY-MM-DD.
 */
export async function loadSearch(days: number, today: string): Promise<SearchResult> {
  const cacheKey = `${days}:${today}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.at + CACHE_MS > Date.now()) return cached.result;

  const result = await fetchSearch(days, today);
  // Fehler werden nicht gehalten: wer die Freigabe gerade erteilt hat, soll
  // sie beim naechsten Laden sehen, nicht in einer Stunde.
  if (result.ok) cache.set(cacheKey, { at: Date.now(), result });
  return result;
}

async function fetchSearch(days: number, today: string): Promise<SearchResult> {
  const auth = getAuth();
  const start = sinceDay(days, today);
  const beforeStart = sinceDay(days * 2, today);
  const beforeEnd = sinceDay(days + 1, today);
  const base = { rowLimit: ROW_LIMIT, dataState: 'all' as const };

  try {
    const [byDay, byDayBefore, byQuery, byPage] = await Promise.all([
      query(auth, { ...base, startDate: start, endDate: today, dimensions: ['date'] }),
      query(auth, { ...base, startDate: beforeStart, endDate: beforeEnd, dimensions: ['date'] }),
      query(auth, { ...base, startDate: start, endDate: today, dimensions: ['query'] }),
      query(auth, { ...base, startDate: start, endDate: today, dimensions: ['page'] }),
    ]);
    return {
      ok: true,
      data: summarizeSearch({
        property: SEARCH_CONSOLE_PROPERTY,
        range: { start, end: today, days },
        byDay,
        byDayBefore,
        byQuery,
        byPage,
        fetchedAt: new Date().toISOString(),
      }),
    };
  } catch (error) {
    const status = statusOf(error);
    const identity = await identityOf(auth);
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      reason: status === 403 || status === 401 ? 'no-access' : 'error',
      identity,
      message,
    };
  }
}

/** Nur fuer Tests. */
export function resetSearchCache(): void {
  cache.clear();
  authClient = null;
}
