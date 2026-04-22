'use client';

/**
 * Wrapper that keeps the legacy `useTranslation()` API (`{ lang, t, setLang, applyTranslations }`)
 * so existing components don't need to be rewritten. Internally backed by next-intl.
 *
 * Provider is no longer needed — next-intl's NextIntlClientProvider lives in app/[locale]/layout.tsx.
 */

import { useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
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
  const pathname = usePathname();

  // Legacy consumers (auth.min.js) expect the raw string — including {name} /
  // {mail} placeholders — so they can do their own substitution. next-intl
  // otherwise tries to ICU-format any key containing `{...}` and throws if no
  // values are passed. Fall back to t.raw() to preserve the placeholders.
  const tWrapped = useCallback(
    (keyPath: string) => {
      try {
        return t(keyPath);
      } catch {
        try {
          const raw = t.raw(keyPath);
          return typeof raw === 'string' ? raw : keyPath;
        } catch {
          return keyPath;
        }
      }
    },
    [t],
  );

  // Full-page reload so legacy app.min.js / i18n.min.js re-initialize for the
  // new locale. Soft-nav (router.replace) would leave stale DOMContentLoaded
  // state. Remove once Phase B lands and legacy JS is gone.
  const setLang = useCallback(
    (newLang: Lang) => {
      if (newLang === lang) return;
      document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}`;
      try { localStorage.setItem('lang', newLang); } catch {}
      const target =
        newLang === routing.defaultLocale ? pathname : `/${newLang}${pathname}`;
      window.location.assign(target);
    },
    [lang, pathname],
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
