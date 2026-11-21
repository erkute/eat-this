import { describe, expect, it } from 'vitest';
import { createCspReportGate, parseCspReport, type CspViolation } from './cspReport';

const report = (fields: Record<string, unknown>) => JSON.stringify({ 'csp-report': fields });

describe('parseCspReport', () => {
  it('keeps directive, blocked origin and page path, and drops the query', () => {
    expect(
      parseCspReport(
        report({
          'document-uri': 'https://www.eatthisdot.com/map?me=abc',
          'effective-directive': 'connect-src',
          'blocked-uri': 'https://api.example.com/v1/track?id=7',
          'source-file': 'https://www.eatthisdot.com/_next/static/chunks/app.js',
        })
      )
    ).toEqual({
      directive: 'connect-src',
      blocked: 'https://api.example.com',
      page: '/map',
      source: 'https://www.eatthisdot.com',
    });
  });

  it('reads the directive name out of a full violated-directive line', () => {
    expect(
      parseCspReport(
        report({
          'document-uri': 'https://www.eatthisdot.com/',
          'violated-directive': "script-src 'self' 'unsafe-inline'",
          'blocked-uri': 'eval',
        })
      )
    ).toEqual({ directive: 'script-src', blocked: 'eval', page: '/', source: null });
  });

  it('drops what browser extensions cause', () => {
    expect(
      parseCspReport(
        report({
          'effective-directive': 'font-src',
          'blocked-uri': 'chrome-extension://abcdef/font.woff2',
        })
      )
    ).toBeNull();
    expect(
      parseCspReport(
        report({
          'effective-directive': 'connect-src',
          'blocked-uri': 'https://api.example.com',
          'source-file': 'moz-extension://abcdef/content.js',
        })
      )
    ).toBeNull();
  });

  it('drops what Google Translate loads into a translated page', () => {
    for (const [directive, blocked] of [
      ['img-src', 'https://translate.google.com/gen204?x=1'],
      ['img-src', 'https://www.google.com/images/cleardot.gif'],
      ['style-src-elem', 'https://www.gstatic.com/_/translate_http/_/ss/k=x'],
      ['img-src', 'https://fonts.gstatic.com/s/i/googlematerialicons/x.svg'],
    ]) {
      expect(
        parseCspReport(
          report({
            'document-uri': 'https://www.eatthisdot.com/restaurant/x',
            'effective-directive': directive,
            'blocked-uri': blocked,
          })
        )
      ).toBeNull();
    }
  });

  it('drops anything that is not a report', () => {
    expect(parseCspReport('not json')).toBeNull();
    expect(parseCspReport('null')).toBeNull();
    expect(parseCspReport(JSON.stringify({ other: true }))).toBeNull();
    expect(parseCspReport(report({ 'blocked-uri': 'https://api.example.com' }))).toBeNull();
    expect(
      parseCspReport(report({ 'effective-directive': 'img-src', 'blocked-uri': 'x'.repeat(40) }))
    ).toBeNull();
    expect(
      parseCspReport(report({ 'effective-directive': 'IMG <b>', 'blocked-uri': 'inline' }))
    ).toBeNull();
  });
});

describe('createCspReportGate', () => {
  const violation = (blocked: string): CspViolation => ({
    directive: 'img-src',
    blocked,
    page: '/',
    source: null,
  });
  const day1 = new Date('2026-11-14T10:00:00Z');
  const day2 = new Date('2026-11-15T10:00:00Z');

  it('lets each distinct violation through once a day', () => {
    const allow = createCspReportGate(10);
    expect(allow(violation('https://a.example'), day1)).toBe(true);
    expect(allow(violation('https://a.example'), day1)).toBe(false);
    expect(allow(violation('https://b.example'), day1)).toBe(true);
    expect(allow(violation('https://a.example'), day2)).toBe(true);
  });

  it('stops at the daily cap and starts over the next day', () => {
    const allow = createCspReportGate(2);
    expect(allow(violation('https://a.example'), day1)).toBe(true);
    expect(allow(violation('https://b.example'), day1)).toBe(true);
    expect(allow(violation('https://c.example'), day1)).toBe(false);
    expect(allow(violation('https://c.example'), day2)).toBe(true);
  });
});
