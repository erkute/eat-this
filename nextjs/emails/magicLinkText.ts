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
    'Die besten Orte Berlins auf einer Map — und für ausgewählte Spots sagen wir dir',
    'gleich, was du bestellen musst.',
    '',
    'Hier anmelden und deine Map öffnen:',
    magicLink,
    '',
    'Der Link gilt 1 Stunde und nur für deine E-Mail-Adresse.',
    'Ganz Berlin liegt danach auf deiner Map, und dein Starter Pack legt dir',
    '20 Must-Eat-Karten ins Album \u2014 zehn offen, zehn zum Aufdecken vor Ort.',
    '',
    ...SIGN_OFF,
  ].join('\n');
}
