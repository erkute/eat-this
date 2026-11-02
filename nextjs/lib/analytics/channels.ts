export const CHANNELS = [
  ['google', 'Google-Suche'],
  ['search', 'Andere Suchmaschinen'],
  ['social', 'Social Media'],
  ['email', 'Newsletter / E-Mail'],
  ['paid', 'Bezahlte Kampagnen'],
  ['referral', 'Andere Websites'],
  ['none', 'Ohne externen Verweis'],
] as const;
export type Channel = (typeof CHANNELS)[number][0];
const within = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);
/** Kampagnen senden nur eine feste Kategorie; keine UTM-Texte werden gespeichert. */
export function channelOf(referrer: unknown, hint: unknown): Channel {
  if (hint === 'email' || hint === 'paid' || hint === 'social') return hint;
  let host = '';
  try {
    host = new URL(typeof referrer === 'string' ? referrer : '').hostname.toLowerCase();
  } catch {}
  if (!host || within(host, 'eatthisdot.com')) return 'none';
  if (
    [
      'google.com',
      'google.de',
      'google.co.uk',
      'google.fr',
      'google.it',
      'google.es',
      'google.at',
      'google.ch',
      'google.nl',
      'google.be',
    ].some((domain) => host === domain || host === `www.${domain}`)
  )
    return 'google';
  if (
    [
      'bing.com',
      'duckduckgo.com',
      'ecosia.org',
      'qwant.com',
      'search.yahoo.com',
      'brave.com',
      'yandex.com',
    ].some((domain) => within(host, domain))
  )
    return 'search';
  if (
    [
      'instagram.com',
      'facebook.com',
      't.co',
      'x.com',
      'twitter.com',
      'tiktok.com',
      'pinterest.com',
      'pinterest.de',
      'reddit.com',
      'threads.net',
      'threads.com',
      'linkedin.com',
    ].some((domain) => within(host, domain))
  )
    return 'social';
  return 'referral';
}
export function channelHint(search: string): 'email' | 'paid' | 'social' | null {
  const medium = (new URLSearchParams(search).get('utm_medium') ?? '').trim().toLowerCase();
  if (['email', 'newsletter'].includes(medium)) return 'email';
  if (['cpc', 'ppc', 'paid', 'paid_social', 'paid-search', 'display'].includes(medium))
    return 'paid';
  return medium === 'social' ? 'social' : null;
}
