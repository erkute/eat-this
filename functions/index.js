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

// Sanity schema field name is `restaurantRef` (see studio/schemaTypes/mustEat.js);
// the map projection in nextjs/lib/map/queries.ts renames it to `restaurant`
// for the frontend. We use the raw field name here.
async function pickRandomMustEatsWithParents(count) {
  const rows = await sanity.fetch(`
    *[_type == "mustEat" && defined(image.asset) && defined(restaurantRef._ref) && restaurantRef->isOpen != false]{
      "mustEatId": _id,
      "restaurantId": restaurantRef._ref
    }
  `);
  const byRestaurant = new Map();
  for (const r of (Array.isArray(rows) ? rows : [])) {
    if (!byRestaurant.has(r.restaurantId)) byRestaurant.set(r.restaurantId, []);
    byRestaurant.get(r.restaurantId).push(r.mustEatId);
  }
  if (byRestaurant.size < count) {
    throw new Error(`not-enough-restaurants: have ${byRestaurant.size} restaurants with mustEats, need ${count}`);
  }
  // Welcome pack = 10 Spots (Restaurants). Pick `count` unique restaurants,
  // then one random mustEat per restaurant for the onboarding reveal cards.
  // Map visibility derives from restaurantIds, so all other mustEats at
  // those restaurants become visible too — see /api/map-data filter.
  const restaurantIds = [...byRestaurant.keys()];
  for (let i = restaurantIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [restaurantIds[i], restaurantIds[j]] = [restaurantIds[j], restaurantIds[i]];
  }
  const pickedRestaurantIds = restaurantIds.slice(0, count);
  const pickedMustEatIds = pickedRestaurantIds.map((rid) => {
    const eats = byRestaurant.get(rid);
    return eats[Math.floor(Math.random() * eats.length)];
  });
  return {
    mustEatIds:    pickedMustEatIds,
    restaurantIds: pickedRestaurantIds,
  };
}

// Given a list of mustEat _ids, return the de-duped list of parent
// restaurant _ids. Used by the backfill path where the welcome pack
// already exists and we need to derive the matching restaurantIds.
async function parentRestaurantIdsOf(mustEatIds) {
  if (!Array.isArray(mustEatIds) || mustEatIds.length === 0) return [];
  const rows = await sanity.fetch(
    `*[_type == "mustEat" && _id in $ids]{ "rid": restaurantRef._ref }`,
    { ids: mustEatIds },
  );
  return [...new Set(rows.map((r) => r.rid).filter(Boolean))];
}

// Single source of truth for creating a user's welcome pack AND their
// starter entitlement. Both onUserCreate and ensureWelcomePack route
// through this. Idempotent at the doc level — if one of the two docs
// already exists, only the missing one is written.
//
// When the pack exists but the entitlement doesn't (backfill case for
// users created before this code shipped), we derive restaurantIds from
// the pack's existing mustEatIds rather than picking a fresh random set —
// otherwise the entitlement wouldn't match the cards in the user's deck.
async function provisionWelcomeForUid(db, uid, source) {
  const packRef = db.collection('users').doc(uid).collection('packs').doc('welcome');
  const entRef  = db.collection('users').doc(uid).collection('entitlements').doc('starter');

  // Note: the read-write window here is not transactional. Two concurrent
  // calls for the same uid would both see exists: false and both write,
  // overwriting each other. Acceptable trade-off in this codebase:
  //  - onUserCreate is an auth-trigger (once-delivery in practice)
  //  - ensureWelcomePack has no concurrent client callers
  //  - the worst case is a re-roll of the user's starter cards, recoverable
  //    by running scripts/backfill-starter-entitlements.ts
  const [packSnap, entSnap] = await Promise.all([packRef.get(), entRef.get()]);
  if (packSnap.exists && entSnap.exists) {
    return { status: 'exists' };
  }

  let mustEatIds;
  let restaurantIds;

  if (packSnap.exists) {
    mustEatIds    = packSnap.data().mustEatIds || [];
    restaurantIds = await parentRestaurantIdsOf(mustEatIds);
  } else {
    const picked  = await pickRandomMustEatsWithParents(10);
    mustEatIds    = picked.mustEatIds;
    restaurantIds = picked.restaurantIds;
  }

  if (!packSnap.exists) {
    await packRef.set({
      opened:    false,
      mustEatIds,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      openedAt:  null,
      source,
    });
  }

  if (!entSnap.exists) {
    await entRef.set({
      type:            'starter',
      slug:            null,
      restaurantIds,
      mustEatIds,
      purchasedAt:     admin.firestore.FieldValue.serverTimestamp(),
      stripeSessionId: null,
      source,
    });
  }

  return {
    status: packSnap.exists ? 'entitlement-backfilled' : 'created',
  };
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
    const uid = request.auth.uid;

    try {
      const result = await provisionWelcomeForUid(
        admin.firestore(),
        uid,
        'ensure-on-demand',
      );
      logger.info('[ensureWelcomePack]', uid, result);
      return { ok: true, status: result.status };
    } catch (err) {
      logger.error('[ensureWelcomePack] failed for', uid, err);
      throw new HttpsError('failed-precondition', 'Could not source cards.');
    }
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
    const result = await provisionWelcomeForUid(
      admin.firestore(),
      user.uid,
      'signup',
    );
    logger.info('[onUserCreate] welcome pack + entitlement', user.uid, result);
  } catch (err) {
    logger.error('[onUserCreate] welcome provisioning failed:', err);
  }
});
