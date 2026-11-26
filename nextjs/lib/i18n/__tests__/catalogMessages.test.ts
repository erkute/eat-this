import { describe, expect, it, vi } from 'vitest';
import { getCatalogMessages } from '@/lib/i18n/translations';
import { getLandingFaqs } from '@/lib/landing/faqs';

const { getPackContents } = vi.hoisted(() => ({ getPackContents: vi.fn() }));
vi.mock('@/lib/sanity.server', () => ({ getPackContents }));
vi.mock('next-intl/server', () => ({ getRequestConfig: (config: unknown) => config }));
import requestConfig from '@/i18n/request';

function promo(locale: 'de' | 'en', count: number) {
  return getCatalogMessages(locale, count).map.starterPromoBody;
}

function explanations(locale: 'de' | 'en', count: number) {
  const question =
    locale === 'de' ? 'Warum sind die meisten Karten verdeckt?' : 'Why are most cards face down?';
  const faq = getLandingFaqs(locale, count).find(({ q }) => q === question);
  return [getCatalogMessages(locale, count).mustEats.onbStarterBody, faq?.a ?? ''];
}

for (const locale of ['de', 'en'] as const) {
  describe(`Catalog size in ${locale}`, () => {
    it('updates the total in promos and explanations', () => {
      for (const count of [100, 101, 137]) {
        const [onboarding, faq] = explanations(locale, count);
        for (const message of [promo(locale, count), onboarding, faq]) {
          expect(message).toContain(String(count));
          expect(message).not.toMatch(/kostenlos|gratis|\bfree\b/i);
          expect(message).not.toContain('{mustEatCount}');
          if (count !== 100) expect(message).not.toContain('100');
        }
      }
    });

    it('keeps the reveal arithmetic in the explanation and discovery in the promo', () => {
      const message = promo(locale, 137);
      expect(message).not.toMatch(/\b(?:10|20)\b/);
      expect(message).toContain(
        locale === 'de' ? 'zeigt dir die ersten' : 'shows you the first ones'
      );
      expect(message).toContain(locale === 'de' ? 'entdeckst du vor Ort' : 'Discover the rest');
      const starterCount = locale === 'de' ? '20 weitere' : '20 more';
      expect(getLandingFaqs(locale, 137).filter(({ a }) => a.includes(starterCount))).toHaveLength(
        1
      );
      for (const message of explanations(locale, 137)) {
        expect(message).toContain('10');
        expect(message).toContain(starterCount);
        expect(message).toMatch(locale === 'de' ? /vor Ort/ : /spots themselves|when you visit/);
      }
    });

    it('formats larger catalogs for the current locale', () => {
      for (const message of [promo(locale, 1234), ...explanations(locale, 1234)]) {
        expect(message).toContain(locale === 'de' ? '1.234' : '1,234');
      }
    });

    it('builds the request messages from the published Sanity count', async () => {
      for (const count of [100, 101]) {
        getPackContents.mockResolvedValueOnce({ allBerlin: { mustEats: count } });
        const config = await requestConfig({ requestLocale: Promise.resolve(locale), locale });
        expect(config.messages).toEqual(getCatalogMessages(locale, count));
      }
    });
  });
}

it('keeps dotted or unsupported routes out of the FAQ', () => {
  expect(getLandingFaqs('sitemap.xml' as 'de', 100)).toEqual([]);
});
