import { describe, expect, it } from 'vitest';
import {
  buildFunnel,
  daysBetween,
  eachDay,
  packPriceCents,
  sinceDay,
  summarize,
  summarizeAccounts,
  summarizeDeck,
  weekdayOf,
  type AccountRecord,
  type AccountsInput,
  type DailyDoc,
} from './stats.server';

/** Der Rollout-Tag der neuen Felder plus der erste volle Tag danach — genau
 *  die Mischung, die im Katalog wirklich liegt: der 28.08.2026 traegt
 *  `continuations` und den Dialog, aber nur fuer den Abend. */
function docs(): DailyDoc[] {
  return [
    {
      day: '2026-08-28',
      pageviews: 100,
      visitors: 20,
      paths: { '/': 60, '/map': 40 },
      continuations: { '/': 2 },
      referrers: { www_google_com: 5 },
      events: { map_opened: 10, consent_gate_shown: 20, consent_accepted: 1 },
    },
    {
      day: '2026-08-29',
      pageviews: 50,
      visitors: 10,
      paths: { '/': 30, '/map': 20 },
      entryPaths: { '/': 8 },
      continuations: { '/': 25 },
      referrers: { www_google_com: 2, chatgpt_com: 3 },
      events: { map_opened: 5, consent_gate_shown: 10, consent_accepted: 2, purchase: 0 },
    },
  ];
}

describe('summarize', () => {
  it('summiert Aufrufe und Besucher und sortiert die Tage aufsteigend', () => {
    const result = summarize([docs()[1], docs()[0]]);

    expect(result.days.map((d) => d.day)).toEqual(['2026-08-28', '2026-08-29']);
    expect(result.totals).toEqual({ pageviews: 150, visitors: 30, days: 2, closedDays: 2 });
    // Ohne Angabe spannt sich das Fenster über die Dokumente.
    expect(result.range).toMatchObject({ start: '2026-08-28', end: '2026-08-29', days: 2 });
  });

  it('rechnet Ausstiege NUR über volle Tage mit continuations', () => {
    const result = summarize(docs());

    // Der 28. trägt continuations — aber nur für den Abend, das Feld ging an
    // diesem Tag live. Zählte er mit, wären es 90 Aufrufe für "/" und 63
    // Ausstiege: jeder Aufruf des Vormittags sähe wie ein Ausstieg aus.
    expect(result.exitDays).toBe(1);
    const home = result.exits.find((e) => e.key === '/');
    expect(home).toEqual({ key: '/', views: 30, continued: 25, exits: 5, rate: 5 / 30 });
  });

  it('klemmt negative Ausstiege auf null', () => {
    const result = summarize([
      { day: '2026-08-29', paths: { '/map': 3 }, continuations: { '/map': 9 } },
    ]);

    expect(result.exits[0]).toMatchObject({ key: '/map', exits: 0, rate: 0 });
  });

  it('stellt die Punkte in Referrer-Hosts wieder her', () => {
    const result = summarize(docs());

    expect(result.referrers).toEqual([
      { key: 'www.google.com', count: 7 },
      { key: 'chatgpt.com', count: 3 },
    ]);
  });

  it('legt jedes Ereignis je Tag ab — damit das Brett jede Reihe zeichnen kann', () => {
    const result = summarize(docs());

    expect(result.eventsByDay).toEqual([
      {
        day: '2026-08-28',
        counts: { map_opened: 10, consent_gate_shown: 20, consent_accepted: 1 },
      },
      {
        day: '2026-08-29',
        counts: { map_opened: 5, consent_gate_shown: 10, consent_accepted: 2, purchase: 0 },
      },
    ]);
  });

  it('rechnet die Zustimmung gegen Besucher, nicht gegen Einblendungen', () => {
    const result = summarize(docs());

    // Nur der 29.: der 28. zaehlte den Dialog erst ab dem Abend, seine 20
    // Besucher waren groesstenteils nie gefragt.
    expect(result.consent).toEqual({
      shown: 10,
      accepted: 2,
      declined: 0,
      visitors: 10,
      days: 1,
      rate: 0.2,
      ratePerView: 0.2,
      viewsPerVisitor: 1,
    });
  });

  it('nimmt als Nenner nur die Besucher der Tage, die den Dialog ganztägig zählen', () => {
    const result = summarize([
      { day: '2026-08-27', visitors: 500 },
      { day: '2026-08-28', visitors: 400, events: { consent_gate_shown: 30, consent_accepted: 1 } },
      {
        day: '2026-08-29',
        visitors: 100,
        events: { consent_gate_shown: 300, consent_accepted: 20 },
      },
    ]);

    expect(result.consent.visitors).toBe(100);
    expect(result.consent.days).toBe(1);
    expect(result.consent.rate).toBe(0.2);
    expect(result.consent.viewsPerVisitor).toBe(3);
  });

  it('liefert keine Zustimmungsquote ohne Nenner', () => {
    const result = summarize([{ day: '2026-08-29', events: { consent_accepted: 4 } }]);

    expect(result.consent.rate).toBeNull();
    expect(result.consent.ratePerView).toBeNull();
  });

  it('übersteht fehlende und unbrauchbare Zählfelder', () => {
    const result = summarize([
      { day: '2026-08-29' },
      { day: '2026-08-30', pageviews: Number.NaN, paths: { '/': Number.NaN, '/map': 2 } },
    ]);

    expect(result.totals).toEqual({ pageviews: 0, visitors: 0, days: 2, closedDays: 2 });
    expect(result.paths).toEqual([{ key: '/map', count: 2 }]);
  });

  it('gibt für eine leere Sammlung eine leere Auswertung zurück', () => {
    const result = summarize([]);

    expect(result.totals).toEqual({ pageviews: 0, visitors: 0, days: 0, closedDays: 0 });
    expect(result.accounts).toBeNull();
    expect(result.deck).toBeNull();
    expect(result.exits).toEqual([]);
    expect(result.consent.rate).toBeNull();
    expect(result.dayDetails).toEqual({ today: null, latest: null });
  });
});

