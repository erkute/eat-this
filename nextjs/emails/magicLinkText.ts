// Plain-text alternatives for the two auth mails. Kept lean and transactional
// (no marketing hype) — both for accessibility and for deliverability: a
// missing or hype-heavy text/plain part is a documented spam signal.

import type { MailLocale } from './locale';

/* Derselbe Wortlaut wie die HTML-Mail (SignupEmail, LoginEmail, Shell). */
const TEXT = {
  de: {
    signOff: ['—', 'Du hast keine Anmeldung angefordert? Dann kannst du diese E-Mail ignorieren.'],
    validity: 'Dein Anmeldelink ist eine Stunde gültig und gilt nur für deine E-Mail-Adresse.',
    loginIntro: 'Willkommen zurück. Hier ist dein Anmeldelink:',
    signupLead:
      'Entdecke Berlins beste Restaurants, Cafés und Bars, probiere ihre Must\u00a0Eats und sammle sie in deinem Deck. Alles auf einer Map.',
    signupIntro: 'Bei Eat This anmelden:',
    signupAfter: [
      'Dein Starter Pack: 20 Must Eats.',
      '10 Karten liegen sofort offen in deinem Deck.',
      'Die anderen 10 deckst du direkt am Spot auf.',
    ],
  },
  en: {
    signOff: ['—', 'Didn’t request a sign-in? Then you can ignore this email.'],
    validity: 'Your sign-in link is valid for one hour and only works for your email address.',
    loginIntro: 'Welcome back. Here’s your sign-in link:',
    signupLead:
      'Discover Berlin’s best restaurants, cafés and bars, try their Must\u00a0Eats and collect them in your deck. All on one map.',
    signupIntro: 'Sign up for Eat This:',
    signupAfter: [
      'Your Starter Pack: 20 Must Eats.',
      '10 cards go straight into your deck face up.',
      'Reveal the other 10 at the spots.',
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
