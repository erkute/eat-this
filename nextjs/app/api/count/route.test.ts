import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
  rollback: vi.fn(),
  writeInsight: vi.fn(),
}));

vi.mock('@/lib/analytics/engagement.server', () => ({ writeInsight: mocks.writeInsight }));
vi.mock('@/lib/rateLimitWindow', () => ({
  checkWindowedRateLimit: mocks.checkRateLimit,
}));

vi.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: () => ({
    batch: () => {
      const jobs: (() => Promise<unknown>)[] = [];
      const batch = {
        create: (ref: { create: (data: unknown) => Promise<unknown> }, data: unknown) => {
          jobs.push(() => ref.create(data));
          return batch;
        },
        update: (ref: { update: (data: unknown) => Promise<unknown> }, data: unknown) => {
          jobs.push(() => ref.update(data));
          return batch;
        },
        set: (
          ref: { set: (data: unknown, opts: unknown) => Promise<unknown> },
          data: unknown,
          opts: unknown
        ) => {
          jobs.push(() => ref.set(data, opts));
          return batch;
        },
        commit: async () => {
          try {
            for (const job of jobs) await job();
          } catch (error) {
            mocks.rollback();
            throw error;
          }
        },
      };
      return batch;
    },
    collection: (name: string) => ({
      doc: (id: string) => ({
        create: (data: unknown) => mocks.create(name, id, data),
        update: (data: unknown) => mocks.update(name, id, data),
        set: (data: unknown, opts: unknown) => mocks.set(name, id, data, opts),
        get: async () => ({ data: () => mocks.get(name, id) }),
      }),
    }),
  }),
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { increment: (n: number) => ({ __inc: n }) },
  Timestamp: { fromMillis: (ms: number) => ({ __ts: ms }) },
}));

import { GET, POST } from './route';
import { MAP_KEY_BUDGET, resetDayKeysCache } from '@/lib/analytics/dayKeyBudget';
import { resetHomeTargetsCache } from '@/lib/analytics/homeHeat';

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

/* Three hops: App Hosting appends ingress + GFE after the real client, so
 * clientIpFromXff takes the third from the end. Mirrors the buddy route. */
function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://www.eatthisdot.com/api/count', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      'user-agent': CHROME,
      'x-forwarded-for': '84.13.22.9, 10.0.0.1, 10.0.0.2',
      ...headers,
    },
  });
}

/** The day document write, or undefined when nothing was counted. */
function dayWrite() {
  const call = mocks.set.mock.calls.find(([collection]) => collection === 'analytics_daily');
  return call?.[2] as Record<string, unknown> | undefined;
}

