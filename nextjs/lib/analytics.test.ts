// @vitest-environment jsdom
// Der Zaehler schweigt auf lokalen Hosts — unter dem jsdom-Standard
// (localhost) wuerde hier nichts gesendet, und zwar zu Recht.
// @vitest-environment-options { "url": "https://www.eatthisdot.com/" }
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countEvent,
  countHome,
  countInsight,
  countView,
  qualifiedCountName,
  resetReferrerSentForTests,
  trackEvent,
  trackEventOnce,
} from './analytics';

/* `{ ...navigator }` verliert `userAgent` — der Getter liegt auf dem Prototyp.
 * Der Zaehler schickt ihn im Beacon mit, also muss der Stub ihn tragen. */
const TEST_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/136.0.0.0 Safari/537.36';

/* Der eigene Browser, Bots samt dem Browser der Claude-App und das
 * Zahlenbrett werden nicht gezaehlt. */
describe('der Zaehler laesst eigene und automatische Besuche aus', () => {
  let beacon: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { ...navigator, userAgent: TEST_UA, sendBeacon: beacon });
  });

  afterEach(() => {
    document.cookie = 'eatthis_nocount=; Max-Age=0; Path=/';
    vi.unstubAllGlobals();
  });

  it('zaehlt einen gewoehnlichen Browser', () => {
    trackEvent('map_opened');
    expect(beacon).toHaveBeenCalledTimes(1);
  });

  it('laesst den per Knopf abgemeldeten Browser aus', () => {
    document.cookie = 'eatthis_nocount=1; Path=/';
    trackEvent('map_opened');
    expect(beacon).not.toHaveBeenCalled();
  });

  it('laesst den Browser der Claude-App aus', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: `${TEST_UA} Claude/1.2.3 Chrome/136.0.0.0`,
      sendBeacon: beacon,
    });
    trackEvent('map_opened');
    expect(beacon).not.toHaveBeenCalled();
  });

  it.each(['/admin/stats', '/en/admin/stats'])('laesst %s aus', (pathname) => {
    vi.stubGlobal('location', { ...window.location, pathname });
    countView();
    expect(beacon).not.toHaveBeenCalled();
  });

  it('haelt „admin" im Slug nicht fuer das Brett', () => {
    vi.stubGlobal('location', { ...window.location, pathname: '/news/administration-kantine' });
    countView();
    expect(beacon).toHaveBeenCalledTimes(1);
  });

  it('zaehlt sitzungsweit einmalige Ereignisse nur einmal', () => {
    trackEventOnce('purchase_1', 'purchase', { value: 2.99 });
    trackEventOnce('purchase_1', 'purchase', { value: 2.99 });
    expect(beacon).toHaveBeenCalledTimes(1);
  });
});

