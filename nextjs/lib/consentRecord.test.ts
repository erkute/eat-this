import { describe, expect, it } from 'vitest';
import { parseConsentBody } from '@/lib/consentRecord';

/* The endpoint is unauthenticated and writes the log we would produce if
 * someone ever disputes a consent. A row nobody can vouch for is worse than no
 * row, so anything that is not exactly the expected shape is refused. */
describe('parseConsentBody', () => {
  const valid = {
    id: '3f2a1b4c-5d6e-7f80-9012-3456789abcde',
    value: 'accepted',
    version: 2,
    locale: 'de',
  };

  it('accepts a well-formed record', () => {
    expect(parseConsentBody(valid)).toEqual(valid);
  });

  it('drops unknown fields rather than storing them', () => {
    expect(parseConsentBody({ ...valid, ip: '1.2.3.4', email: 'a@b.c' })).toEqual(valid);
  });

  it.each([
    ['a missing id', { ...valid, id: undefined }],
    ['an id with punctuation', { ...valid, id: 'abc; DROP' }],
    ['a short id', { ...valid, id: 'abc' }],
    ['an invented answer', { ...valid, value: 'sure' }],
    ['a non-integer version', { ...valid, version: 1.5 }],
    ['a version of zero', { ...valid, version: 0 }],
    ['a version as a string', { ...valid, version: '2' }],
    ['an unsupported locale', { ...valid, locale: 'fr' }],
    ['a non-object', 'accepted'],
    ['null', null],
  ])('rejects %s', (_label, body) => {
    expect(parseConsentBody(body)).toBeNull();
  });
});
