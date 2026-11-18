/**
 * Who not to count.
 *
 * In the edge logs most requests are automated; without this the numbers are
 * wrong by a multiple, not slightly high.
 *
 *   1. Declared crawlers, by user agent. The easy half.
 *   2. Lighthouse. It runs real Chrome, executes JavaScript and therefore
 *      reaches this endpoint like a visitor would; our own CI runs it.
 *      GitHub runners live in Azure's address space and look like a render
 *      crawler from there.
 *
 *      Lighthouse sends its emulated phone UA without the "Chrome-Lighthouse"
 *      suffix, so `lighthouse` in the declared list never matches, and an IP
 *      condition cannot help: the runners rotate through ranges no regex
 *      keeps up with, and x-forwarded-for is not reliably the caller.
 *
 *      The device string alone is the signature. Since UA reduction a real
 *      Android phone reports itself as "Android 10; K"; no current browser
 *      sends "moto g power (2022)". Lighthouse's constant is the only source
 *      of that string.
 *
 *   3. The browser pane of the Claude desktop app. It is ordinary Chrome with
 *      "Claude/<version>" in the UA and keeps its own cookie jar, so the
 *      /admin/stats opt-out never reaches it. `claudebot` in the list below is
 *      the crawler; this is the app.
 *
 *   4. Vulnerability scanners send an ordinary browser UA. No UA filter sees
 *      them; here the path allowlist in the route catches them, since a 404
 *      never reaches this endpoint at all.
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
