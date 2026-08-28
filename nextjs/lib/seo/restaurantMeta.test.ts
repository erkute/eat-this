import { describe, it, expect } from 'vitest';
import {
  buildCuratedRestaurantTitle,
  buildRestaurantTitle,
  truncateAtSentence,
} from './restaurantMeta';

describe('buildRestaurantTitle', () => {
  it('builds the full DE pattern', () => {
    expect(
      buildRestaurantTitle({ name: 'Sofi', cuisineType: 'Bakery', district: 'Mitte', locale: 'de' })
    ).toBe('Sofi – Bäckerei in Berlin-Mitte');
  });

  it('uses the raw cuisine value on EN', () => {
    expect(
      buildRestaurantTitle({ name: 'Sofi', cuisineType: 'Bakery', district: 'Mitte', locale: 'en' })
    ).toBe('Sofi – Bakery in Berlin-Mitte');
  });

  it('falls back to "in Berlin" without district', () => {
    expect(
      buildRestaurantTitle({ name: 'Sofi', cuisineType: 'Bakery', district: null, locale: 'de' })
    ).toBe('Sofi – Bäckerei in Berlin');
  });

  it('avoids double Berlin when the name contains it', () => {
    expect(
      buildRestaurantTitle({
        name: '136 Berlin Restaurant',
        cuisineType: 'Peruvian',
        district: 'Mitte',
        locale: 'de',
      })
    ).toBe('136 Berlin Restaurant – Peruanisch in Mitte');
  });

  it('falls back to the unique name when cuisine and location exceed the budget', () => {
    const t = buildRestaurantTitle({
      name: 'Der Weinlobbyist Restaurant & Weinbar',
      cuisineType: 'Wine Bar',
      district: 'Prenzlauer Berg',
      locale: 'de',
    });
    expect(t).toBe('Der Weinlobbyist Restaurant & Weinbar');
    expect(t.length).toBeLessThanOrEqual(60);
  });

  it('passes unknown cuisine values through', () => {
    expect(
      buildRestaurantTitle({ name: 'X', cuisineType: 'Fusion', district: 'Mitte', locale: 'de' })
    ).toBe('X – Fusion in Berlin-Mitte');
  });

  it('handles missing cuisine and district', () => {
    expect(
      buildRestaurantTitle({ name: 'Sofi', cuisineType: null, district: null, locale: 'de' })
    ).toBe('Sofi – in Berlin');
  });
});

describe('truncateAtSentence', () => {
  it('returns short text unchanged', () => {
    expect(truncateAtSentence('Kurz und gut.')).toBe('Kurz und gut.');
  });

  it('cuts at the last sentence boundary before 155 chars', () => {
    const text =
      'Handgeformtes Sauerteigbrot aus dem Steinofen. Die Zimtschnecken haben Kultstatus und die Schlange reicht am Wochenende bis vor die Tür. ' +
      'Danach folgt ein dritter Satz, der definitiv über das Limit hinausschießt und abgeschnitten werden muss.';
    const out = truncateAtSentence(text);
    expect(out).toBe(
      'Handgeformtes Sauerteigbrot aus dem Steinofen. Die Zimtschnecken haben Kultstatus und die Schlange reicht am Wochenende bis vor die Tür.'
    );
    expect(out.length).toBeLessThanOrEqual(155);
  });

  it('falls back to a word boundary with ellipsis when no sentence end exists', () => {
    const text = 'wort '.repeat(60).trim();
    const out = truncateAtSentence(text);
    expect(out.endsWith(' …')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(155);
  });

  it('collapses whitespace', () => {
    expect(truncateAtSentence('Zwei  Leerzeichen\nund Umbruch.')).toBe(
      'Zwei Leerzeichen und Umbruch.'
    );
  });

  it('falls back to ellipsis when the only sentence end is in the first 40 chars', () => {
    const short = 'Ja. ' + 'x '.repeat(80).trim();
    const out = truncateAtSentence(short);
    expect(out.endsWith(' …')).toBe(true);
  });
});

describe('buildCuratedRestaurantTitle', () => {
  it('adds missing branch qualifiers before applying the title budget', () => {
    const stargarder = buildCuratedRestaurantTitle(
      'Hokey Pokey — Eispatisserie in Prenzlauer Berg',
      'Hokey Pokey Stargarder'
    );
    const oderberger = buildCuratedRestaurantTitle(
      'Hokey Pokey — Eispatisserie in Prenzlauer Berg',
      'Hokey Pokey Oderberger'
    );

    expect(stargarder).not.toBe(oderberger);
    expect(stargarder).toContain('Stargarder');
    expect(oderberger).toContain('Oderberger');
    expect(stargarder.length).toBeLessThanOrEqual(60);
    expect(oderberger.length).toBeLessThanOrEqual(60);
  });
});

describe('title budget without the brand suffix', () => {
  // Genau die Titel, die vorher mitten im Satz gekappt wurden: 51 bzw. 55
  // Zeichen lagen über den 49, die das Suffix übrig ließ — und weg war der
  // Bezirk, also das Standort-Keyword, für das die Seite ranken soll.
  it('keeps a curated title that the brand suffix used to cut', () => {
    const t = buildCuratedRestaurantTitle(
      'Long March Canteen — Chinesische Tapas in Kreuzberg',
      'Long March Canteen'
    );
    expect(t).toBe('Long March Canteen — Chinesische Tapas in Kreuzberg');
    expect(t).not.toContain('…');
  });

  it('still truncates beyond 60 characters', () => {
    const t = buildCuratedRestaurantTitle(
      'Gorilla Bäckerei — Bakery auf dem EUREF-Campus in Berlin-Schöneberg',
      'Gorilla Bäckerei'
    );
    expect(t).toMatch(/…$/);
    expect(t.length).toBeLessThanOrEqual(60);
  });

  it('leaves no brand suffix on the built title either', () => {
    const t = buildRestaurantTitle({
      name: 'Sofi',
      cuisineType: 'Bakery',
      district: 'Mitte',
      locale: 'de',
    });
    expect(t).toBe('Sofi – Bäckerei in Berlin-Mitte');
  });
});
