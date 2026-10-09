import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  findPageImage,
  isPublicAddress,
  parseRemoteUrl,
  RemoteImageError,
  sniffImageType,
} from './remoteImage.server';

describe('isPublicAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.20.0.1',
    '192.168.178.49',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fe80::1',
    'fd00::1',
    '::ffff:127.0.0.1',
    '64:ff9b::a9fe:a9fe',
    '64:ff9b::169.254.169.254',
  ])('blocks %s', (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each(['93.184.216.34', '151.101.1.140', '2606:4700::6810:85e5', '::ffff:93.184.216.34'])(
    'allows %s',
    (address) => {
      expect(isPublicAddress(address)).toBe(true);
    }
  );

  it('rejects hostnames, which only the lookup may resolve', () => {
    expect(isPublicAddress('localhost')).toBe(false);
  });
});

describe('parseRemoteUrl', () => {
  it('accepts plain http and https links', () => {
    expect(parseRemoteUrl('https://example.com/a.jpg').hostname).toBe('example.com');
    expect(parseRemoteUrl('http://example.com:80/a.jpg').hostname).toBe('example.com');
  });

  it.each([
    'ftp://example.com/a.jpg',
    'file:///etc/passwd',
    'https://user:pw@example.com/a.jpg',
    'https://example.com:8443/a.jpg',
    'http://127.0.0.1/a.jpg',
    'http://[::1]/a.jpg',
    'http://169.254.169.254/latest/meta-data',
    'kein link',
  ])('rejects %s', (link) => {
    expect(() => parseRemoteUrl(link)).toThrow(RemoteImageError);
  });
});

describe('sniffImageType', () => {
  it('recognises the formats by their first bytes', () => {
    expect(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(
      'image/jpeg'
    );
    expect(
      sniffImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))
    ).toBe('image/png');
    expect(sniffImageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp');
    expect(sniffImageType(Buffer.from('GIF89a\0\0\0\0\0\0'))).toBe('image/gif');
    expect(sniffImageType(Buffer.from('\0\0\0\x1cftypavif\0\0'))).toBe('image/avif');
  });

  it('does not trust html that claims to be an image', () => {
    expect(sniffImageType(Buffer.from('<!doctype html><html>'))).toBeNull();
  });
});

describe('findPageImage', () => {
  const page = new URL('https://example.com/spot/ari');

  it('prefers og:image and resolves relative links', () => {
    const html = `<head>
      <meta name="twitter:image" content="https://cdn.example.com/twitter.jpg">
      <meta property="og:image" content="/media/hero.jpg?w=1200&amp;q=80">
    </head>`;
    expect(findPageImage(html, page)).toBe('https://example.com/media/hero.jpg?w=1200&q=80');
  });

  it('accepts the attribute order content-first', () => {
    const html = `<meta content="https://cdn.example.com/a.webp" property="og:image" />`;
    expect(findPageImage(html, page)).toBe('https://cdn.example.com/a.webp');
  });

  it('falls back to twitter:image', () => {
    const html = `<meta name="twitter:image" content="https://cdn.example.com/t.png">`;
    expect(findPageImage(html, page)).toBe('https://cdn.example.com/t.png');
  });

  it('returns null without a preview image', () => {
    expect(findPageImage('<meta name="description" content="x">', page)).toBeNull();
  });
});
