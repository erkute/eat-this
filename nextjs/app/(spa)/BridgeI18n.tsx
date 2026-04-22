'use client';

/**
 * BridgeI18n — bridges the React i18n context with the legacy window.i18n API.
 *
 * During migration the vanilla JS files (app.min.js, auth.min.js, etc.) still
 * call window.i18n.{t, setLang, currentLang, applyTranslations}. This component
 * keeps those calls working by syncing the React context into window.i18n.
 *
 * Functions that aren't in the React context yet (renderNewsCards, applyStartContent)
 * are preserved from whatever i18n.min.js put there before React hydrated.
 *
 * Remove this file once the SPA migration is complete and i18n.min.js is gone.
 */

import { useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

declare global {
  interface Window {
    i18n?: {
      t: (key: string) => string;
      setLang: (lang: Lang) => void;
      currentLang: () => Lang;
      applyTranslations: () => void;
      renderNewsCards?: () => Promise<void>;
      applyStartContent?: (d: Record<string, string>) => void;
    };
  }
}

export default function BridgeI18n() {
  const { lang, t, setLang, applyTranslations } = useTranslation();

  // Sync React → window.i18n on every lang change.
  // Vanilla-only functions (renderNewsCards, applyStartContent) are preserved
  // so app.min.js callers keep working unchanged.
  useEffect(() => {
    // Capture vanilla refs before overwriting so the new setLang closure can
    // still delegate to the original vanilla engine (news card re-rendering, etc.)
    const vanillaSetLang = window.i18n?.setLang;
    const vanillaRenderNewsCards = window.i18n?.renderNewsCards;
    const vanillaApplyStartContent = window.i18n?.applyStartContent;

    window.i18n = {
      t,
      currentLang: () => lang,
      applyTranslations,
      renderNewsCards: vanillaRenderNewsCards,
      applyStartContent: vanillaApplyStartContent,
      setLang: (newLang: Lang) => {
        setLang(newLang);           // update React state (triggers re-render)
        vanillaSetLang?.(newLang);  // run vanilla engine (DOM update, news cards)
      },
    };
  }, [lang, t, setLang, applyTranslations]);

  // Sync vanilla JS → React when .lang-btn clicks update localStorage
  // (e.g. before React fully takes over lang switching).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'lang' && (e.newValue === 'de' || e.newValue === 'en')) {
        setLang(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [setLang]);

  return null;
}
