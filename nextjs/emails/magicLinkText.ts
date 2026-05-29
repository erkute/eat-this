// Plain-text fallback for the magic-link email. Kept lean + transactional
// (no marketing hype) — both for accessibility and for deliverability.
export function buildMagicLinkText(magicLink: string): string {
  return [
    'EAT THIS — We tell you what to eat.',
    '',
    'Dein Login-Link. Tipp drauf, du bist drin:',
    magicLink,
    '',
    'Der Link ist 1 Stunde gültig und nur für deine E-Mail-Adresse bestimmt.',
    '',
    '—',
    'Du bekommst diese E-Mail, weil du dich bei eatthisdot.com angemeldet hast.',
    'Nicht angefordert? Ignoriere sie einfach.',
  ].join('\n')
}
