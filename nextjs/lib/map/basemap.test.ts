import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const light = JSON.parse(readFileSync('public/basemap/style.json', 'utf8'));
const dark = JSON.parse(readFileSync('public/basemap/style-dark.json', 'utf8'));

describe('basemap palettes', () => {
  it('preserves sources, layer geometry and label hierarchy across themes', () => {
    expect(dark.sources).toEqual(light.sources);
    expect(dark.glyphs).toEqual(light.glyphs);
    const structure = (style: typeof light) => style.layers.map((layer: Record<string, unknown>) => {
      const { paint, ...geometry } = layer;
      return { ...geometry, paint: Object.fromEntries(Object.entries(paint as Record<string, unknown> || {}).filter(([key]) => !key.endsWith('-color'))) };
    });
    expect(structure(dark)).toEqual(structure(light));
    expect(dark.layers.find((layer: { type: string }) => layer.type === 'background').paint['background-color']).not.toBe(light.layers.find((layer: { type: string }) => layer.type === 'background').paint['background-color']);
  });
});
