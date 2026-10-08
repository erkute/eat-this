import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONSENT_VERSION } from '../lib/consent';

for (const locale of ['de', 'en'] as const) {
  test(`Must Eats invites visitors to try and browse the cards (${locale})`, async ({
    page,
    context,
    baseURL,
  }) => {
    await page.route('**/api/consent', (route) => route.fulfill({ status: 204 }));
    await context.addCookies([
      { name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! },
    ]);
    await page.emulateMedia({ reducedMotion: locale === 'en' ? 'reduce' : 'no-preference' });
    await page.goto(locale === 'de' ? '/' : '/en');
    await expect(page.locator('html')).not.toHaveAttribute('data-hero-intro', '');
    const section = page.getByRole('region', { name: 'Must Eats', exact: true });
    await expect(
      section.getByText(
        locale === 'de'
          ? 'Gerichte, die du bestellen solltest. Einige zeigen wir dir direkt, andere deckst du erst vor Ort auf und sammelst sie in deinem Deck.'
          : 'Dishes you should order. Some we show you right away, others you flip at the spot and collect in your deck.',
        { exact: true }
      )
    ).toBeVisible();
    const deck = section.getByRole('list', { name: 'Must Eats', exact: true });
    const mobile = page.viewportSize()!.width < 768;
    if (mobile) {
      await expect(deck.locator('li:visible')).toHaveCount(4);
      const cards = await deck.locator('li:visible').evaluateAll((items) => items.map((item) => {
        const box = item.getBoundingClientRect();
        return { x: box.x, y: box.y };
      }));
      expect(Math.abs(cards[0].y - cards[1].y)).toBeLessThan(1);
      expect(cards[2].y).toBeGreaterThan(cards[0].y);
      expect(Math.abs(cards[0].x - cards[2].x)).toBeLessThan(1);
      expect(await deck.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    } else {
      await deck.press('ArrowRight');
      await expect.poll(() => deck.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    }
    // Focus reaches cards beyond the initial crop without a carousel button.
    const covered = deck
      .locator('li')
      .nth(1)
      .getByRole('button', {
        name:
          locale === 'de'
            ? 'Verdecktes Must Eat — anmelden und aufdecken'
            : 'Face-down Must Eat — sign in to reveal',
        exact: true,
      });
    await expect(covered).toHaveCount(1);
    if (!mobile) {
      await deck.locator('li').last().getByRole('link').first().press('Tab');
      await expect.poll(() => deck.evaluate((element) => element.scrollLeft)).toBeGreaterThan(200);
    }
    const bounds = await section.evaluate((element) => ({
      width: element.clientWidth,
      content: element.scrollWidth,
    }));
    expect(bounds.content).toBeLessThanOrEqual(bounds.width + 1);
    const result = await new AxeBuilder({ page })
      .include('[data-hub-musteats]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))
    ).toEqual([]);
    if (locale === 'en') {
      expect(
        await deck
          .locator('img')
          .first()
          .evaluate((image) => getComputedStyle(image).transform)
      ).toBe('none');
    }
    const explain = section.getByRole('button', {
      name: locale === 'de' ? "Wie funktioniert's?" : 'How does it work?',
      exact: true,
    });
    await explain.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(explain).toBeFocused();
    await section
      .getByRole('link', {
        name: locale === 'de' ? 'Alle Must Eats' : 'All Must Eats',
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`${locale === 'de' ? '' : '/en'}/must-eats$`));
  });
}
