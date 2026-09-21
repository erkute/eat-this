// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
const replace = vi.hoisted(() => vi.fn());
vi.mock('next-intl', () => ({
  useLocale: () => 'de',
  useTranslations: () => (key: string) => key,
}));
vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/kategorie/pizza',
  useRouter: () => ({ replace }),
}));
import { useTranslation } from './I18nContext';
beforeEach(() => {
  replace.mockClear();
});
it('keeps active filters and anchors when switching languages', () => {
  window.history.replaceState({}, '', '/kategorie/pizza?bezirk=neukoelln&price=2#spots');
  const { result } = renderHook(() => useTranslation());
  act(() => result.current.setLang('en'));
  expect(replace).toHaveBeenCalledWith('/kategorie/pizza?bezirk=neukoelln&price=2#spots', {
    locale: 'en',
    scroll: false,
  });
});
