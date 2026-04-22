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

import { useEffect, useRef } from 'react';
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
  // Remember the vanilla methods the first time we see them (after
  // i18n.min.js loads via afterInteractive and overwrites window.i18n).
  const vanillaRef = useRef<{
    setLang?: (l: Lang) => void;
    applyStartContent?: (d: Record<string, string>) => void;
  }>({});

  // Sync React → window.i18n on every lang change.
  // News cards are now React-rendered, so renderNewsCards is a no-op that just
  // re-binds the legacy ticker/reveal logic against the React DOM.
  //
  // i18n.min.js loads AFTER hydration (next/script strategy="afterInteractive")
  // and overwrites window.i18n wholesale. We capture its methods each time we
  // run and re-install the React wrapper, so callers of window.i18n.setLang
  // always go through React state.
  useEffect(() => {
    // Capture vanilla methods, but never capture our own React wrapper
    // (tagged with __isReactBridge) — that would cause recursive setLang calls.
    const maybeVanillaSetLang = window.i18n?.setLang as
      | ((l: Lang) => void) & { __isReactBridge?: boolean }
      | undefined;
    if (maybeVanillaSetLang && !maybeVanillaSetLang.__isReactBridge) {
      vanillaRef.current.setLang = maybeVanillaSetLang;
    }
    if (window.i18n?.applyStartContent) {
      vanillaRef.current.applyStartContent = window.i18n.applyStartContent;
    }

    const install = () => {
      const wrappedSetLang = ((newLang: Lang) => {
        setLang(newLang);
        vanillaRef.current.setLang?.(newLang);
      }) as ((l: Lang) => void) & { __isReactBridge: boolean };
      wrappedSetLang.__isReactBridge = true;

      window.i18n = {
        t,
        currentLang: () => lang,
        applyTranslations,
        renderNewsCards: async () => {
          window._bindNewsCards?.();
        },
        applyStartContent: vanillaRef.current.applyStartContent,
        setLang: wrappedSetLang,
      };
    };
    install();

    // Re-install a few times over the first second — i18n.min.js / app.min.js
    // may load after this effect runs and overwrite window.i18n.
    const timers = [50, 200, 600, 1500].map(ms =>
      window.setTimeout(() => {
        const current = window.i18n;
        const currentSetLang = current?.setLang as
          | ((l: Lang) => void) & { __isReactBridge?: boolean }
          | undefined;
        // If the current setLang is already our wrapper, nothing to do.
        if (!current || !currentSetLang || currentSetLang.__isReactBridge) return;
        // A fresh vanilla window.i18n has replaced ours — capture and re-wrap.
        vanillaRef.current.setLang = currentSetLang;
        if (current.applyStartContent) vanillaRef.current.applyStartContent = current.applyStartContent;
        install();
      }, ms),
    );

    return () => { timers.forEach(t => window.clearTimeout(t)); };
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
