import { describe, expect, it } from 'vitest';
import { METADATA_DESCRIPTION_MAX, METADATA_TITLE_MAX, buildBrandedTitle, buildPlainTitle, truncateMetadataDescription } from './metadata-text';

describe('buildBrandedTitle', () => {
  it('adds the compact brand once', () => {
    expect(buildBrandedTitle('Die beste Pizza in Berlin')).toBe(
      'Die beste Pizza in Berlin | EAT THIS'
    );
    expect(buildBrandedTitle('Die beste Pizza in Berlin | Eat This Berlin')).toBe(
      'Die beste Pizza in Berlin | EAT THIS'
    );
  });

  it('drops the brand instead of cutting a title that fits 60 on its own', () => {
    const title = 'Brammibal’s and Atelier Dough: two takes on a good donut';
    expect(title.length).toBeGreaterThan(49);
    expect(buildBrandedTitle(title)).toBe(title);
  });

  it('keeps the brand while title and brand fit 60 together', () => {
    const title = 'Ari’s Berlin: Smash Burgers in a Courtyard Diner';
    expect(buildBrandedTitle(title)).toBe(`${title} | EAT THIS`);
    expect(buildBrandedTitle(title).length).toBeLessThanOrEqual(METADATA_TITLE_MAX);
  });

  it('cuts only what does not fit 60 even without the brand', () => {
    const title = buildBrandedTitle(
      'Hokey Pokey Boutique — Eis & Concept-Store in Prenzlauer Berg, Berlin'
    );
    expect(title.length).toBeLessThanOrEqual(METADATA_TITLE_MAX);
    expect(title.endsWith('…')).toBe(true);
    expect(title).not.toContain('EAT THIS');
  });
});

describe('buildPlainTitle', () => {
  it('keeps the full 60 characters for the title itself', () => {
    const sixty = 'Restaurants in Berlin-Prenzlauer Berg – Qualitaet statt Hype';
    expect(sixty).toHaveLength(60);
    expect(buildPlainTitle(sixty)).toBe(sixty);
  });

  it('adds no brand suffix', () => {
    expect(buildPlainTitle('Restaurants in Berlin-Mitte')).toBe('Restaurants in Berlin-Mitte');
  });

  it('still strips a trailing brand the editor typed in', () => {
    expect(buildPlainTitle('Restaurants in Berlin-Mitte | Eat This')).toBe(
      'Restaurants in Berlin-Mitte'
    );
  });

  it('truncates past 60 rather than letting the SERP cut mid-word', () => {
    const long = 'Restaurants in Berlin-Charlottenburg – Kueche, Kantine, Kantstrasse';
    const out = buildPlainTitle(long);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('truncateMetadataDescription', () => {
  it('keeps descriptions within the metadata budget', () => {
    const description = truncateMetadataDescription('Langer Satz ohne Punkt '.repeat(20));
    expect(description.length).toBeLessThanOrEqual(METADATA_DESCRIPTION_MAX);
  });

  it('prefers a complete sentence when one fits', () => {
    const description = truncateMetadataDescription(
      'Ein vollständiger erster Satz mit genug Substanz für das Snippet. ' +
        'Der zweite Satz ist absichtlich so lang, dass er nicht mehr vollständig in das festgelegte Description-Budget passt und deshalb wegfällt.'
    );
    expect(description).toBe('Ein vollständiger erster Satz mit genug Substanz für das Snippet.');
  });
});