describe('counting', () => {
  let beacon: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { ...navigator, userAgent: TEST_UA, sendBeacon: beacon });
    window.history.replaceState({}, '', '/bezirk/kreuzberg');
    // Der Referrer wird nur einmal pro Dokument geschickt; jeder Test faengt
    // ein frisches Dokument an.
    resetReferrerSentForTests();
  });

  // jsdom's Blob has no .text(), so read it the long way.
  function readBlob(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
  }

  async function sent(call: number = 0) {
    const blob = beacon.mock.calls[call]?.[1] as Blob;
    return JSON.parse(await readBlob(blob)) as Record<string, string>;
  }

  it('counts a page view', async () => {
    countView();

    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0][0]).toBe('/api/count');
    expect((await sent()).path).toBe('/bezirk/kreuzberg');
  });

  it('sends the path only, never the query string', async () => {
    window.history.replaceState({}, '', '/checkout/success?session_id=cs_live_secret');

    countView();

    const body = await sent();
    expect(body.path).toBe('/checkout/success');
    expect(JSON.stringify(body)).not.toContain('cs_live_secret');
  });

  /* document.referrer ist fuer ein Dokument konstant. Ihn bei jedem
   * Routenwechsel mitzuschicken hat dieselbe Herkunft mehrfach gezaehlt:
   * 253 gezaehlte Google-Verweise gegen 83 echte Suchklicks (Aug 2026). */
  it('schickt den Referrer nur beim ersten Aufruf eines Dokuments', async () => {
    Object.defineProperty(document, 'referrer', {
      value: 'https://www.google.com/search?q=beste+pizza+berlin',
      configurable: true,
    });

    countView();
    window.history.replaceState({}, '', '/restaurant/gemello');
    countView();
    window.history.replaceState({}, '', '/restaurant/bari');
    countView();

    expect(beacon).toHaveBeenCalledTimes(3);
    // Nur der Ursprung: der Pfad einer Suchseite traegt Suchbegriffe, und die
    // Route liest ohnehin nur den Host.
    expect((await sent(0)).referrer).toBe('https://www.google.com');
    expect(await sent(1), 'zweiter Aufruf ohne Referrer').not.toHaveProperty('referrer');
    expect(await sent(2), 'dritter Aufruf ohne Referrer').not.toHaveProperty('referrer');
    // Die Pfade zaehlen weiterhin alle drei mit.
    expect([(await sent(0)).path, (await sent(1)).path, (await sent(2)).path]).toEqual([
      '/bezirk/kreuzberg',
      '/restaurant/gemello',
      '/restaurant/bari',
    ]);
  });

  /* Die Vorgaengerseite ist die halbe Antwort auf "wo gehen die Leute raus":
   * Ausstiege(P) = Aufrufe(P) - Fortsetzungen(P). Sie kommt aus dem Referrer
   * bzw. dem Routenwechsel — nie aus einer Sitzungskennung. */
  describe('Vorgaengerseite fuer die Ausstiegsrechnung', () => {
    function setReferrer(value: string) {
      Object.defineProperty(document, 'referrer', { value, configurable: true });
    }

    it('nimmt bei harter Navigation den eigenen Referrer als Vorgaenger', async () => {
      setReferrer('https://www.eatthisdot.com/kategorie/lunch');

      countView();

      expect((await sent()).from).toBe('/kategorie/lunch');
    });

    it('schickt keinen Vorgaenger, wenn der Besuch von aussen kommt', async () => {
      setReferrer('https://www.google.com/search?q=beste+pizza+berlin');

      countView();

      // Fremde Herkunft heisst Einstieg — es gibt nichts fortzusetzen.
      expect(await sent()).not.toHaveProperty('from');
    });

    it('schickt gar keinen Vorgaenger ohne Referrer', async () => {
      setReferrer('');

      countView();

      expect(await sent()).not.toHaveProperty('from');
    });

    it('kettet Routenwechsel innerhalb eines Dokuments', async () => {
      setReferrer('');

      countView(); // /bezirk/kreuzberg — Einstieg
      window.history.replaceState({}, '', '/restaurant/gemello');
      countView();
      window.history.replaceState({}, '', '/restaurant/bari');
      countView();

      expect(await sent(0)).not.toHaveProperty('from');
      expect((await sent(1)).from).toBe('/bezirk/kreuzberg');
      expect((await sent(2)).from).toBe('/restaurant/gemello');
    });

    it('verknuepft nichts mit einer Person — keine Kennung im Beacon', async () => {
      setReferrer('https://www.eatthisdot.com/kategorie/lunch');

      countView();

      // Der ganze Entwurf haengt daran: Aufruf und Vorgaenger, sonst nichts.
      expect(Object.keys(await sent()).sort()).toEqual(['from', 'path', 'referrer', 'ua']);
    });
  });

  it('fans a tracked event out to the counter', async () => {
    trackEvent('map_opened', { tier: 'anon' });

    expect(beacon).toHaveBeenCalledTimes(1);
    expect((await sent()).event).toBe('map_opened');
  });

  /* page_view arrives through countView. Letting it in here as well would
   * double every single view in the dashboard. */
  it('refuses page_view as an event name', () => {
    countEvent('page_view');
    expect(beacon).not.toHaveBeenCalled();
  });

  /* Die App-Hosting-Edge ersetzt den User-Agent-Header, bevor die Anfrage
   * den Origin erreicht — der Bot-Filter der Route lief in Produktion ins
   * Leere. Darum faehrt der UA im Body mit: derselbe String, den der Browser
   * ohnehin in jeder Anfrage sendet. */
  it('schickt den User-Agent im Body mit', async () => {
    countView();
    countEvent('map_opened');

    expect((await sent(0)).ua).toBe(navigator.userAgent);
    expect((await sent(1)).ua).toBe(navigator.userAgent);
  });

  it('never touches storage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const getItem = vi.spyOn(Storage.prototype, 'getItem');

    countView();
    countEvent('map_opened');

    // Reading or writing the device would need consent (TDDDG 25).
    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    setItem.mockRestore();
    getItem.mockRestore();
  });

  it('stays silent when the browser has no sendBeacon and no fetch', () => {
    vi.stubGlobal('navigator', { ...navigator, userAgent: TEST_UA, sendBeacon: undefined });
    vi.stubGlobal('fetch', () => {
      throw new Error('no fetch here');
    });

    expect(() => countView()).not.toThrow();
  });
});

/* Der Zaehler kennt nur Namen. Damit der Trichter die Ausgaenge einer Karte
 * unterscheiden kann, geht fuer zwei Ereignisse ein zweiter Beacon mit dem
 * qualifizierten Namen raus — der Grundname bleibt, sonst reissen die Reihen. */
