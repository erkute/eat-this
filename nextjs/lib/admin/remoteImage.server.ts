import 'server-only';
import { lookup } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';

// Holt ein Foto, dessen Link jemand im Studio einfügt. Der Link kommt von
// außen, also läuft jeder Abruf durch drei Sperren: nur http(s) auf den
// Standard-Ports, nur öffentliche Adressen — geprüft beim Verbindungsaufbau,
// nicht vorab, damit ein DNS-Wechsel zwischen Prüfung und Abruf nichts
// aufmacht — und eine Obergrenze für Zeit, Größe und Weiterleitungen.
//
// Zeigt der Link auf eine Seite statt auf ein Bild, nimmt der Abruf deren
// og:image. So reicht der Link, den man im Browser oben kopiert.

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 15_000;
const USER_AGENT = 'Mozilla/5.0 (compatible; EatThisStudio/1.0; +https://www.eatthisdot.com)';

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

// Zwei getrennte Listen: Eine IPv6-Regel wie ::ffff:0:0/96 träfe in einer
// gemeinsamen BlockList auch jede reine IPv4-Adresse, weil Node IPv4 intern
// als ::ffff:a.b.c.d vergleicht.
const blockedV4 = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blockedV4.addSubnet(net, prefix, 'ipv4');
}
const blockedV6 = new BlockList();
for (const [net, prefix] of [
  ['::', 128],
  ['::1', 128],
  // IPv4 in IPv6 verpackt. Die gepunktete Schreibweise prüft embeddedIpv4
  // vorab gegen die IPv4-Liste; die hexadezimale ist hier pauschal zu.
  ['::ffff:0:0', 96],
  ['64:ff9b::', 96],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
  ['2001:db8::', 32],
] as const) {
  blockedV6.addSubnet(net, prefix, 'ipv6');
}

export class RemoteImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RemoteImageError';
  }
}

/** IPv4-mapped (::ffff:a.b.c.d) und NAT64 (64:ff9b::a.b.c.d) zählen als IPv4. */
function embeddedIpv4(address: string): string | null {
  const match = /^(?:::ffff:|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  return match ? match[1] : null;
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blockedV4.check(address, 'ipv4');
  if (family === 6) {
    const v4 = embeddedIpv4(address);
    if (v4) return isPublicAddress(v4);
    return !blockedV6.check(address, 'ipv6');
  }
  return false;
}

const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, '', 0);
    const list = addresses as { address: string; family: number }[];
    if (list.length === 0 || !list.every((entry) => isPublicAddress(entry.address))) {
      return callback(new RemoteImageError('Diese Adresse ist nicht öffentlich erreichbar.'), '', 0);
    }
    if (options.all) {
      (callback as unknown as (err: null, all: typeof list) => void)(null, list);
      return;
    }
    callback(null, list[0].address, list[0].family);
  });
};

export function parseRemoteUrl(value: string): URL {
  if (value.length > 2048) throw new RemoteImageError('Der Link ist zu lang.');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new RemoteImageError('Das ist kein gültiger Link.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new RemoteImageError('Nur Links mit http oder https gehen.');
  }
  if (url.username || url.password) {
    throw new RemoteImageError('Links mit Zugangsdaten gehen nicht.');
  }
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new RemoteImageError('Nur Links auf den Standard-Ports gehen.');
  }
  // Eine nackte IP im Link prüft der Lookup nicht — sie wird direkt verbunden.
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) && !isPublicAddress(host)) {
    throw new RemoteImageError('Diese Adresse ist nicht öffentlich erreichbar.');
  }
  return url;
}

interface RawResponse {
  status: number;
  location: string | null;
  contentType: string;
  body: Buffer;
}

