/**
 * Cookie consent state — and the proof that it was given.
 *
 * The answer lives in a COOKIE, not localStorage, so it is knowable
 * synchronously — before hydration, and server-side if a route ever wants it.
 * The consent gate is a blocking dialog, and reading the answer late would
 * mean flashing it at people who already answered.
 *
 * Two cookies, because they have different lifetimes:
 *
 *   cookieConsent  '<value>.<version>' — the decision. Cleared when someone
 *                  reopens the dialog to change their mind.
 *   consentId      an opaque random id for this browser. Survives a change of
 *                  mind so the consent log can show the whole sequence of
 *                  decisions rather than isolated rows. Written only once an
 *                  answer exists; undecided visitors get no id.
 *
 * Both are strictly necessary under TDDDG 25(2): one so we stop asking, the
 * other so the Art. 7(1) record can be tied to the browser that holds it.
 */
export const CONSENT_COOKIE = 'cookieConsent';
export const CONSENT_ID_COOKIE = 'consentId';

/**
 * Bump whenever the dialog's purposes or its description of them change.
 *
 * Art. 7(1) asks us to show what someone agreed to, which only works if the
 * stored answer names a specific version of the question. A stored version
 * that is not this one reads as undecided, so the dialog comes back and the
 * new text gets its own answer. That also means bumping this re-asks everyone
 * — which is the point, not a side effect.
 *
 * 2 is the first version with a record behind it. Answers from before this
 * shipped carry no version and cannot be evidenced, so they do not survive.
 *
 * 3 names Adobe Fonts (Typekit) and Sentry under third parties. Both already
 * ran on every page load and both see the visitor's IP; only the dialog had
 * stayed quiet about them, so answers to version 2 were given to an
 * incomplete list.
 */
export const CONSENT_VERSION = 3;

export type ConsentValue = 'accepted' | 'declined';

export interface ConsentDecision {
  value: ConsentValue;
  version: number;
}

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
/** The id outlives any single decision so the log can chain them together. */
const ID_MAX_AGE_SECONDS = ONE_YEAR_SECONDS * 2;

function isConsentValue(value: string | null | undefined): value is ConsentValue {
  return value === 'accepted' || value === 'declined';
}

/** Pure half of readConsent, so the format has tests that need no document. */
export function parseConsentCookie(raw: string | null): ConsentDecision | null {
  if (!raw) return null;
  const parts = raw.split('.');
  // Exactly two parts, and the version has to be digits: Number('') is 0 and
  // destructuring quietly ignores a third field, so a lax check would read
  // 'accepted.' and 'accepted.2.5' as valid answers.
  if (parts.length !== 2) return null;
  const [value, version] = parts;
  if (!isConsentValue(value) || !/^\d+$/.test(version)) return null;
  return { value, version: Number(version) };
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// No `Secure`: localhost is plain http and would silently drop the cookie,
// which would reopen the banner on every dev reload. SameSite=Lax is enough
// here — neither of these is an auth token.
function writeCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

/**
 * The current answer, or null when there is none that still counts.
 *
 * An answer to an older version of the question is deliberately not one: it
 * reads as undecided so the dialog asks again.
 */
export function readConsent(): ConsentValue | null {
  const decision = parseConsentCookie(readCookie(CONSENT_COOKIE));
  if (!decision || decision.version !== CONSENT_VERSION) return null;
  return decision.value;
}

/** The browser's consent id, or null before any answer has been given. */
export function readConsentId(): string | null {
  const id = readCookie(CONSENT_ID_COOKIE);
  return id && /^[a-f0-9-]{8,64}$/.test(id) ? id : null;
}

/**
 * crypto.randomUUID needs a secure context; `next dev` on a LAN address is not
 * one, and an id that throws there would take the whole answer down with it.
 */
function newConsentId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Reuses the existing id when there is one, so a change of mind stays linked. */
export function ensureConsentId(): string {
  const existing = readConsentId();
  if (existing) return existing;
  const id = newConsentId();
  writeCookie(CONSENT_ID_COOKIE, id, ID_MAX_AGE_SECONDS);
  return id;
}

export function writeConsent(value: ConsentValue): void {
  writeCookie(CONSENT_COOKIE, `${value}.${CONSENT_VERSION}`, ONE_YEAR_SECONDS);
}

/** Clears the decision only. The id stays: the log needs the thread. */
export function clearConsent(): void {
  writeCookie(CONSENT_COOKIE, '', 0);
}

/**
 * File the decision server-side — the Art. 7(1) record.
 *
 * Best effort on purpose. keepalive so it survives the page being closed, and
 * a failure never blocks the answer: a visitor who clicked must not be held on
 * a blocking dialog because Firestore had a bad second. A record that does not
 * arrive costs us evidence, not the user their choice.
 */
export function recordConsent(value: ConsentValue, locale: string): void {
  if (typeof window === 'undefined') return;
  try {
    void fetch('/api/consent', {
      method: 'POST',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: ensureConsentId(),
        value,
        version: CONSENT_VERSION,
        locale,
      }),
    }).catch(() => {});
  } catch {
    // Recording must never be the reason an answer fails to register.
  }
}
