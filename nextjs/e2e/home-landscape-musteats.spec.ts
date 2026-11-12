import { test, expect } from '@playwright/test';
for (const width of [667, 844])
  for (const motion of ['no-preference', 'reduce'] as const)
    test(`home Must Eats deal completes at ${width} (${motion})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 390 });
      await page.emulateMedia({ reducedMotion: motion });
      await page.goto('/');
      const section = page.locator('[data-hub-musteats]');
      if (motion === 'no-preference')
        await expect(section.locator('[data-deal-back]').first()).toBeVisible();
      await section.locator('ul').scrollIntoViewIfNeeded();
      for (const back of await section.locator('[data-deal-back]').all())
        await expect(back).toBeHidden();
      const card = section.locator('[data-stack-photo]').first();
      expect((await card.boundingBox())!.height).toBeLessThan(220);
      await page.screenshot({
        path: `/tmp/eat-this-home-landscape-musteats-${width}-${motion}.png`,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.setViewportSize({ width, height: 390 });
      await section.locator('ul').scrollIntoViewIfNeeded();
      for (const back of await section.locator('[data-deal-back]').all())
        await expect(back).toBeHidden();
      expect((await card.boundingBox())!.height).toBeLessThan(220);
    });
