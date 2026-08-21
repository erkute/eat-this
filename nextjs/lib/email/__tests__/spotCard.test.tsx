import { describe, it, expect } from 'vitest';
import {
  isValidSlug,
  spotPhotoUrl,
  SpotCardImage,
  SPOT_CARD_WIDTH,
  SPOT_CARD_HEIGHT,
} from '../spotCard';

describe('isValidSlug', () => {
  it('accepts normal sanity slugs', () => {
    expect(isValidSlug('sofi')).toBe(true);
    expect(isValidSlug('wen-cheng-2')).toBe(true);
  });

  it('rejects empty, traversal and url-ish input', () => {
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('../etc')).toBe(false);
    expect(isValidSlug('https://evil')).toBe(false);
    expect(isValidSlug('a b')).toBe(false);
    expect(isValidSlug('UPPER')).toBe(false);
    expect(isValidSlug('x'.repeat(120))).toBe(false);
  });
});

describe('image url builders', () => {
  it('photo: 4:3 server-crop, forced JPEG (Satori cannot decode WebP)', () => {
    expect(spotPhotoUrl('https://cdn.sanity.io/images/x/y/a.png?w=99')).toBe(
      `https://cdn.sanity.io/images/x/y/a.png?w=${SPOT_CARD_WIDTH}&h=${SPOT_CARD_HEIGHT}&fit=crop&fm=jpg&q=80`
    );
  });
});

describe('SpotCardImage', () => {
  const spot = {
    name: 'Sofi',
    area: 'Mitte',
    cuisine: 'Bakery',
    photo: 'https://cdn.sanity.io/images/x/y/a.png',
  };

  function flatten(node: unknown): string {
    return JSON.stringify(node);
  }

  it('composes the public restaurant photo, name and meta line', () => {
    const tree = flatten(SpotCardImage({ spot }));
    expect(tree).toContain('fm=jpg'); // photo layer
    expect(tree).toContain('Sofi'); // name in the brand face
    expect(tree).toContain('Mitte · Bakery'); // meta under the name, as on home
    expect(tree).not.toContain('rotate(14deg)');
    expect(tree).not.toContain('fm=png');
  });

  it('sets every type layer in the brand face, never a system font', () => {
    // Satori knows no system fonts — a stray family name renders as a blank box.
    const tree = flatten(SpotCardImage({ spot }));
    expect(tree).toContain('EatThisDisplay');
    expect(tree).not.toContain('Schoolbell');
    expect(tree).not.toContain('Saira');
  });

  it('handles a missing cuisine without a dangling separator', () => {
    const tree = flatten(SpotCardImage({ spot: { ...spot, cuisine: undefined } }));
    expect(tree).toContain('Mitte');
    expect(tree).not.toContain('Mitte ·');
  });
});
