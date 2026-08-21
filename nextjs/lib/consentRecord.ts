/**
 * Shape and validation of one row in the consent log.
 *
 * Lives here rather than in the route because a Next route module may only
 * export its HTTP handlers and the framework's config keys — exporting the
 * parser from route.ts fails the generated route types. Being its own module
 * also means the validation has tests that never touch Firestore.
 */
export interface ConsentRecord {
  id: string;
  value: 'accepted' | 'declined';
  version: number;
  locale: 'de' | 'en';
}

/**
 * The endpoint is unauthenticated and writes the log we would produce if a
 * consent is ever disputed. A row nobody can vouch for is worse than no row,
 * so everything is checked, nothing is trusted, and unknown fields are dropped
 * rather than stored.
 */
export function parseConsentBody(raw: unknown): ConsentRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const { id, value, version, locale } = raw as Record<string, unknown>;
  if (typeof id !== 'string' || !/^[a-f0-9-]{8,64}$/.test(id)) return null;
  if (value !== 'accepted' && value !== 'declined') return null;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > 9999)
    return null;
  if (locale !== 'de' && locale !== 'en') return null;
  return { id, value, version, locale };
}
