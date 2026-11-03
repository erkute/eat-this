import 'server-only';

import { BlockList, isIP } from 'node:net';
import searchbot from './searchbot.generated.json';

const crawlers = new BlockList();
for (const range of searchbot.ranges) {
  const [address, prefix] = range.split('/');
  crawlers.addSubnet(address, Number(prefix), isIP(address) === 6 ? 'ipv6' : 'ipv4');
}

/** Offiziell veröffentlichte Suchcrawler-Netze. Der Ausschluss betrifft nur
 * Analytics, nicht den Seitenzugriff oder die Indexierung. Die Browserkennung
 * im Beacon kann von der im Edge-Log abweichen; diese Prüfung braucht sie nicht.
 * Daten aktualisieren: npm run sync:analytics-bot-ips. */
export function isKnownCrawlerIp(ip: string): boolean {
  const family = isIP(ip);
  return family !== 0 && crawlers.check(ip, family === 6 ? 'ipv6' : 'ipv4');
}
