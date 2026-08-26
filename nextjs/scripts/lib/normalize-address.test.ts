import { describe, it, expect } from 'vitest';
import { normalizeAddress } from '../import-from-url';

describe('normalizeAddress', () => {
  it('collapses the borough form Google sometimes returns', () => {
    expect(
      normalizeAddress(
        'Skalitzer Str. 105, 10997 Berlin-Bezirk Friedrichshain-Kreuzberg, Deutschland'
      )
    ).toBe('Skalitzer Str. 105, 10997 Berlin, Deutschland');
  });

  it('leaves the short form untouched', () => {
    expect(normalizeAddress('Richardstraße 100, 12043 Berlin, Deutschland')).toBe(
      'Richardstraße 100, 12043 Berlin, Deutschland'
    );
  });

  it('does not touch a street that merely starts with Berlin', () => {
    expect(normalizeAddress('Berliner Str. 119, 13187 Berlin, Deutschland')).toBe(
      'Berliner Str. 119, 13187 Berlin, Deutschland'
    );
  });

  it('keeps addresses outside Berlin intact', () => {
    expect(normalizeAddress('Greiffenberger Str. 8, 16278 Angermünde, Deutschland')).toBe(
      'Greiffenberger Str. 8, 16278 Angermünde, Deutschland'
    );
  });
});
