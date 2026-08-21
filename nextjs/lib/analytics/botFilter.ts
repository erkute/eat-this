/**
 * Who not to count.
 *
 * Measured against 14 days of edge logs (06.-19.08.2026, 78985 requests): 79 %
 * of all traffic was automated. Without this the numbers are not "slightly
 * high", they are wrong by a factor of five.
 *
 * Three filters, and all three are needed - each one alone still lies:
 *
 *  1. Declared crawlers, by user agent. The easy half.
 *  2. The disguised Azure render crawler: real Chrome UA, executes JavaScript,
 *     ~2500 pages a day and climbing since it appeared on 16.08.2026. It WILL
 *     reach this endpoint, because running JS is exactly what it does. UA alone
 *     would drop real Motorola owners; the IP range alone would drop anything
 *     else hosted on Azure. Both have to match.
 *  3. Vulnerability scanners send an ordinary browser UA - in the logs they
 *     show up as /wp-admin/install.php, /ip, /contact. No UA filter sees them.
 *     What catches them there is the response status; here it is the path
 *     allowlist in the route, since a 404 never reaches this endpoint at all.
 */

const DECLARED =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link|whatsapp|telegram|preview|monitor|uptime|curl|wget|python-requests|axios|okhttp|headless|lighthouse|pagespeed|gtmetrix|semrush|ahrefs|mj12|dotbot|petalbot|yandex|baidu|applebot|amazonbot|gptbot|claudebot|perplexity|bytespider/i;

const AZURE_UA = /moto g power \(2022\)/i;
const AZURE_IP = /^(?:20|4|40|52|57)\.|^64\.236\.|^135\.119\.|^168\.62\.|^172\.18\d\./;

/** True for traffic that must not appear in any count. */
export function isAutomated(userAgent: string | null, ip: string | null): boolean {
  const ua = userAgent ?? '';
  // An empty UA is not a browser. Every real one sends something.
  if (!ua.trim()) return true;
  if (DECLARED.test(ua)) return true;
  return AZURE_UA.test(ua) && AZURE_IP.test(ip ?? '');
}
