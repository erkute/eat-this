import { describe, expect, it } from 'vitest';
import { sinceDay, summarize, weekdayOf, type DailyDoc } from './stats.server';

/** Zwei Tage aus der Zeit vor `continuations` plus zwei danach — genau die
 *  Mischung, die im Katalog wirklich liegt (Feld erst seit 28.08.2026). */
function docs(): DailyDoc[] {
  return [
    {
      day: '2026-08-27',
      pageviews: 100,
      visitors: 20,
      paths: { '/': 60, '/map': 40 },
      referrers: { www_google_com: 5 },
      events: { map_opened: 10, consent_gate_shown: 20, consent_accepted: 1 },
    },
    {
      day: '2026-08-28',
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

    expect(result.days.map((d) => d.day)).toEqual(['2026-08-27', '2026-08-28']);
    expect(result.totals).toEqual({ pageviews: 150, visitors: 30, days: 2 });
  });

  it('rechnet Ausstiege NUR über Tage mit continuations', () => {
    const result = summarize(docs());

    // Der 27. trägt keine continuations. Zählte er mit, wären es 90 Aufrufe
    // für "/" und 65 Ausstiege — beides falsch.
    expect(result.exitDays).toBe(1);
    const home = result.exits.find((e) => e.key === '/');
    expect(home).toEqual({ key: '/', views: 30, continued: 25, exits: 5, rate: 5 / 30 });
  });

  it('klemmt negative Ausstiege auf null', () => {
    // Mehr Fortsetzungen als Aufrufe: möglich, wenn die Fortsetzung am
    // Folgetag verbucht wird, ihr Aufruf aber vor dem Fenster liegt.
    const result = summarize([
      { day: '2026-08-28', paths: { '/map': 3 }, continuations: { '/map': 9 } },
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

    expect(result.consent).toEqual({
      shown: 30,
      accepted: 3,
      declined: 0,
      visitors: 30, // beide Tage tragen den Dialog: 20 + 10
      days: 2,
      rate: 0.1,
      ratePerView: 0.1,
      viewsPerVisitor: 1,
    });
  });

  it('nimmt als Nenner nur die Besucher der Tage, die den Dialog zählen', () => {
    // `consent_gate_shown` gibt es erst seit dem 28.08.2026. Zaehlte der Tag
    // davor mit, stuenden Zaehler und Nenner auf verschiedenen Zeitraeumen —
    // dieselbe Falle wie bei den Ausstiegen.
    const result = summarize([
      { day: '2026-08-27', visitors: 500 },
      { day: '2026-08-28', visitors: 100, events: { consent_gate_shown: 300, consent_accepted: 20 } },
    ]);

    expect(result.consent.visitors).toBe(100);
    expect(result.consent.days).toBe(1);
    expect(result.consent.rate).toBe(0.2);
    expect(result.consent.viewsPerVisitor).toBe(3);
  });

  it('liefert keine Zustimmungsquote ohne Nenner', () => {
    const result = summarize([{ day: '2026-08-28', events: { consent_accepted: 4 } }]);

    expect(result.consent.rate).toBeNull();
    expect(result.consent.ratePerView).toBeNull();
  });

  it('behält Trichterstufen mit dem Wert null', () => {
    // Der Kauftrichter endet real bei purchase=0. Eine Stufe wegzulassen,
    // weil sie leer ist, versteckt genau den Befund.
    const kauf = summarize(docs()).funnels.find((f) => f.label === 'Kauf');

    expect(kauf?.steps.map((s) => s.key)).toEqual([
      'locked_spot_opened',
      'locked_spot_pack_clicked',
      'begin_checkout',
      'purchase',
    ]);
    expect(kauf?.steps.every((s) => s.count === 0)).toBe(true);
  });

  it('übersteht fehlende und unbrauchbare Zählfelder', () => {
    const result = summarize([
      { day: '2026-08-29' },
      { day: '2026-08-30', pageviews: Number.NaN, paths: { '/': Number.NaN, '/map': 2 } },
    ]);

    expect(result.totals).toEqual({ pageviews: 0, visitors: 0, days: 2 });
    expect(result.paths).toEqual([{ key: '/map', count: 2 }]);
  });

  it('gibt für eine leere Sammlung eine leere Auswertung zurück', () => {
    const result = summarize([]);

    expect(result.totals).toEqual({ pageviews: 0, visitors: 0, days: 0 });
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
