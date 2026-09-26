import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { compressedJson, pickEncoding } from './compressedJson';

const big = {
  restaurants: Array.from({ length: 200 }, (_, i) => ({ id: `r${i}`, name: 'Kitten Deli' })),
};
const req = (acceptEncoding?: string) =>
  new Request('https://example.com/api/map-data', {
    headers: acceptEncoding ? { 'accept-encoding': acceptEncoding } : {},
  });
const bytes = async (res: Response) => Buffer.from(await res.arrayBuffer());

describe('pickEncoding', () => {
  it('nimmt Brotli vor gzip und respektiert q=0', () => {
    expect(pickEncoding('gzip, deflate, br, zstd')).toBe('br');
    expect(pickEncoding('gzip, br;q=0')).toBe('gzip');
    expect(pickEncoding('identity')).toBeNull();
    expect(pickEncoding('*')).toBe('br');
    expect(pickEncoding(null)).toBeNull();
  });
});

describe('compressedJson', () => {
  it('packt mit Brotli, wenn der Browser es anbietet', async () => {
    const res = await compressedJson(req('gzip, br'), big);
    expect(res.headers.get('content-encoding')).toBe('br');
    expect(res.headers.get('vary')).toBe('Accept-Encoding');
    const body = await bytes(res);
    expect(body.length).toBeLessThan(JSON.stringify(big).length / 4);
    expect(JSON.parse(brotliDecompressSync(body).toString())).toEqual(big);
  });

  it('faellt auf gzip zurueck', async () => {
    const res = await compressedJson(req('gzip'), big);
    expect(res.headers.get('content-encoding')).toBe('gzip');
    expect(JSON.parse(gunzipSync(await bytes(res)).toString())).toEqual(big);
  });

  it('bleibt roh ohne Angebot und bei kleinen Antworten', async () => {
    const plain = await compressedJson(req(), big);
    expect(plain.headers.get('content-encoding')).toBeNull();
    expect(await plain.json()).toEqual(big);

    const small = await compressedJson(req('br'), { ok: true });
    expect(small.headers.get('content-encoding')).toBeNull();
    expect(await small.json()).toEqual({ ok: true });
  });

  it('traegt Status und JSON-Typ', async () => {
    const res = await compressedJson(req(), { error: 'x' }, { status: 401 });
    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toBe('application/json');
  });
});