describe('buildFunnel — die vier Stufen des Produkts', () => {
  const events = new Map<string, number>([
    ['map_opened', 50],
    ['must_eat_opened', 20],
    ['must_eat_reveal_login_required', 8],
    ['login_view', 10],
    ['login', 3],
    ['sign_up', 2],
    ['starter_pack_granted', 2],
    ['must_eat_reveal_unlocked', 1],
    ['begin_checkout', 4],
    ['purchase', 1],
  ]);
  const paths = new Map<string, number>([
    ['/packs', 6],
    ['/en/packs', 2],
    ['/pack/category-pizza', 3],
    ['/en/pack/all-berlin', 1],
    ['/packs/irgendwas', 99], // kein Treffer: weder Übersicht noch Pack-Seite
  ]);

  it('führt von frei über Konto und vor Ort zu den Packs und behält leere Stufen', () => {
    // Die Reise endet real oft bei purchase=0. Eine Stufe wegzulassen, weil
    // sie leer ist, versteckt genau den Befund.
    const funnel = buildFunnel(events, paths, 100);

    expect(funnel.stages.map((s) => s.key)).toEqual(['free', 'account', 'onsite', 'packs']);
    expect(funnel.stages[0].steps[0]).toEqual({ key: 'visitors', count: 100, share: 1 });
    expect(funnel.stages[1].offer).toBe('+20 Karten, 10 davon offen');
    const onsite = funnel.stages[2].steps;
    expect(onsite.find((s) => s.key === 'must_eat_reveal_too_far')).toEqual({
      key: 'must_eat_reveal_too_far',
      count: 0,
      share: 0,
    });
  });

  it('zählt Magic Link und Google als eine Anmelde-Stufe', () => {
    const account = buildFunnel(events, paths, 100).stages[1].steps;

    expect(account.find((s) => s.key === 'signed_in')?.count).toBe(5);
    expect(account.find((s) => s.key === 'sign_up')?.count).toBe(2);
  });

  it('liest Pack-Übersicht und Pack-Seiten aus den Aufrufen, in beiden Sprachen', () => {
    const packs = buildFunnel(events, paths, 100).stages[3].steps;

    expect(packs.find((s) => s.key === 'packs_page')?.count).toBe(8);
    expect(packs.find((s) => s.key === 'pack_page')?.count).toBe(4);
  });

  it('rechnet Quoten nur zwischen Stufen, die aufeinander folgen — und null ohne Basis', () => {
    const funnel = buildFunnel(events, paths, 100);
    const rate = (key: string) => funnel.rates.find((r) => r.key === key);

    expect(rate('visit_map')).toEqual({
      key: 'visit_map',
      from: 'visitors',
      to: 'map_opened',
      now: 50,
      base: 100,
      rate: 0.5,
    });
    expect(rate('checkout_purchase')?.rate).toBe(0.25);
    // Keine Quote auf starter_pack_granted: das Pack geht auch an Altkonten
    // bei ihrer naechsten Anmeldung, sign_up ist nicht seine Basis.
    expect(funnel.rates.map((r) => r.key)).not.toContain('signed_starter');
    expect(funnel.rates.some((r) => r.to === 'starter_pack_granted')).toBe(false);
    expect(buildFunnel(new Map(), new Map(), 0).rates.every((r) => r.rate === null)).toBe(true);
  });

  it('nimmt die Besucher als Anteil, nie die Vorstufe', () => {
    // 4 Checkouts bei 100 Besuchern: 4 %, nicht 4/3 der Pack-Seiten.
    const packs = buildFunnel(events, paths, 100).stages[3].steps;
    expect(packs.find((s) => s.key === 'begin_checkout')?.share).toBe(0.04);
  });
});

