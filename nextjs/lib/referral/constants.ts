// Shared, dependency-free referral constants. Imported by BOTH the edge
// middleware and the node API route — keep free of firebase/node imports.

export const REFERRER_COOKIE = 'pending_referrer'

// Bonus size per successful referral (inviter AND friend). Internal only —
// NEVER surface this number in UI copy (see no-spot-counts rule).
export const REFERRAL_BONUS_SIZE = 10

// Cookie Max-Age: 30 days, in seconds.
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30

// Plausible-Firebase-uid shape check for the ?ref value.
export const UID_SHAPE = /^[a-zA-Z0-9]{20,40}$/

// New-account freshness window (ms). Only friend accounts created within this
// window of the confirm call reward the inviter.
export const ACCOUNT_FRESHNESS_MS = 10 * 60 * 1000
