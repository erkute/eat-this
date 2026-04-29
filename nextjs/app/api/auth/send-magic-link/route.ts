import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { getAdminAuth } from '@/lib/firebase/admin';
import MagicLinkEmail from '@/emails/MagicLinkEmail';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BOOSTER_PACKS = [
  'booster.jpg',
  'booster1.jpg',
  'booster2.jpg',
  'booster3.jpg',
  'booster5.jpg',
  'booster8.jpg',
];

function pickBoosterPack(): string {
  return BOOSTER_PACKS[Math.floor(Math.random() * BOOSTER_PACKS.length)];
}

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

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('[send-magic-link] RESEND_API_KEY missing');
    return NextResponse.json({ error: 'email-misconfigured' }, { status: 500 });
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const fromName  = process.env.RESEND_FROM_NAME  || 'Eat This';

  const boosterPack = pickBoosterPack();
  const html = await render(
    MagicLinkEmail({ magicLink, appUrl: origin, boosterPack })
  );

  const text = [
    'EAT THIS — Berlin · 150+ Must Eats · 200+ Restaurants',
    '',
    'Dein Booster Pack wartet.',
    '',
    '10 zufällige Must Eat Cards — dein persönlicher Start-Stack aus echten Restaurant-Empfehlungen.',
    '',
    'Bestätige deinen Login und öffne dein Pack:',
    magicLink,
    '',
    'Der Link ist 1 Stunde gültig und nur für diese E-Mail-Adresse bestimmt.',
    '',
    'So geht’s weiter:',
    '1. Klick den Link — du landest direkt in deinem Profil.',
    '2. Sag uns deinen Namen — dauert 5 Sekunden.',
    '3. Pack öffnen — deine 10 Karten werden enthüllt.',
    '',
    '—',
    'Du erhältst diese E-Mail, weil du dich bei eatthisdot.com registriert hast.',
    'Nicht angefordert? Ignoriere diese E-Mail einfach.',
  ].join('\n');

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