describe('countEvent — Auffaecherung nach Parameter', () => {
  const beacon = vi.fn<(url: string, data: Blob) => boolean>(() => true);
  // jsdom's Blob has no .text(), so read it the long way.
  const sent = (index = 0) =>
    new Promise<Record<string, string>>((resolve, reject) => {
      const blob = beacon.mock.calls[index]?.[1] as Blob;
      const reader = new FileReader();
      reader.onload = () => resolve(JSON.parse(String(reader.result)) as Record<string, string>);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });

  beforeEach(() => {
    beacon.mockClear();
    vi.stubGlobal('navigator', { ...navigator, userAgent: TEST_UA, sendBeacon: beacon });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('bildet den qualifizierten Namen aus Ereignis und Parameter', () => {
    expect(qualifiedCountName('must_eat_reveal_attempt', { result: 'unlocked' })).toBe(
      'must_eat_reveal_unlocked'
    );
    expect(qualifiedCountName('login_start', { method: 'google' })).toBe('login_start_google');
    expect(qualifiedCountName('map_opened', { tier: 'anon' })).toBeNull();
    expect(qualifiedCountName('login_start')).toBeNull();
    // Nur handzahme Werte werden zu Namen — die Route hat eine Allowlist, und
    // ein Parameter mit Sonderzeichen soll gar nicht erst losgeschickt werden.
    expect(qualifiedCountName('login_start', { method: 'Google Login!' })).toBeNull();
  });

  it('schickt Grundname UND qualifizierten Namen', async () => {
    trackEvent('must_eat_reveal_attempt', {
      must_eat_id: 'm1',
      result: 'login_required',
      distance_meters: -1,
    });

    expect(beacon).toHaveBeenCalledTimes(2);
    expect((await sent(0)).event).toBe('must_eat_reveal_attempt');
    expect((await sent(1)).event).toBe('must_eat_reveal_login_required');
  });

  it('laesst Ereignisse ohne Regel bei einem Beacon', () => {
    trackEvent('map_opened', { tier: 'anon' });
    expect(beacon).toHaveBeenCalledTimes(1);
  });
});

describe('eigene Browser senden keine Zähl-Beacons', () => {
  afterEach(() => {
    document.cookie = 'eatthis_nocount=; Max-Age=0; Path=/';
    vi.unstubAllGlobals();
  });
  it('unterdrückt Seiten und Ereignisse mit Ausschluss-Cookie', () => {
    const sendBeacon = vi.fn();
    vi.stubGlobal('navigator', { userAgent: TEST_UA, sendBeacon });
    document.cookie = 'eatthis_nocount=1; Path=/';
    countView();
    countEvent('map_opened');
    expect(sendBeacon).not.toHaveBeenCalled();
  });
  it.each(['localhost', '127.0.0.1', '[::1]'])(
    'unterdrückt lokale Produktionsvorschauen auf %s',
    (hostname) => {
      const sendBeacon = vi.fn();
      vi.stubGlobal('navigator', { userAgent: TEST_UA, sendBeacon });
      vi.stubGlobal('location', { ...window.location, hostname });
      countView();
      countEvent('map_opened');
      expect(sendBeacon).not.toHaveBeenCalled();
    }
  );
});

it('sendet aus lokalen Vorschauen keine Zählereignisse', () => {
  const referrer = vi.spyOn(document, 'referrer', 'get').mockReturnValue('http://127.0.0.1:4178/');
  const beacon = vi.fn();
  vi.stubGlobal('navigator', { userAgent: TEST_UA, sendBeacon: beacon });
  vi.stubGlobal('location', { hostname: 'www.eatthisdot.com', pathname: '/' });
  document.cookie = 'eatthis_nocount=; Max-Age=0; Path=/';
  try {
    countView();
    countEvent('map_opened');
    trackEvent('map_opened');
    expect(beacon).not.toHaveBeenCalled();
  } finally {
    referrer.mockRestore();
    vi.unstubAllGlobals();
  }
});

describe('preview and automation exclusion across every measurement', () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each(['192.168.178.49', '10.0.0.5', '172.16.0.8'])('sends no beacons from %s', (hostname) => {
    const sendBeacon = vi.fn();
    vi.stubGlobal('navigator', { userAgent: TEST_UA, sendBeacon });
    vi.stubGlobal('location', { ...window.location, hostname });
    countView();
    countEvent('map_opened');
    countHome({ home: 'view', device: 'phone' });
    countInsight({ insight: 'signals', device: 'phone', signals: ['view'] });
    expect(sendBeacon).not.toHaveBeenCalled();
  });
  it('excludes WebDriver even with an ordinary browser user agent', () => {
    const sendBeacon = vi.fn();
    vi.stubGlobal('navigator', { userAgent: TEST_UA, webdriver: true, sendBeacon });
    countView();
    countEvent('map_opened');
    countHome({ home: 'view', device: 'phone' });
    countInsight({ insight: 'signals', device: 'phone', signals: ['view'] });
    expect(sendBeacon).not.toHaveBeenCalled();
  });
});
