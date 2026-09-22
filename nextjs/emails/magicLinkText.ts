// Plain-text alternatives for the two auth mails. Kept lean and transactional
// (no marketing hype) — both for accessibility and for deliverability: a
// missing or hype-heavy text/plain part is a documented spam signal.

import type { MailLocale } from './locale';

const TEXT = {
  de: {
    signOff: [
      '—',
      'Du bekommst diese E-Mail, weil sich jemand mit dieser Adresse bei eatthisdot.com',
      'angemeldet hat. Warst du das nicht, ignoriere sie einfach.',
    ],
    validity: 'Der Link gilt 1 Stunde und nur für deine E-Mail-Adresse.',
    loginIntro: 'Willkommen zurück. Hier ist dein Login-Link:',
    signupLead: 'Gute Spots findest du überall. Wir sagen dir, was du dort bestellen solltest.',
    signupIntro: 'Hier anmelden und deine Map öffnen:',
    signupAfter: [
      'Danach: 20 Must Eats, überall in Berlin verteilt. Bereit, von dir entdeckt',
      'zu werden.',
    ],
  },
  en: {
    signOff: [
      '—',
      'You’re getting this email because someone signed in to eatthisdot.com',
      'with this address. If that wasn’t you, just ignore it.',
    ],
    validity: 'This link is valid for 1 hour and only for your email address.',
    loginIntro: 'Welcome back. Here’s your sign-in link:',
    signupLead: 'Good spots are everywhere. We tell you what to order there.',
    signupIntro: 'Sign up here and open your map:',
    signupAfter: ['Then: 20 Must Eats, spread all over Berlin. Waiting for you to discover them.'],
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
    ...t.signupAfter,
    '',
    ...t.signOff,
  ].join('\n');
}
