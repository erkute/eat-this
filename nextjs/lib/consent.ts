/**
 * Cookie consent state.
 *
 * Lives in a COOKIE, not localStorage, for one reason: the answer has to be
 * knowable before the first paint. The banner is `position: fixed` and its
 * height feeds `--consent-bar-h`, which the map subtracts from
 * `--phone-list-sheet-visible` so the bar cannot cover the filter row. While
 * the answer sat in localStorage it could only be read after hydration, so the
 * map laid out at the wrong height first and corrected 175px later — a single
 * layout shift worth CLS 0.108 on /map against a 0.10 budget, measured. A
 * cookie is readable synchronously in the pre-paint bootstrap (and server-side
 * if a route ever wants it), which is what lets the space be reserved up front.
 *
 * Values are the same three the banner always used, so nothing downstream had
 * to learn a new vocabulary: 'accepted' | 'declined' | absent (undecided).
 */

export const CONSENT_COOKIE = 'cookieConsent';

/** Also the old localStorage key — read once for migration, never written. */
export const CONSENT_LEGACY_KEY = 'cookieConsent';

export type ConsentValue = 'accepted' | 'declined';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function isConsentValue(value: string | null | undefined): value is ConsentValue {
  return value === 'accepted' || value === 'declined';
}

/** Current consent, or null when the user has not answered yet. */
export function readConsent(): ConsentValue | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return isConsentValue(value) ? value : null;
}

export function writeConsent(value: ConsentValue): void {
  if (typeof document === 'undefined') return;
  // No `Secure`: localhost is plain http and would silently drop the cookie,
  // which would reopen the banner on every dev reload. SameSite=Lax is enough
  // here — this is a UI preference, not an auth token.
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax`;
}

export function clearConsent(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

/**
 * One-time move of an existing answer out of localStorage.
 *
 * Without this every user who already decided would be asked again on the
 * deploy that ships the cookie. Returns the migrated value so the caller can
 * treat it as the current answer in the same tick.
 */
export function migrateLegacyConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null;
  let legacy: string | null = null;
  try {
    legacy = window.localStorage.getItem(CONSENT_LEGACY_KEY);
  } catch {
    // Safari private mode throws on localStorage access — nothing to migrate.
    return null;
  }
  if (!isConsentValue(legacy)) return null;
  writeConsent(legacy);
  try {
    window.localStorage.removeItem(CONSENT_LEGACY_KEY);
  } catch {
    // Keeping the stale key is harmless: the cookie now wins every read.
  }
  return legacy;
}

/**
 * Drop the pre-paint reservation once the banner is gone.
 *
 * The bootstrap sets `data-consent="pending"` before first paint, and the CSS
 * behind that attribute is what reserves the bar's height. It has to come off
 * when the user answers, or the map keeps a 175px gap for a bar that will
 * never appear again.
 */
export function setConsentPendingAttribute(pending: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (pending) root.setAttribute('data-consent', 'pending');
  else root.removeAttribute('data-consent');
}
