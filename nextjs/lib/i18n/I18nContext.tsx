'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { translations, type Lang, type TranslationsShape } from './translations';

// ─── Types ─────────────────────────────────────────────────────────────────

interface I18nContextValue {
  lang: Lang;
  t: (keyPath: string) => string;
  setLang: (lang: Lang) => void;
  /** Apply translations to legacy data-i18n* DOM attributes during migration. */
  applyTranslations: () => void;
}

// ─── Context ───────────────────────────────────────────────────────────────

const I18nContext = createContext<I18nContextValue | null>(null);

// ─── Lang detection ────────────────────────────────────────────────────────
// Mirrors the priority in the vanilla JS engine and the inline bootstrap script:
// URL ?lang= > localStorage > navigator.language > 'de' (Berlin-first default)

function detectLang(): Lang {
  if (typeof window === 'undefined') return 'de';
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (fromUrl === 'de' || fromUrl === 'en') return fromUrl;
  const stored = localStorage.getItem('lang');
  if (stored === 'de' || stored === 'en') return stored;
  const nav = (navigator.language || 'de').toLowerCase();
  if (nav.startsWith('de')) return 'de';
  if (nav.startsWith('en')) return 'en';
  return 'de';
}

// ─── Path resolver ─────────────────────────────────────────────────────────

function resolvePath(dict: TranslationsShape, path: string): string {
  const keys = path.split('.');
  let val: unknown = dict;
  for (const k of keys) {
    if (val === null || typeof val !== 'object') return path;
    val = (val as Record<string, unknown>)[k];
  }
  return typeof val === 'string' ? val : path;
}

// ─── Provider ──────────────────────────────────────────────────────────────

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Server renders with 'de' (safe default); client syncs to detected lang after hydration.
  const [lang, setLangState] = useState<Lang>('de');

  useEffect(() => {
    setLangState(detectLang());
  }, []);

  const t = useCallback(
    (keyPath: string) => resolvePath(translations[lang], keyPath),
    [lang],
  );

  /** Updates URL, localStorage, and React state — mirroring the vanilla engine. */
  const setLang = useCallback((newLang: Lang) => {
    if (!translations[newLang]) return;
    setLangState(newLang);
    localStorage.setItem('lang', newLang);
    try {
      const url = new URL(window.location.href);
      if (newLang === 'en') url.searchParams.set('lang', 'en');
      else url.searchParams.delete('lang');
      window.history.replaceState(null, '', url.toString());
    } catch {
      // Non-critical: URL sync failure should not block translation update.
    }
  }, []);

  /**
   * Fills data-i18n* (textContent, placeholder, aria-label) attributes in the DOM.
   * Used for legacy vanilla JS elements during migration. The data-i18n-html
   * variant is intentionally handled by i18n.min.js until those elements are
   * migrated to React components.
   */
  const applyTranslations = useCallback(() => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n')!;
      const val = t(key);
      if (val !== key) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder')!;
      const val = t(key);
      if (val !== key) (el as HTMLInputElement).placeholder = val;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria')!;
      const val = t(key);
      if (val !== key) el.setAttribute('aria-label', val);
    });
    document.documentElement.lang = lang;
  }, [lang, t]);

  // Re-apply DOM translations whenever lang changes (covers migrated + legacy elements).
  useEffect(() => {
    applyTranslations();
  }, [applyTranslations]);

  const value = useMemo(
    () => ({ lang, t, setLang, applyTranslations }),
    [lang, t, setLang, applyTranslations],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

// Stable DE fallback for components rendered outside <I18nProvider> (e.g. restaurant pages).
const I18N_FALLBACK: I18nContextValue = {
  lang: 'de',
  t: (keyPath) => resolvePath(translations['de'], keyPath),
  setLang: () => {},
  applyTranslations: () => {},
};

export function useTranslation(): I18nContextValue {
  return useContext(I18nContext) ?? I18N_FALLBACK;
}
