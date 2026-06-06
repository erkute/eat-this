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
import { render } from '@react-email/render';
import { getAdminAuth } from '@/lib/firebase/admin';
import { getEmailSpots } from '@/lib/sanity.server';
import MagicLinkEmail from '@/emails/MagicLinkEmail';
import { buildMagicLinkText } from '@/emails/magicLinkText';

type SendMagicLinkError =
  | 'link-generation-failed'
  | 'email-misconfigured'
  | 'send-failed';

export type SendMagicLinkResult =
  | { ok: true }
  | { ok: false; error: SendMagicLinkError };

export async function sendMagicLinkEmail(params: {
  email: string;
  /** Already-validated/sanitized destination after sign-in. */
  continueUrl: string;
  /** Public base URL for email artwork. */
  appUrl: string;
}): Promise<SendMagicLinkResult> {
  const { email, continueUrl, appUrl } = params;

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
    magicLink = await getAdminAuth().generateSignInWithEmailLink(email, {
      url:             linkUrl,
      handleCodeInApp: true,
    });
  } catch (err) {
    console.error('[sendMagicLink] generateSignInWithEmailLink failed:', err);
    return { ok: false, error: 'link-generation-failed' };
  }

  // First-time signup vs. returning login: an existing account means we drop the
  // starter-pack framing and greet them back instead. `getUserByEmail` throws
  // `auth/user-not-found` for a brand-new email — treat that (or any error) as new.
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
  const fromName  = process.env.RESEND_FROM_NAME  || 'Eat This';

  // Curated spots are a nice-to-have — never block the login email on Sanity.
  const restaurants = await getEmailSpots(4).catch((err) => {
    console.error('[sendMagicLink] getEmailSpots failed:', err);
    return [];
  });

  const html = await render(
    MagicLinkEmail({ magicLink, appUrl, restaurants, returning })
  );
  const text = buildMagicLinkText(magicLink);

  try {
    const resend = new Resend(resendKey);
    const result = await resend.emails.send({
      from:    `${fromName} <${fromEmail}>`,
      to:      email,
      subject: 'Dein Login-Link für Eat This',
      html,
      text,
      replyTo: fromEmail,
    });

    if (result.error) {
      console.error('[sendMagicLink] resend error:', result.error);
      return { ok: false, error: 'send-failed' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[sendMagicLink] resend threw:', err);
    return { ok: false, error: 'send-failed' };
  }
}
