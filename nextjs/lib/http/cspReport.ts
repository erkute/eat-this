/**
 * What a browser's CSP violation report boils down to.
 *
 * The policy in next.config.ts runs as Report-Only: it blocks nothing and only
 * tells this endpoint what it WOULD have blocked. Only what is needed to fix
 * the allowlist is kept: the directive, the blocked origin and the page's
 * path. Query strings, full URLs and anything about the visitor are dropped.
 */
export interface CspViolation {
  directive: string;
  /** Origin of the blocked resource, or a keyword such as `inline` or `eval`. */
  blocked: string;
  /** Path of the page that reported it, without query. */
  page: string;
  /** Origin of the script that triggered it, when the browser names one. */
  source: string | null;
}

// Extensions inject their own resources into every page they touch. Those
// violations say nothing about the site and would drown out the real ones.
const EXTENSION_SCHEME = /^(chrome|moz|safari|safari-web|ms-browser)-extension:/i;
const DIRECTIVE = /^[a-z][a-z-]{2,39}$/;
const KEYWORD = /^[a-z][a-z-]{0,19}$/;

function originOf(value: string): string | null {
  try {
    const url = new URL(value);
    return /^(https?|wss?):$/.test(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

function pathOf(value: string): string {
  try {
    return new URL(value).pathname.slice(0, 200);
  } catch {
    return '';
  }
}

/** Returns null for anything that is not a usable report. */
export function parseCspReport(raw: string): CspViolation | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const report = (parsed as { 'csp-report'?: unknown } | null)?.['csp-report'];
  if (typeof report !== 'object' || report === null) return null;
  const field = (name: string): string => {
    const value = (report as Record<string, unknown>)[name];
    return typeof value === 'string' ? value.trim() : '';
  };

  // Older browsers send the whole directive line in `violated-directive`.
  const directive = (field('effective-directive') || field('violated-directive')).split(/\s+/)[0];
  if (!DIRECTIVE.test(directive)) return null;

  const blockedRaw = field('blocked-uri');
  const sourceRaw = field('source-file');
  if (EXTENSION_SCHEME.test(blockedRaw) || EXTENSION_SCHEME.test(sourceRaw)) return null;

  const blocked = originOf(blockedRaw) ?? (KEYWORD.test(blockedRaw) ? blockedRaw : null);
  if (!blocked) return null;

  return {
    directive,
    blocked,
    page: pathOf(field('document-uri')),
    source: originOf(sourceRaw),
  };
}

/**
 * Lets each distinct violation through once per day and server instance, and
 * no more than `maxPerDay` distinct ones. The endpoint is unauthenticated: the
 * cap is what keeps invented reports from filling the error quota.
 */
export function createCspReportGate(maxPerDay: number) {
  let day = '';
  const seen = new Set<string>();
  return (violation: CspViolation, now: Date = new Date()): boolean => {
    const today = now.toISOString().slice(0, 10);
    if (today !== day) {
      day = today;
      seen.clear();
    }
    const key = `${violation.directive}|${violation.blocked}`;
    if (seen.has(key) || seen.size >= maxPerDay) return false;
    seen.add(key);
    return true;
  };
}
