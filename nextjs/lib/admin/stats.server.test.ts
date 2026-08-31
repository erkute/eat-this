import { describe, expect, it } from 'vitest';
import { sinceDay, summarize, type DailyDoc } from './stats.server';

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

  it('berechnet die Zustimmungsquote gegen die gezeigten Dialoge', () => {
    const result = summarize(docs());

    expect(result.consent).toEqual({ shown: 30, accepted: 3, declined: 0, rate: 0.1 });
  });

  it('liefert keine Zustimmungsquote ohne Nenner', () => {
    const result = summarize([{ day: '2026-08-28', events: { consent_accepted: 4 } }]);

    expect(result.consent.rate).toBeNull();
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
