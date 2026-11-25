import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test as base, type BrowserContext } from '@playwright/test';

export * from '@playwright/test';

// Jedes Foto von der Sanity-CDN zählt gegen das monatliche Datenvolumen des
// Projekts. Die Browsertests prüfen Aufbau und Bedienung, nicht die Fotos, und
// laufen pro PR in drei Browsern über rund 150 Seiten. Darum bekommen sie
// einfarbige Platzhalter (4:3, wenige KB). Der Platzhalter ist mindestens so
// breit wie das angefragte `w`: Bei `srcset` teilt der Browser die
// `naturalWidth` durch die Pixeldichte, ein zu schmaler Platzhalter sähe dann
// wie das kleine Vorschaubild aus.
const WIDTHS = [160, 320, 640, 1280, 2560, 3840];
const PLACEHOLDERS = new Map(
  WIDTHS.map((width) => [width, readFileSync(resolve(`e2e/fixtures/sanity-placeholder-${width}.webp`))])
);

function placeholderFor(url: string): Buffer {
  const requested = Number(new URL(url).searchParams.get('w')) || 0;
  const width = WIDTHS.find((candidate) => candidate >= requested) ?? WIDTHS[WIDTHS.length - 1];
  return PLACEHOLDERS.get(width)!;
}

/** Für Kontexte, die ein Test selbst mit `browser.newContext()` öffnet. */
export async function placeholderSanityPhotos(context: BrowserContext): Promise<void> {
  await context.route('https://cdn.sanity.io/images/**', (route) =>
    route.fulfill({ body: placeholderFor(route.request().url()), contentType: 'image/webp' })
  );
}

export const test = base.extend<{ sanityPhotoPlaceholder: void }>({
  sanityPhotoPlaceholder: [
    async ({ context }, use) => {
      await placeholderSanityPhotos(context);
      await use();
    },
    { auto: true },
  ],
});
