import { defineRouting } from 'next-intl/routing';

// DE ist Default ohne URL-Präfix (/musts), EN mit /en (/en/musts).
// Altlinks ?lang=en werden in middleware.ts auf /en/... umgeleitet.
// localeDetection: false → / ist immer DE, /en/* ist immer EN. Sprache wechselt
// nur per expliziter Toggle (setLang macht window.location.assign).
export const routing = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  localePrefix: 'as-needed',
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
