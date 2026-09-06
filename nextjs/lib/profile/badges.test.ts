import { describe, expect, it } from 'vitest';
import { computeBadges } from './badges';

const kreuzberg = { group: 'Kreuzberg', done: 3, total: 3 };
const mitte = { group: 'Mitte', done: 1, total: 5 };

describe('computeBadges', () => {
  it('gibt einem leeren Deck nichts', () => {
    expect(computeBadges({ stamped: 0, groups: [] })).toEqual([]);
  });

  /* Die erste abgestempelte Karte ist der Moment, in dem jemand tatsaechlich
     vor einem Spot stand. */
  it('feiert die erste Karte', () => {
    expect(computeBadges({ stamped: 1, groups: [mitte] })).toEqual([{ kind: 'cards', value: 1 }]);
  });

  /* Nur die hoechste Stufe: „Erste Karte" neben „25 Karten" liest sich wie
     eine Liste von Selbstverstaendlichkeiten. */
  it('zeigt nur die hoechste erreichte Stufe', () => {
    expect(computeBadges({ stamped: 30, groups: [] })).toEqual([{ kind: 'cards', value: 25 }]);
    expect(computeBadges({ stamped: 100, groups: [] })).toEqual([{ kind: 'cards', value: 100 }]);
  });

  it('zeichnet jeden vollen Bezirk aus, die halben nicht', () => {
    expect(computeBadges({ stamped: 4, groups: [kreuzberg, mitte] })).toEqual([
      { kind: 'cards', value: 1 },
      { kind: 'district', value: 'Kreuzberg' },
    ]);
  });

  /* Ein Bezirk ohne Plaetze ist nicht komplett, sondern leer — sonst
     verschenkt ein Datenfehler ein Abzeichen. */
  it('haelt einen leeren Bezirk nicht fuer komplett', () => {
    expect(
      computeBadges({ stamped: 0, groups: [{ group: 'Spandau', done: 0, total: 0 }] })
    ).toEqual([]);
  });

  it('kroent ein volles Deck mit ganz Berlin', () => {
    const badges = computeBadges({
      stamped: 8,
      groups: [kreuzberg, { group: 'Mitte', done: 5, total: 5 }],
    });
    expect(badges).toEqual([
      { kind: 'cards', value: 1 },
      { kind: 'district', value: 'Kreuzberg' },
      { kind: 'district', value: 'Mitte' },
      { kind: 'allBerlin' },
    ]);
  });

  /* Bei einem einzigen Bezirk saegte „Ganz Berlin" dasselbe wie das
     Bezirks-Abzeichen daneben. */
  it('sagt bei einem einzigen vollen Bezirk nicht ganz Berlin', () => {
    expect(computeBadges({ stamped: 3, groups: [kreuzberg] })).toEqual([
      { kind: 'cards', value: 1 },
      { kind: 'district', value: 'Kreuzberg' },
    ]);
  });
});
