'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  loading: boolean;
  error: string | null;
  hasData: boolean;
  onRetry: () => void;
}

/**
 * Persistent map-payload status. Cached/SSR rows remain usable on refresh
 * failures, but are explicitly labelled as stale instead of looking current.
 *
 * Die Meldung hat keine eigene Fläche: sie läuft durch die zentrale Info-Karte
 * (NotificationToast, mittig im Onboarding-Zuschnitt), wie die Standort-Meldung
 * von Karte und Startseite auch. Vorher war das eine kleine Leiste am unteren
 * Bildrand — auf dem Telefon unter dem Sheet, und die dritte Infofläche auf
 * einem Schirm. `duration: 0`: die Meldung steht, solange der Zustand steht,
 * und der Rückgabewert räumt genau sie wieder ab.
 */
export default function MapDataNotice({ loading, error, hasData, onRetry }: Props) {
  const t = useTranslations('map');
  const state = error ? (hasData ? 'stale' : 'error') : loading ? (hasData ? 'refreshing' : 'loading') : null;

  useEffect(() => {
    if (!state) return;
    const isError = state === 'error' || state === 'stale';
    const key = {
      loading: 'dataLoading',
      refreshing: 'dataRefreshing',
      error: 'dataError',
      stale: 'dataStale',
    }[state];
    return window.showNotice?.({
      tone: isError ? 'warning' : 'info',
      icon: isError ? 'alert' : 'spark',
      eyebrow: t('dataEyebrow'),
      title: t(`${key}Title`),
      detail: t(`${key}Detail`),
      action: isError ? { label: t('dataRetry'), onClick: onRetry } : undefined,
      duration: 0,
    });
  }, [state, onRetry, t]);

  return null;
}
