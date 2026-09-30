import { describe, expect, it } from 'vitest';
import { spotNameWithoutDistrict } from './spotNameWithoutDistrict';

describe('spotNameWithoutDistrict', () => {
  it('drops the district the name ends with', () => {
    expect(spotNameWithoutDistrict('AERA Charlottenburg', 'Charlottenburg')).toBe('AERA');
  });

  it('drops a district set off by a dash or comma', () => {
    expect(spotNameWithoutDistrict('Kitten Deli – Neukölln', 'Neukölln')).toBe('Kitten Deli');
    expect(spotNameWithoutDistrict('Kitten Deli, Neukölln', 'Neukölln')).toBe('Kitten Deli');
  });

  it('ignores case and handles two-word districts', () => {
    expect(spotNameWithoutDistrict('Bonanza prenzlauer berg', 'Prenzlauer Berg')).toBe('Bonanza');
  });

  it('keeps names that only contain the district elsewhere or are nothing else', () => {
    expect(spotNameWithoutDistrict('Kreuzberger Himmel', 'Kreuzberg')).toBe('Kreuzberger Himmel');
    expect(spotNameWithoutDistrict('Mitte Bar', 'Mitte')).toBe('Mitte Bar');
    expect(spotNameWithoutDistrict('Mitte', 'Mitte')).toBe('Mitte');
    expect(spotNameWithoutDistrict('Neumitte', 'Mitte')).toBe('Neumitte');
  });

  it('passes the name through without a district', () => {
    expect(spotNameWithoutDistrict('Sabich', undefined)).toBe('Sabich');
    expect(spotNameWithoutDistrict('Sabich', '')).toBe('Sabich');
  });
});
