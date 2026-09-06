import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { VOYAGE_MODEL, VOYAGE_DIM } from '../../lib/buddy/voyage';
import {
  checkIndexShape,
  compareToCatalog,
  EMBEDDINGS_PATH,
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

  it('meldet Slugs, die als [[spot:…]]-Marker nie durchkämen', () => {
    const findings = checkIndexShape(
      ok({ vectors: { 'Zola Pizza': [1, 0], gazzo: [0, 1] } }),
      expected
    );
    expect(findings[0]).toMatch(/Marker-Zeichenklasse/);
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
 * Der eigentliche Wächter: nicht die Logik, sondern die Datei, die ausgeliefert
 * wird. Läuft offline in jedem `npm test` mit. Den Abgleich gegen Sanity kann
 * er nicht leisten — der braucht Netz und steht in `npm run check:embeddings`.
 */
describe('der ausgelieferte Index', () => {
  const file = join(dirname(fileURLToPath(import.meta.url)), '../..', EMBEDDINGS_PATH);
  const index = JSON.parse(readFileSync(file, 'utf8')) as EmbeddingsIndex;

  it('passt zu dem Modell und der Dimension, mit denen zur Laufzeit gefragt wird', () => {
    expect(checkIndexShape(index, { model: VOYAGE_MODEL, dim: VOYAGE_DIM })).toEqual([]);
  });

  it('trägt einen ernstzunehmenden Katalog — ein Rumpfindex wäre schlimmer als keiner', () => {
    // Kein Abgleich mit Sanity, nur die Untergrenze: fiele die Datei auf eine
    // Handvoll Spots zusammen, ränge Remy fast alles ans Ende.
    expect(index.count).toBeGreaterThan(300);
  });
});
