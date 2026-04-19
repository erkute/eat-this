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
const {
  getVerificationTemplate,
  getPasswordResetTemplate,
  getEmailChangeTemplate,
  getMfaTemplate,
  getNewsletterConfirmTemplate,
} = require('./templates');

admin.initializeApp();

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

exports.subscribeNewsletter = onCall({ region: 'europe-west1', enforceAppCheck: true, secrets: [RESEND_API_KEY] }, async (req) => {
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

// Auto-unlock Starter Pack on registration
exports.subscribeNewsletter = onCall({ region: 'europe-west1', enforceAppCheck: true }, async (req) => {
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
  return { status: 'subscribed' };
});

exports.onUserCreate = require('firebase-functions/v1').auth.user().onCreate(async (user) => {
  try {
    await admin.firestore()
      .collection('userPacks').doc(user.uid)
      .collection('packs').doc('starter')
      .set({ unlockedAt: Date.now(), source: 'signup' });
    logger.info('[onUserCreate] Starter pack unlocked for', user.uid);
  } catch (err) {
    logger.error('[onUserCreate] Failed:', err);
  }
});
