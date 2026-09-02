import { describe, expect, it } from 'vitest';
import {
  sinceDay,
  summarize,
  summarizeAccounts,
  weekdayOf,
  type AccountRecord,
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
    // Mehr Fortsetzungen als Aufrufe: möglich, wenn die Fortsetzung am
    // Folgetag verbucht wird, ihr Aufruf aber vor dem Fenster liegt.
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

  it('rechnet die Zustimmung gegen Besucher, nicht gegen Einblendungen', () => {
    // Der Dialog blockiert und erscheint je Besucher mehrfach. Gegen die
    // Einblendungen gerechnet faellt die Quote um ein Vielfaches zu niedrig
    // aus — sie beantwortet dann „wie oft wird geklickt", nicht „wie viele
    // Menschen stimmen zu".
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
    // `consent_gate_shown` gibt es erst seit dem Abend des 28.08.2026. Zaehlte
    // ein Tag davor oder der halbe Rollout-Tag mit, stuenden Zaehler und
    // Nenner auf verschiedenen Zeitraeumen — dieselbe Falle wie bei den
    // Ausstiegen.
    const result = summarize([
      { day: '2026-08-27', visitors: 500 },
      { day: '2026-08-28', visitors: 400, events: { consent_gate_shown: 30, consent_accepted: 1 } },
      { day: '2026-08-29', visitors: 100, events: { consent_gate_shown: 300, consent_accepted: 20 } },
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

  it('führt die Reise vom Besucher bis zum Kauf und behält leere Stufen', () => {
    // Die Reise endet real bei purchase=0. Eine Stufe wegzulassen, weil sie
    // leer ist, versteckt genau den Befund. Und der Bezug sind die Besucher —
    // die erste Stufe ist keine Ereigniszahl.
    const reise = summarize(docs()).funnels.find((f) => f.label === 'Die ganze Reise');

    expect(reise?.steps.map((s) => s.key)).toEqual([
      'visitors',
      'map_opened',
      'restaurant_opened',
      'must_eat_opened',
      'must_eat_reveal_attempt',
      'locked_spot_opened',
      'locked_spot_pack_clicked',
      'view_item',
      'begin_checkout',
      'purchase',
    ]);
    expect(reise?.steps[0]).toEqual({ key: 'visitors', count: 30 });
    expect(reise?.steps[1]).toEqual({ key: 'map_opened', count: 15 });
    expect(reise?.steps.at(-1)).toEqual({ key: 'purchase', count: 0 });
  });

  it('zählt Magic Link und Google als eine Anmelde-Stufe', () => {
    const konto = summarize([
      { day: '2026-08-29', events: { login_view: 10, login: 3, sign_up: 2 } },
    ]).funnels.find((f) => f.label === 'Konto');

    expect(konto?.steps.find((s) => s.key === 'signed_in')?.count).toBe(5);
    expect(konto?.steps.find((s) => s.key === 'sign_up')?.count).toBe(2);
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
    expect(result.exits).toEqual([]);
    expect(result.consent.rate).toBeNull();
  });
});

describe('sinceDay', () => {
  it('nimmt den heutigen Tag in das Fenster auf', () => {
    // 7 Tage heißt heute plus sechs davor, nicht sieben davor.
    expect(sinceDay(7, '2026-08-31')).toBe('2026-08-25');
    expect(sinceDay(1, '2026-08-31')).toBe('2026-08-31');
  });

  it('rechnet über Monats- und Jahresgrenzen', () => {
    expect(sinceDay(30, '2026-08-31')).toBe('2026-08-02');
    expect(sinceDay(5, '2026-01-03')).toBe('2025-12-30');
    expect(sinceDay(365, '2026-08-31')).toBe('2025-09-01');
  });

  it('stolpert nicht über die Zeitumstellung', () => {
    // Die deutsche Sommerzeit endet am 25.10.2026. Über einen Anker um
    // Mitternacht käme hier ein Tag zu viel oder zu wenig heraus.
    expect(sinceDay(2, '2026-10-26')).toBe('2026-10-25');
    expect(sinceDay(7, '2026-03-30')).toBe('2026-03-24');
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
    // Ein halber Tag als Hauptzahl sähe jeden Morgen wie ein Absturz aus.
    const result = summarize(woche(), [], '2026-08-31');

    expect(result.latest.day).toEqual({ day: '2026-08-30', visitors: 90, pageviews: 900 });
    expect(result.today).toEqual({ day: '2026-08-31', visitors: 20, pageviews: 200 });
  });

  it('nimmt ohne heutigen Tag den letzten vorhandenen', () => {
    const result = summarize(woche(), [], '2026-09-05');

    expect(result.latest.day?.day).toBe('2026-08-31');
    expect(result.today).toBeNull();
  });

  it('vergleicht mit dem Vortag und mit demselben Wochentag', () => {
    const docs: DailyDoc[] = [
      { day: '2026-08-23', visitors: 60 }, // So, eine Woche vorher
      { day: '2026-08-29', visitors: 50 }, // Sa, Vortag
      { day: '2026-08-30', visitors: 90 }, // So, der Tag
    ];
    const result = summarize(docs, [], '2026-08-31');

    expect(result.latest.vsPrevDay?.visitors).toEqual({ now: 90, before: 50, change: 0.8 });
    expect(result.latest.vsSameWeekday?.visitors).toEqual({ now: 90, before: 60, change: 0.5 });
  });

  it('findet denselben Wochentag auch in der Vorperiode', () => {
    // Bei „7 Tage" liegt die Vorwoche immer ausserhalb des Fensters — der
    // Vergleich fiel dort still weg, obwohl die Route den Tag geladen hatte.
    const result = summarize(
      [{ day: '2026-08-30', visitors: 90 }],
      [{ day: '2026-08-23', visitors: 60 }],
      '2026-08-31'
    );

    expect(result.latest.vsSameWeekday?.visitors).toEqual({ now: 90, before: 60, change: 0.5 });
  });

  it('lässt den Vergleich weg, wenn der Bezugstag fehlt', () => {
    const result = summarize([{ day: '2026-08-30', visitors: 90 }], [], '2026-08-31');

    expect(result.latest.vsPrevDay).toBeNull();
    expect(result.latest.vsSameWeekday).toBeNull();
  });

  it('vergleicht den Zeitraum mit der Periode davor', () => {
    const result = summarize(
      [{ day: '2026-08-30', visitors: 90, pageviews: 900 }],
      [{ day: '2026-08-29', visitors: 60, pageviews: 600 }],
      '2026-08-31'
    );

    expect(result.period).toEqual({
      visitors: { now: 90, before: 60, change: 0.5 },
      pageviews: { now: 900, before: 600, change: 0.5 },
      days: 1,
      daysNow: 1,
    });
  });

  it('vergleicht je Tag, nicht in Summen', () => {
    // Der Fall, der wirklich vorkommt: das Fenster ist kalendarisch gleich
    // lang, aber der Zaehler lief in der Vorperiode erst ab der Haelfte. In
    // Summen gerechnet stuenden hier +100 %, obwohl sich nichts bewegt hat.
    const result = summarize(
      [
        { day: '2026-08-29', visitors: 100 },
        { day: '2026-08-30', visitors: 100 },
      ],
      [{ day: '2026-08-24', visitors: 100 }],
      '2026-08-31'
    );

    expect(result.period).toEqual({
      visitors: { now: 100, before: 100, change: 0 },
      pageviews: { now: 0, before: 0, change: null },
      days: 1,
      daysNow: 2,
    });
  });

  it('nimmt den laufenden Tag nicht in den Tagesschnitt', () => {
    // Um neun Uhr morgens stand der halbe Tag als ganzer im Nenner und zog
    // den Schnitt um ein Zehntel nach unten — ohne dass jemand weggeblieben
    // waere.
    const result = summarize(
      [
        { day: '2026-08-30', visitors: 100 },
        { day: '2026-08-31', visitors: 10 },
      ],
      [{ day: '2026-08-29', visitors: 100 }],
      '2026-08-31'
    );

    expect(result.period?.visitors).toEqual({ now: 100, before: 100, change: 0 });
    expect(result.period?.daysNow).toBe(1);
    expect(result.totals.closedDays).toBe(1);
  });

  it('behauptet keine Steigerung, wenn es vorher nichts gab', () => {
    // 0 auf 5 ist kein "+500 %", sondern ein Neuanfang.
    const result = summarize(
      [{ day: '2026-08-30', visitors: 5 }],
      [{ day: '2026-08-29', visitors: 0 }],
      '2026-08-31'
    );

    expect(result.period?.visitors.change).toBeNull();
    expect(result.period?.visitors.now).toBe(5);
  });

  it('lässt den Zeitraumvergleich ohne Vorperiode ganz weg', () => {
    expect(summarize(woche(), [], '2026-08-31').period).toBeNull();
  });

  it('mittelt Besucher je Wochentag, ohne den laufenden Tag', () => {
    // Der Montag hat zwei Tage im Fenster (24.08. und heute) — nur der
    // abgeschlossene darf zählen, sonst zieht ein halber Tag den Schnitt runter.
    const montag = summarize(woche(), [], '2026-08-31').weekdays.find((w) => w.index === 1);

    expect(montag).toEqual({ index: 1, visitors: 70, pageviews: 700, days: 1 });
  });

  it('nennt Gewinner und Verlierer gegenüber der Vorperiode', () => {
    const result = summarize(
      [{ day: '2026-08-30', paths: { '/map': 100, '/neu': 40 }, referrers: { a_com: 5 } }],
      [{ day: '2026-08-29', paths: { '/map': 160, '/weg': 30 }, referrers: { a_com: 20 } }],
      '2026-08-31'
    );

    expect(result.movers.paths).toEqual([
      { key: '/map', now: 100, before: 160, diff: -60 },
      { key: '/neu', now: 40, before: 0, diff: 40 },
      { key: '/weg', now: 0, before: 30, diff: -30 },
    ]);
    // Hosts kommen auch hier mit Punkten zurück, nicht mit Unterstrichen.
    expect(result.movers.referrers[0]).toEqual({ key: 'a.com', now: 5, before: 20, diff: -15 });
  });
});

describe('weekdayOf', () => {
  it('bestimmt den Wochentag zeitzonenfest', () => {
    expect(weekdayOf('2026-08-31')).toBe(1); // Montag
    expect(weekdayOf('2026-08-30')).toBe(0); // Sonntag
    expect(weekdayOf('2026-10-25')).toBe(0); // Zeitumstellung, trotzdem Sonntag
  });
});

describe('summarizeAccounts', () => {
  const konto = (over: Partial<AccountRecord> = {}): AccountRecord => ({
    createdDay: '2026-08-01',
    lastActiveDay: '2026-08-01',
    provider: 'email',
    favorites: 0,
    ...over,
  });

  it('zählt neue und aktive Konten im Zeitraum', () => {
    const result = summarizeAccounts(
      [
        konto({ createdDay: '2026-08-29', lastActiveDay: '2026-08-29', provider: 'google' }),
        konto({ lastActiveDay: '2026-08-30', favorites: 3 }),
        konto({ lastActiveDay: null }),
      ],
      [],
      [],
      '2026-08-25'
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

  it('zählt als Kauf nur, was Stripe bezahlt hat', () => {
    // Die Sammlung ist voller Seed-Daten (starter/manual) und Gratis-Spots
    // bei der Anmeldung — ein Kauf ist nur, wofuer Geld floss.
    const result = summarizeAccounts(
      [],
      [
        { day: '2026-05-13', source: 'stripe' },
        { day: '2026-08-30', source: 'stripe' },
        { day: '2026-08-30', source: 'signup' },
        { day: '2026-08-30', source: 'manual' },
      ],
      [
        { day: '2026-08-30', status: 'open' },
        { day: '2026-08-30', status: 'completed' },
        { day: '2026-08-01', status: 'open' },
      ],
      '2026-08-25'
    );

    expect(result.purchases).toEqual({ total: 2, inWindow: 1 });
    expect(result.checkouts).toEqual({ inWindow: 2, open: 1 });
  });
});