describe('Kalender', () => {
  it('sinceDay nimmt den heutigen Tag in das Fenster auf', () => {
    expect(sinceDay(7, '2026-08-31')).toBe('2026-08-25');
    expect(sinceDay(1, '2026-08-31')).toBe('2026-08-31');
  });

  it('sinceDay rechnet über Monats- und Jahresgrenzen', () => {
    expect(sinceDay(30, '2026-08-31')).toBe('2026-08-02');
    expect(sinceDay(5, '2026-01-03')).toBe('2025-12-30');
    expect(sinceDay(365, '2026-08-31')).toBe('2025-09-01');
  });

  it('sinceDay stolpert nicht über die Zeitumstellung', () => {
    expect(sinceDay(2, '2026-10-26')).toBe('2026-10-25');
    expect(sinceDay(7, '2026-03-30')).toBe('2026-03-24');
  });

  it('daysBetween zählt beide Enden mit, eachDay listet sie', () => {
    expect(daysBetween('2026-08-30', '2026-08-30')).toBe(1);
    expect(daysBetween('2026-08-25', '2026-08-31')).toBe(7);
    expect(eachDay('2026-08-30', '2026-09-01')).toEqual(['2026-08-30', '2026-08-31', '2026-09-01']);
    expect(eachDay('2026-09-02', '2026-09-01')).toEqual([]);
  });

  it('weekdayOf bestimmt den Wochentag zeitzonenfest', () => {
    expect(weekdayOf('2026-08-31')).toBe(1); // Montag
    expect(weekdayOf('2026-08-30')).toBe(0); // Sonntag
    expect(weekdayOf('2026-10-25')).toBe(0); // Zeitumstellung, trotzdem Sonntag
  });
});

