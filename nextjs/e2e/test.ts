import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test as base, type BrowserContext } from '@playwright/test';

export * from '@playwright/test';

// Jedes Foto von der Sanity-CDN zählt gegen das monatliche Datenvolumen des
// Projekts. Die Browsertests prüfen Aufbau und Bedienung, nicht die Fotos, und
// laufen pro PR in drei Browsern über rund 150 Seiten. Darum bekommen sie ein
// kleines, echtes Platzhalterbild (320 × 240) statt der Fotos.
const PLACEHOLDER = readFileSync(resolve('e2e/fixtures/sanity-placeholder.webp'));

/** Für Kontexte, die ein Test selbst mit `browser.newContext()` öffnet. */
export async function placeholderSanityPhotos(context: BrowserContext): Promise<void> {
  await context.route('https://cdn.sanity.io/images/**', (route) =>
    route.fulfill({ body: PLACEHOLDER, contentType: 'image/webp' })
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
