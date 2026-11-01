import 'server-only';

import { BlockList, isIP } from 'node:net';

let configured: string | undefined;
let excluded = new BlockList();

/** Private Laufzeit-Konfiguration: einzelne IPs oder CIDR-Netze, durch Komma
 * getrennt. IPv6-/64 umfasst auch wechselnde Privacy-Adressen im selben LAN.
 * Weder die Adressen noch das Ergebnis werden in Analytics gespeichert. */
export function isExcludedAnalyticsIp(ip: string): boolean {
  const value = process.env.STATS_EXCLUDE_IPS ?? '';
  if (configured !== value) {
    const list = new BlockList();
    for (const entry of value.split(',').map((part) => part.trim()).filter(Boolean)) {
      const [address, prefix, extra] = entry.split('/');
      const family = isIP(address);
      const type = family === 6 ? 'ipv6' : 'ipv4';
      const maxPrefix = family === 6 ? 128 : 32;
      if (
        !family || extra !== undefined ||
        (prefix !== undefined && (!/^\d+$/.test(prefix) || Number(prefix) > maxPrefix))
      ) {
        throw new Error('Invalid STATS_EXCLUDE_IPS configuration');
      }
      if (prefix === undefined) list.addAddress(address, type);
      else list.addSubnet(address, Number(prefix), type);
    }
    excluded = list;
    configured = value;
  }
  const family = isIP(ip);
  return family !== 0 && excluded.check(ip, family === 6 ? 'ipv6' : 'ipv4');
}