describe('summarize — Vergleiche für den Morgenblick', () => {
  const woche = (): DailyDoc[] => [
    { day: '2026-08-24', visitors: 70, pageviews: 700 }, // Mo
    { day: '2026-08-25', visitors: 80, pageviews: 800 }, // Di
    { day: '2026-08-30', visitors: 90, pageviews: 900 }, // So
    { day: '2026-08-31', visitors: 20, pageviews: 200 }, // Mo, heute
  ];

  it('trennt den laufenden Tag vom jüngsten abgeschlossenen', () => {
    const result = summarize(woche(), [], { today: '2026-08-31' });

    expect(result.latest.day).toEqual({ day: '2026-08-30', visitors: 90, pageviews: 900 });
    expect(result.today).toEqual({ day: '2026-08-31', visitors: 20, pageviews: 200 });
    expect(result.range.includesToday).toBe(true);
  });

  it('nimmt ohne heutigen Tag den letzten vorhandenen', () => {
    const result = summarize(woche(), [], { today: '2026-09-05' });

    expect(result.latest.day?.day).toBe('2026-08-31');
    expect(result.today).toBeNull();
    expect(result.range.includesToday).toBe(false);
  });

  it('vergleicht mit dem Vortag und mit demselben Wochentag', () => {
    const docs: DailyDoc[] = [
      { day: '2026-08-23', visitors: 60 }, // So, eine Woche vorher
      { day: '2026-08-29', visitors: 50 }, // Sa, Vortag
      { day: '2026-08-30', visitors: 90 }, // So, der Tag
    ];
    const result = summarize(docs, [], { today: '2026-08-31' });

    expect(result.latest.vsPrevDay?.visitors).toEqual({ now: 90, before: 50, change: 0.8 });
    expect(result.latest.vsSameWeekday?.visitors).toEqual({ now: 90, before: 60, change: 0.5 });
  });

  it('findet denselben Wochentag auch in der Vorperiode', () => {
    const result = summarize(
      [{ day: '2026-08-30', visitors: 90 }],
      [{ day: '2026-08-23', visitors: 60 }],
      { today: '2026-08-31' }
    );

    expect(result.latest.vsSameWeekday?.visitors).toEqual({ now: 90, before: 60, change: 0.5 });
  });

  it('lässt den Vergleich weg, wenn der Bezugstag fehlt', () => {
    const result = summarize([{ day: '2026-08-30', visitors: 90 }], [], { today: '2026-08-31' });

    expect(result.latest.vsPrevDay).toBeNull();
    expect(result.latest.vsSameWeekday).toBeNull();
  });

  it('vergleicht den Zeitraum mit der Periode davor und liefert deren Verlauf', () => {
    const result = summarize(
      [{ day: '2026-08-30', visitors: 90, pageviews: 900 }],
      [{ day: '2026-08-29', visitors: 60, pageviews: 600 }],
      { today: '2026-08-31' }
    );

    expect(result.period).toEqual({
      visitors: { now: 90, before: 60, change: 0.5 },
      pageviews: { now: 900, before: 600, change: 0.5 },
      days: 1,
      daysNow: 1,
    });
    expect(result.previousDays).toEqual([{ day: '2026-08-29', visitors: 60, pageviews: 600 }]);
  });

  it('vergleicht je Tag, nicht in Summen', () => {
    const result = summarize(
      [
        { day: '2026-08-29', visitors: 100 },
        { day: '2026-08-30', visitors: 100 },
      ],
      [{ day: '2026-08-24', visitors: 100 }],
      { today: '2026-08-31' }
    );

    expect(result.period).toEqual({
      visitors: { now: 100, before: 100, change: 0 },
      pageviews: { now: 0, before: 0, change: null },
      days: 1,
      daysNow: 2,
    });
  });

  it('nimmt den laufenden Tag nicht in den Tagesschnitt', () => {
    const result = summarize(
      [
        { day: '2026-08-30', visitors: 100 },
        { day: '2026-08-31', visitors: 10 },
      ],
      [{ day: '2026-08-29', visitors: 100 }],
      { today: '2026-08-31' }
    );

    expect(result.period?.visitors).toEqual({ now: 100, before: 100, change: 0 });
    expect(result.period?.daysNow).toBe(1);
    expect(result.totals.closedDays).toBe(1);
  });

  it('behauptet keine Steigerung, wenn es vorher nichts gab', () => {
    const result = summarize(
      [{ day: '2026-08-30', visitors: 5 }],
      [{ day: '2026-08-29', visitors: 0 }],
      { today: '2026-08-31' }
    );

    expect(result.period?.visitors.change).toBeNull();
  });

  it('lässt den Zeitraumvergleich ohne Vorperiode ganz weg', () => {
    expect(summarize(woche(), [], { today: '2026-08-31' }).period).toBeNull();
  });

  it('mittelt Besucher je Wochentag, ohne den laufenden Tag', () => {
    const montag = summarize(woche(), [], { today: '2026-08-31' }).weekdays.find(
      (w) => w.index === 1
    );

    expect(montag).toEqual({ index: 1, visitors: 70, pageviews: 700, days: 1 });
  });

  it('nennt Gewinner und Verlierer gegenüber der Vorperiode — Seiten, Herkunft, Ereignisse', () => {
    const result = summarize(
      [
        {
          day: '2026-08-30',
          paths: { '/map': 100, '/neu': 40 },
          referrers: { a_com: 5 },
          events: { sign_up: 3 },
        },
      ],
      [
        {
          day: '2026-08-29',
          paths: { '/map': 160, '/weg': 30 },
          referrers: { a_com: 20 },
          events: { sign_up: 1, purchase: 1 },
        },
      ],
      { today: '2026-08-31' }
    );

    expect(result.movers.paths).toEqual([
      { key: '/map', now: 100, before: 160, diff: -60 },
      { key: '/neu', now: 40, before: 0, diff: 40 },
      { key: '/weg', now: 0, before: 30, diff: -30 },
    ]);
    expect(result.movers.referrers[0]).toEqual({ key: 'a.com', now: 5, before: 20, diff: -15 });
    expect(result.movers.events).toEqual([
      { key: 'sign_up', now: 3, before: 1, diff: 2 },
      { key: 'purchase', now: 0, before: 1, diff: -1 },
    ]);
  });
});

