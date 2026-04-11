'use strict';

// ─── Sanity → Firebase Hosting Deploy Webhook ────────────────────────────────
// Sanity calls this endpoint after every publish.
// The function triggers a new Firebase Hosting deploy via GitHub Actions.
//
// Setup:
//   1. In Sanity Studio → API → Webhooks → add this URL:
//      https://us-central1-eat-this-8a13b.cloudfunctions.net/sanityWebhook
//   2. Set HTTP method: POST
//   3. Add a secret header: X-Sanity-Webhook-Secret = <your secret>
//   4. Store the same secret in Firebase: firebase functions:secrets:set SANITY_WEBHOOK_SECRET
//   5. Store a GitHub PAT with workflow scope: firebase functions:secrets:set GITHUB_DEPLOY_TOKEN

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const https = require('https');

const SANITY_WEBHOOK_SECRET = defineSecret('SANITY_WEBHOOK_SECRET');
const GITHUB_DEPLOY_TOKEN   = defineSecret('GITHUB_DEPLOY_TOKEN');

const GITHUB_OWNER = 'erkute';
const GITHUB_REPO  = 'eat-this'; // update if repo name differs

exports.sanityWebhook = onRequest(
  { secrets: [SANITY_WEBHOOK_SECRET, GITHUB_DEPLOY_TOKEN] },
  async (req, res) => {
    // Only accept POST
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // Verify secret header
    const incoming = req.headers['x-sanity-webhook-secret'];
    if (!incoming || incoming !== SANITY_WEBHOOK_SECRET.value()) {
      res.status(401).send('Unauthorized');
      return;
    }

    // Trigger GitHub Actions workflow_dispatch
    const payload = JSON.stringify({
      ref: 'main',
      inputs: { reason: 'sanity-publish' },
    });

    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/deploy.yml/dispatches`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_DEPLOY_TOKEN.value()}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'eat-this-webhook',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    await new Promise((resolve, reject) => {
      const ghReq = https.request(options, (ghRes) => {
        if (ghRes.statusCode >= 200 && ghRes.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`GitHub API returned ${ghRes.statusCode}`));
        }
      });
      ghReq.on('error', reject);
      ghReq.write(payload);
      ghReq.end();
    });

    res.status(200).json({ ok: true });
  }
);
