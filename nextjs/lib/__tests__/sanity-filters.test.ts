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

  it('fragt `isOpen` nirgends ohne `isClosed` ab', () => {
    const offenders: string[] = [];
    for (const file of [...sources('lib'), ...sources('app')]) {
      if (file.endsWith(join('lib', 'sanity-filters.ts'))) continue; // die Quelle selbst
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (GROQ_IS_OPEN.test(line) && !line.includes('isClosed')) {
            offenders.push(`${file}:${i + 1}  ${line.trim()}`);
          }
        });
    }
    expect(offenders, `Diese Abfragen filtern isOpen ohne isClosed — liveRestaurant() benutzen:\n${offenders.join('\n')}`).toEqual([]);
  });
});
