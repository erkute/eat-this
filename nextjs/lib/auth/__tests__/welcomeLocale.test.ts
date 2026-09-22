import { describe, it, expect } from 'vitest';
import { welcomeLocale } from '@/lib/auth/welcomeLocale';

const link = (continueUrl: string) =>
  // Firebase haengt an den Link ein eigenes `lang` auf oberster Ebene — das
  // gehoert seinem Handler und darf hier nichts entscheiden.
  `?mode=signIn&oobCode=x&lang=de&continueUrl=${encodeURIComponent(continueUrl)}`;

describe('welcomeLocale', () => {
  it('nimmt die Sprache aus der Continue-URL', () => {
    expect(welcomeLocale(link('https://x.test/en?lang=en'), '')).toBe('en');
  });

  it('der Link schlaegt den Cookie — in beide Richtungen', () => {
    expect(welcomeLocale(link('https://x.test/?lang=de'), 'NEXT_LOCALE=en')).toBe('de');
    expect(welcomeLocale(link('https://x.test/en?lang=en'), 'NEXT_LOCALE=de')).toBe('en');
  });

  it('faellt fuer alte Links auf den Cookie zurueck, dann auf Deutsch', () => {
    expect(welcomeLocale(link('https://x.test/'), 'a=1; NEXT_LOCALE=en')).toBe('en');
    expect(welcomeLocale(link('https://x.test/'), '')).toBe('de');
    expect(welcomeLocale('', 'NEXT_LOCALE=fr')).toBe('de');
  });

  it('ignoriert Unbekanntes und Kaputtes', () => {
    expect(welcomeLocale(link('https://x.test/?lang=fr'), '')).toBe('de');
    expect(welcomeLocale('?continueUrl=%%%', 'NEXT_LOCALE=%E0')).toBe('de');
  });
});
