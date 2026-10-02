import { describe, expect, it } from 'vitest';
import { chapterShortLabel, splitHeading } from './headingDeck';

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

describe('chapterShortLabel', () => {
  it('schneidet die Erklärung hinter dem Gedankenstrich ab', () => {
    expect(chapterShortLabel('Kolo Coffee – Mikrorösterei mit Wettkampf-Bohnen')).toBe(
      'Kolo Coffee'
    );
    expect(chapterShortLabel('BEN RAHIM — Ibrik im Sand, ohne Zucker')).toBe('BEN RAHIM');
    expect(chapterShortLabel('Distrikt - All-Day-Breakfast an der Bergstraße')).toBe('Distrikt');
  });

  it('lässt einen Bindestrich im Namen selbst stehen', () => {
    // Ohne Leerzeichen drumherum ist der Strich Teil des Namens.
    expect(chapterShortLabel('Coffee-Bar Nummer 9')).toBe('Coffee-Bar Nummer 9');
  });

  it('lässt Überschriften ohne Trenner ganz', () => {
    expect(chapterShortLabel('Fazit')).toBe('Fazit');
  });

  it('gibt nie einen leeren Namen zurück', () => {
    // Eine Überschrift, die mit dem Trenner anfängt, hätte sonst nichts übrig.
    expect(chapterShortLabel('– Nachtrag')).toBe('– Nachtrag');
  });
});
