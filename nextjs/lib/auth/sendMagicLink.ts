// Shared magic-link sender. Generates a Firebase sign-in-with-email link and
// emails it via Resend with the branded template.
//
// TRUSTED callers only: there is NO rate limiting and NO continueUrl
// validation here. The public route (app/api/auth/send-magic-link) wraps this
// with per-email + per-IP rate limits and a continueUrl allow-list. Trusted
// server paths (e.g. the Stripe webhook after a verified guest purchase) call
// this directly — bypassing the public route so they don't get throttled by
// the shared-IP rate-limit bucket.

import { Resend } from 'resend';
import { renderEmail } from '@/emails/render';
import { getAdminAuth } from '@/lib/firebase/admin';
import SignupEmail, { SIGNUP_SUBJECT } from '@/emails/SignupEmail';
import LoginEmail, { LOGIN_SUBJECT } from '@/emails/LoginEmail';
import { buildLoginText, buildSignupText } from '@/emails/magicLinkText';

type SendMagicLinkError = 'link-generation-failed' | 'email-misconfigured' | 'send-failed';

/**
 * Rewrite the generated sign-in link so it lands on OUR /welcome — regardless
 * of what the Firebase project's action URL says.
 *
 * The generated link is nothing but `<callbackUri>?<oobCode etc.>`, and
 * /welcome validates the QUERY (isSignInWithEmailLink checks mode + oobCode),
 * never the host. So the host is ours to choose — and it has to be, because
 * the project setting cannot be relied on: staging's sat on the Firebase
 * default (`…firebaseapp.com/__/auth/action`), whose handler silently
 * forwards to the continue URL without ever signing anyone in — "ich komme
 * auf die Staging-Seite, aber werde nicht eingeloggt" (user, 2026-08-26).
 * Fixing the setting is closed off too: both the console and the admin API
 * refuse with EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED, an anti-phishing restriction
 * on the project. So the server owns the link now; the console setting is
 * decoration. On production, whose callbackUri already points at
 * www.eatthisdot.com/welcome, this rewrite is a no-op by construction.
 *
 * The target origin comes from the continue URL — already validated against
 * the own-origin allow-list by every caller — so the link always lands on the
 * same deployment that asked for it.
 */
export function rehostMagicLink(generated: string, continueUrl: string): string {
  try {
    const link = new URL(generated);
    const target = new URL(continueUrl);
    link.protocol = target.protocol;
    link.host = target.host;
    link.pathname = '/welcome';
    return link.toString();
  } catch {
    // Non-absolute continueUrl — the same legacy fallback the `e`-param code
    // above tolerates. A mail with Firebase's default handler still beats no
    // mail at all.
    return generated;
  }
}

type SendMagicLinkResult = { ok: true } | { ok: false; error: SendMagicLinkError };

export async function sendMagicLinkEmail(params: {
  email: string;
  /** Already-validated/sanitized destination after sign-in. */
  continueUrl: string;
  /** Public base URL for email artwork. */
  appUrl: string;
  /** Stable logical-send key for retry-safe trusted callers. */
  idempotencyKey?: string;
}): Promise<SendMagicLinkResult> {
  const { email, continueUrl, appUrl, idempotencyKey } = params;

  // The continue URL doubles as the cross-browser email carrier: /welcome
  // reads `e` to complete the sign-in when the link opens in a browser that
  // never stored emailForSignIn (e.g. Gmail app handing off to Chrome while
  // the link was requested in Safari). Trade-off: the address is visible in
  // the link URL — acceptable, the link already sits in that very inbox.
  let linkUrl = continueUrl;
  try {
    const u = new URL(continueUrl);
    u.searchParams.set('e', email);
    linkUrl = u.toString();
  } catch {
    // Non-absolute continueUrl (shouldn't happen — callers build absolute
    // URLs): fall back to the raw value, /welcome then asks for the email.
  }

  let magicLink: string;
  try {
    magicLink = rehostMagicLink(
      await getAdminAuth().generateSignInWithEmailLink(email, {
        url: linkUrl,
        handleCodeInApp: true,
      }),
      continueUrl
    );
  } catch (err) {
    console.error('[sendMagicLink] generateSignInWithEmailLink failed:', err);
    return { ok: false, error: 'link-generation-failed' };
  }

  // First-time signup vs. returning login: two separate mails, not one template
  // with a flag. A returning login gets the short transactional message (link
  // above the fold, no artwork); only a new address gets the product pitch.
  // `getUserByEmail` throws `auth/user-not-found` for a brand-new email — treat
  // that (or any error) as new.
  let returning = false;
  try {
    await getAdminAuth().getUserByEmail(email);
    returning = true;
  } catch {
    returning = false;
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('[sendMagicLink] RESEND_API_KEY missing');
    return { ok: false, error: 'email-misconfigured' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const fromName = process.env.RESEND_FROM_NAME || 'Eat This';
  const stagingRecipient = process.env.STAGING_EMAIL_RECIPIENT;
  if (process.env.NEXT_PUBLIC_ENV === 'staging' && !stagingRecipient) {
    console.error('[sendMagicLink] STAGING_EMAIL_RECIPIENT missing');
    return { ok: false, error: 'email-misconfigured' };
  }
  // Staging may generate links for arbitrary guest test identities, but the
  // message itself is delivered only to the explicitly configured sink/test
  // inbox. This prevents a staging smoke test from mailing real customers.
  const recipient = process.env.NEXT_PUBLIC_ENV === 'staging' ? stagingRecipient! : email;

  const html = returning
    ? await renderEmail(LoginEmail({ magicLink, appUrl }))
    : await renderEmail(SignupEmail({ magicLink, appUrl }));
  const text = returning ? buildLoginText(magicLink) : buildSignupText(magicLink);
  const subject = returning ? LOGIN_SUBJECT : SIGNUP_SUBJECT;

  try {
    const resend = new Resend(resendKey);
    const result = await resend.emails.send(
      {
        from: `${fromName} <${fromEmail}>`,
        to: recipient,
        subject,
        html,
        text,
        replyTo: fromEmail,
      },
      idempotencyKey ? { idempotencyKey } : undefined
    );

    if (result.error) {
      // A retry regenerates the Firebase action link, so Resend sees a
      // different payload for the same logical key. This response proves the
      // original request was already accepted; treat it as delivered and let
      // the caller persist its outbox marker.
      if (idempotencyKey && result.error.name === 'invalid_idempotent_request') {
        return { ok: true };
      }
      console.error('[sendMagicLink] resend error:', result.error);
      return { ok: false, error: 'send-failed' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[sendMagicLink] resend threw:', err);
    return { ok: false, error: 'send-failed' };
  }
}
