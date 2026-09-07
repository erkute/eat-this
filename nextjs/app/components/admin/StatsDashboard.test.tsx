// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Accounts, StatsSummary } from '@/lib/admin/stats.server';
import type { SearchSummary } from '@/lib/admin/searchConsole';

const state = vi.hoisted(() => ({
  user: null as { uid: string } | null,
  loading: false,
  getIdToken: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: state.user, loading: state.loading }),
}));

vi.mock('@/lib/firebase/config', () => ({
  auth: {
    get currentUser() {
      return state.user ? { getIdToken: state.getIdToken } : null;
    },
  },
}));

import StatsDashboard from './StatsDashboard';

const step = (key: string, count: number, visitors = 1147) => ({
  key,
  count,
  share: visitors > 0 ? count / visitors : 0,
});

function accounts(overrides: Partial<Accounts> = {}): Accounts {
  return {
    total: 56,
    newInWindow: 4,
    activeInWindow: 9,
    active: { day: 1, week: 3, month: 7 },
    google: 30,
    email: 26,
    withFavorites: 12,
    starterPacks: { total: 5, inWindow: 3 },
    reveals: { total: 93, inWindow: 6 },
    referrals: { total: 2, inWindow: 1 },
    purchases: {
      total: 4,
      inWindow: 1,
      byPack: [
        { packId: 'all-berlin', name: 'All Berlin', count: 1, revenueCents: 999 },
        { packId: 'category-pizza', name: 'Pizza', count: 3, revenueCents: 897 },
      ],
    },
    revenue: { totalCents: 1896, inWindowCents: 299 },
    checkouts: { inWindow: 5, open: 4, completed: 1 },
    people: { accounts: 56, withStarterPack: 5, withReveal: 9, withReferral: 2, buyers: 2 },
    byDay: [
      {
        day: '2026-08-30',
        newAccounts: 2,
        starterPacks: 2,
        reveals: 4,
        referrals: 1,
        purchases: 1,
        revenueCents: 299,
      },
      {
        day: '2026-08-31',
        newAccounts: 1,
        starterPacks: 1,
        reveals: 2,
        referrals: 0,
        purchases: 0,
        revenueCents: 0,
      },
    ],
    ...overrides,
  };
}

function search(): SearchSummary {
  return {
    property: 'sc-domain:eatthisdot.com',
    range: { start: '2026-08-06', end: '2026-09-02', days: 28 },
    totals: { clicks: 303, impressions: 54472, ctr: 0.0056, position: 12.9 },
    before: { clicks: 195, impressions: 29732, ctr: 0.0066, position: 11.7 },
    days: [
      { day: '2026-09-01', clicks: 24, impressions: 4242, ctr: 0.0057, position: 12.6 },
      { day: '2026-09-02', clicks: 23, impressions: 4225, ctr: 0.0054, position: 12.5 },
    ],
    queries: [{ key: 'bari berlin menu', clicks: 9, impressions: 106, ctr: 0.0849, position: 5.2 }],
    pages: [
      { key: '/en/kategorie/lunch', clicks: 24, impressions: 2650, ctr: 0.0091, position: 10.3 },
    ],
    opportunities: [
      { key: 'gemello berlin', clicks: 2, impressions: 983, ctr: 0.002, position: 6.7 },
    ],
    devices: [{ key: 'MOBILE', clicks: 250, impressions: 40000, ctr: 0.006, position: 12 }],
    countries: [{ key: 'deu', clicks: 280, impressions: 50000, ctr: 0.0056, position: 12.5 }],
    movers: {
      rising: [
        {
          key: 'bari berlin menu',
          clicks: 9,
          clicksBefore: 2,
          impressions: 106,
          impressionsBefore: 40,
          position: 5.2,
          positionBefore: 8,
          diff: 7,
        },
      ],
      falling: [],
    },
    latestDay: {
      day: '2026-09-02',
      totals: { clicks: 23, impressions: 4225, ctr: 0.0054, position: 12.5 },
      queries: [{ key: 'frische suche', clicks: 3, impressions: 30, ctr: 0.1, position: 4 }],
      pages: [{ key: '/map', clicks: 5, impressions: 200, ctr: 0.025, position: 7 }],
    },
    previousDay: null,
    fetchedAt: '2026-09-03T20:00:00.000Z',
  };
}

