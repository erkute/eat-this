// Plain-text alternatives for the two auth mails. Kept lean and transactional
// (no marketing hype) — both for accessibility and for deliverability: a
// missing or hype-heavy text/plain part is a documented spam signal.

import type { MailLocale } from './locale';

/* Derselbe Wortlaut wie die HTML-Mail (SignupEmail, LoginEmail, Shell). */
const TEXT = {
  de: {
    signOff: ['—', 'Du hast keine Anmeldung angefordert? Dann kannst du diese E-Mail ignorieren.'],
    validity: 'Dein Anmeldelink ist eine Stunde gültig und gilt nur für deine E-Mail-Adresse.',
    loginIntro: 'Schön, dass du wieder da bist. Hier ist dein Anmeldelink:',
    signupLead:
      'Mit deiner Anmeldung kommen 20 zusätzliche Must Eats in dein Deck.',
    signupIntro: 'Bei Eat This anmelden:',
    signupAfter: [
      'Jede Karte zeigt dir ein Gericht und den passenden Spot dazu.',
      'Alle 20 Karten liegen sofort offen in deinem Deck.',
    ],
  },
  en: {
    signOff: ['—', 'Didn’t request a sign-in? Then you can ignore this email.'],
    validity: 'Your sign-in link is valid for one hour and only works for your email address.',
    loginIntro: 'Good to have you back. Here’s your sign-in link:',
    signupLead:
      'Sign up and add 20 additional Must Eats to your deck.',
    signupIntro: 'Sign up for Eat This:',
    signupAfter: [
      'Each card pairs a dish with the spot where you can try it.',
      'All 20 cards go straight into your deck face up.',
    ],
  },
} as const;

const MASTHEAD = 'EAT THIS — We tell you what to eat.';

/** Returning user: the link, nothing else. */
export function buildLoginText(magicLink: string, locale: MailLocale): string {
  const t = TEXT[locale];
  return [MASTHEAD, '', t.loginIntro, magicLink, '', t.validity, '', ...t.signOff].join('\n');
}

/** First-time address: same link, one line of context. */
export function buildSignupText(magicLink: string, locale: MailLocale): string {
  const t = TEXT[locale];
  return [
    MASTHEAD,
    '',
    t.signupLead,
    '',
    t.signupIntro,
    magicLink,
    '',
    t.validity,
    '',
    ...t.signupAfter,
    '',
    ...t.signOff,
  ].join('\n');
}
