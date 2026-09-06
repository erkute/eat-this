import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { VOYAGE_MODEL, VOYAGE_DIM } from '../../lib/buddy/voyage';
import {
  ALL_INDEXES,
  checkIndexShape,
  compareToCatalog,
  type EmbeddingsIndex,
} from './embeddings-index';

const ok = (over: Partial<EmbeddingsIndex> = {}): EmbeddingsIndex => ({
  model: 'voyage-3-lite',
  dim: 2,
  count: 2,
  vectors: { zola: [1, 0], gazzo: [0, 1] },
  ...over,
});
const expected = { model: 'voyage-3-lite', dim: 2 };

describe('checkIndexShape', () => {
  it('sagt zu einem gesunden Index nichts', () => {
    expect(checkIndexShape(ok(), expected)).toEqual([]);
  });

  it('meldet einen leeren Index und hört dann auf', () => {
    const findings = checkIndexShape(ok({ vectors: {}, count: 0 }), expected);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/leer/);
  });

  it('meldet ein fremdes Modell — der Kosinus wäre bedeutungslos', () => {
    expect(checkIndexShape(ok({ model: 'voyage-3' }), expected)[0]).toMatch(/voyage-3 statt/);
  });

  it('meldet, wenn count und Vektorzahl auseinanderlaufen', () => {
    expect(checkIndexShape(ok({ count: 99 }), expected)[0]).toMatch(/count sagt 99, es sind 2/);
  });

  it('meldet Vektoren mit falscher Länge', () => {
    const findings = checkIndexShape(ok({ vectors: { zola: [1, 0], gazzo: [0] } }), expected);
    expect(findings[0]).toMatch(/1 Vektoren haben nicht 2 Werte: gazzo/);
  });

  it('meldet Nullvektoren und NaN — beide ranken still nach hinten', () => {
    const findings = checkIndexShape(
      ok({ vectors: { zola: [0, 0], gazzo: [Number.NaN, 1] } }),
      expected
    );
    expect(findings[0]).toMatch(/2 Vektoren sind null oder enthalten NaN/);
  });

  it('meldet Slugs, die weder als Marker noch als Pfad durchkaemen', () => {
    const findings = checkIndexShape(
      ok({ vectors: { 'Zola Pizza': [1, 0], gazzo: [0, 1] } }),
      expected
    );
    expect(findings[0]).toMatch(/Zeichenklasse \[A-Za-z0-9-\]/);
  });
});

describe('compareToCatalog', () => {
  it('trennt fehlende von verwaisten Slugs', () => {
    const r = compareToCatalog(['a', 'b', 'weg'], ['a', 'b', 'neu'], 5);
    expect(r.missing).toEqual(['neu']);
    expect(r.orphans).toEqual(['weg']);
    expect(r.live).toBe(3);
    expect(r.indexed).toBe(3);
  });

  it('bleibt grün, solange die Lücke unter dem Budget liegt', () => {
    // 1 von 100 fehlt = 1 %, Budget 5 %.
    const live = Array.from({ length: 100 }, (_, i) => `s${i}`);
    const r = compareToCatalog(live.slice(1), live, 5);
    expect(r.missingPct).toBeCloseTo(1);
    expect(r.overBudget).toBe(false);
  });

  it('wird rot, sobald das Budget gerissen ist', () => {
    const live = Array.from({ length: 100 }, (_, i) => `s${i}`);
    const r = compareToCatalog(live.slice(10), live, 5);
    expect(r.missingPct).toBeCloseTo(10);
    expect(r.overBudget).toBe(true);
  });

  it('erklärt einen leeren Katalog nicht zum Befund — das ist eine Störung der Quelle', () => {
    const r = compareToCatalog(['a', 'b'], [], 5);
    expect(r.overBudget).toBe(false);
    expect(r.missingPct).toBe(0);
  });
});

/**
 * Der eigentliche Wächter: nicht die Logik, sondern die Dateien, die
 * ausgeliefert werden. Läuft offline in jedem `npm test` mit. Den Abgleich
 * gegen Sanity kann er nicht leisten — der braucht Netz und steht in
 * `npm run check:embeddings`.
 */
describe.each(ALL_INDEXES.map((spec) => [spec.label, spec] as const))(
  'der ausgelieferte Index: %s',
  (_label, spec) => {
    const file = join(dirname(fileURLToPath(import.meta.url)), '../..', spec.path);
    const index = JSON.parse(readFileSync(file, 'utf8')) as EmbeddingsIndex;

    it('passt zu dem Modell und der Dimension, mit denen zur Laufzeit gefragt wird', () => {
      expect(checkIndexShape(index, { model: VOYAGE_MODEL, dim: VOYAGE_DIM })).toEqual([]);
    });

    it('traegt einen ernstzunehmenden Bestand — ein Rumpfindex waere schlimmer als keiner', () => {
      // Kein Abgleich mit Sanity, nur die Untergrenze: fiele eine Datei auf
      // eine Handvoll Eintraege zusammen, ränge Remy fast alles ans Ende.
      // Bei den Artikeln entscheidet der Index sogar die Treffermenge.
      const floor = spec.label === 'Spots' ? 300 : 20;
      expect(index.count).toBeGreaterThan(floor);
    });
  }
);

describe('die Index-Spezifikationen', () => {
  it('nennen jeweils einen eigenen Pfad und Wiederaufbau-Befehl', () => {
    const paths = ALL_INDEXES.map((s) => s.path);
    const cmds = ALL_INDEXES.map((s) => s.rebuildCommand);
    expect(new Set(paths).size).toBe(ALL_INDEXES.length);
    expect(new Set(cmds).size).toBe(ALL_INDEXES.length);
  });

  it('fragen isOpen nie ohne isClosed ab — sonst empfiehlt Remy geschlossene Laeden', () => {
    for (const spec of ALL_INDEXES) {
      if (/isOpen/.test(spec.filter)) expect(spec.filter).toMatch(/isClosed/);
    }
  });
});
