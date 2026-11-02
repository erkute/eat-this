import { it, expect } from 'vitest';
import { channelOf, channelHint } from './channels';
it('ordnet nur feste Herkunftskategorien zu und verwechselt interne Aufrufe nicht mit Referrals', () => {
  expect(channelOf('https://www.google.de/search', null)).toBe('google');
  expect(channelOf('https://mail.google.com/', null)).toBe('referral');
  expect(channelOf('https://maps.google.de/', null)).toBe('referral');
  expect(channelOf('https://l.instagram.com', null)).toBe('social');
  expect(channelOf('https://www.eatthisdot.com/news', null)).toBe('none');
  expect(channelOf('', null)).toBe('none');
  expect(channelOf('https://google.de.evil.example', null)).toBe('referral');
  expect(channelHint('?utm_medium=email&utm_campaign=private')).toBe('email');
  expect(channelHint('?utm_medium=beliebiger-text')).toBeNull();
});
