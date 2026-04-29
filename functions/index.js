'use strict';

const admin = require('firebase-admin');

// Sanity publish → GitHub Actions deploy trigger
// Activate after setting secrets:
//   firebase functions:secrets:set SANITY_WEBHOOK_SECRET
//   firebase functions:secrets:set GITHUB_DEPLOY_TOKEN
// Then uncomment:
// const { sanityWebhook } = require('./webhook');
// exports.sanityWebhook = sanityWebhook;
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { Resend } = require('resend');
const { createClient: createSanityClient } = require('@sanity/client');
const {
  getVerificationTemplate,
  getPasswordResetTemplate,
  getEmailChangeTemplate,
  getMfaTemplate,
  getNewsletterConfirmTemplate,
} = require('./templates');

admin.initializeApp();

const sanity = createSanityClient({
  projectId:  'ehwjnjr2',
  dataset:    'production',
  apiVersion: '2024-01-01',
  useCdn:     true,
});

// Fisher–Yates over the full id list, keep first `count`.
async function pickRandomMustEatIds(count) {
  const ids = await sanity.fetch('*[_type == "mustEat" && defined(image.asset)]._id');
  if (!Array.isArray(ids) || ids.length < count) {
    throw new Error('not-enough-must-eats: have ' + (ids ? ids.length : 0) + ', need ' + count);
  }
  const shuffled = ids.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

// ─── Rate limiter (Firestore-backed) ─────────────────────────────────────────
// Tracks request timestamps per key in _rateLimits/{key}.
// Returns true if the request is allowed, false if the limit is exceeded.
async function checkRateLimit(key, maxRequests, windowMs) {
  const now      = Date.now();
  const cutoff   = now - windowMs;
  const ref      = admin.firestore().collection('_rateLimits').doc(key);

  const allowed = await admin.firestore().runTransaction(async (tx) => {
    const doc    = await tx.get(ref);
    const recent = (doc.exists ? doc.data().requests : []).filter(t => t > cutoff);

    if (recent.length >= maxRequests) return false;

    recent.push(now);
    tx.set(ref, { requests: recent, updatedAt: now }, { merge: false });
    return true;
  });

  return allowed;
}

const FROM = 'EAT THIS <noreply@eatthisdot.com>';

function getResend() {
  return new Resend(RESEND_API_KEY.value());
}

// ─── 1. E-Mail bestätigen — von auth.js nach updateProfile aufgerufen ─────────
exports.sendVerificationEmail = onCall(
  { secrets: [RESEND_API_KEY], enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Nicht eingeloggt.');
    }

    // Rate limit: max 3 verification emails per user per hour
    const allowed = await checkRateLimit(
      'verify:uid:' + request.auth.uid, 3, 60 * 60 * 1000
    );
    if (!allowed) {
      throw new HttpsError('resource-exhausted', 'Zu viele Versuche. Bitte in einer Stunde erneut versuchen.');
    }

    const user        = await admin.auth().getUser(request.auth.uid);
    const displayName = request.data.displayName || user.displayName || user.email.split('@')[0];

    const link = await admin.auth().generateEmailVerificationLink(user.email, {
      url: 'https://www.eatthisdot.com',
    });

    await getResend().emails.send({
      from:    FROM,
      to:      user.email,
      subject: 'Fast fertig — bestätige deine E-Mail',
      html:    getVerificationTemplate(displayName, link),
    });

    return { success: true };
  }
);

// ─── 2. Passwort zurücksetzen — von auth.js aufgerufen ────────────────────────
exports.sendPasswordReset = onCall(
  { secrets: [RESEND_API_KEY], enforceAppCheck: true },
  async (request) => {
    const email = request.data.email?.trim();
    if (!email) {
      throw new HttpsError('invalid-argument', 'E-Mail-Adresse fehlt.');
    }

    // Rate limit: max 3 resets per email per hour
    const emailAllowed = await checkRateLimit(
      'pw-reset:email:' + email, 3, 60 * 60 * 1000
    );
    if (!emailAllowed) {
      throw new HttpsError('resource-exhausted', 'Zu viele Versuche. Bitte in einer Stunde erneut versuchen.');
    }

    // Rate limit: max 10 resets per IP per hour
    const ip = request.rawRequest?.ip ?? 'unknown';
    const ipAllowed = await checkRateLimit(
      'pw-reset:ip:' + ip, 10, 60 * 60 * 1000
    );
    if (!ipAllowed) {
      throw new HttpsError('resource-exhausted', 'Zu viele Versuche. Bitte später erneut versuchen.');
    }

    try {
      logger.info('sendPasswordReset: generating link for', email);
      const link = await admin.auth().generatePasswordResetLink(email, {
        url: 'https://www.eatthisdot.com',
      });
      logger.info('sendPasswordReset: link generated, sending via Resend');

      const displayName = email.split('@')[0];

      const result = await getResend().emails.send({
        from:    FROM,
        to:      email,
        subject: 'Neues Passwort festlegen — EAT THIS',
        html:    getPasswordResetTemplate(displayName, link),
      });
      logger.info('sendPasswordReset: Resend result', result);
    } catch (err) {
      logger.error('sendPasswordReset error:', err);
    }

    return { success: true };
  }
);

