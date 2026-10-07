/** Read Google's existing 28-day field data; adds no tracking to the website. */
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });

const key = process.env.CRUX_API_KEY || process.env.GOOGLE_API_KEY;
if (!key) {
  console.error(
    'Set CRUX_API_KEY to a key enabled for the Chrome UX Report API. No field verdict is available.'
  );
  process.exit(1);
}

const targets = {
  largest_contentful_paint: { label: 'LCP', maximum: 2500, unit: 'ms' },
  interaction_to_next_paint: { label: 'INP', maximum: 200, unit: 'ms' },
  cumulative_layout_shift: { label: 'CLS', maximum: 0.1, unit: '' },
};

for (const formFactor of ['PHONE', 'DESKTOP']) {
  try {
    const response = await fetch(
      `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: 'https://www.eatthisdot.com',
          formFactor,
          metrics: Object.keys(targets),
        }),
        signal: AbortSignal.timeout(20_000),
      }
    );
    if (response.status === 404) {
      console.log(`${formFactor}: insufficient CrUX field data; no pass/fail verdict.`);
      continue;
    }
    if (!response.ok) {
      console.error(
        `${formFactor}: CrUX HTTP ${response.status}; check API activation and key permissions. No field verdict is available.`
      );
      process.exitCode = 1;
      continue;
    }
    const data = (await response.json()) as {
      record?: {
        collectionPeriod?: unknown;
        metrics?: Record<string, { percentiles?: { p75?: number | string } }>;
      };
    };
    console.log(`${formFactor}: ${JSON.stringify(data.record?.collectionPeriod)}`);
    for (const [metric, target] of Object.entries(targets)) {
      const raw = data.record?.metrics?.[metric]?.percentiles?.p75;
      const value = raw === undefined ? NaN : Number(raw);
      console.log(
        `${target.label} p75: ${Number.isFinite(value) ? `${value}${target.unit} (${value <= target.maximum ? 'good' : 'above target'})` : 'no data'}`
      );
    }
  } catch {
    // Fetch errors can contain request URLs with the API key. Never print them.
    console.error(`${formFactor}: CrUX request failed; no field verdict is available.`);
    process.exitCode = 1;
  }
}
