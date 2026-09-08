import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { liveRestaurant } from '../sanity-filters';

describe('liveRestaurant', () => {
  it('prüft beide Felder — ein Laden gilt nur als offen, wenn keins von beiden dagegen spricht', () => {
    expect(liveRestaurant()).toBe('isOpen != false && isClosed != true');
  });

  it('setzt den Präfix vor JEDES Feld, nicht nur vor das erste', () => {
    // Der naheliegende Fehler wäre `restaurantRef->isOpen != false && isClosed != true`:
    // die zweite Hälfte prüfte dann das Must Eat statt des Restaurants und
    // wäre immer wahr.
    expect(liveRestaurant('restaurantRef->')).toBe(
      'restaurantRef->isOpen != false && restaurantRef->isClosed != true'
    );
    expect(liveRestaurant('@->')).toBe('@->isOpen != false && @->isClosed != true');
  });
});

/**
 * Der Wächter gegen die Wiederholung.
 *
 * Der Fehler war nie eine falsche Abfrage, sondern vierzehn richtige, von denen
 * zwölf ein Feld vergaßen. Ein Kommentar („die Filter MÜSSEN identisch
 * bleiben") stand daneben und hat es nicht verhindert. Dieser Test schon: wer
 * `isOpen` von Hand abfragt, ohne `isClosed` daneben, bricht ihn.
 */
describe('Katalogfilter in den Abfragen', () => {
  /** GROQ schreibt `!=` und `==`; JS-Vergleiche (`!==`) treffen das nicht. */
  const GROQ_IS_OPEN = /isOpen\s*(?:!=\s*false|==\s*true)/;

  /**
   * Reine Kommentarzeilen. Ein Kommentar, der eine Abweichung *erklärt*
   * (`scripts/lib/embeddings-index.ts`), zitiert die Bedingung — und wurde
   * dafür selbst als Verstoß gemeldet.
   */
  const COMMENT = /^\s*(?:\/\/|\/?\*)/;

  /**
   * Der Marker, mit dem eine Abfrage sich vom Katalogfilter ausnimmt. Muss
   * einen Grund tragen — `// katalog-ausnahme: <warum>` — und im Kommentar
   * unmittelbar über der Abfrage stehen (oder in derselben Zeile).
   *
   * Absichtlich unbequem: eine Ausnahme ohne Begründung ist genau der
   * Zustand, aus dem der Fehler vom 05.09.2026 entstanden ist.
   */
  const EXCEPTION = /katalog-ausnahme:\s*\S/;

  /** Beginn einer GROQ-Abfrage über Restaurant-Dokumente. */
  const RESTAURANT_QUERY = /\*\[\s*_type == "restaurant"/;

  function sources(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        out.push(...sources(full));
      } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
        out.push(full);
      }
    }
    return out;
  }

  /**
   * Alle Dateien, über die der Wächter läuft.
   *
   * `scripts` ist bewusst dabei: die Wartungsskripte schreiben in denselben
   * Katalog, und der Einbettungs-Index (`scripts/lib/embeddings-index.ts`)
   * entscheidet, welche Spots Remy überhaupt kennt. Ein geschlossener Laden
   * darf dort so wenig auftauchen wie auf einer Bezirksseite.
   */
  function scanned(): string[] {
    return [...sources('lib'), ...sources('app'), ...sources('scripts')].filter(
      (file) => !file.endsWith(join('lib', 'sanity-filters.ts')) // die Quelle selbst
    );
  }

  it('fragt `isOpen` nirgends ohne `isClosed` ab', () => {
    const offenders: string[] = [];
    for (const file of scanned()) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (COMMENT.test(line)) return;
          if (GROQ_IS_OPEN.test(line) && !line.includes('isClosed')) {
            offenders.push(`${file}:${i + 1}  ${line.trim()}`);
          }
        });
    }
    expect(offenders, `Diese Abfragen filtern isOpen ohne isClosed — liveRestaurant() benutzen:\n${offenders.join('\n')}`).toEqual([]);
  });

  /**
   * Die Regel, die der erste Test NICHT abdeckt.
   *
   * Er meldet nur Zeilen, die `isOpen` überhaupt erwähnen — eine Abfrage ganz
   * ohne Katalogfilter lief still durch. Genau so kamen `restaurantPageQuery`,
   * `getAllRestaurantsLite`, `restaurantMapDetailQuery` und die Badge-Seite
   * durch: sie versprachen Deckung, die der Wächter nie hatte.
   *
   * Deshalb hier die Umkehrung: JEDE Restaurant-Abfrage filtert den Katalog —
   * oder sagt in einem Kommentar, warum nicht.
   */
  it('filtert in jeder Restaurant-Abfrage den Katalog — oder begründet die Ausnahme', () => {
    const offenders: string[] = [];
    for (const file of scanned()) {
      const lines = readFileSync(file, 'utf8').split('\n');
      // Wartungsskripte arbeiten oft als Ganzes über den Bestand. Steht der
      // Marker in ihrem Modul-Kommentar — alles vor dem ersten `import` —,
      // gilt er für jede Abfrage der Datei. Ein Grund pro Datei statt
      // desselben Satzes fünfmal.
      const firstImport = lines.findIndex((l) => /^import\s/.test(l));
      const header = lines.slice(0, firstImport === -1 ? 0 : firstImport).join('\n');
      const fileExcused = EXCEPTION.test(header);
      lines.forEach((line, i) => {
        if (!RESTAURANT_QUERY.test(line)) return;
        // Das Filter-Prädikat darf über mehrere Zeilen laufen (`*[` … `]`),
        // deshalb ein Fenster statt nur der Trefferzeile.
        const window = lines.slice(i, i + 6).join('\n');
        const filtered = window.includes('liveRestaurant(') || /isClosed/.test(window);
        // Die Begründung steht im Kommentarblock direkt darüber — oder,
        // dateiweit, im Modul-Kommentar.
        const excused =
          fileExcused || EXCEPTION.test(lines.slice(Math.max(0, i - 6), i + 1).join('\n'));
        if (!filtered && !excused) {
          offenders.push(`${file}:${i + 1}  ${line.trim()}`);
        }
      });
    }
    expect(
      offenders,
      `Diese Restaurant-Abfragen laufen ohne Katalogfilter. Entweder liveRestaurant() ergänzen — oder darüber begründen:\n  // katalog-ausnahme: <warum diese Abfrage auch geschlossene Spots braucht>\n${offenders.join('\n')}`
    ).toEqual([]);
  });

  it('erkennt einen Marker ohne Begründung nicht als Ausnahme an', () => {
    // Ein blankes „katalog-ausnahme:" wäre die Rückkehr zum Kommentar, der
    // nichts durchsetzt — der Wächter verlangt einen Grund dahinter.
    expect(EXCEPTION.test('// katalog-ausnahme:')).toBe(false);
    expect(EXCEPTION.test('// katalog-ausnahme: Detailseite, auch geschlossen')).toBe(true);
  });
});
