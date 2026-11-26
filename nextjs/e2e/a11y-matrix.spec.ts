import { expect, test, type Page } from './test';
import AxeBuilder from '@axe-core/playwright';
import { createAccount, requireEmulators, restoreAccount } from './account-fixture';

// Barrierefreiheit der wichtigsten Zustände in beiden Sprachen und beiden
// Farbmodi. Telefon und Desktop kommen aus den Playwright-Projekten.
// Ausgelassen ist nur die Spot-Seite hell auf Deutsch: Die prüft
// public-pages.spec.ts mit denselben Regeln. theme.spec.ts prüft Dunkel DE
// ohne wcag21a/wcag22aa und ersetzt diese Matrix darum nicht.
//
// axe meldet Kontrast als „incomplete“, wenn es den Hintergrund nicht
// bestimmen kann (Foto, Textur, Verlauf). Diese Stellen gelten nicht als
// bestanden: Sie hängen als `contrast-incomplete` am Test und werden von Hand
// bewertet.

type Theme = 'light' | 'dark';
type Locale = 'de' | 'en';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function audit(page: Page, scope?: string) {
  await page.evaluate(() => document.fonts.ready);
  const builder = new AxeBuilder({ page }).withTags(TAGS);
  if (scope) builder.include(scope);
  const result = await builder.analyze();
  const incomplete = result.incomplete
    .filter(({ id }) => id === 'color-contrast')
    .flatMap(({ nodes }) => nodes.map((node) => ({ target: node.target.join(' '), why: node.any[0]?.message ?? '' })));
  if (incomplete.length) {
    await test.info().attach('contrast-incomplete', {
      body: JSON.stringify(incomplete, null, 2),
      contentType: 'application/json',
    });
  }
  expect(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
}

async function prepare(page: Page, theme: Theme) {
  await page.addInitScript((value) => localStorage.setItem('et-theme', value), theme);
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
}

const prefix = (locale: Locale) => (locale === 'en' ? '/en' : '');

interface State {
  name: string;
  skip?: (theme: Theme, locale: Locale) => boolean;
  open: (page: Page, locale: Locale) => Promise<string | undefined>;
}

const STATES: State[] = [
  {
    name: 'home',
    open: async (page, locale) => {
      await page.goto(`${prefix(locale)}/`);
      await expect(page.locator('h1')).toBeVisible();
      return undefined;
    },
  },
  {
    name: 'map list',
    open: async (page, locale) => {
      await page.goto(`${prefix(locale)}/map`);
      await expect(page.locator('[data-list-row]').first()).toBeVisible();
      return undefined;
    },
  },
  {
    name: 'map filter open',
    open: async (page, locale) => {
      await page.goto(`${prefix(locale)}/map`);
      const chip = page
        .locator('[data-filter-chip-row]')
        .getByRole('button', { name: locale === 'en' ? 'District' : 'Bezirk', exact: true });
      await chip.click();
      await expect(chip).toHaveAttribute('aria-expanded', 'true');
      // Telefon: eigenes Blatt (dialog), Desktop: Liste in der Spalte (group).
      await expect(
        page.getByRole(page.viewportSize()!.width < 1024 ? 'dialog' : 'group', {
          name: locale === 'en' ? /district/i : /Bezirk/,
        })
      ).toBeVisible();
      return undefined;
    },
  },
  {
    name: 'map spot detail',
    open: async (page, locale) => {
      await page.goto(`${prefix(locale)}/map?r=gazzo`);
      await expect(page.getByRole('dialog', { name: 'Gazzo', exact: true })).toBeVisible();
      return undefined;
    },
  },
  {
    name: 'spot page',
    skip: (theme, locale) => theme === 'light' && locale === 'de',
    open: async (page, locale) => {
      await page.goto(`${prefix(locale)}/restaurant/engelbecken`);
      await expect(page.locator('h1')).toBeVisible();
      return undefined;
    },
  },
  {
    name: 'packs',
    open: async (page, locale) => {
      await page.goto(`${prefix(locale)}/packs`);
      await expect(page.locator('h1')).toBeVisible();
      return undefined;
    },
  },
  {
    name: 'pack page',
    open: async (page, locale) => {
      await page.goto(`${prefix(locale)}/pack/pizza`);
      await expect(page.locator('h1')).toBeVisible();
      return undefined;
    },
  },
  {
    name: 'starter login',
    open: async (page, locale) => {
      await page.goto(`${prefix(locale)}/`);
      await expect(page.locator('[data-hub-musteats] ul')).toHaveAttribute('data-deal-state', 'spread');
      await page
        .getByRole('button', {
          name: locale === 'en' ? 'Face-down Must Eat — sign in to reveal' : 'Verdecktes Must Eat — anmelden und aufdecken',
          exact: true,
        })
        .click();
      await expect(
        page.getByRole('heading', {
          name: locale === 'en' ? 'Discover your Starter Pack.' : 'Entdecke dein Starter Pack.',
          exact: true,
        })
      ).toBeVisible();
      return '[role="dialog"][aria-modal="true"]';
    },
  },
];

for (const theme of ['light', 'dark'] as const) {
  for (const locale of ['de', 'en'] as const) {
    for (const state of STATES) {
      if (state.skip?.(theme, locale)) continue;
      test(`a11y ${state.name} (${locale}, ${theme})`, async ({ page }) => {
        await prepare(page, theme);
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        const scope = await state.open(page, locale);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        if (theme === 'dark') await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        else await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
        await audit(page, scope);
        expect(errors).toEqual([]);
      });
    }

    test(`a11y account tabs (${locale}, ${theme})`, async ({ page, context, request, baseURL }) => {
      requireEmulators(baseURL);
      await prepare(page, theme);
      const account = await createAccount(request);
      await restoreAccount(context, account);
      await page.goto(`${prefix(locale)}/profile`);
      const tabs = page.getByRole('tab');
      await expect(tabs).toHaveCount(4);
      for (let index = 0; index < 4; index++) {
        await tabs.nth(index).click();
        await expect(tabs.nth(index)).toHaveAttribute('aria-selected', 'true');
        await expect(page.locator('[role="tabpanel"]:not([hidden])')).toBeVisible();
        await audit(page);
      }
    });
  }
}
