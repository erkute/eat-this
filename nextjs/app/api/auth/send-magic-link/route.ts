import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { getAdminAuth } from '@/lib/firebase/admin';
import { getEmailSpots } from '@/lib/sanity.server';
import MagicLinkEmail from '@/emails/MagicLinkEmail';
import { buildMagicLinkText } from '@/emails/magicLinkText';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { email?: string; locale?: string; continueUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid-email' }, { status: 400 });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.headers.get('origin') ||
    'https://www.eatthisdot.com';

  const continueUrl = body.continueUrl || `${origin}/profile`;

  let magicLink: string;
  try {
    magicLink = await getAdminAuth().generateSignInWithEmailLink(email, {
      url:             continueUrl,
      handleCodeInApp: true,
    });
  } catch (err) {
    console.error('[send-magic-link] generateSignInWithEmailLink failed:', err);
    return NextResponse.json({ error: 'link-generation-failed' }, { status: 500 });
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
    console.error('[send-magic-link] RESEND_API_KEY missing');
    return NextResponse.json({ error: 'email-misconfigured' }, { status: 500 });
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const fromName  = process.env.RESEND_FROM_NAME  || 'Eat This';

  // Curated spots are a nice-to-have — never block the login email on Sanity.
  const restaurants = await getEmailSpots(4).catch((err) => {
    console.error('[send-magic-link] getEmailSpots failed:', err);
    return [];
  });

  const html = await render(
    MagicLinkEmail({ magicLink, appUrl: origin, restaurants, returning })
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
      console.error('[send-magic-link] resend error:', result.error);
      return NextResponse.json({ error: 'send-failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[send-magic-link] resend threw:', err);
    return NextResponse.json({ error: 'send-failed' }, { status: 500 });
  }
}
