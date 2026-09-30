import { GoogleAuth } from 'google-auth-library';
import type { Range } from '@/lib/admin/stats.server';

/**
 * Die GA4-Nutzer neben dem eigenen Zaehler — mit demselben Dienstkonto wie die
 * Search Console (lib/admin/searchConsole.server.ts): lokal das Konto aus
 * `.env.local`, in App Hosting das Compute-Konto ueber ADC. Beide stehen seit
 * 28.09.2026 in der GA-Property; die Analytics Data API ist im Projekt
 * eat-this-8a13b aktiviert.
 *
 * Warum GA ueberhaupt daneben steht: es zaehlt nur, wer dem Cookie-Dialog
 * zustimmt. Im Abgleich 01.–27.09.2026 waren das 612 GA-Nutzer gegen 635
 * Zustimmungen und 1.704 Besucher im Zaehler — GA sieht rund ein Drittel. Die
 * Luecke ist die Einwilligung, kein Messfehler; das Brett soll sie zeigen,
 * statt dass jemand zwei Zahlen aus zwei Oberflaechen gegeneinander haelt.
 */

const PROPERTY = 'properties/529928450';
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const ENDPOINT = `https://analyticsdata.googleapis.com/v1beta/${PROPERTY}`;
/** Zehn Minuten: GA verarbeitet den laufenden Tag fortlaufend, aber das
 *  Kontingent soll nicht am Neuladen des Bretts haengen. */
const CACHE_MS = 10 * 60 * 1000;

interface GaDay {
  day: string;
  users: number;
}

export type GaResult =
  | { ok: true; users: number; days: GaDay[] }
  | {
      ok: false;
      /** `no-access`: das Dienstkonto fehlt in der GA-Property. */
      reason: 'no-access' | 'error';
      identity: string | null;
      message: string;
    };

interface ReportRow {
  dimensionValues?: { value: string }[];
  metricValues?: { value: string }[];
}

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

async function report(
  kind: 'runReport' | 'runRealtimeReport',
  body: Record<string, unknown>
): Promise<ReportRow[]> {
  const client = await getAuth().getClient();
  const response = await client.request<{ rows?: ReportRow[] }>({
    url: `${ENDPOINT}:${kind}`,
    method: 'POST',
    data: body,
  });
  return response.data.rows ?? [];
}

const metric = (row: ReportRow | undefined): number => Number(row?.metricValues?.[0]?.value ?? 0);

/** `20260928` → `2026-09-28`. */
function isoDay(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

const cache = new Map<string, { at: number; result: GaResult }>();

/**
 * Aktive Nutzer im Fenster, gesamt und je Tag. Die Summe kommt aus einer
 * eigenen Abfrage: Nutzer sind nicht additiv, wer an zwei Tagen kam, steht in
 * zwei Tageszeilen, im Fenster aber nur einmal.
 */
export async function loadGa(range: Range): Promise<GaResult> {
  const cacheKey = `${range.start}:${range.end}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.at + CACHE_MS > Date.now()) return cached.result;

  const dateRanges = [{ startDate: range.start, endDate: range.end }];
  const metrics = [{ name: 'activeUsers' }];
  let result: GaResult;
  try {
    const [total, byDay] = await Promise.all([
      report('runReport', { dateRanges, metrics }),
      report('runReport', {
        dateRanges,
        metrics,
        dimensions: [{ name: 'date' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
        limit: 400,
      }),
    ]);
    result = {
      ok: true,
      users: metric(total[0]),
      days: byDay.map((row) => ({
        day: isoDay(row.dimensionValues?.[0]?.value ?? ''),
        users: metric(row),
      })),
    };
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    let identity: string | null = null;
    try {
      identity = (await getAuth().getCredentials()).client_email ?? null;
    } catch {
      identity = null;
    }
    return {
      ok: false,
      reason: status === 403 || status === 401 ? 'no-access' : 'error',
      identity,
      message: error instanceof Error ? error.message : String(error),
    };
  }
  cache.set(cacheKey, { at: Date.now(), result });
  return result;
}

/** GAs eigene Zahl „aktiv in den letzten 30 Minuten" — oder null. */
export async function loadGaRealtime(): Promise<number | null> {
  try {
    return metric((await report('runRealtimeReport', { metrics: [{ name: 'activeUsers' }] }))[0]);
  } catch {
    return null;
  }
}

/** Nur fuer Tests. */
export function resetGaCache(): void {
  cache.clear();
  authClient = null;
}
