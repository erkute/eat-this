// nextjs/lib/cuisineLabels.test.ts
import { describe, it, expect } from 'vitest';
import { CUISINE_LABELS_DE, localizedCuisine } from './cuisineLabels';

describe('localizedCuisine', () => {
  it('lässt die englischen Rohwerte auf /en stehen', () => {
    expect(localizedCuisine('Wine Bar', 'en')).toBe('Wine Bar');
  });

  it('übersetzt auf den deutschen Seiten', () => {
    expect(localizedCuisine('Wine Bar', 'de')).toBe('Weinbar');
  });

  /* Die sechs Werte, die am 09.09.2026 im Bestand standen, aber nicht in der
     Tabelle: 13 Spots trugen auf den deutschen Seiten ein englisches Label.
     Aufgefallen in Remys Chat, wo „ITALIAN / PIZZA" und „ITALIENISCH" in
     derselben Antwort untereinander standen. */
  it.each([
    ['Italian / Pizza', 'Pizza'],
    ['Japanese / Ramen', 'Ramen'],
    ['Sandwiches', 'Sandwiches'],
    ['Desserts', 'Desserts'],
    ['Vegetarian', 'Vegetarisch'],
    ['Spanish', 'Spanisch'],
  ])('kennt %s', (raw, expected) => {
    expect(localizedCuisine(raw, 'de')).toBe(expected);
  });

  it('lässt einen unbekannten Wert stehen, statt ihn zu verschlucken', () => {
    expect(localizedCuisine('Ethiopian', 'de')).toBe('Ethiopian');
    expect(CUISINE_LABELS_DE.Ethiopian).toBeUndefined();
  });
});
