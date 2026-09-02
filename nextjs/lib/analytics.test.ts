// @vitest-environment jsdom
// GA laeuft seit 28.08.2026 nur noch auf dem Produktions-Host — unter dem
// jsdom-Standard (localhost) wuerde hier nichts mehr laden, und zwar zu Recht.
// @vitest-environment-options { "url": "https://www.eatthisdot.com/" }
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countEvent,
  countView,
  getAnalyticsPageLocation,
  handoffEvent,
  isAnalyticsHost,
  loadAnalytics,
  flushAnalyticsQueue,
  resetReferrerSentForTests,
  trackEvent,
  trackEventOnce,
} from './analytics';
import { CONSENT_VERSION } from './consent';

/* `{ ...navigator }` verliert `userAgent` — der Getter liegt auf dem Prototyp.
 * Der Zaehler schickt ihn im Beacon mit, also muss der Stub ihn tragen. */
const TEST_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/136.0.0.0 Safari/537.36';

describe('analytics consent gate', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    // Consent lives in a cookie now (lib/consent.ts) so the pre-paint
    // bootstrap can read it; the gate reads it from there.
    document.cookie = 'cookieConsent=; Max-Age=0; Path=/';
    delete (window as Window & { gtag?: unknown }).gtag;
    delete (window as Window & { __eatThisAnalyticsQueue?: unknown }).__eatThisAnalyticsQueue;
    vi.stubGlobal('navigator', { ...navigator, userAgent: TEST_UA, sendBeacon: vi.fn(() => true) });
  });

  it('drops events before consent', () => {
    trackEvent('map_opened');
    expect(
      (window as Window & { __eatThisAnalyticsQueue?: unknown[] }).__eatThisAnalyticsQueue
    ).toBeUndefined();
  });

  it('queues after consent and flushes when gtag loads', () => {
    document.cookie = `cookieConsent=accepted.${CONSENT_VERSION}; Path=/`;
    trackEvent('map_opened', { tier: 'anon' });

    const gtag = vi.fn();
    (window as Window & { gtag?: typeof gtag }).gtag = gtag;
    flushAnalyticsQueue();

    expect(gtag).toHaveBeenCalledWith('event', 'map_opened', { tier: 'anon' });
  });

  it('deduplicates session-scoped events', () => {
    document.cookie = `cookieConsent=accepted.${CONSENT_VERSION}; Path=/`;
    const gtag = vi.fn();
    (window as Window & { gtag?: typeof gtag }).gtag = gtag;

    trackEventOnce('purchase_1', 'purchase', { value: 2.99 });
    trackEventOnce('purchase_1', 'purchase', { value: 2.99 });

    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it('hands an event across a hard navigation', () => {
    document.cookie = `cookieConsent=accepted.${CONSENT_VERSION}; Path=/`;
    handoffEvent('sign_up', { method: 'email_link' });

    const appendChild = vi.spyOn(document.head, 'appendChild');
    loadAnalytics();
    const gtag = (window as Window & { gtag?: ReturnType<typeof vi.fn> }).gtag;

    expect(gtag).toBeDefined();
    expect(sessionStorage.getItem('eatthis_analytics_handoff')).toBeNull();
    expect(appendChild).toHaveBeenCalled();
    // Ohne das Zuruecknehmen liefert ein spaeteres vi.spyOn auf dieselbe
    // Methode denselben Mock zurueck — inklusive dieses Aufrufs. Ein Test, der
    // "wurde nicht aufgerufen" prueft, schlaegt dann wegen dieser Zeile fehl.
    appendChild.mockRestore();
  });
});

/* Bis 28.08.2026 lud GA auf jedem Host. Ergebnis: 59 % aller Sitzungen ueber
 * 90 Tage kamen aus der Entwicklung oder vom Staging, und jede ungefilterte
 * GA-Zahl — auch jede im GA4-Webinterface — war damit falsch. */
describe('GA laeuft nur auf dem Produktions-Host', () => {
  it.each([
    ['www.eatthisdot.com', true],
    ['eatthisdot.com', true],
    ['localhost', false],
    ['127.0.0.1', false],
    ['192.168.178.49', false],
    ['eat-this-staging--eat-this-staging-8a13b.us-central1.hosted.app', false],
  ])('%s -> %s', (host, expected) => {
    expect(isAnalyticsHost(host)).toBe(expected);
  });

  beforeEach(() => {
    // gtag und die Warteschlange ueberleben sonst aus dem Block darueber.
    document.cookie = 'cookieConsent=; Max-Age=0; Path=/';
    delete (window as Window & { gtag?: unknown }).gtag;
    delete (window as Window & { __eatThisAnalyticsQueue?: unknown }).__eatThisAnalyticsQueue;
  });

  // stubGlobal statt spyOn(window,'location'): jsdoms location ist nicht
  // ersetzbar, und ein Spy darauf laesst sich nicht sauber zuruecknehmen — er
  // friert die URL fuer alle folgenden Tests der Datei auf '/' ein.
  afterEach(() => vi.unstubAllGlobals());

  function onHost(hostname: string) {
    vi.stubGlobal('location', { ...window.location, hostname });
  }

  it('laedt kein GA auf einem fremden Host, auch mit Zustimmung', () => {
    document.cookie = `cookieConsent=accepted.${CONSENT_VERSION}; Path=/`;
    const appendChild = vi.spyOn(document.head, 'appendChild');
    // Staging faehrt einen Produktions-Build; nur der Host unterscheidet.
    onHost('eat-this-staging--eat-this-staging-8a13b.us-central1.hosted.app');

    loadAnalytics();

    expect(appendChild, 'kein gtag-Skript auf Staging').not.toHaveBeenCalled();
    expect((window as Window & { gtag?: unknown }).gtag).toBeUndefined();
    appendChild.mockRestore();
  });

  it('sammelt auf einem fremden Host auch keine Warteschlange an', () => {
    document.cookie = `cookieConsent=accepted.${CONSENT_VERSION}; Path=/`;
    onHost('localhost');

    trackEvent('map_opened');
    trackEvent('map_opened');

    // Ohne diesen Riegel waechst die Queue auf Staging unbegrenzt: Zustimmung
    // liegt vor, gtag kommt nie.
    expect(
      (window as Window & { __eatThisAnalyticsQueue?: unknown[] }).__eatThisAnalyticsQueue
    ).toBeUndefined();
  });
});

