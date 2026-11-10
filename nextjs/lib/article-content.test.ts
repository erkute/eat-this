import { describe, expect, it } from 'vitest';
import { articleContent } from './article-content';
const de = [{ _type: 'block', _key: 'de' }];
const en = [{ _type: 'block', _key: 'en' }];
describe('article translation fallback', () => {
  it('keeps the selected translation when present', () => {
    expect(articleContent({ content: en, contentDe: de }, 'de')).toBe(de);
    expect(articleContent({ content: en, contentDe: de }, 'en')).toBe(en);
  });
  it('renders German for missing and empty English bodies', () => {
    expect(articleContent({ contentDe: de }, 'en')).toBe(de);
    expect(articleContent({ content: [], contentDe: de }, 'en')).toBe(de);
  });
  it('renders English for an empty German draft and tolerates no content', () => {
    expect(articleContent({ content: en, contentDe: [] }, 'de')).toBe(en);
    expect(articleContent({}, 'en')).toEqual([]);
  });
});
