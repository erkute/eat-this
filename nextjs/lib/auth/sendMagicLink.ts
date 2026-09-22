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
import type { MailLocale } from '@/emails/locale';
import { EMAIL_LINK_EMAIL_PARAM, EMAIL_LINK_PARAMS } from '@/lib/auth/emailLinkParams';

type SendMagicLinkError = 'link-generation-failed' | 'email-misconfigured' | 'send-failed';

/**
 * Der Link aus der Mail landet direkt auf der Seite, auf der die Anmeldung
 * begann — mit dem Code im Gepäck. Dort geht die Bestätigungs-Tafel auf
 * (EmailLinkSignIn), ein Klick, und die Tour läuft wie nach Google.
 *
 * Firebase erzeugt `<Action-Handler>?mode=…&oobCode=…&apiKey=…&continueUrl=…`.
 * Übernommen werden nur die drei Parameter, die `signInWithEmailLink` liest;
 * `continueUrl` ist die Zielseite selbst, und Firebases `lang` würde die
 * Middleware als alten Sprachschalter lesen und mit 308 beantworten. Dazu
 * kommt `e`, die Adresse: der Link öffnet routinemäßig in einem anderen
 * Browser als dem, der ihn angefordert hat (Gmail-App → Chrome), und Firebase
 * braucht sie zum Einlösen.
 *
 * Der Host kommt aus der Continue-URL, nie aus der Projekt-Einstellung:
 * Staging stand auf dem Firebase-Default-Handler, der stumm weiterleitet, ohne
 * je jemanden anzumelden (26.08.2026), und umstellen lässt sich die
 * Einstellung nicht (EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED). Bis 22.09.2026 ging
 * der Link auf eine eigene Seite /welcome, die nach dem Klick hart auf die
 * Zielseite weiterleitete.
 */
export function landingLink(generated: string, continueUrl: string, email: string): string {
  try {
    const link = new URL(generated);
    const target = new URL(continueUrl);
    for (const name of EMAIL_LINK_PARAMS) {
      target.searchParams.delete(name);
      if (name === EMAIL_LINK_EMAIL_PARAM) continue;
      const value = link.searchParams.get(name);
      if (value) target.searchParams.set(name, value);
    }
    target.searchParams.set(EMAIL_LINK_EMAIL_PARAM, email);
    return target.toString();
  } catch {
    // Keine absolute Continue-URL (rufen alle Aufrufer so nicht): lieber der
    // unveränderte Firebase-Link als gar keine Mail.
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
  /** Sprache der Mail. Die Seite, auf der der Link landet, hat ihre eigene. */
  locale: MailLocale;
  /** Stable logical-send key for retry-safe trusted callers. */
  idempotencyKey?: string;
}): Promise<SendMagicLinkResult> {
  const { email, continueUrl, appUrl, locale, idempotencyKey } = params;

  let magicLink: string;
  try {
    magicLink = landingLink(
      await getAdminAuth().generateSignInWithEmailLink(email, {
        url: continueUrl,
        handleCodeInApp: true,
      }),
      continueUrl,
      email
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
    ? await renderEmail(LoginEmail({ magicLink, appUrl, locale }))
    : await renderEmail(SignupEmail({ magicLink, appUrl, locale }));
  const text = returning ? buildLoginText(magicLink, locale) : buildSignupText(magicLink, locale);
  const subject = returning ? LOGIN_SUBJECT[locale] : SIGNUP_SUBJECT[locale];

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
