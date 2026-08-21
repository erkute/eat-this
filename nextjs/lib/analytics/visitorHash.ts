import { createHash } from 'node:crypto';

/**
 * A visitor identity that cannot outlive the day it describes.
 *
 * Counting "how many people" needs SOMETHING comparable between two requests,
 * and no cookie may be involved - a cookie is the one thing that would drag
 * this under TDDDG 25 and back behind the consent dialog. So the identity is
 * derived from what the request already carries (IP + user agent), salted with
 * a server-only secret, and re-salted every day: yesterday's hash and today's
 * hash for the same person share no relationship anyone can compute.
 *
 * Be precise about what this is: the hash IS stored, briefly, because the
 * dedupe cannot work otherwise - App Hosting runs up to 10 instances, so an
 * in-memory set would count the same visitor once per instance. It is stored
 * salted, it is never stored next to the page someone looked at, and the TTL
 * policy on analytics_seen.expiresAt deletes it. Do not describe it as "never
 * stored"; the privacy policy has to match what the code does.
 *
 * Same construction as the buddy rate limiter (app/api/buddy/route.ts) - raw
 * IPs are never written down there either.
 */

/** Calendar day in Berlin, so a "day" means what the reader thinks it means. */
export function berlinDay(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function visitorHash(ip: string, userAgent: string, day: string, salt: string): string {
  return createHash('sha256')
    .update(`${ip} ${userAgent} ${day} ${salt}`)
    .digest('hex')
    .slice(0, 40);
}

/**
 * The salt is required in production and only in production: without it every
 * deploy would silently fall back to a public constant, and a public constant
 * turns the hash into something anyone can recompute from an IP.
 */
export function countSalt(): string {
  const salt = process.env.COUNT_SALT;
  if (salt) return salt;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('COUNT_SALT is required in production');
  }
  return 'eat-this-count-dev';
}
