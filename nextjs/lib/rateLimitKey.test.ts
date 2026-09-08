import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { rateLimitKey } from './rateLimitKey';

const IPV4 = '84.13.22.9';
const IPV6 = '2a02:8109:9c80:1f00:c1b:6ba9:6d3e:8f21';
const EMAIL = 'gast@example.com';

describe('rateLimitKey', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  /* Der eigentliche Punkt: der Schluessel wird zur Dokument-ID in
   * `_rateLimits`. Was hier durchrutscht, liegt in der Datenbank.
   *
   * Der Beweis liegt nicht im Suchen nach Bruchstuecken — in 40 Hex-Zeichen
   * steht „84" irgendwann zufaellig — sondern in der Form: hinter dem Praefix
   * kommen ausschliesslich Hex-Ziffern. Ein Punkt, ein Doppelpunkt, ein @
   * oder irgendein Buchstabe jenseits von f kann dort nicht stehen, und damit
   * kann kein Stueck einer Adresse dort stehen. */
  it.each([
    ['eine IPv4', IPV4],
    ['eine IPv6', IPV6],
    ['eine Mailadresse', EMAIL],
  ])('traegt %s nicht im Schluessel', (_label, identity) => {
    const key = rateLimitKey('deck', identity);
    expect(key).not.toContain(identity);
    expect(key).toMatch(/^deck:[0-9a-f]{40}$/);
    // Die Trennzeichen der Kennung ueberleben nicht (der Doppelpunkt hinter
    // dem Praefix gehoert dem Schluessel, nicht der Kennung).
    const hash = key.slice('deck:'.length);
    for (const char of new Set(identity.replace(/[0-9a-f]/g, ''))) {
      expect(hash, `„${char}" steckt in ${key}`).not.toContain(char);
    }
  });

  it('ist Praefix plus 40 Hex-Zeichen und sonst nichts', () => {
    expect(rateLimitKey('magic-link:ip', IPV6)).toMatch(/^magic-link:ip:[0-9a-f]{40}$/);
  });

  /* Ein Deckel, der nicht wiedererkennt, deckelt nichts. */
  it('ist stabil fuer dieselbe Herkunft', () => {
    expect(rateLimitKey('deck', IPV4)).toBe(rateLimitKey('deck', IPV4));
  });

  it('trennt zwei Herkuenfte', () => {
    expect(rateLimitKey('deck', IPV4)).not.toBe(rateLimitKey('deck', '84.13.22.10'));
  });

  /* Zwei Fenster derselben Route duerfen sich nicht gegenseitig verbrauchen. */
  it('trennt zwei Praefixe fuer dieselbe Herkunft', () => {
    expect(rateLimitKey('magic-link:ip', IPV4)).not.toBe(rateLimitKey('deck', IPV4));
  });

  /* Ohne Salt waere der Hash aus einer IP nachrechenbar — dann stuende die
   * Adresse effektiv doch in der Datenbank. */
  it('haengt am Salt', () => {
    vi.stubEnv('COUNT_SALT', 'salz-a');
    const a = rateLimitKey('deck', IPV4);
    vi.stubEnv('COUNT_SALT', 'salz-b');
    expect(rateLimitKey('deck', IPV4)).not.toBe(a);
  });

  /* Der Tages-Salt rotiert um Mitternacht Berlin — der Preis dafuer, dass aus
   * `_rateLimits` kein Bestand ueber Tage wird. */
  it('rotiert ueber den Berliner Tageswechsel', () => {
    vi.stubEnv('COUNT_SALT', 'salz');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-08T21:30:00Z')); // 23:30 Berlin
    const abends = rateLimitKey('deck', IPV4);
    vi.setSystemTime(new Date('2026-09-08T22:30:00Z')); // 00:30 Berlin
    expect(rateLimitKey('deck', IPV4)).not.toBe(abends);
  });

  /* Firestore-Dokument-IDs duerfen keinen Schraegstrich enthalten und nicht
   * „." oder „.." heissen; der Hash kann beides nicht produzieren, eine roh
   * durchgereichte Kennung dagegen schon. */
  it('ergibt eine gueltige Firestore-Dokument-ID', () => {
    const key = rateLimitKey('magic-link:email', EMAIL);
    expect(key).not.toContain('/');
    expect(key).not.toMatch(/^\.\.?$/);
    expect(Buffer.byteLength(key, 'utf8')).toBeLessThan(1500);
  });
});

/* Der Wachhund. Die Umstellung oben nuetzt nichts, wenn die naechste Route
 * wieder `\`x:${ip}\`` schreibt — das ist genau, wie die Deck-Seite dazu kam. */
const SOURCE_ROOTS = ['app', 'lib'];

/** Rohe Kennungen, die niemals in einen Ratenlimit-Schluessel gehoeren.
 *  Wortgrenzen, damit `ipHash`, `clientIpHash` und `emailHash` durchgehen —
 *  die sind ja die Loesung, nicht das Problem. */
const RAW_IDENTITY = /\$\{[^}]*\b(ip|email|clientIp|xff|userAgent|remoteIp)\b[^}]*\}/i;

/** Erstes Argument jedes checkRateLimit-Aufrufs, sofern es ein Template ist. */
const RATE_LIMIT_TEMPLATE = /checkRateLimit(?:FailClosed)?\(\s*`([^`]*)`/g;

function sourceFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        walk(full);
      } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
        out.push(full);
      }
    }
  };
  walk(join(process.cwd(), root));
  return out;
}

describe('kein Ratenlimit-Schluessel enthaelt eine rohe Kennung', () => {
  it('findet ueberhaupt Aufrufer (sonst prueft der Test nichts)', () => {
    const withCalls = SOURCE_ROOTS.flatMap(sourceFiles).filter((file) =>
      readFileSync(file, 'utf8').includes('checkRateLimit')
    );
    expect(withCalls.length).toBeGreaterThan(3);
  });

  it('kein Template-Schluessel interpoliert IP, Mailadresse oder User-Agent', () => {
    const offenders: string[] = [];
    for (const file of SOURCE_ROOTS.flatMap(sourceFiles)) {
      const source = readFileSync(file, 'utf8');
      for (const [, template] of source.matchAll(RATE_LIMIT_TEMPLATE)) {
        if (RAW_IDENTITY.test(template)) {
          offenders.push(`${relative(process.cwd(), file)}: \`${template}\``);
        }
      }
    }
    expect(offenders, 'gehashte Kennung benutzen: rateLimitKey(praefix, kennung)').toEqual([]);
  });

  /* Die zwei Stellen, an denen es schon einmal schiefging — namentlich, damit
   * ein Rueckfall nicht nur „irgendwo" auffaellt. */
  it.each([
    ['app/[locale]/deck/[uid]/page.tsx', "rateLimitKey('deck', ip)"],
    ['app/api/auth/send-magic-link/route.ts', "rateLimitKey('magic-link:ip', ip)"],
    ['app/api/auth/send-magic-link/route.ts', "rateLimitKey('magic-link:email', email)"],
  ])('%s deckelt ueber %s', (file, call) => {
    expect(readFileSync(join(process.cwd(), file), 'utf8')).toContain(call);
  });
});
