import { afterEach, describe, expect, it, vi } from 'vitest';
import { berlinDay, countSalt, visitorHash } from './visitorHash';

const IP = '84.13.22.9';
const UA = 'Mozilla/5.0 (Macintosh) Chrome/136';

describe('berlinDay', () => {
  /* Berlin, not UTC: in summer the two disagree for two hours every night, and
   * a "day" in the dashboard has to mean the day the reader had. */
  it('uses the Berlin calendar day, not UTC', () => {
    expect(berlinDay(new Date('2026-08-20T22:30:00Z'))).toBe('2026-08-21');
    expect(berlinDay(new Date('2026-08-20T21:30:00Z'))).toBe('2026-08-20');
  });

  it('handles winter time, when the offset is one hour', () => {
    expect(berlinDay(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-16');
    expect(berlinDay(new Date('2026-01-15T22:30:00Z'))).toBe('2026-01-15');
  });
});

describe('visitorHash', () => {
  it('is stable for the same person on the same day', () => {
    expect(visitorHash(IP, UA, '2026-08-21', 's')).toBe(visitorHash(IP, UA, '2026-08-21', 's'));
  });

  /* The rotation is the privacy property: yesterday's hash and today's share no
   * computable relationship, so the collection cannot become a profile. */
  it('is unrelated across days', () => {
    expect(visitorHash(IP, UA, '2026-08-21', 's')).not.toBe(visitorHash(IP, UA, '2026-08-22', 's'));
  });

  it('is unrelated across salts', () => {
    expect(visitorHash(IP, UA, '2026-08-21', 'a')).not.toBe(visitorHash(IP, UA, '2026-08-21', 'b'));
  });

  it.each([
    ['a different IP', '84.13.22.10', UA],
    ['a different browser', IP, 'Mozilla/5.0 (iPhone) Safari/604'],
  ])('separates %s', (_label, ip, ua) => {
    expect(visitorHash(ip, ua, '2026-08-21', 's')).not.toBe(visitorHash(IP, UA, '2026-08-21', 's'));
  });

  it('does not leak the IP into the hash', () => {
    expect(visitorHash(IP, UA, '2026-08-21', 's')).not.toContain('84');
    expect(visitorHash(IP, UA, '2026-08-21', 's')).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe('countSalt', () => {
  const previous = process.env.COUNT_SALT;
  const previousEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (previous === undefined) delete process.env.COUNT_SALT;
    else process.env.COUNT_SALT = previous;
    vi.stubEnv('NODE_ENV', previousEnv ?? 'test');
  });

  it('uses the configured salt', () => {
    process.env.COUNT_SALT = 'from-secret-manager';
    expect(countSalt()).toBe('from-secret-manager');
  });

  /* Falling back to a public constant in production would make every hash
   * recomputable from an IP by anyone who read this file. Fail instead. */
  it('refuses to fall back in production', () => {
    delete process.env.COUNT_SALT;
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => countSalt()).toThrow(/COUNT_SALT/);
  });

  it('falls back in development, so local work needs no secret', () => {
    delete process.env.COUNT_SALT;
    vi.stubEnv('NODE_ENV', 'development');
    expect(countSalt()).toBe('eat-this-count-dev');
  });
});
