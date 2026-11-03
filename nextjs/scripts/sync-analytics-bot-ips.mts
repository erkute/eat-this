import { writeFile } from 'node:fs/promises';
import { isIP } from 'node:net';

const source = 'https://openai.com/searchbot.json';
const response = await fetch(source, { signal: AbortSignal.timeout(15_000) });
if (!response.ok) throw new Error(`Crawler-Netze: HTTP ${response.status}`);
const data = (await response.json()) as {
  creationTime: string;
  prefixes: Array<{ ipv4Prefix?: string; ipv6Prefix?: string }>;
};
const ranges = data.prefixes.map((row) => row.ipv4Prefix ?? row.ipv6Prefix ?? '');
if (
  !data.creationTime ||
  !ranges.length ||
  ranges.length > 1000 ||
  ranges.some((range) => {
    const [address, prefix, extra] = range.split('/');
    const family = isIP(address);
    return (
      !family ||
      extra !== undefined ||
      !/^\d+$/.test(prefix ?? '') ||
      Number(prefix) < (family === 6 ? 32 : 8) ||
      Number(prefix) > (family === 6 ? 128 : 32)
    );
  })
)
  throw new Error('Ungültige Crawler-Netze; vorhandene Datei bleibt bestehen.');
await writeFile(
  new URL('../lib/analytics/searchbot.generated.json', import.meta.url),
  JSON.stringify({ source, sourceUpdatedAt: data.creationTime, ranges }, null, 2) + '\n'
);
console.log(`${ranges.length} offizielle Suchcrawler-Netze aktualisiert.`);
