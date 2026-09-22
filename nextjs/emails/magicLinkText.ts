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
      'Wir empfehlen dir gute Spots in Berlin – und mit unseren Must Eats die Gerichte, für die sich der Besuch lohnt.',
    signupIntro: 'Bei Eat This anmelden:',
    signupAfter: [
      'Dein Starter Pack: 20 Must Eats. Geht auf uns. Jede Karte verrät dir, was du',
      'an einem Spot bestellen solltest. Manche sind schon offen, andere deckst du',
      'erst vor Ort auf.',
    ],
  },
  en: {
    signOff: ['—', 'Didn’t request a sign-in? Then you can ignore this email.'],
    validity: 'Your sign-in link is valid for one hour and only works for your email address.',
    loginIntro: 'Welcome back. Here’s your sign-in link:',
    signupLead:
      'We point you to great spots in Berlin – and with our Must Eats, to the dishes that make the visit worth it.',
    signupIntro: 'Sign up for Eat This:',
    signupAfter: [
      'Your Starter Pack: 20 Must Eats. On us. Every card tells you what to order at',
      'a spot. Some are already open, others you reveal on site.',
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
