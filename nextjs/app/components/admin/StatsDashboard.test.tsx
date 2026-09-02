// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatsSummary } from '@/lib/admin/stats.server';

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

/** Eine Auswertung in der Form, die die Route liefert. */
function summary(overrides: Partial<StatsSummary> = {}): StatsSummary {
  return {
    days: [
      { day: '2026-08-30', pageviews: 372, visitors: 91 },
      { day: '2026-08-31', pageviews: 127, visitors: 19 },
    ],
    totals: { pageviews: 8629, visitors: 1147, days: 11, closedDays: 10 },
    accounts: null,
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
    },
    paths: [{ key: '/map', count: 492 }],
    entryPaths: [{ key: '/', count: 96 }],
    referrers: [{ key: 'www.google.com', count: 329 }],
    events: [{ key: 'map_opened', count: 1469 }],
    exits: [{ key: '/map', views: 492, continued: 56, exits: 436, rate: 436 / 492 }],
    exitDays: 4,
    funnels: [
      {
        label: 'Kauf',
        steps: [
          { key: 'locked_spot_opened', count: 187 },
          { key: 'begin_checkout', count: 5 },
          { key: 'purchase', count: 0 },
        ],
      },
    ],
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
}

function respondWith(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('StatsDashboard', () => {
  beforeEach(() => {
    state.user = { uid: 'u1' };
    state.loading = false;
    state.getIdToken.mockReset().mockResolvedValue('token-123');
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

  it('schickt das Admin-Token mit und zeigt die Kennzahlen', async () => {
    const fetchMock = respondWith(summary());
    vi.stubGlobal('fetch', fetchMock);

    render(<StatsDashboard />);

    await waitFor(() => expect(screen.getByText('1.147')).toBeTruthy());
    expect(screen.getByText('8.629')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/stats?days=30', {
      headers: { Authorization: 'Bearer token-123' },
    });
  });

  it('rechnet die Zustimmung gegen Besucher, nicht gegen Einblendungen', async () => {
    // Der Dialog blockiert und erscheint je Besucher mehrfach (hier 3,3 Mal).
    // Gegen die Einblendungen gerechnet stuenden hier 5,0 % statt 16,5 % —
    // dieselbe Wirklichkeit, durch den falschen Nenner geteilt.
    vi.stubGlobal('fetch', respondWith(summary()));

    render(<StatsDashboard />);

    await waitFor(() => expect(screen.getByText('16,5 %')).toBeTruthy());
    expect(screen.getByText(/5,0 %/)).toBeTruthy();
    expect(screen.getByText(/3,3 Mal je Besucher/)).toBeTruthy();
  });

  it('zeigt eine Trichterstufe mit dem Wert null, statt sie zu verschweigen', async () => {
    // Der Kauftrichter endet real bei purchase=0 — genau das ist der Befund.
    vi.stubGlobal('fetch', respondWith(summary()));

    render(<StatsDashboard />);

    await waitFor(() => expect(screen.getByText('Gekauft')).toBeTruthy());
    const row = screen.getByText('Gekauft').closest('div');
    expect(row?.textContent).toContain('0');
  });

  it('benennt die Grundlage der Ausstiegsrechnung', async () => {
    vi.stubGlobal('fetch', respondWith(summary()));

    render(<StatsDashboard />);

    // „4 von 11" steht jetzt auch im Consent-Block — hier gezielt die
    // Ausstiegs-Fussnote greifen.
    await waitFor(() => expect(screen.getByText(/Gerechnet über/)).toBeTruthy());
    expect(screen.getByText(/Gerechnet über/).textContent).toContain('4 von 11');
  });

  it('erklärt die 404 der Route als fehlenden Zugriff, nicht als Fehler', async () => {
    vi.stubGlobal('fetch', respondWith({ error: 'not found' }, 404));

    render(<StatsDashboard />);

    await waitFor(() => expect(screen.getByText(/keinen Zugriff/i)).toBeTruthy());
  });

  it('lädt den gewählten Zeitraum nach', async () => {
    const fetchMock = respondWith(summary());
    vi.stubGlobal('fetch', fetchMock);

    render(<StatsDashboard />);
    await waitFor(() => expect(screen.getByText('1.147')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: '7 Tage' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith('/api/admin/stats?days=7', expect.anything())
    );
  });

  it('stellt den letzten vollen Tag voran und markiert den laufenden getrennt', async () => {
    // Ein laufender Tag als Hauptzahl sähe jeden Morgen wie ein Absturz aus.
    vi.stubGlobal('fetch', respondWith(summary()));

    render(<StatsDashboard />);

    await waitFor(() => expect(screen.getByText('Sonntag, 30.08.')).toBeTruthy());
    // Die Hauptzahl des Blocks, nicht der gleichnamige Balkenwert im Verlauf.
    const karte = screen.getByText('Sonntag, 30.08.').closest('section');
    expect(karte?.querySelector('p')?.textContent).toBe('91');
    expect(screen.getByText(/Heute stehen bisher 19 Besucher/)).toBeTruthy();
  });

  it('zeigt die Richtung gegen Vortag und gegen denselben Wochentag', async () => {
    vi.stubGlobal('fetch', respondWith(summary()));

    render(<StatsDashboard />);

    await waitFor(() => expect(screen.getByText(/zum Vortag/)).toBeTruthy());
    expect(screen.getByText(/zum selben Wochentag/)).toBeTruthy();
    // Beide Werte fielen — der Pfeil muss nach unten zeigen. Das Label sitzt
    // in einem Kind-span, der Pfeil im Elternteil.
    const vortag = screen.getByText(/zum Vortag/).closest('span')?.parentElement;
    expect(vortag?.textContent).toContain('▼');
  });

  it('trennt Besucher und Seitenaufrufe in zwei Verläufe', async () => {
    // Auf gemeinsamer Skala war die Besucherreihe ein Strich am Boden.
    vi.stubGlobal('fetch', respondWith(summary()));

    render(<StatsDashboard />);

    await waitFor(() => expect(screen.getAllByRole('heading', { level: 2 })).toBeTruthy());
    const titel = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titel).toContain('Besucher');
    expect(titel).toContain('Seitenaufrufe');
  });

  it('nennt Gewinner und Verlierer gegenüber der Vorperiode', async () => {
    vi.stubGlobal('fetch', respondWith(summary()));

    render(<StatsDashboard />);

    await waitFor(() => expect(screen.getByText('Veränderungen zur Vorperiode')).toBeTruthy());
    expect(screen.getByText('−208')).toBeTruthy();
    expect(screen.getByText('+8')).toBeTruthy();
  });

  it('lässt den Vorperiodenvergleich weg, wenn es ihn nicht gibt', async () => {
    vi.stubGlobal('fetch', respondWith(summary({ period: null })));

    render(<StatsDashboard />);

    await waitFor(() => expect(screen.getByText('Cookie-Dialog')).toBeTruthy());
    expect(screen.queryByText('Veränderungen zur Vorperiode')).toBeNull();
  });

  it('zeigt die Konten aus Firebase Auth mit Käufen und Checkout-Versuchen', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith(
        summary({
          accounts: {
            total: 6,
            newInWindow: 4,
            activeInWindow: 2,
            google: 4,
            email: 2,
            withFavorites: 3,
            purchases: { total: 4, inWindow: 0 },
            checkouts: { inWindow: 5, open: 5 },
          },
        })
      )
    );

    render(<StatsDashboard />);

    await waitFor(() => expect(screen.getByText('Konten')).toBeTruthy());
    expect(screen.getByText('Konten gesamt').previousElementSibling?.textContent).toBe('6');
    expect(screen.getByText('Aktiv im Zeitraum').previousElementSibling?.textContent).toBe('2');
    expect(screen.getByText(/5 Stripe-Sitzungen angelegt, davon 5 nie abgeschlossen/)).toBeTruthy();
  });

  it('lässt die Konten-Karte weg, wenn die Route keine liefert', async () => {
    vi.stubGlobal('fetch', respondWith(summary({ accounts: null })));

    render(<StatsDashboard />);

    await waitFor(() => expect(screen.getByText('Die Reise')).toBeTruthy());
    expect(screen.queryByText('Konten gesamt')).toBeNull();
  });

  it('rechnet den Tagesschnitt ohne den laufenden Tag', async () => {
    // 1.147 Besucher, davon 19 heute, über 10 volle Tage: 113 — nicht 104
    // über elf, als wäre der halbe Tag ein ganzer.
    vi.stubGlobal('fetch', respondWith(summary()));

    render(<StatsDashboard />);

    await waitFor(() => expect(screen.getByText('Besucher je vollem Tag')).toBeTruthy());
    expect(screen.getByText('Besucher je vollem Tag').previousElementSibling?.textContent).toBe(
      '113'
    );
  });

  it('setzt jede Stufe der Reise ins Verhältnis zu den Besuchern', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith(
        summary({
          // Die Ereignisliste nennt dieselben Namen — hier zaehlt nur die Reise.
          events: [],
          funnels: [
            {
              label: 'Die ganze Reise',
              steps: [
                { key: 'visitors', count: 1147 },
                { key: 'map_opened', count: 1469 },
                { key: 'view_item', count: 595 },
                { key: 'purchase', count: 0 },
              ],
            },
          ],
        })
      )
    );

    render(<StatsDashboard />);

    await waitFor(() => expect(screen.getByText('Karte geöffnet')).toBeTruthy());
    // 1.469 auf 1.147 Besucher: 128 je 100 — Ereignisse, keine Personen.
    const karte = screen.getByText('Karte geöffnet').closest('div');
    expect(karte?.textContent).toContain('128');
    // 595 auf 1.147: 52 je 100. Keine Quote gegen die Stufe davor — /packs
    // feuert `view_item` an jeden, der die Seite direkt oeffnet.
    expect(screen.getByText('Pack-Angebot gesehen').closest('div')?.textContent).toContain('52');
    // `view_item` feuert auf der Pack-Seite, nicht am Spot — so hiess es vorher.
    expect(screen.queryByText('Spot-Detail gesehen')).toBeNull();
  });

  it('bietet an, den eigenen Browser aus den Zahlen zu nehmen', async () => {
    vi.stubGlobal('fetch', respondWith(summary()));
    document.cookie = 'eatthis_nocount=; Max-Age=0; Path=/';

    render(<StatsDashboard />);

    const knopf = await screen.findByRole('button', { name: 'Nicht mitzählen' });
    fireEvent.click(knopf);

    expect(document.cookie).toContain('eatthis_nocount=1');
    expect(screen.getByText(/wird nicht mitgezählt/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Wieder mitzählen' }));
    expect(document.cookie).not.toContain('eatthis_nocount=1');
  });
});
