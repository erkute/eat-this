import { describe, it, expect } from 'vitest';
import { CUISINE_LABELS_DE, localizedCuisine } from './cuisineLabels';

describe('localizedCuisine', () => {
  it('lässt die englischen Rohwerte auf /en stehen', () => {
    expect(localizedCuisine('Wine Bar', 'en')).toBe('Wine Bar');
  });

  it('übersetzt auf den deutschen Seiten', () => {
    expect(localizedCuisine('Wine Bar', 'de')).toBe('Weinbar');
  });

  /* Werte, die im Bestand stehen und in der Tabelle leicht fehlen: Ohne Eintrag
     trägt ein Spot auf den deutschen Seiten ein englisches Label, und in Remys
     Chat stehen dann „ITALIAN / PIZZA" und „ITALIENISCH" in derselben Antwort
     untereinander. */
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

  it('kennt Fusion, obwohl es auf Deutsch gleich heißt', () => {
    expect(CUISINE_LABELS_DE.Fusion).toBe('Fusion');
  });

  it('lässt einen unbekannten Wert stehen, statt ihn zu verschlucken', () => {
    expect(localizedCuisine('Ethiopian', 'de')).toBe('Ethiopian');
    expect(CUISINE_LABELS_DE.Ethiopian).toBeUndefined();
  });
});
