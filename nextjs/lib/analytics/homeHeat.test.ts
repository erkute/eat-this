import { beforeEach, describe, expect, it } from 'vitest';
import {
  homeTargetKeys,
  homeTargetWithinBudget,
  OVERFLOW_TARGET,
  parseHomeBeacon,
  resetHomeTargetsCache,
  summarizeHome,
  TARGET_BUDGET,
  targetKey,
} from './homeHeat';

describe('parseHomeBeacon', () => {
  it('rundet die Scrolltiefe auf Zehnerschritte ab und behaelt nur echte Abschnitte', () => {
    expect(
      parseHomeBeacon({
        home: 'scroll',
        device: 'phone',
        depth: 0.47,
        reached: ['hero', 'map', 'map', 'nav', 'erfunden'],
      })
    ).toEqual({ kind: 'scroll', device: 'phone', depth: 40, reached: ['hero', 'map'] });
  });

  it('legt einen Klick in seine Zelle', () => {
    expect(
      parseHomeBeacon({
        home: 'click',
        device: 'desktop',
        section: 'magazine',
        x: 0.5,
        y: 1,
        target: '/news/ari.s',
      })
    ).toEqual({
      kind: 'click',
      device: 'desktop',
      section: 'magazine',
      cell: '10_19',
      target: '/news/ari_s',
    });
  });

  it('verwirft, was kein Startseiten-Beacon ist', () => {
    expect(parseHomeBeacon({ path: '/' })).toBeNull();
    expect(
      parseHomeBeacon({ home: 'click', device: 'tablet', section: 'hero', x: 0, y: 0 })
    ).toBeNull();
    expect(
      parseHomeBeacon({ home: 'click', device: 'phone', section: 'hero', x: 2, y: 0 })
    ).toBeNull();
    expect(parseHomeBeacon({ home: 'scroll', device: 'phone', depth: 0.5 })).toBeNull();
  });
});

describe('targetKey', () => {
  it('kuerzt, entfernt Punkte und Steuerzeichen', () => {
    expect(targetKey('  instagram.com\n')).toBe('instagram_com');
    expect(targetKey('x'.repeat(100))).toHaveLength(60);
    expect(targetKey('__name__')).toBeNull();
    expect(targetKey(OVERFLOW_TARGET)).toBeNull();
    expect(targetKey(3)).toBeNull();
  });
});

describe('Klickziel-Budget', () => {
  beforeEach(() => resetHomeTargetsCache());

  it('sammelt neue Ziele ein, sobald das Budget eines Geraets voll ist', async () => {
    const full = Object.fromEntries(Array.from({ length: TARGET_BUDGET }, (_, i) => [`t${i}`, 1]));
    const keys = await homeTargetKeys('2026-10-31', async () => ({
      clicks: { phone: { hero: full } },
    }));
    expect(homeTargetWithinBudget(keys, 'phone', 'hero', 't1')).toBe('t1');
    expect(homeTargetWithinBudget(keys, 'phone', 'hero', 'neu')).toBe(OVERFLOW_TARGET);
    expect(homeTargetWithinBudget(keys, 'desktop', 'hero', 'neu')).toBe('neu');
  });

  it('zaehlt nichts unter neuem Namen, wenn das Dokument unlesbar war', async () => {
    const keys = await homeTargetKeys('2026-10-31', async () => {
      throw new Error('down');
    });
    expect(homeTargetWithinBudget(keys, 'phone', 'hero', 'neu')).toBe(OVERFLOW_TARGET);
  });
});

describe('summarizeHome', () => {
  it('rechnet die Tiefe als „mindestens so weit" und sortiert die Ziele', () => {
    const stats = summarizeHome([
      {
        day: '2026-10-31',
        views: { phone: 4 },
        depth: { phone: { '20': 1, '100': 3 } },
        reached: { phone: { hero: 4, footer: 3 } },
        clicks: { phone: { hero: { '/map': 2 }, faq: { 'Was kostet Eat This?': 5 } } },
        heat: { phone: { hero: { '3_4': 2 }, faq: { '1_1': 5 } } },
      },
      { day: '2026-10-30', views: { phone: 1 }, depth: { phone: { '0': 1 } } },
    ]);
    const phone = stats.devices.phone;
    expect(stats.since).toBe('2026-10-30');
    expect(phone.views).toBe(5);
    expect(phone.depth.find((d) => d.depth === 0)?.share).toBe(1);
    expect(phone.depth.find((d) => d.depth === 30)?.share).toBe(0.6);
    expect(phone.depth.find((d) => d.depth === 100)?.share).toBe(0.6);
    expect(phone.reached.at(-1)).toEqual({ section: 'footer', count: 3 });
    expect(phone.targets[0]).toEqual({ section: 'faq', target: 'Was kostet Eat This?', count: 5 });
    expect(phone.clicks).toBe(7);
    expect(stats.devices.desktop.views).toBe(0);
  });
});
