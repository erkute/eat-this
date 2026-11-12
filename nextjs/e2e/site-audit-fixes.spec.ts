import { expect, test } from '@playwright/test';

for (const theme of ['light', 'dark'] as const) {
  test(`district directory and truthful share feedback (${theme})`, async ({ page }, info) => {
    await page.addInitScript(value => {
      localStorage.setItem('et-theme', value);
      Object.defineProperty(navigator, 'share', { value: undefined });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Clipboard denied'); } } });
    }, theme);
    await page.emulateMedia({ reducedMotion: theme === 'dark' ? 'reduce' : 'no-preference' });
    const prefix = theme === 'dark' ? '/en' : '';
    await page.goto(`${prefix}/bezirk`);
    const directory = page.getByRole('navigation', { name: theme === 'dark' ? 'District list' : 'Bezirke als Liste' });
    await expect(directory.getByRole('link', { name: 'Friedenau', exact: true })).toHaveAttribute('href', `${prefix}/bezirk/friedenau`);
    await directory.scrollIntoViewIfNeeded();
    expect(await page.locator('body').evaluate(body => body.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `/tmp/eat-this-site-fixes/${info.project.name}-${theme}-districts.png` });
    await directory.getByRole('link', { name: 'Friedenau', exact: true }).click();
    await expect(page.locator('h1')).toContainText('Friedenau');
    await page.goto(`${prefix}/news/essen-trinken-schoeneberg`);
    const share = page.locator('button.et-btn-tape');
    await share.click();
    await expect(page.getByRole('alert').filter({ hasText: /Kopieren nicht möglich|Could not copy/ })).toBeVisible();
    await expect(share).toHaveText(theme === 'dark' ? 'Share' : 'Teilen');
    await expect(page.getByRole('textbox', { name: theme === 'dark' ? 'Link to copy' : 'Link zum Kopieren' })).toHaveValue(page.url());
    const buttonBox = await share.boundingBox();
    const fieldBox = await page.getByRole('textbox', { name: theme === 'dark' ? 'Link to copy' : 'Link zum Kopieren' }).boundingBox();
    expect(fieldBox!.y).toBeGreaterThan(buttonBox!.y + buttonBox!.height);
    await page.screenshot({ path: `/tmp/eat-this-site-fixes/${info.project.name}-${theme}-share-error.png` });
  });
}
