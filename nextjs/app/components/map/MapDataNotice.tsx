'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { notify } from '@/lib/notice';

interface Props {
  error: string | null;
  hasData: boolean;
  onRetry: () => void;
}

/**
 * Persistent map-payload status. Cached/SSR rows remain usable on refresh
 * failures, but are explicitly labelled as stale instead of looking current. A
 * successful background refresh stays silent.
 *
 * Die Meldung hat keine eigene Fläche: Sie läuft durch die zentrale Info-Karte
 * (NotificationToast), wie die Standort-Meldung von Karte und Startseite auch.
 * `duration: 0`: Die Meldung steht, solange der Zustand steht, und der
 * Rückgabewert räumt genau sie wieder ab.
 *
 * Nur Fehler melden sich. Einen Ladezustand gibt es nicht: Die Map kommt mit
 * Server-Daten, und wo sie fehlen, sagt eine leere Karte dasselbe. Ein Zustand
 * „aktualisiert im Hintergrund" fehlt mit Absicht: Die Meldung spränge bei
 * jedem Besuch von Deck und Map auf und gleich wieder zu. Geht die
 * Aktualisierung schief, meldet sich `stale`.
 */
export default function MapDataNotice({ error, hasData, onRetry }: Props) {
  const locale = useLocale();
  const state = error ? (hasData ? 'mapDataStale' : 'mapDataError') : null;

  useEffect(() => {
    if (!state) return;
    return notify(state, locale, {
      action: { label: locale === 'en' ? 'Retry' : 'Nochmal', onClick: onRetry },
      onDismiss: () => {},
      duration: 0,
    });
  }, [state, onRetry, locale]);

  return null;
}