// ─── 3. E-Mail-Adresse ändern — von Profileinstellungen aufgerufen ────────────
exports.sendEmailChange = onCall(
  { secrets: [RESEND_API_KEY], enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Nicht eingeloggt.');
    }

    // Rate limit: max 3 email-change requests per user per hour
    const allowed = await checkRateLimit(
      'email-change:uid:' + request.auth.uid, 3, 60 * 60 * 1000
    );
    if (!allowed) {
      throw new HttpsError('resource-exhausted', 'Zu viele Versuche. Bitte in einer Stunde erneut versuchen.');
    }

    const newEmail = request.data.newEmail?.trim();
    if (!newEmail) {
      throw new HttpsError('invalid-argument', 'Neue E-Mail-Adresse fehlt.');
    }

    const user        = await admin.auth().getUser(request.auth.uid);
    const displayName = user.displayName || user.email.split('@')[0];

    const link = await admin.auth().generateVerifyAndChangeEmailLink(user.email, newEmail, {
      url: 'https://www.eatthisdot.com',
    });

    await getResend().emails.send({
      from:    FROM,
      to:      user.email,
      subject: 'Bestätige deine neue E-Mail-Adresse — EAT THIS',
      html:    getEmailChangeTemplate(displayName, user.email, newEmail, link),
    });

    return { success: true };
  }
);

// ─── 4. 2FA aktiviert — nach MFA-Enrollment aufgerufen ───────────────────────
exports.sendMfaNotification = onCall(
  { secrets: [RESEND_API_KEY], enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Nicht eingeloggt.');
    }

    const user        = await admin.auth().getUser(request.auth.uid);
    const displayName = user.displayName || user.email.split('@')[0];

    await getResend().emails.send({
      from:    FROM,
      to:      user.email,
      subject: 'Zwei-Faktor-Authentifizierung aktiviert — EAT THIS',
      html:    getMfaTemplate(displayName),
    });

    return { success: true };
  }
);

exports.subscribeNewsletter = onCall({ region: 'europe-west1', secrets: [RESEND_API_KEY] }, async (req) => {
  const { email } = req.data || {};
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !EMAIL_RE.test(email)) {
    throw new Error('invalid-email');
  }
  const db  = admin.firestore();
  const ref = db.collection('newsletterSubscribers').doc(email.toLowerCase());
  const doc = await ref.get();
  if (doc.exists) return { status: 'already_subscribed' };
  await ref.set({
    email: email.toLowerCase(),
    subscribedAt: Date.now(),
    source: 'landing_page',
  });
  logger.info('[subscribeNewsletter] new subscriber:', email);
  try {
    await getResend().emails.send({
      from:    FROM,
      to:      email,
      subject: 'Du bist dabei.',
      html:    getNewsletterConfirmTemplate(),
    });
  } catch (err) {
    logger.warn('[subscribeNewsletter] confirmation email failed:', err.message);
  }
  return { status: 'subscribed' };
});

// Backfill the welcome Booster Pack on demand. Idempotent — if the pack
// already exists, no-op. Used by the profile page when usePack reports
// 'missing' (which happens for users created before onUserCreate was wired
// up, or whenever the auth trigger gets skipped/fails).
exports.ensureWelcomePack = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in first.');
    }
    const uid    = request.auth.uid;
    const packId = String(request.data?.packId ?? 'welcome');

    const ref = admin.firestore()
      .collection('users').doc(uid)
      .collection('packs').doc(packId);

    const existing = await ref.get();
    if (existing.exists) {
      return { ok: true, status: 'exists' };
    }

    let mustEatIds;
    try {
      mustEatIds = await pickRandomMustEatIds(10);
    } catch (err) {
      logger.error('[ensureWelcomePack] Sanity fetch failed for', uid, err);
      throw new HttpsError('failed-precondition', 'Could not source cards.');
    }

    await ref.set({
      opened:    false,
      mustEatIds,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      openedAt:  null,
      source:    'ensure-on-demand',
    });
    logger.info('[ensureWelcomePack] Created for', uid, 'with', mustEatIds.length, 'cards');
    return { ok: true, status: 'created' };
  }
);

// Open a Booster Pack — flips opened=false → true, sets openedAt.
// Idempotent: re-opening an already-opened pack is a no-op.
exports.openPack = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to open packs.');
    }
    const uid = request.auth.uid;
    const packId = String(request.data?.packId ?? 'welcome');

    const ref = admin.firestore()
      .collection('users').doc(uid)
      .collection('packs').doc(packId);

    try {
      await admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
          throw new HttpsError('not-found', 'Pack not found.');
        }
        if (snap.data().opened === true) return;
        tx.update(ref, {
          opened:   true,
          openedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error('[openPack] tx failed:', err);
      throw new HttpsError('internal', 'Failed to open pack.');
    }
    logger.info('[openPack] opened', packId, 'for', uid);
    return { ok: true };
  }
);

// On signup:
//  1. Legacy starter unlock at userPacks/{uid}/packs/starter (curated map content)
//  2. Welcome Booster Pack at users/{uid}/packs/welcome — 10 random Must Eats (Feature C)
exports.onUserCreate = require('firebase-functions/v1').auth.user().onCreate(async (user) => {
  const db = admin.firestore();

  try {
    await db
      .collection('userPacks').doc(user.uid)
      .collection('packs').doc('starter')
      .set({ unlockedAt: Date.now(), source: 'signup' });
    logger.info('[onUserCreate] Starter pack unlocked for', user.uid);
  } catch (err) {
    logger.error('[onUserCreate] Starter unlock failed:', err);
  }

  try {
    const packRef = db
      .collection('users').doc(user.uid)
      .collection('packs').doc('welcome');

    const existing = await packRef.get();
    if (existing.exists) {
      logger.info('[onUserCreate] Welcome pack already exists for', user.uid);
      return;
    }

    const mustEatIds = await pickRandomMustEatIds(10);
    await packRef.set({
      opened:    false,
      mustEatIds,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      openedAt:  null,
      source:    'signup',
    });
    logger.info('[onUserCreate] Welcome booster pack created for', user.uid, 'with', mustEatIds.length, 'cards');
  } catch (err) {
    logger.error('[onUserCreate] Welcome booster pack creation failed:', err);
  }
});
