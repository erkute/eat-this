/**
 * Who not to count.
 *
 * In the edge logs about four out of five requests are automated. Without this
 * the numbers are not "slightly high", they are wrong by a factor of five.
 *
 *   1. Declared crawlers, by user agent. The easy half.
 *   2. Lighthouse. It runs real Chrome, executes JavaScript and therefore
 *      reaches this endpoint like a visitor would - our own CI does it on every
 *      push and PR to main (.lighthouserc.json: five URLs, three runs each).
 *      GitHub runners live in Azure's address space and look like a render
 *      crawler from there.
 *
 *      Lighthouse 12 sends its emulated phone UA WITHOUT the "Chrome-Lighthouse"
 *      suffix (header and navigator.userAgent identical, no marker). So
 *      `lighthouse` in the declared list never matches, and an IP condition
 *      cannot help: the runners rotate through ranges no regex keeps up with,
 *      and x-forwarded-for is not reliably the caller.
 *
 *      The device string alone is the signature. Since Chrome 110 (UA
 *      reduction) a real Android phone reports itself as "Android 10; K" - no
 *      living person can send "moto g power (2022)" from a current browser.
 *      Lighthouse's constant is the only source of that string.
 *
 *   3. The browser pane of the Claude desktop app. It is ordinary Chrome with
 *      "Claude/<version>" in the UA and keeps its own cookie jar, so the
 *      /admin/stats opt-out never reaches it - every smoke test run against
 *      production from there would stand in the numbers as a visit.
 *      `claudebot` in the list below is the crawler; this is the app.
 *
 *   4. Vulnerability scanners send an ordinary browser UA - in the logs they
 *      show up as /wp-admin/install.php, /ip, /contact. No UA filter sees them.
 *      What catches them there is the response status; here it is the path
 *      allowlist in the route, since a 404 never reaches this endpoint at all.
 */

const DECLARED =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link|whatsapp|telegram|preview|monitor|uptime|curl|wget|python-requests|axios|okhttp|headless|lighthouse|pagespeed|gtmetrix|semrush|ahrefs|mj12|dotbot|petalbot|yandex|baidu|applebot|amazonbot|gptbot|claudebot|perplexity|bytespider/i;

/** Lighthouse's emulated phone (lighthouse-core/config/constants.js). */
const LIGHTHOUSE_UA = /moto g power \(2022\)/i;

/** The Claude desktop app's built-in browser, e.g. "… Claude/2.9939.2 Chrome/152…". */
const CLAUDE_APP_UA = /\bClaude\/\d/;

/** True for traffic that must not appear in any count. */
export function isAutomated(userAgent: string | null): boolean {
  const ua = userAgent ?? '';
  // An empty UA is not a browser. Every real one sends something.
  if (!ua.trim()) return true;
  return DECLARED.test(ua) || LIGHTHOUSE_UA.test(ua) || CLAUDE_APP_UA.test(ua);
}
