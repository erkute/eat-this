import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

for (const reduced of [false, true]) {
  test(`FAQ opens quietly and keeps keyboard focus visible (${reduced})`, async ({ page, context, baseURL, isMobile }) => {
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.goto('/');
    const questions = page.locator('[data-hub-faq] summary');
    const question = questions.nth(1);
    await question.scrollIntoViewIfNeeded();
    await expect(question).toHaveCSS('-webkit-tap-highlight-color', 'rgba(0, 0, 0, 0)');
    if (isMobile) await question.tap(); else await question.click();
    await expect(question.locator('..')).toHaveAttribute('open', '');
    await expect(question).toHaveCSS('outline-style', 'none');
    await expect(question).toHaveCSS('box-shadow', 'none');
    if (isMobile) await question.tap(); else await question.click();
    await expect(question.locator('..')).not.toHaveAttribute('open', '');
    await question.focus();
    await page.keyboard.press('Tab');
    const keyboardQuestion = questions.nth(2);
    await expect(keyboardQuestion).toBeFocused();
    await expect(keyboardQuestion).not.toHaveCSS('box-shadow', 'none');
    await page.keyboard.press('Enter');
    await expect(keyboardQuestion.locator('..')).toHaveAttribute('open', '');
  });
}