describe('POST /api/count', () => {
  beforeEach(() => {
    mocks.rollback.mockReset();
    mocks.writeInsight.mockReset().mockResolvedValue(undefined);
    mocks.checkRateLimit.mockReset().mockResolvedValue({ allowed: true });
    mocks.create.mockReset().mockResolvedValue(undefined);
    mocks.update.mockReset().mockResolvedValue(undefined);
    mocks.set.mockReset().mockResolvedValue(undefined);
    // Ein leeres Tagesdokument: jeder Schluessel ist neu und passt ins Budget.
    mocks.get.mockReset().mockReturnValue(undefined);
    resetDayKeysCache();
    resetHomeTargetsCache();
    process.env.COUNT_SALT = 'test-salt';
    // The route refuses to write outside production on purpose (see below);
    // every counting assertion here is about the production path.
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    delete process.env.COUNT_SALT;
    vi.unstubAllEnvs();
  });

  /* Local dev is wired to the PRODUCTION Firestore, so an unguarded endpoint
   * would file every developer page load as real traffic. */
  it.each(['development', 'test'])('writes nothing when NODE_ENV is %s', async (env) => {
    vi.stubEnv('NODE_ENV', env);

    const res = await POST(request({ path: '/' }));

    expect(res.status).toBe(204);
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each(['http://127.0.0.1:4178/', 'http://localhost:3100/', 'http://[::1]:3100/'])(
    'zählt Live-Aufrufe aus der lokalen Vorschau %s nicht',
    async (referrer) => {
      const res = await POST(request({ path: '/', referrer }));
      expect(res.status).toBe(204);
      expect(mocks.set).not.toHaveBeenCalled();
      expect(mocks.create).not.toHaveBeenCalled();
    }
  );

  it('counts a page view and its referrer host', async () => {
    const res = await POST(
      request({
        path: '/bezirk/kreuzberg',
        referrer: 'https://www.google.com/search?q=berlin+ramen',
      })
    );

    expect(res.status).toBe(204);
    const write = dayWrite();
    expect(write?.pageviews).toEqual({ __inc: 1 });
    expect(write?.paths).toEqual({ '/bezirk/kreuzberg': { __inc: 1 } });
    // Host only — the query string carried the person's search terms.
    expect(write?.referrers).toEqual({ www_google_com: { __inc: 1 } });
  });

  /* Ausstiege(P) = paths[P] - continuations[P]. Die Fortsetzung ist alles, was
   * dafuer gebraucht wird — es wird nie ein Aufruf mit einer Person verknuepft,
   * und visitorHash bleibt von den besuchten Seiten getrennt. */
  describe('Fortsetzungen fuer die Ausstiegsrechnung', () => {
    it('zaehlt die Vorgaengerseite als Fortsetzung', async () => {
      await POST(request({ path: '/restaurant/bari', from: '/kategorie/lunch' }));

      const write = dayWrite();
      expect(write?.paths).toEqual({ '/restaurant/bari': { __inc: 1 } });
      expect(write?.continuations).toEqual({ '/kategorie/lunch': { __inc: 1 } });
    });

    it('zaehlt ohne Vorgaenger keine Fortsetzung', async () => {
      await POST(request({ path: '/kategorie/lunch' }));

      // Ein Einstieg setzt nichts fort — sonst waere die Rechnung um eins daneben.
      expect(dayWrite()).not.toHaveProperty('continuations');
    });

    it('verwirft einen Vorgaenger, der keine Route dieser Seite ist', async () => {
      await POST(request({ path: '/', from: '/wp-admin/install.php?x=1' }));

      expect(dayWrite()).not.toHaveProperty('continuations');
    });

    it('nimmt den Selbstbezug an — ein erneuter Aufruf setzt den Besuch fort', async () => {
      await POST(request({ path: '/map', from: '/map' }));

      expect(dayWrite()?.continuations).toEqual({ '/map': { __inc: 1 } });
    });

    it('zaehlt bei einem Ereignis keine Fortsetzung', async () => {
      await POST(request({ path: '/map', from: '/', event: 'map_opened' }));

      const write = dayWrite();
      expect(write?.events).toEqual({ map_opened: { __inc: 1 } });
      expect(write).not.toHaveProperty('continuations');
    });
  });

  it.each(['not_a_real_event', '', null, 12])(
    'zählt unbekannte Ereignisse nicht als Seitenaufruf: %s',
    async (event) => {
      await POST(request({ path: '/', event }));
      expect(mocks.set).not.toHaveBeenCalled();
      expect(mocks.create).not.toHaveBeenCalled();
    }
  );

  it('verbraucht bei einem fehlgeschlagenen Tages-Schreibvorgang den Besucher nicht', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let reserved = false;
    // Der Datenbank-Doppelgänger verwirft bei einem Batch-Fehler alle Schreibvorgänge.
    mocks.rollback.mockImplementation(() => {
      reserved = false;
    });
    mocks.create.mockImplementation(async () => {
      if (reserved) throw Object.assign(new Error('ALREADY_EXISTS'), { code: 6 });
      reserved = true;
    });
    mocks.set.mockRejectedValueOnce(new Error('UNAVAILABLE'));
    await POST(request({ path: '/' }));
    mocks.set.mockClear();
    await POST(request({ path: '/news/ein-artikel' }));
    expect(dayWrite()?.visitors).toEqual({ __inc: 1 });
    expect(dayWrite()?.entryPaths).toEqual({ '/news/ein-artikel': { __inc: 1 } });
  });

  it('trennt Artikel-Meilensteine vom Besucher- und Seitenzähler', async () => {
    await POST(
      request({
        path: '/news/test',
        insight: 'signals',
        device: 'phone',
        signals: ['view', 'depth25'],
      })
    );
    expect(mocks.writeInsight).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({
        path: '/news/test',
        surface: 'article',
        signals: ['view', 'depth25'],
      })
    );
    expect(dayWrite()).toBeUndefined();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('schließt Detailmessung bei DNT ebenfalls aus und verwirft ungültige Signale vollständig', async () => {
    await POST(
      request(
        { path: '/news/test', insight: 'signals', device: 'phone', signals: ['view'] },
        { DNT: '1' }
      )
    );
    await POST(request({ path: '/news/test', insight: 'erfunden', device: 'phone' }));
    expect(mocks.writeInsight).not.toHaveBeenCalled();
    expect(dayWrite()).toBeUndefined();
  });
  it('ordnet nur den ersten Tagesaufruf einem Kanal zu', async () => {
    await POST(request({ path: '/news/test', referrer: 'https://www.google.de' }));
    expect(dayWrite()?.entryChannels).toEqual({ google: { __inc: 1 } });
    mocks.create.mockRejectedValueOnce(Object.assign(new Error('ALREADY_EXISTS'), { code: 6 }));
    mocks.set.mockClear();
    await POST(request({ path: '/map', referrer: 'https://instagram.com' }));
    expect(dayWrite()).not.toHaveProperty('entryChannels');
  });

  it('counts a first-of-day visitor once, and not on the second view', async () => {
    await POST(request({ path: '/' }));
    expect(dayWrite()?.visitors, 'first view of the day is a visitor').toEqual({ __inc: 1 });

    // `create` throwing IS the "already seen today" signal.
    mocks.set.mockClear();
    mocks.create.mockRejectedValueOnce(Object.assign(new Error('ALREADY_EXISTS'), { code: 6 }));
    await POST(request({ path: '/map' }));

    const second = dayWrite();
    expect(second?.pageviews, 'the view still counts').toEqual({ __inc: 1 });
    expect(second?.visitors, 'the person does not count twice').toBeUndefined();
  });

  /* „Gerade aktiv" im Brett zaehlt Pruefwerte mit `lastSeenAt` in den letzten
   * 30 Minuten. Jeder Beacon frischt die Zeit auf — aber nur ein Seitenaufruf
   * darf das Dokument anlegen, sonst verschluckt ein fruehes Ereignis den
   * Besucher (siehe `firstToday`). */
  describe('lastSeenAt fuer „gerade aktiv"', () => {
    it('setzt die Zeit beim ersten Aufruf des Tages mit an', async () => {
      await POST(request({ path: '/' }));

      const [collection, , data] = mocks.create.mock.calls[0];
      expect(collection).toBe('analytics_seen');
      expect(data).toHaveProperty('lastSeenAt');
      expect(mocks.update).not.toHaveBeenCalled();
    });

    it('frischt sie bei jedem weiteren Aufruf auf', async () => {
      mocks.create.mockRejectedValueOnce(Object.assign(new Error('ALREADY_EXISTS'), { code: 6 }));
      await POST(request({ path: '/map' }));

      const [collection, , data] = mocks.update.mock.calls[0];
      expect(collection).toBe('analytics_seen');
      expect(Object.keys(data as object)).toEqual(['lastSeenAt']);
    });

    it('frischt sie bei einem Ereignis auf, ohne das Dokument anzulegen', async () => {
      await POST(request({ path: '/map', event: 'map_opened' }));

      expect(mocks.create).not.toHaveBeenCalled();
      expect(mocks.update).toHaveBeenCalledTimes(1);
    });

    it('bleibt bei 204, wenn das Auffrischen scheitert', async () => {
      mocks.update.mockRejectedValueOnce(new Error('NOT_FOUND'));
      const res = await POST(request({ path: '/map', event: 'map_opened' }));

      expect(res.status).toBe(204);
      expect(dayWrite()?.events).toEqual({ map_opened: { __inc: 1 } });
    });
  });

  /* The storage-free opt-out. If these ever start counting, the privacy policy
   * is making a promise the code does not keep. */
  it.each([
    ['Sec-GPC', { 'sec-gpc': '1' }],
    ['DNT', { dnt: '1' }],
  ])('honours %s and writes nothing', async (_label, headers) => {
    const res = await POST(request({ path: '/' }, headers));

    expect(res.status).toBe(204);
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  /* Lighthouse executes JavaScript, so it reaches this endpoint exactly like
   * a browser - our own CI on every push to main, from whatever address the
   * runner happens to have. */
  it('drops Lighthouse from any address', async () => {
    const res = await POST(
      request(
        { path: '/' },
        {
          'user-agent':
            'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36',
          'x-forwarded-for': '84.13.22.9, 10.0.0.1, 10.0.0.2',
        }
      )
    );

    expect(res.status).toBe(204);
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it('drops a verified search crawler even with ordinary browser UA in header and body', async () => {
    const headers = { 'x-forwarded-for': '104.210.140.130, 10.0.0.1, 10.0.0.2' };
    for (const body of [
      { path: '/', ua: CHROME },
      { path: '/', ua: CHROME, event: 'consent_gate_shown' },
      { path: '/', ua: CHROME, home: 'view', device: 'phone' },
    ]) {
      expect((await POST(request(body, headers))).status).toBe(204);
    }
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.writeInsight).not.toHaveBeenCalled();
    expect(await (await GET(request({}, headers))).json()).toEqual({ excluded: true });
  });

  it('drops a declared crawler', async () => {
    await POST(request({ path: '/' }, { 'user-agent': 'Googlebot/2.1' }));
    expect(mocks.set).not.toHaveBeenCalled();
  });

  /* Die App-Hosting-Edge ersetzt den User-Agent-Header, bevor die Anfrage den
   * Origin erreicht — der Header ist in Produktion immer harmlos. Was der
   * Browser wirklich ist, steht darum im Body (lib/analytics.ts). Live-Beweis
   * vom 02.09.2026: `curl -A curl/8.0` mit uebergrossem Body bekam 413 statt
   * 204, der Filter hatte den UA also nie gesehen — und Bingbot, Baidu-Render
   * und der Azure-Crawler standen als Besucher in der Tafel. */
  describe('User-Agent aus dem Body', () => {
    it('erkennt den Bot am Body-UA, auch wenn der Header harmlos ist', async () => {
      const res = await POST(
        request({
          path: '/',
          ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0)',
        })
      );

      expect(res.status).toBe(204);
      expect(mocks.set).not.toHaveBeenCalled();
    });

    it('erkennt Lighthouse am Body-UA, auch ohne die Kennung „Chrome-Lighthouse"', async () => {
      await POST(
        request({
          path: '/',
          ua: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 Chrome/136.0.0.0 Mobile Safari/537.36',
        })
      );

      expect(mocks.set).not.toHaveBeenCalled();
    });

    it('bildet den Besucher-Hash aus dem Body-UA — zwei Geräte hinter einer IP sind zwei Besucher', async () => {
      await POST(request({ path: '/', ua: 'Mozilla/5.0 (iPhone) Safari' }));
      await POST(request({ path: '/', ua: 'Mozilla/5.0 (Macintosh) Chrome' }));

      const hashes = mocks.create.mock.calls.map(([, id]) => id);
      expect(hashes).toHaveLength(2);
      expect(hashes[0]).not.toBe(hashes[1]);
    });

    it('fällt ohne Body-UA auf den Header zurück', async () => {
      await POST(request({ path: '/', ua: '   ' }, { 'user-agent': 'Googlebot/2.1' }));
      expect(mocks.set).not.toHaveBeenCalled();
    });
  });

  /* Das Zahlenbrett zaehlte seinen einzigen Leser: /admin/stats stand mit 67
   * Aufrufen in der eigenen Ausstiegstabelle. */
  it.each(['/admin/stats', '/en/admin/stats', '/admin'])(
    'zählt interne Werkzeuge nicht: %s',
    async (path) => {
      const res = await POST(request({ path }));
      expect(res.status).toBe(204);
      expect(mocks.set).not.toHaveBeenCalled();
    }
  );

  /* Das geteilte Deck traegt eine Firebase-UID im Pfad, und die ist gemischt
   * gross und klein geschrieben. Sie fiel damit durch die Pfadpruefung — und
   * ein verworfener Pfad verwarf bis zum 08.09.2026 die ganze Anfrage, VOR der
   * Ereignis-Auswertung. Der Einladungsweg hatte deshalb null Aufrufe, null
   * Einstiege, null Referrer und kein einziges `starter_pack_granted`. */
  describe('Pfade mit einer Kennung darin', () => {
    const UID = 'Z2IJ8CJsAbCdEfGhIjKlMnOpQr01';

    it('zaehlt das geteilte Deck, ohne die fremde UID zu speichern', async () => {
      const res = await POST(request({ path: `/deck/${UID}` }));

      expect(res.status).toBe(204);
      const write = dayWrite();
      expect(write?.paths).toEqual({ '/deck': { __inc: 1 } });
      expect(write?.entryPaths, 'der geteilte Link IST der Einstieg').toEqual({
        '/deck': { __inc: 1 },
      });
      // Die Schluessel im Tagesdokument sind unbegrenzt; eine fremde Kennung
      // gehoert dort weder als Schluessel noch als Wert hinein.
      expect(JSON.stringify(mocks.set.mock.calls)).not.toContain(UID);
    });

    it('behaelt die Sprache: /en/deck/<uid> wird /en/deck', async () => {
      await POST(request({ path: `/en/deck/${UID}` }));
      expect(dayWrite()?.paths).toEqual({ '/en/deck': { __inc: 1 } });
    });

    it('zaehlt das Ereignis, das auf dem geteilten Deck feuert', async () => {
      await POST(request({ path: `/deck/${UID}`, event: 'starter_pack_granted' }));
      expect(dayWrite()?.events).toEqual({ starter_pack_granted: { __inc: 1 } });
    });

    it('kuerzt auch den Vorgaenger — die Fortsetzung vom Deck aus', async () => {
      await POST(request({ path: '/map', from: `/deck/${UID}` }));
      expect(dayWrite()?.continuations).toEqual({ '/deck': { __inc: 1 } });
    });

    it('verwirft ein Deck ohne Kennung nicht — /deck bleibt /deck', async () => {
      await POST(request({ path: '/deck' }));
      expect(dayWrite()?.paths).toEqual({ '/deck': { __inc: 1 } });
    });
  });

  /* Ein verworfener Pfad nimmt sein Ereignis mit. Fuer /admin ist das gewollt —
   * das Zahlenbrett soll seinen einzigen Leser nicht zaehlen —, und dieser Test
   * haelt fest, dass es eine Entscheidung ist und kein Zufall. */
  it('verwirft mit dem internen Pfad auch sein Ereignis', async () => {
    const res = await POST(request({ path: '/admin', event: 'login' }));

    expect(res.status).toBe(204);
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it('respektiert das Opt-out-Cookie des Betreibers wie GPC', async () => {
    const res = await POST(
      request({ path: '/' }, { cookie: 'cookieConsent=x; eatthis_nocount=1' })
    );

    expect(res.status).toBe(204);
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it.each([
    { path: '/' },
    { path: '/en' },
    { path: '/map', event: 'map_opened' },
    { path: '/', home: 'click', device: 'desktop', section: 'hero', x: 0.5, y: 0.5 },
    { path: '/', home: 'scroll', device: 'phone', depth: 0.5, reached: ['hero'] },
  ])('schließt den eigenen Anschluss ohne Cookie aus: %j', async (body) => {
    vi.stubEnv('STATS_EXCLUDE_IPS', '84.13.22.9,2001:db8:1234:5678::/64');

    const res = await POST(request(body));

    expect(res.status).toBe(204);
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it('schließt wechselnde IPv6-Geräteadressen im eigenen Netz aus', async () => {
    vi.stubEnv('STATS_EXCLUDE_IPS', '2001:db8:1234:5678::/64');
    const res = await POST(
      request(
        { path: '/' },
        {
          'x-forwarded-for': '2001:db8:1234:5678:abcd:1234:5678:9abc, 10.0.0.1, 10.0.0.2',
        }
      )
    );
    expect(res.status).toBe(204);
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('verwendet die geprüfte Besucher-IP statt vorgeschobener Header oder Body-Felder', async () => {
    vi.stubEnv('STATS_EXCLUDE_IPS', '192.0.2.4');
    await POST(
      request(
        { path: '/', ip: '192.0.2.4' },
        {
          'x-forwarded-for': '192.0.2.4, 84.13.22.9, 10.0.0.1, 10.0.0.2',
          'x-real-ip': '192.0.2.4',
        }
      )
    );
    expect(dayWrite()?.pageviews).toEqual({ __inc: 1 });
  });

  it('liefert den Anschluss-Ausschluss vor dem GA-Laden ohne Messung oder Cache', async () => {
    vi.stubEnv('STATS_EXCLUDE_IPS', '84.13.22.9');
    const res = await GET(request({}));
    expect(await res.json()).toEqual({ excluded: true });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it('gibt GA für andere Anschlüsse frei und verrät nur den Ja/Nein-Wert', async () => {
    vi.stubEnv('STATS_EXCLUDE_IPS', '192.0.2.4');
    expect(await (await GET(request({}))).json()).toEqual({ excluded: false });
    expect(await (await GET(request({}, { cookie: 'eatthis_nocount=1' }))).json()).toEqual({
      excluded: true,
    });
  });

  /* Scanners send an ordinary browser UA, so only the path shape catches them
   * here — a 404 never reaches this endpoint to be filtered by status. */
  it.each(['/wp-admin/install.php', '/../../etc/passwd', '/a?b=c', '/UPPER', '/a/b/c/d/e/f/g'])(
    'refuses the scanner path %s',
    async (path) => {
      await POST(request({ path }));
      expect(mocks.set).not.toHaveBeenCalled();
    }
  );

  it('drops an event name that is not on the allowlist', async () => {
    await POST(request({ path: '/', event: 'something_invented' }));
    const write = dayWrite();
    // Ein unbekanntes Ereignis darf auch keinen Seitenaufruf erzeugen.
    expect(write?.events).toBeUndefined();
    expect(write).toBeUndefined();
  });

  it('counts an allowlisted event without counting a second page view', async () => {
    await POST(request({ path: '/map', event: 'map_opened' }));
    const write = dayWrite();
    expect(write?.events).toEqual({ map_opened: { __inc: 1 } });
    expect(write?.pageviews, 'the view was already counted by countView').toBeUndefined();
  });

  it('stops writing when the rate limit trips', async () => {
    mocks.checkRateLimit.mockResolvedValue({ allowed: false, reason: 'per_minute' });
    const res = await POST(request({ path: '/' }));

    expect(res.status).toBe(429);
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it('rejects a body big enough to be an attack', async () => {
    const res = await POST(request(JSON.stringify({ path: '/', referrer: 'x'.repeat(2000) })));
    expect(res.status).toBe(413);
    expect(mocks.set).not.toHaveBeenCalled();
  });

  /* Der Riegel am Besucher-Hash war umgehbar: in den Hash geht `body.ua` ein,
   * und den bestimmt der Aufrufer. Ein neuer UA-String je Anfrage hiess ein
   * frischer Schluessel — und damit je Anfrage ein Dokument in
   * `analytics_seen` und ein beliebig aufblasbarer `visitors`-Stand. */
  describe('Riegel an der Adresse', () => {
    it('haengt nicht am User-Agent, den der Aufrufer schickt', async () => {
      await POST(request({ path: '/', ua: 'Mozilla/5.0 (iPhone) Safari' }));
      await POST(request({ path: '/', ua: 'Mozilla/5.0 (Macintosh) Chrome' }));

      const ipKeys = mocks.checkRateLimit.mock.calls
        .map(([key]) => key as string)
        .filter((key) => key.startsWith('an-ip:'));

      expect(ipKeys).toHaveLength(2);
      expect(ipKeys[0], 'derselbe Schluessel trotz zweier UA-Strings').toBe(ipKeys[1]);
    });

    it('sperrt, bevor der Riegel am Besucher ueberhaupt gefragt wird', async () => {
      mocks.checkRateLimit.mockResolvedValueOnce({ allowed: false, reason: 'per_minute' });

      const res = await POST(request({ path: '/' }));

      expect(res.status).toBe(429);
      expect(mocks.checkRateLimit).toHaveBeenCalledTimes(1);
      expect(mocks.set).not.toHaveBeenCalled();
    });

    /* Ein Beacon ist kein Grund, aus einer Firestore-Stoerung einen Vorfall zu
       machen — die Politik steht am Aufruf, nicht im Begrenzer. */
    it('bestellt beide Riegel mit der Fehlerpolitik `allow`', async () => {
      await POST(request({ path: '/' }));

      const policies = mocks.checkRateLimit.mock.calls.map(([, , policy]) => policy);
      expect(policies).toEqual(['allow', 'allow']);
    });
  });

  /* `paths`, `entryPaths`, `continuations` und `referrers` waren freie
   * Map-Schluessel in EINEM Dokument. Firestore deckelt es bei 1 MB und 20.000
   * Indexeintraegen — ist die Grenze gerissen, schlagen ALLE Schreibvorgaenge
   * des Tages fehl, nicht nur der, der sie gerissen hat. */
  describe('Schluesselbudget des Tagesdokuments', () => {
    function fullMap(prefix: string) {
      return Object.fromEntries(
        Array.from({ length: MAP_KEY_BUDGET }, (_, i) => [`${prefix}${i}`, 1])
      );
    }

    it('verbraucht durch Wiederholungsaufrufe kein Budget für echte neue Einstiege', async () => {
      const entryPaths = fullMap('/restaurant/spot-');
      delete entryPaths['/restaurant/spot-0'];
      mocks.get.mockReturnValue({ entryPaths });
      mocks.create.mockRejectedValueOnce(Object.assign(new Error('ALREADY_EXISTS'), { code: 6 }));
      await POST(request({ path: '/news/nur-spaeter-gesehen' }));
      mocks.set.mockClear();
      await POST(request({ path: '/news/echter-neuer-einstieg' }));
      expect(dayWrite()?.entryPaths).toEqual({ '/news/echter-neuer-einstieg': { __inc: 1 } });
    });

    it('sammelt einen neuen Pfad ein, sobald das Budget voll ist', async () => {
      mocks.get.mockReturnValue({ paths: fullMap('/restaurant/spot-') });

      await POST(request({ path: '/restaurant/ganz-neu' }));

      expect(dayWrite()?.paths).toEqual({ '/other': { __inc: 1 } });
    });

    it('zaehlt einen Pfad weiter, der schon im Dokument steht', async () => {
      mocks.get.mockReturnValue({ paths: { ...fullMap('/restaurant/spot-'), '/map': 3 } });

      await POST(request({ path: '/map' }));

      expect(dayWrite()?.paths).toEqual({ '/map': { __inc: 1 } });
    });

    it('sammelt auch einen neuen Verweis-Host ein', async () => {
      mocks.get.mockReturnValue({ referrers: fullMap('host_') });

      await POST(request({ path: '/', referrer: 'https://news.example.org/foo' }));

      expect(dayWrite()?.referrers).toEqual({ other: { __inc: 1 } });
    });

    it('liest das Tagesdokument fuer ein Ereignis gar nicht', async () => {
      await POST(request({ path: '/map', event: 'map_opened' }));

      // `events` steht auf einer Allowlist — dort gibt es nichts zu deckeln.
      expect(mocks.get).not.toHaveBeenCalled();
    });
  });

  /* Ein Beacon ist ein Aufruf, den niemand wiederholen kann und dessen
   * Ergebnis niemand liest. Ein 500 daraus landet ueber `onRequestError` als
   * Vorfall in Sentry, ohne dass irgendjemandem geholfen waere. */
  describe('Scrolltiefe und Klicks der Startseite', () => {
    const homeWrite = () =>
      mocks.set.mock.calls.find(([collection]) => collection === 'analytics_home')?.[2] as
        | Record<string, unknown>
        | undefined;

    it('zaehlt einen Klick in analytics_home, nicht als Seitenaufruf', async () => {
      const response = await POST(
        request({
          path: '/',
          home: 'click',
          device: 'phone',
          section: 'faq',
          x: 0.12,
          y: 0.5,
          target: 'Was kostet Eat This?',
        })
      );
      expect(response.status).toBe(204);
      expect(dayWrite()).toBeUndefined();
      expect(homeWrite()).toMatchObject({
        heat: { phone: { faq: { '2_10': { __inc: 1 } } } },
        clicks: { phone: { faq: { 'Was kostet Eat This?': { __inc: 1 } } } },
      });
    });

    it('zählt einen Startseiten-Aufruf beim Öffnen und Fortschritt getrennt', async () => {
      await POST(request({ path: '/en', home: 'view', device: 'desktop' }));
      expect(homeWrite()).toMatchObject({
        views: { desktop: { __inc: 1 } },
        cumulativeDepth: { desktop: { '0': { __inc: 1 } } },
      });
      mocks.set.mockClear();
      await POST(
        request({
          path: '/en',
          home: 'progress',
          device: 'desktop',
          depths: [10, 20, 90],
          reached: ['hero'],
        })
      );
      expect(homeWrite()).toMatchObject({
        cumulativeDepth: { desktop: { '90': { __inc: 1 } } },
        reached: { desktop: { hero: { __inc: 1 } } },
      });
      expect(homeWrite()).not.toHaveProperty('views');
      expect(dayWrite()).toBeUndefined();
    });

    it('verwirft einen Startseiten-Beacon von einer anderen Seite ganz', async () => {
      await POST(
        request({ path: '/map', home: 'click', device: 'phone', section: 'hero', x: 0, y: 0 })
      );
      expect(homeWrite()).toBeUndefined();
      expect(dayWrite()).toBeUndefined();
    });
  });

  it('antwortet 204, wenn der Schreibvorgang scheitert', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.set.mockRejectedValue(new Error('UNAVAILABLE'));

    const res = await POST(request({ path: '/' }));

    expect(res.status).toBe(204);
  });

  /* The visitor hash may be stored; the raw IP may never be. */
  it('never writes a raw IP anywhere', async () => {
    await POST(request({ path: '/' }));
    const written = JSON.stringify([
      mocks.set.mock.calls,
      mocks.create.mock.calls,
      mocks.checkRateLimit.mock.calls,
    ]);
    expect(written).not.toContain('84.13.22.9');
  });
});

it.each([
  'http://localhost:3100',
  'http://127.0.0.1:3100',
  'http://[::1]:3100',
  'http://192.168.178.49:3100',
  'http://10.0.0.5:3100',
  'http://172.16.0.8:3100',
])('schreibt auch im Produktionsbuild nichts für Vorschau-Origin %s', async (origin) => {
  mocks.set.mockClear();
  mocks.create.mockClear();
  mocks.update.mockClear();
  vi.stubEnv('NODE_ENV', 'production');
  const response = await POST(request({ path: '/' }, { origin }));
  expect(response.status).toBe(204);
  expect(mocks.set).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
  vi.unstubAllEnvs();
});
