import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import { createCspReportGate, parseCspReport } from '@/lib/http/cspReport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A real report is a few hundred bytes.
const MAX_BODY = 8 * 1024;
const allowReport = createCspReportGate(10);

// Target of `report-uri` in the Report-Only policy (next.config.ts). Browsers
// post here on their own and ignore the answer, so every outcome is a 204.
export async function POST(request: Request) {
  const done = new NextResponse(null, { status: 204 });

  const raw = await request.text().catch(() => '');
  if (!raw || raw.length > MAX_BODY) return done;

  const violation = parseCspReport(raw);
  if (!violation || !allowReport(violation)) return done;

  console.warn('[csp-report]', JSON.stringify(violation));
  Sentry.captureMessage(`CSP would block ${violation.blocked} (${violation.directive})`, {
    level: 'warning',
    fingerprint: ['csp-report', violation.directive, violation.blocked],
    extra: { page: violation.page, source: violation.source },
  });
  return done;
}
