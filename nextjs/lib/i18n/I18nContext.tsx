'use client';

/**
 * Wrapper that keeps the legacy `useTranslation()` API (`{ lang, t, setLang, applyTranslations }`)
 * so existing components don't need to be rewritten. Internally backed by next-intl.
 *
 * Provider is no longer needed — next-intl's NextIntlClientProvider lives in app/[locale]/layout.tsx.
 */

import { useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { Lang } from './translations';

interface I18nContextValue {
  lang: Lang;
  t: (keyPath: string) => string;
  setLang: (lang: Lang) => void;
  /** Apply translations to legacy data-i18n* DOM attributes during migration. */
  applyTranslations: () => void;
}

/** Provider is a no-op now; kept exported so existing imports don't break. */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useTranslation(): I18nContextValue {
  const lang = useLocale() as Lang;
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();

  const tWrapped = useCallback(
    (keyPath: string) => {
      try {
        return t(keyPath);
      } catch {
        return keyPath;
      }
    },
    [t],
  );

  const setLang = useCallback(
    (newLang: Lang) => {
      if (newLang === lang) return;
      router.replace(pathname, { locale: newLang });
    },
    [lang, router, pathname],
  );

  const applyTranslations = useCallback(() => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n')!;
      const val = tWrapped(key);
      if (val !== key) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder')!;
      const val = tWrapped(key);
      if (val !== key) (el as HTMLInputElement).placeholder = val;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria')!;
      const val = tWrapped(key);
      if (val !== key) el.setAttribute('aria-label', val);
    });
    document.documentElement.lang = lang;
  }, [lang, tWrapped]);

  return { lang, t: tWrapped, setLang, applyTranslations };
}
