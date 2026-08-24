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

  it('keeps long titles within the final title budget', () => {
    const title = buildBrandedTitle(
      'Hokey Pokey Boutique — Eis & Concept-Store in Prenzlauer Berg'
    );
    expect(title.length).toBeLessThanOrEqual(METADATA_TITLE_MAX);
    expect(title).toMatch(/… \| EAT THIS$/);
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
