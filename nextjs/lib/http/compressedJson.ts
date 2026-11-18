import 'server-only';

import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';
import { NextResponse } from 'next/server';

/* Next komprimiert Seiten und Chunks, Antworten von Route-Handlern aber nicht:
   /api/map-data ginge mit rund 380 kB roh raus, egal was der Browser anbietet.
   Am Server braucht die Route unter einer Sekunde, am Telefon käme sie mit
   mehreren Sekunden an; die Zeit steckt in der Leitung, nicht im Rechnen.
   Komprimiert sind es rund 50–60 kB.

   Brotli bei Qualität 5: nah an gzip -9 in der Größe, aber schnell genug für
   eine Antwort pro Aufruf. Beides läuft im libuv-Threadpool, nicht auf dem
   Event-Loop. Unter der Schwelle lohnt der Umweg nicht. */

const brotli = promisify(brotliCompress);
const gzipAsync = promisify(gzip);
const MIN_BYTES = 1024;

type Encoding = 'br' | 'gzip' | null;

/** Liest `Accept-Encoding` mit q-Werten; `q=0` heisst ausdruecklich nein. */
export function pickEncoding(header: string | null): Encoding {
  if (!header) return null;
  const accepted = new Map<string, number>();
  for (const part of header.split(',')) {
    const [name, ...params] = part.trim().toLowerCase().split(';');
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    accepted.set(name, q ? Number(q.slice(2)) || 0 : 1);
  }
  const ok = (name: string) => (accepted.get(name) ?? accepted.get('*') ?? 0) > 0;
  if (ok('br')) return 'br';
  if (ok('gzip')) return 'gzip';
  return null;
}

export async function compressedJson(
  request: Request,
  data: unknown,
  init: { status?: number } = {}
): Promise<NextResponse> {
  const raw = Buffer.from(JSON.stringify(data));
  const encoding =
    raw.length >= MIN_BYTES ? pickEncoding(request.headers.get('accept-encoding')) : null;
  const body =
    encoding === 'br'
      ? await brotli(raw, {
          params: {
            [constants.BROTLI_PARAM_QUALITY]: 5,
            [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
            [constants.BROTLI_PARAM_SIZE_HINT]: raw.length,
          },
        })
      : encoding === 'gzip'
        ? await gzipAsync(raw)
        : raw;
  const response = new NextResponse(new Uint8Array(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
  // Auch unkomprimiert: ein Cache darf die Antwort nur je Kodierung aufheben.
  response.headers.set('Vary', 'Accept-Encoding');
  if (encoding) response.headers.set('Content-Encoding', encoding);
  return response;
}
