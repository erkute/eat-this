import { describe, expect, it } from 'vitest';
import { splitHeading } from './headingDeck';

describe('splitHeading', () => {
  it('teilt am Gedankenstrich in Name und Unterzeile', () => {
    expect(splitHeading('goldies – für Puristen mit Prinzipien')).toEqual({
      name: 'goldies',
      separator: ' – ',
      deck: 'für Puristen mit Prinzipien',
    });
    expect(splitHeading('BEN RAHIM — Ibrik im Sand')?.name).toBe('BEN RAHIM');
    expect(splitHeading('Distrikt - All-Day-Breakfast')?.deck).toBe('All-Day-Breakfast');
  });

  it('ergibt zusammengesetzt wieder die ganze Überschrift', () => {
    const text = 'Café Frieda  –  für Verabredungen, die gut laufen sollen';
    const parts = splitHeading(text);
    expect(parts && parts.name + parts.separator + parts.deck).toBe(text);
  });

  it('lässt einen Bindestrich im Namen stehen', () => {
    expect(splitHeading('Coffee-Bar Nummer 9')).toBeNull();
    expect(splitHeading('Five Elephant-Kreuzberg – Kuchen')?.name).toBe('Five Elephant-Kreuzberg');
  });

  it('teilt nichts ohne Trenner oder ohne eine Seite', () => {
    expect(splitHeading('Fazit')).toBeNull();
    expect(splitHeading(' – nur Unterzeile')).toBeNull();
    expect(splitHeading('Nur Name – ')).toBeNull();
  });
});
