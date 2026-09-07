// Plain-text alternatives for the two auth mails. Kept lean and transactional
// (no marketing hype) — both for accessibility and for deliverability: a
// missing or hype-heavy text/plain part is a documented spam signal.

const SIGN_OFF = [
  '—',
  'Du bekommst diese E-Mail, weil sich jemand mit dieser Adresse bei eatthisdot.com',
  'angemeldet hat. Warst du das nicht, ignoriere sie einfach.',
];

/** Returning user: the link, nothing else. */
export function buildLoginText(magicLink: string): string {
  return [
    'EAT THIS — We tell you what to eat.',
    '',
    'Willkommen zurück. Hier ist dein Login-Link:',
    magicLink,
    '',
    'Der Link gilt 1 Stunde und nur für deine E-Mail-Adresse.',
    '',
    ...SIGN_OFF,
  ].join('\n');
}

/** First-time address: same link, one line of context. */
export function buildSignupText(magicLink: string): string {
  return [
    'EAT THIS — We tell you what to eat.',
    '',
    'Gute Spots findest du überall. Wir sagen dir, was du dort bestellen solltest.',
    '',
    'Hier anmelden und deine Map öffnen:',
    magicLink,
    '',
    'Der Link gilt 1 Stunde und nur für deine E-Mail-Adresse.',
    'Danach: 20 Karten. Zehn liegen in deinem Deck, zehn liegen drau\u00dfen in',
    'Berlin \u2014 die holst du dir vor Ort.',
    '',
    ...SIGN_OFF,
  ].join('\n');
}
