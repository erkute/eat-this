import { describe, it, expect } from 'vitest';
import { postSignInTarget } from '@/lib/auth/postSignInTarget';

const ORIGIN = 'https://www.eatthisdot.com';
const target = (search: string, home = '/') => postSignInTarget(search, ORIGIN, home);

describe('postSignInTarget', () => {
  it('goes home when the link carries no destination', () => {
    expect(target('')).toBe('/');
    expect(target('?mode=signIn&oobCode=abc')).toBe('/');
  });

  it('honours the locale home for an EN sign-in', () => {
    expect(target('', '/en')).toBe('/en');
  });

  it('returns the path the link asked for', () => {
    const cu = encodeURIComponent(`${ORIGIN}/map?r=vox-restaurant-bar`);
    expect(target(`?continueUrl=${cu}`)).toBe('/map?r=vox-restaurant-bar');
  });

  it('drops the email carrier the mail added', () => {
    // `e` exists so sign-in survives opening in a second browser. Once it has
    // done that, printing the address in the landing page's URL bar is a leak
    // with no purpose.
    const cu = encodeURIComponent(`${ORIGIN}/map?r=vox&e=someone%40example.com`);
    expect(target(`?continueUrl=${cu}`)).toBe('/map?r=vox');
  });

  it('refuses a foreign origin', () => {
    const cu = encodeURIComponent('https://evil.example/steal');
    expect(target(`?continueUrl=${cu}`)).toBe('/');
  });

  it('refuses a protocol-relative host, which resolves off-origin', () => {
    // '//evil.example' against a base URL is NOT a path — it is that host.
    expect(target(`?continueUrl=${encodeURIComponent('//evil.example/steal')}`)).toBe('/');
  });

  it('refuses to bounce back through the sign-in handler', () => {
    // The code in the URL is spent by the time this runs; a second pass
    // through /welcome would land on the expired-link screen.
    const cu = encodeURIComponent(`${ORIGIN}/welcome?mode=signIn`);
    expect(target(`?continueUrl=${cu}`)).toBe('/');
  });

  it('goes home rather than throwing on a value URL cannot parse', () => {
    expect(target(`?continueUrl=${encodeURIComponent('http://')}`)).toBe('/');
  });

  it('never leaves our origin, whatever it is handed', () => {
    // The guarantee is the origin, not a tidy path: junk that still resolves
    // against our own base is harmless — it lands on our own 404 — while
    // anything pointing elsewhere has to come back as home.
    const nasty = [
      '%ZZ',
      'javascript:alert(1)',
      '//evil.example',
      'https://evil.example/x',
      'http://www.eatthisdot.com.evil.example/x',
      '\\\\evil.example',
    ];
    for (const raw of nasty) {
      const out = target(`?continueUrl=${encodeURIComponent(raw)}`);
      expect(new URL(out, ORIGIN).origin).toBe(ORIGIN);
    }
  });

  it('keeps a relative destination, resolved against our own origin', () => {
    expect(target(`?continueUrl=${encodeURIComponent('/profile')}`)).toBe('/profile');
  });
});
