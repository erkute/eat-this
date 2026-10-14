// Audits the production build of this checkout, never the deployed website.
const production = require('./.lighthouserc.json');

// CI verteilt die Seiten auf mehrere Rechner (`LIGHTHOUSE_SHARD=2/3`, quality.yml);
// ohne die Variable prüft ein Lauf alle.
const [shard, shards] = (process.env.LIGHTHOUSE_SHARD || '1/1').split('/').map(Number);
const urls = production.ci.collect.url.filter((_, i) => i % shards === shard - 1);
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start:verify',
      startServerReadyPattern: 'Ready',
      startServerReadyTimeout: 60000,
      url: urls.map((url) =>
        url.replace('https://www.eatthisdot.com', 'http://127.0.0.1:3100')
      ),
      numberOfRuns: 3,
      settings: { chromeFlags: '--no-sandbox', extraHeaders: JSON.stringify({ DNT: '1' }) },
    },
    assert: {
      assertMatrix: production.ci.assert.assertMatrix.map((entry) => ({
        ...entry,
        matchingUrlPattern: entry.matchingUrlPattern.replace(
          'https://www\\.eatthisdot\\.com',
          'http://127\\.0\\.0\\.1:3100'
        ),
      })),
    },
    upload: { target: 'filesystem', outputDir: '/tmp/eat-this-lighthouse-preview' },
  },
};
