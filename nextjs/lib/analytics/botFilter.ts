/**
 * Who not to count.
 *
 * Measured against 14 days of edge logs (06.-19.08.2026, 78985 requests): 79 %
 * of all traffic was automated. Without this the numbers are not "slightly
 * high", they are wrong by a factor of five.
 *
 * Two filters, and both are needed:
 *
 *  1. Declared crawlers, by user agent. The easy half.
 *  2. Lighthouse. It runs real Chrome, executes JavaScript and therefore
 *     reaches this endpoint like a visitor would - our own CI does it on every
 *     push and PR to main (.lighthouserc.json: five URLs, three runs each), and
 *     the "Azure render crawler" of August turned out to be exactly that:
 *     GitHub runners live in Azure's address space.
 *
 *     Lighthouse 12 sends its emulated phone UA WITHOUT the "Chrome-Lighthouse"
 *     suffix - proven on 03.09.2026 against a local echo page (header and
 *     navigator.userAgent identical, no marker) and in the edge log (456
 *     beacons in 8 h, all bare). So `lighthouse` in the declared list never
 *     matched, and an IP condition cannot help: the runners rotate through
 *     ranges no regex keeps up with (128.24.x, 9.234.x, 48.214.x, 172.174.x
 *     were all missing), and x-forwarded-for is not reliably the caller.
 *
 *     The device string alone is the signature. Since Chrome 110 (UA
 *     reduction) a real Android phone reports itself as "Android 10; K" - no
 *     living person can send "moto g power (2022)" from a current browser.
 *     Lighthouse's constant is the only source of that string.
 *
 *  3. Vulnerability scanners send an ordinary browser UA - in the logs they
 *     show up as /wp-admin/install.php, /ip, /contact. No UA filter sees them.
 *     What catches them there is the response status; here it is the path
 *     allowlist in the route, since a 404 never reaches this endpoint at all.
 */

const DECLARED =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link|whatsapp|telegram|preview|monitor|uptime|curl|wget|python-requests|axios|okhttp|headless|lighthouse|pagespeed|gtmetrix|semrush|ahrefs|mj12|dotbot|petalbot|yandex|baidu|applebot|amazonbot|gptbot|claudebot|perplexity|bytespider/i;

/** Lighthouse's emulated phone (lighthouse-core/config/constants.js). */
const LIGHTHOUSE_UA = /moto g power \(2022\)/i;

/** True for traffic that must not appear in any count. */
export function isAutomated(userAgent: string | null): boolean {
  const ua = userAgent ?? '';
  // An empty UA is not a browser. Every real one sends something.
  if (!ua.trim()) return true;
  return DECLARED.test(ua) || LIGHTHOUSE_UA.test(ua);
}
