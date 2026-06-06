'use client';

/**
 * Wrapper that keeps the legacy `useTranslation()` API (`{ lang, t, setLang }`)
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
}

/** Provider is a no-op now; kept exported so existing imports don't break. */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useTranslation(): I18nContextValue {
  const lang = useLocale() as Lang;
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();

  // Some consumers do their own {name} / {mail} substitution and expect the raw
  // string with placeholders intact. next-intl otherwise tries to ICU-format any
  // key containing `{...}` and throws if no values are passed. Fall back to
  // t.raw() to preserve the placeholders.
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

  // Soft-nav locale switch — next-intl's router rewrites the /en prefix and
  // swaps messages in place; the cookie keeps middleware/legacy ?lang redirects
  // consistent with the chosen locale.
  const setLang = useCallback(
    (newLang: Lang) => {
      if (newLang === lang) return;
      document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}`;
      try { localStorage.setItem('lang', newLang); } catch {}
      router.replace(pathname, { locale: newLang });
    },
    [lang, pathname, router],
  );

  return { lang, t: tWrapped, setLang };
}