describe('summarize — heute und gestern ausgebreitet', () => {
  const docs: DailyDoc[] = [
    { day: '2026-08-23', visitors: 60, pageviews: 300 }, // So vor einer Woche
    { day: '2026-08-29', visitors: 50, pageviews: 250 }, // Sa
    {
      day: '2026-08-30', // So, der jüngste abgeschlossene
      visitors: 90,
      pageviews: 450,
      paths: { '/': 200, '/map': 250 },
      entryPaths: { '/': 70, '/map': 20 },
      continuations: { '/': 150 },
      referrers: { www_google_com: 30 },
      events: { map_opened: 40, sign_up: 2, login: 1, purchase: 1 },
    },
    { day: '2026-08-31', visitors: 12, pageviews: 30, events: { map_opened: 5 } }, // heute
  ];

  it('liefert beide Tage mit Ranglisten, Vergleichen und eigenem Trichter', () => {
    const result = summarize(docs, [], { today: '2026-08-31' });
    const latest = result.dayDetails.latest;
    const today = result.dayDetails.today;

    expect(latest?.day).toBe('2026-08-30');
    expect(latest?.vsPrevDay?.visitors).toEqual({ now: 90, before: 50, change: 0.8 });
    expect(latest?.vsSameWeekday?.visitors).toEqual({ now: 90, before: 60, change: 0.5 });
    expect(latest?.paths[0]).toEqual({ key: '/map', count: 250 });
    expect(latest?.entryPaths[0]).toEqual({ key: '/', count: 70 });
    expect(latest?.referrers).toEqual([{ key: 'www.google.com', count: 30 }]);
    expect(latest?.hasExits).toBe(true);
    expect(latest?.exits.find((e) => e.key === '/')).toMatchObject({ views: 200, exits: 50 });
    expect(latest?.funnel.stages[1].steps.find((s) => s.key === 'signed_in')).toEqual({
      key: 'signed_in',
      count: 3,
      share: 3 / 90,
    });

    expect(today?.day).toBe('2026-08-31');
    expect(today?.vsPrevDay?.visitors).toEqual({ now: 12, before: 90, change: -78 / 90 });
    // Kein `continuations`: Ausstiege bleiben leer statt alles als Ausstieg zu werten.
    expect(today?.hasExits).toBe(false);
    expect(today?.exits).toEqual([]);
  });

  it('hängt die Firestore-Zahlen des Tages an, wenn Konten dabei sind', () => {
    const accounts = summarizeAccounts(
      {
        accounts: [],
        purchases: [
          { day: '2026-08-30', source: 'stripe', starter: false, packId: 'category-pizza' },
        ],
        reveals: [{ day: '2026-08-30' }, { day: '2026-08-30' }],
        referrals: [],
        checkouts: [],
      },
      '2026-08-25',
      '2026-08-31',
      '2026-08-31'
    );
    const result = summarize(docs, [], { today: '2026-08-31', accounts });

    expect(result.dayDetails.latest?.people).toEqual({
      day: '2026-08-30',
      newAccounts: 0,
      starterPacks: 0,
      reveals: 2,
      referrals: 0,
      purchases: 1,
      revenueCents: 299,
    });
  });

  it('nimmt das Fenster aus den Optionen, wenn es keine Dokumente gibt', () => {
    const result = summarize([], [], {
      today: '2026-09-07',
      range: { start: '2026-08-01', end: '2026-08-31' },
    });

    expect(result.range).toEqual({
      start: '2026-08-01',
      end: '2026-08-31',
      days: 31,
      today: '2026-09-07',
      includesToday: false,
    });
  });
});

