import { describe, expect, it } from 'vitest';
import { OPEN_STATUS_LABELS } from './openingHours';
import { translations } from '@/lib/i18n/translations';

/**
 * Der Offen-Zustand wird an vier Stellen erzeugt: Map-Sheet und Map-Liste
 * ziehen ihre Wörter über next-intl aus `translations.map`, die Remy-Retrieval
 * und der Zustands-Chip der Spot-Seite haben dort keinen Kontext und nehmen
 * `OPEN_STATUS_LABELS`.
 *
 * Zwei Quellen für dieselben vier Wörter laufen auseinander, sobald jemand nur
 * eine anfasst — genau das war passiert: die Retrieval sagte „Offen", während
 * Map und Spot-Seite „Geöffnet" zeigten, und kein Test hat es bemerkt. Dieser
 * hier bemerkt es.
 */
describe('OPEN_STATUS_LABELS', () => {
  for (const locale of ['de', 'en'] as const) {
    it(`stimmt für ${locale} mit translations.map überein`, () => {
      const t = translations[locale].map;
      expect(OPEN_STATUS_LABELS[locale]).toEqual({
        open: t.open,
        closed: t.closed,
        opens: t.opens,
        closes: t.closes,
      });
    });
  }
});