/** Eine Auswertung in der Form, die die Route liefert. */
function summary(overrides: Partial<StatsSummary> = {}): StatsSummary {
  const events = new Map<string, number>([
    ['map_opened', 1469],
    ['must_eat_opened', 210],
    ['must_eat_reveal_login_required', 40],
    ['login_view', 60],
    ['login_start', 20],
    ['login', 7],
    ['sign_up', 5],
    ['starter_pack_granted', 5],
    ['must_eat_reveal_unlocked', 3],
    ['begin_checkout', 5],
    ['purchase', 0],
  ]);
  const count = (key: string) => events.get(key) ?? 0;
  const funnel: StatsSummary['funnel'] = {
    stages: [
      {
        key: 'free',
        title: 'Frei',
        offer: 'Alle Spots, 5 Karten offen',
        steps: [
          step('visitors', 1147),
          step('map_opened', 1469),
          step('restaurant_opened', 0),
          step('must_eat_opened', 210),
        ],
      },
      {
        key: 'account',
        title: 'Konto',
        offer: '+20 Karten, 10 davon offen',
        steps: [
          step('must_eat_reveal_login_required', 40),
          step('login_view', 60),
          step('login_start', 20),
          step('signed_in', 12),
          step('sign_up', 5),
          step('starter_pack_granted', 5),
        ],
      },
      {
        key: 'onsite',
        title: 'Vor Ort',
        offer: 'Ein Rücken geht im 50-m-Radius auf',
        steps: [step('must_eat_reveal_unlocked', 3), step('must_eat_reveal_too_far', 0)],
      },
      {
        key: 'packs',
        title: 'Packs',
        offer: 'Alle Karten einer Kategorie, oder All Berlin',
        steps: [
          step('packs_page', 30),
          step('view_item', 187),
          step('begin_checkout', 5),
          step('purchase', 0),
        ],
      },
    ],
    rates: [
      { key: 'visit_map', from: 'visitors', to: 'map_opened', now: 1469, base: 1147, rate: 1.28 },
      {
        key: 'login_view_signed',
        from: 'login_view',
        to: 'signed_in',
        now: 12,
        base: 60,
        rate: 0.2,
      },
      {
        key: 'checkout_purchase',
        from: 'begin_checkout',
        to: 'purchase',
        now: 0,
        base: 5,
        rate: 0,
      },
      { key: 'visit_purchase', from: 'visitors', to: 'purchase', now: 0, base: 1147, rate: 0 },
    ],
  };
  const dayOf = (
    day: string,
    visitors: number,
    pageviews: number
  ): NonNullable<StatsSummary['dayDetails']['latest']> => ({
    day,
    visitors,
    pageviews,
    vsPrevDay: {
      visitors: { now: visitors, before: 123, change: -0.26 },
      pageviews: { now: pageviews, before: 873, change: -0.57 },
    },
    vsSameWeekday: {
      visitors: { now: visitors, before: 135, change: -0.33 },
      pageviews: { now: pageviews, before: 1232, change: -0.7 },
    },
    paths: [{ key: '/map', count: 40 }],
    entryPaths: [{ key: '/', count: 20 }],
    referrers: [{ key: 'www.google.com', count: 12 }],
    events: [...events.entries()].map(([key, c]) => ({ key, count: c })),
    exits: [{ key: '/map', views: 40, continued: 10, exits: 30, rate: 0.75 }],
    hasExits: true,
    funnel,
    people: {
      day,
      newAccounts: 2,
      starterPacks: 2,
      reveals: 4,
      referrals: 1,
      purchases: 1,
      revenueCents: 299,
    },
  });

  return {
    range: {
      start: '2026-08-02',
      end: '2026-08-31',
      days: 30,
      today: '2026-08-31',
      includesToday: true,
    },
    days: [
      { day: '2026-08-30', pageviews: 372, visitors: 91 },
      { day: '2026-08-31', pageviews: 127, visitors: 19 },
    ],
    previousDays: [
      { day: '2026-07-31', pageviews: 300, visitors: 80 },
      { day: '2026-08-01', pageviews: 310, visitors: 85 },
    ],
    eventsByDay: [
      { day: '2026-08-30', counts: { map_opened: 1000, sign_up: 3 } },
      { day: '2026-08-31', counts: { map_opened: 469, sign_up: 2 } },
    ],
    totals: { pageviews: 8629, visitors: 1147, days: 11, closedDays: 10 },
    accounts: accounts(),
    deck: {
      cards: 26,
      publicCards: 5,
      spots: 465,
      freeCards: 5,
      starterCards: 20,
      starterFaceUp: 10,
      byCategory: [
        {
          slug: 'lunch',
          name: 'Lunch',
          cards: 11,
          spots: 194,
          packId: 'category-lunch',
          sellable: true,
        },
        {
          slug: 'fine-dining',
          name: 'Fine Dining',
          cards: 0,
          spots: 51,
          packId: 'category-finedining',
          sellable: false,
        },
      ],
    },
    search: { ok: true, data: search() },
    latest: {
      day: { day: '2026-08-30', pageviews: 372, visitors: 91 },
      vsPrevDay: {
        visitors: { now: 91, before: 123, change: -0.26 },
        pageviews: { now: 372, before: 873, change: -0.574 },
      },
      vsSameWeekday: {
        visitors: { now: 91, before: 135, change: -0.326 },
        pageviews: { now: 372, before: 1232, change: -0.698 },
      },
    },
    today: { day: '2026-08-31', pageviews: 127, visitors: 19 },
    period: {
      visitors: { now: 104, before: 82, change: 0.274 },
      pageviews: { now: 784, before: 636, change: 0.233 },
      days: 11,
      daysNow: 11,
    },
    weekdays: [
      { index: 0, visitors: 226, pageviews: 1604, days: 2 },
      { index: 1, visitors: 73, pageviews: 763, days: 1 },
    ],
    movers: {
      paths: [{ key: '/map', now: 492, before: 700, diff: -208 }],
      referrers: [{ key: 'chatgpt.com', now: 8, before: 0, diff: 8 }],
      events: [{ key: 'sign_up', now: 5, before: 2, diff: 3 }],
    },
    paths: [{ key: '/map', count: 492 }],
    entryPaths: [{ key: '/', count: 96 }],
    referrers: [{ key: 'www.google.com', count: 329 }],
    events: [...events.entries()].map(([key, c]) => ({ key, count: c })),
    exits: [{ key: '/map', views: 492, continued: 56, exits: 436, rate: 436 / 492 }],
    exitDays: 4,
    funnel,
    dayDetails: { today: dayOf('2026-08-31', 19, 127), latest: dayOf('2026-08-30', 91, 372) },
    consent: {
      shown: 1139,
      accepted: 57,
      declined: 44,
      visitors: 346,
      days: 4,
      rate: 57 / 346,
      ratePerView: 57 / 1139,
      viewsPerVisitor: 1139 / 346,
    },
    ...overrides,
  };
  void count;
}

