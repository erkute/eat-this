import { defineRouting } from 'next-intl/routing';

// DE ist Default ohne URL-Präfix (/musts), EN mit /en (/en/musts).
// Altlinks ?lang=en werden in middleware.ts auf /en/... umgeleitet.
export const routing = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  localePrefix: 'as-needed',
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];