describe('getAnalyticsPageLocation', () => {
  it('removes Stripe session IDs from page views but preserves other params', () => {
    expect(
      getAnalyticsPageLocation(
        'https://www.eatthisdot.com/checkout/success?session_id=cs_secret&utm_source=stripe'
      )
    ).toEqual({
      pageLocation: 'https://www.eatthisdot.com/checkout/success?utm_source=stripe',
      pagePath: '/checkout/success?utm_source=stripe',
    });
  });

  /* /welcome wird seit 28.08.2026 mitgezaehlt, und die Route traegt den
   * Firebase-Action-Link in der URL. `oobCode` ist ein einloesbares
   * Anmelde-Token: stuende es im page_location, laege ein Login-Code in
   * Googles Berichten. */
  it('entfernt den Magic-Link-Code aus der /welcome-URL', () => {
    const { pageLocation, pagePath } = getAnalyticsPageLocation(
      'https://www.eatthisdot.com/welcome?mode=signIn&oobCode=AbC_secret123' +
        '&apiKey=AIzaSyKEY&continueUrl=https%3A%2F%2Fwww.eatthisdot.com%2F%3Fme%3Dspot1&lang=de'
    );

    for (const secret of ['AbC_secret123', 'AIzaSyKEY', 'me%3Dspot1']) {
      expect(pageLocation, `${secret} darf nicht zu Google`).not.toContain(secret);
      expect(pagePath, `${secret} darf nicht zu Google`).not.toContain(secret);
    }
    // Was harmlos ist, bleibt stehen — sonst verliert der Bericht den Kontext.
    expect(pagePath).toBe('/welcome?mode=signIn&lang=de');
  });
});

/* The consent-free counter. Its whole value is that it does NOT depend on the
 * answer to the cookie question — if any of this starts checking consent, the
 * numbers go back to being a third of the truth. */
describe('consent-free counting', () => {
  let beacon: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.cookie = 'cookieConsent=; Max-Age=0; Path=/';
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

  it.each([
    ['no answer yet', ''],
    ['declined', `cookieConsent=declined.${CONSENT_VERSION}; Path=/`],
    ['accepted', `cookieConsent=accepted.${CONSENT_VERSION}; Path=/`],
  ])('counts a page view when consent is %s', async (_label, cookie) => {
    if (cookie) document.cookie = cookie;

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

  it('fans a tracked event out to the counter without consent', async () => {
    trackEvent('map_opened', { tier: 'anon' });

    expect(beacon, 'the counter runs before the consent gate').toHaveBeenCalledTimes(1);
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

    // Reading or writing the device is the one thing that would put this
    // endpoint behind the consent dialog (TDDDG 25).
    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    setItem.mockRestore();
    getItem.mockRestore();
  });

  /* Der Magic-Link-Abschluss (welcome/page.tsx) laeuft ueber handoffEvent,
   * weil danach eine harte Navigation folgt und GA erst auf der Zielseite
   * laedt. Bis 29.08.2026 stand `!gaEnabled()` dort VOR allem anderen — der
   * Hauptweg in ein Konto war damit nur fuer Zustimmende sichtbar, also fuer
   * die Minderheit, deretwegen dieser Zaehler ueberhaupt existiert. */
  it.each([
    ['no answer yet', ''],
    ['declined', `cookieConsent=declined.${CONSENT_VERSION}; Path=/`],
  ])('counts a handed-off sign_up when consent is %s', async (_label, cookie) => {
    if (cookie) document.cookie = cookie;

    handoffEvent('sign_up', { method: 'email_link' });

    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0][0]).toBe('/api/count');
    expect((await sent()).event).toBe('sign_up');
  });

  /* Der Zaehler faehrt NICHT im Handoff mit: sendBeacon ueberlebt die
   * Navigation, ein zweites Zaehlen auf der Zielseite waere eine Dopplung. */
  it('does not put the count into the handoff storage', () => {
    document.cookie = `cookieConsent=accepted.${CONSENT_VERSION}; Path=/`;

    handoffEvent('login', { method: 'email_link' });

    const stored = JSON.parse(sessionStorage.getItem('eatthis_analytics_handoff') ?? '[]');
    expect(stored).toHaveLength(1);
    expect(beacon).toHaveBeenCalledTimes(1);
  });

  it('stays silent when the browser has no sendBeacon and no fetch', () => {
    vi.stubGlobal('navigator', { ...navigator, userAgent: TEST_UA, sendBeacon: undefined });
    vi.stubGlobal('fetch', () => {
      throw new Error('no fetch here');
    });

    expect(() => countView()).not.toThrow();
  });
});