function respondWith(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

/** Einen Bericht in der Seitenleiste öffnen. */
function openReport(label: string) {
  const nav = screen.getByRole('navigation', { name: 'Berichte' });
  fireEvent.click(within(nav).getByRole('button', { name: new RegExp(`^${label}`) }));
}

describe('StatsDashboard', () => {
  beforeEach(() => {
    state.user = { uid: 'u1' };
    state.loading = false;
    state.getIdToken.mockReset().mockResolvedValue('token-123');
    window.location.hash = '';
    vi.stubGlobal('scrollTo', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('fordert zur Anmeldung auf, solange niemand angemeldet ist', () => {
    state.user = null;
    const fetchMock = respondWith({});
    vi.stubGlobal('fetch', fetchMock);

    render(<StatsDashboard />);

    expect(screen.getByText(/bitte anmelden/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('schickt das Admin-Token mit und zeigt die Kennzahlen der Übersicht', async () => {
    const fetchMock = respondWith(summary());
    vi.stubGlobal('fetch', fetchMock);

    render(<StatsDashboard />);

    await waitFor(() => expect(screen.getAllByText('1.147').length).toBeGreaterThan(0));
    expect(screen.getByText('8.629')).toBeTruthy();
    expect(
      screen.getByText('Umsatz', { selector: 'span[class*="kpiLabel"]' }).nextElementSibling
        ?.textContent
    ).toBe('2,99\u00a0€');
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/stats?days=30', {
      headers: { Authorization: `Bearer token-123` },
    });
  });

  it('erklärt die 404 der Route als fehlenden Zugriff, nicht als Fehler', async () => {
    vi.stubGlobal('fetch', respondWith({ error: 'not found' }, 404));

    render(<StatsDashboard />);

    await waitFor(() => expect(screen.getByText(/keinen Zugriff/i)).toBeTruthy());
  });

  it('lädt den gewählten Zeitraum nach — Vorgabe und eigenes Fenster', async () => {
    const fetchMock = respondWith(summary());
    vi.stubGlobal('fetch', fetchMock);

    render(<StatsDashboard />);
    await waitFor(() => expect(screen.getAllByText('1.147').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: '7 Tage' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith('/api/admin/stats?days=7', expect.anything())
    );

    fireEvent.change(screen.getByLabelText('Von'), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText('Bis'), { target: { value: '2026-08-15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zeitraum' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        '/api/admin/stats?from=2026-08-01&to=2026-08-15',
        expect.anything()
      )
    );
  });

  it('stellt den letzten vollen Tag voran und markiert den laufenden getrennt', async () => {
    vi.stubGlobal('fetch', respondWith(summary()));

    render(<StatsDashboard />);

    await waitFor(() => expect(screen.getByText('Sonntag, 30.08.')).toBeTruthy());
    const karte = screen.getByText('Sonntag, 30.08.').closest('section');
    expect(karte?.querySelector('p[class*="big"]')?.textContent).toContain('91');
    expect(screen.getByText(/Heute bisher 19 Besucher/)).toBeTruthy();
    expect(screen.getByText(/zum Vortag/).closest('span')?.parentElement?.textContent).toContain(
      '▼'
    );
  });

  it('breitet heute und gestern nebeneinander aus, mit der Suche des frischesten Tages', async () => {
    vi.stubGlobal('fetch', respondWith(summary()));

    render(<StatsDashboard />);
    await waitFor(() => expect(screen.getAllByText('1.147').length).toBeGreaterThan(0));
    openReport('Heute & Gestern');

    const heute = await screen.findByRole('region', { name: 'Montag, 31.08.' });
    expect(within(heute).getByText('läuft noch')).toBeTruthy();
    expect(
      within(heute).getAllByText('Konto angelegt')[0].previousElementSibling?.textContent
    ).toBe('5');
    const gestern = screen.getByRole('region', { name: 'Sonntag, 30.08.' });
    expect(within(gestern).getByText('abgeschlossen')).toBeTruthy();
    // Die Firestore-Zahlen des Tages haengen mit dran.
    expect(within(gestern).getByText('Neue Konten').previousElementSibling?.textContent).toBe('2');
    // Der frischeste Tag der Search Console mit seinen Suchbegriffen.
    expect(screen.getByText('frische suche')).toBeTruthy();
    expect(screen.getByText('Mittwoch, 02.09.')).toBeTruthy();
  });

  it('zeigt den Trichter in vier Stufen und behält leere Stufen', async () => {
    vi.stubGlobal('fetch', respondWith(summary()));

    render(<StatsDashboard />);
    await waitFor(() => expect(screen.getAllByText('1.147').length).toBeGreaterThan(0));
    openReport('Funnel');

    expect(await screen.findByText('Die Reise in vier Stufen')).toBeTruthy();
    expect(screen.getByText('+20 Karten, 10 davon offen')).toBeTruthy();
    // purchase=0 ist der Befund, nicht eine Luecke.
    const row = screen.getByText('Gekauft').closest('div');
    expect(row?.textContent).toContain('0');
    // Personen statt Ereignisse, aus Firestore.
    expect(screen.getByText('haben gekauft').closest('li')?.textContent).toContain('2');
  });

  it('zeigt Karten, Konten und den Stapel je Kategorie', async () => {
    vi.stubGlobal('fetch', respondWith(summary()));

    render(<StatsDashboard />);
    await waitFor(() => expect(screen.getAllByText('1.147').length).toBeGreaterThan(0));
    openReport('Karten & Konten');

    expect(await screen.findByText('Karten je Kategorie')).toBeTruthy();
    expect(screen.getByText('Fine Dining').closest('tr')?.textContent).toContain('leer');
    expect(screen.getByText('Lunch').closest('tr')?.textContent).toContain('käuflich');
    expect(screen.getByText('Aktiv 7 Tage').nextElementSibling?.textContent).toBe('3');
  });

  it('rechnet den Umsatz zum Katalogpreis und zeigt ihn je Pack', async () => {
    vi.stubGlobal('fetch', respondWith(summary()));

    render(<StatsDashboard />);
    await waitFor(() => expect(screen.getAllByText('1.147').length).toBeGreaterThan(0));
    openReport('Umsatz');

    expect(await screen.findByText('Umsatz insgesamt')).toBeTruthy();
    expect(screen.getByText('Umsatz insgesamt').nextElementSibling?.textContent).toBe(
      '18,96\u00a0€'
    );
    expect(screen.getByText('All Berlin').closest('tr')?.textContent).toContain('9,99');
  });

  it('zeigt die Google-Suche mit Anfragen, Geräten, Ländern und Bewegungen', async () => {
    vi.stubGlobal('fetch', respondWith(summary()));

    render(<StatsDashboard />);
    await waitFor(() => expect(screen.getAllByText('1.147').length).toBeGreaterThan(0));
    openReport('Google-Suche');

    expect(await screen.findByText('Welche Suche funktioniert')).toBeTruthy();
    expect(screen.getAllByText('bari berlin menu').length).toBeGreaterThan(0);
    expect(screen.getByText('Telefon')).toBeTruthy();
    expect(screen.getByText('Deutschland')).toBeTruthy();
    expect(screen.getByText('+7')).toBeTruthy();
    expect(screen.getByText('gemello berlin')).toBeTruthy();
  });

  it('nennt bei fehlendem Zugang das freizuschaltende Dienstkonto', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith(
        summary({
          search: { ok: false, reason: 'no-access', identity: 'sa@eat-this.iam', message: '403' },
        })
      )
    );

    render(<StatsDashboard />);
    await waitFor(() => expect(screen.getAllByText('1.147').length).toBeGreaterThan(0));
    openReport('Google-Suche');

    expect(await screen.findByText('sa@eat-this.iam')).toBeTruthy();
  });

  it('rechnet die Zustimmung gegen Besucher, nicht gegen Einblendungen', async () => {
    vi.stubGlobal('fetch', respondWith(summary()));

    render(<StatsDashboard />);
    await waitFor(() => expect(screen.getAllByText('1.147').length).toBeGreaterThan(0));
    openReport('Cookie-Dialog');

    // 57 von 346 Besuchern = 16,5 %; je Einblendung waeren es 5,0 % — die
    // Zahl steht dabei, aber als das, was sie ist.
    expect((await screen.findAllByText('16,5 %')).length).toBeGreaterThan(0);
    expect(
      screen.getByText('Zustimmungen je Einblendung').previousElementSibling?.textContent
    ).toBe('5,0 %');
    expect(screen.getByText(/lehnen ab/)).toBeTruthy();
  });

  it('listet jedes Ereignis mit Anteil und Bewegung', async () => {
    vi.stubGlobal('fetch', respondWith(summary()));

    render(<StatsDashboard />);
    await waitFor(() => expect(screen.getAllByText('1.147').length).toBeGreaterThan(0));
    openReport('Ereignisse');

    const row = (await screen.findByText('Konto angelegt')).closest('tr');
    expect(row?.textContent).toContain('+3');
  });

  it('öffnet den Bericht aus dem Hash', async () => {
    window.location.hash = '#content';
    vi.stubGlobal('fetch', respondWith(summary()));

    render(<StatsDashboard />);

    expect(await screen.findByText('Wo Besuche enden')).toBeTruthy();
    expect(screen.getByText(/^Über 4 von 11 Tagen/)).toBeTruthy();
  });
});
