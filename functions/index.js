'use strict';

const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { Resend } = require('resend');
const {
  getVerificationTemplate,
  getPasswordResetTemplate,
  getEmailChangeTemplate,
  getMfaTemplate,
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