describe('summarizeAccounts', () => {
  const konto = (over: Partial<AccountRecord> = {}): AccountRecord => ({
    createdDay: '2026-08-01',
    lastActiveDay: '2026-08-01',
    provider: 'email',
    favorites: 0,
    starterPack: false,
    reveals: 0,
    referrals: 0,
    purchases: 0,
    ...over,
  });
  const empty = (): AccountsInput => ({
    accounts: [],
    purchases: [],
    reveals: [],
    referrals: [],
    checkouts: [],
  });

  it('zählt neue und aktive Konten im Zeitraum', () => {
    const result = summarizeAccounts(
      {
        ...empty(),
        accounts: [
          konto({ createdDay: '2026-08-29', lastActiveDay: '2026-08-29', provider: 'google' }),
          konto({ lastActiveDay: '2026-08-30', favorites: 3 }),
          konto({ lastActiveDay: null }),
        ],
      },
      '2026-08-25',
      '2026-08-30',
      '2026-08-30'
    );

    expect(result).toMatchObject({
      total: 3,
      newInWindow: 1,
      activeInWindow: 2,
      google: 1,
      email: 2,
      withFavorites: 1,
    });
  });

  it('zählt aktive Nutzer in festen Fenstern — heute, 7 und 30 Tage — unabhängig vom Zeitraum', () => {
    const result = summarizeAccounts(
      {
        ...empty(),
        accounts: [
          konto({ lastActiveDay: '2026-08-30' }),
          konto({ lastActiveDay: '2026-08-24' }),
          konto({ lastActiveDay: '2026-08-23' }),
          konto({ lastActiveDay: '2026-08-01' }),
          konto({ lastActiveDay: '2026-07-31' }),
          konto({ lastActiveDay: null }),
        ],
      },
      '2026-06-02',
      '2026-08-30',
      '2026-08-30'
    );

    expect(result.active).toEqual({ day: 1, week: 2, month: 4 });
    expect(result.activeInWindow).toBe(5);
  });

  it('zählt als Kauf nur, was Stripe bezahlt hat — und bewertet es zum Katalogpreis', () => {
    const result = summarizeAccounts(
      {
        ...empty(),
        purchases: [
          { day: '2026-05-13', source: 'stripe', starter: false, packId: 'all-berlin' },
          { day: '2026-08-30', source: 'stripe', starter: false, packId: 'category-pizza' },
          { day: '2026-08-30', source: 'signup', starter: true, packId: 'starter' },
          { day: '2026-08-30', source: 'manual', starter: false, packId: 'category-lunch' },
        ],
        checkouts: [
          { day: '2026-08-30', status: 'open', packId: 'category-pizza' },
          { day: '2026-08-30', status: 'completed', packId: 'category-pizza' },
          { day: '2026-08-01', status: 'open', packId: 'all-berlin' },
        ],
      },
      '2026-08-25',
      '2026-08-30',
      '2026-08-30'
    );

    expect(result.purchases).toEqual({
      total: 2,
      inWindow: 1,
      byPack: [
        { packId: 'all-berlin', name: 'All Berlin', count: 1, revenueCents: 999 },
        { packId: 'category-pizza', name: 'Pizza', count: 1, revenueCents: 299 },
      ],
    });
    expect(result.revenue).toEqual({ totalCents: 1298, inWindowCents: 299 });
    expect(result.checkouts).toEqual({ inWindow: 2, open: 1, completed: 1 });
    // Das Starter Pack ist kein Kauf, aber eine eigene Zahl.
    expect(result.starterPacks).toEqual({ total: 1, inWindow: 1 });
  });

  it('zählt Aufdeckungen vor Ort und Einladungen — nur die Eingeladenen, nicht die Belohnung', () => {
    const result = summarizeAccounts(
      {
        ...empty(),
        reveals: [{ day: '2026-08-30' }, { day: '2026-08-01' }],
        referrals: [
          { day: '2026-08-30', source: 'invited-by' },
          { day: '2026-08-30', source: 'invited' },
        ],
      },
      '2026-08-25',
      '2026-08-30',
      '2026-08-30'
    );

    expect(result.reveals).toEqual({ total: 2, inWindow: 1 });
    expect(result.referrals).toEqual({ total: 1, inWindow: 1 });
  });

  it('zählt Personen je Stufe — wer wie weit gekommen ist', () => {
    const result = summarizeAccounts(
      {
        ...empty(),
        accounts: [
          konto({ starterPack: true, reveals: 2, purchases: 1 }),
          konto({ starterPack: true, referrals: 1 }),
          konto(),
        ],
      },
      '2026-08-25',
      '2026-08-30',
      '2026-08-30'
    );

    expect(result.people).toEqual({
      accounts: 3,
      withStarterPack: 2,
      withReveal: 1,
      withReferral: 1,
      buyers: 1,
    });
  });

  it('füllt jeden Kalendertag des Fensters, auch ohne Bewegung', () => {
    const result = summarizeAccounts(
      {
        ...empty(),
        accounts: [konto({ createdDay: '2026-08-29' })],
        purchases: [
          { day: '2026-08-30', source: 'stripe', starter: false, packId: 'category-pizza' },
        ],
      },
      '2026-08-28',
      '2026-08-30',
      '2026-08-30'
    );

    expect(result.byDay).toEqual([
      {
        day: '2026-08-28',
        newAccounts: 0,
        starterPacks: 0,
        reveals: 0,
        referrals: 0,
        purchases: 0,
        revenueCents: 0,
      },
      {
        day: '2026-08-29',
        newAccounts: 1,
        starterPacks: 0,
        reveals: 0,
        referrals: 0,
        purchases: 0,
        revenueCents: 0,
      },
      {
        day: '2026-08-30',
        newAccounts: 0,
        starterPacks: 0,
        reveals: 0,
        referrals: 0,
        purchases: 1,
        revenueCents: 299,
      },
    ]);
  });

  it('kennt den Preis jedes Packs — und null für Unbekanntes', () => {
    expect(packPriceCents('category-pizza')).toBe(299);
    expect(packPriceCents('all-berlin')).toBe(999);
    expect(packPriceCents('starter')).toBe(0);
  });
});