function requestOnce(url: URL, maxBytes: number, signal: AbortSignal): Promise<RawResponse> {
  const transport = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = transport.get(
      url,
      {
        lookup: publicOnlyLookup,
        signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'image/avif,image/webp,image/*,text/html;q=0.8,*/*;q=0.5',
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = typeof res.headers.location === 'string' ? res.headers.location : null;
        const contentType = (res.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
        if (status >= 300 && status < 400) {
          res.resume();
          resolve({ status, location, contentType, body: Buffer.alloc(0) });
          return;
        }
        const declared = Number(res.headers['content-length']);
        if (Number.isFinite(declared) && declared > maxBytes) {
          res.destroy();
          reject(new RemoteImageError('Das Bild ist größer als 20 MB.'));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            res.destroy();
            reject(new RemoteImageError('Das Bild ist größer als 20 MB.'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => resolve({ status, location, contentType, body: Buffer.concat(chunks) }));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
  });
}

async function fetchFollowing(start: URL, maxBytes: number, signal: AbortSignal) {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await requestOnce(url, maxBytes, signal);
    if (res.status >= 300 && res.status < 400) {
      if (!res.location) throw new RemoteImageError('Der Link leitet ins Leere weiter.');
      url = parseRemoteUrl(new URL(res.location, url).toString());
      continue;
    }
    if (res.status < 200 || res.status >= 300) {
      throw new RemoteImageError(`Die Seite antwortet mit Fehler ${res.status}.`);
    }
    return { ...res, url };
  }
  throw new RemoteImageError('Zu viele Weiterleitungen.');
}

/** Erkennt das Format an den ersten Bytes — der Content-Type darf lügen. */
export function sniffImageType(body: Buffer): string | null {
  if (body.length < 12) return null;
  if (body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return 'image/jpeg';
  if (body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (body.subarray(0, 4).toString('ascii') === 'GIF8') return 'image/gif';
  if (body.subarray(0, 4).toString('ascii') === 'RIFF' && body.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  if (body.subarray(4, 12).toString('ascii').startsWith('ftypavi')) return 'image/avif';
  return null;
}

/** og:image (oder twitter:image) aus einer HTML-Seite, als absoluter Link. */
export function findPageImage(html: string, pageUrl: URL): string | null {
  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  const wanted = ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src'];
  const found = new Map<string, string>();
  for (const tag of metas) {
    const key = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    const content = /\bcontent\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (key && content && wanted.includes(key) && !found.has(key)) found.set(key, content);
  }
  for (const key of wanted) {
    const value = found.get(key);
    if (!value) continue;
    try {
      return new URL(value.replace(/&amp;/g, '&'), pageUrl).toString();
    } catch {
      continue;
    }
  }
  return null;
}

export interface RemoteImage {
  body: Buffer;
  contentType: string;
  filename: string;
  /** Wo das Bild tatsächlich herkam (nach Weiterleitungen und og:image). */
  imageUrl: string;
  /** Die Seite, falls der Link auf eine Seite statt auf ein Bild zeigte. */
  pageUrl: string | null;
}

function filenameFor(url: URL, contentType: string): string {
  const last = decodeURIComponent(url.pathname.split('/').pop() ?? '').replace(/[^\w.-]+/g, '-');
  const base = last.replace(/\.[a-z0-9]+$/i, '').slice(0, 60) || 'foto';
  return `${base}.${IMAGE_TYPES[contentType] ?? 'jpg'}`;
}

export async function fetchRemoteImage(link: string): Promise<RemoteImage> {
  const start = parseRemoteUrl(link.trim());
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  try {
    let res = await fetchFollowing(start, Math.max(MAX_IMAGE_BYTES, MAX_HTML_BYTES), signal);
    let pageUrl: string | null = null;

    if (!sniffImageType(res.body) && /html/.test(res.contentType)) {
      const imageLink = findPageImage(res.body.subarray(0, MAX_HTML_BYTES).toString('utf8'), res.url);
      if (!imageLink) {
        throw new RemoteImageError(
          'Auf der Seite ist kein Vorschaubild hinterlegt. Kopiere den Link des Bildes selbst (Rechtsklick → Bildadresse kopieren).'
        );
      }
      pageUrl = res.url.toString();
      res = await fetchFollowing(parseRemoteUrl(imageLink), MAX_IMAGE_BYTES, signal);
    }

    const contentType = sniffImageType(res.body);
    if (!contentType) {
      throw new RemoteImageError('Unter dem Link liegt kein Bild (JPG, PNG, WebP, GIF oder AVIF).');
    }
    return {
      body: res.body,
      contentType,
      filename: filenameFor(res.url, contentType),
      imageUrl: res.url.toString(),
      pageUrl,
    };
  } catch (error) {
    if (error instanceof RemoteImageError) throw error;
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new RemoteImageError('Die Seite hat zu lange gebraucht.');
    }
    throw new RemoteImageError('Der Link ließ sich nicht abrufen.');
  }
}