describe('summarizeDeck', () => {
  it('zählt Karten je Kategorie und weiß, welches Pack käuflich ist', () => {
    const deck = summarizeDeck({
      restaurants: [
        { _id: 'r1', categories: [{ slug: 'pizza' }, { slug: 'dinner' }] },
        { _id: 'r2', categories: [{ slug: 'dinner' }] },
        { _id: 'r3', categories: [{ slug: 'fine-dining' }] },
        { _id: 'r4' },
      ],
      mustEats: [
        { _id: 'm1', restaurant: { _id: 'r1' }, revealedForAnon: true },
        { _id: 'm2', restaurant: { _id: 'r2' } },
      ],
      categories: [
        { slug: 'dinner', name: 'Dinner' },
        { slug: 'pizza', name: 'Pizza' },
        { slug: 'fine-dining', name: 'Fine Dining' },
        { slug: 'ohne-pack', name: 'Ohne Pack' },
      ],
    });

    expect(deck).toMatchObject({
      cards: 2,
      publicCards: 1,
      spots: 4,
      freeCards: 5,
      starterCards: 20,
      starterFaceUp: 10,
    });
    // Mehrfachkategorisiert: m1 zählt in Pizza UND Dinner.
    expect(deck.byCategory).toEqual([
      {
        slug: 'dinner',
        name: 'Dinner',
        cards: 2,
        spots: 2,
        packId: 'category-dinner',
        sellable: true,
      },
      {
        slug: 'pizza',
        name: 'Pizza',
        cards: 1,
        spots: 1,
        packId: 'category-pizza',
        sellable: true,
      },
      {
        slug: 'fine-dining',
        name: 'Fine Dining',
        cards: 0,
        spots: 1,
        packId: 'category-finedining',
        sellable: false,
      },
      { slug: 'ohne-pack', name: 'Ohne Pack', cards: 0, spots: 0, packId: null, sellable: false },
    ]);
  });
});
