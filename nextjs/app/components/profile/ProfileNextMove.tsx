'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import MapIntentLink from '@/app/components/MapIntentLink';
import { formatLocalizedDistance } from '@/lib/map/distance';
import { getLocatingCopy } from '@/lib/map/locationStatus';
import { useUserLocationContext } from '@/lib/map/UserLocationContext';
import { FALLBACK_DISTRICT, pickNextMove } from '@/lib/profile/nextMove';
import type { MapMustEat } from '@/lib/types';
import styles from './Profile.module.css';

interface Props {
  /** Die eigenen Must Eats — dieselbe Liste, die das Deck zeigt. */
  mustEats: MapMustEat[];
  faceUpIds: ReadonlySet<string>;
  /** restaurantId → kuratierter Bezirk, aus ProfileShell. */
  districtByRest: ReadonlyMap<string, string>;
  /** Hat dieses Konto je selbst eine Karte aufgedeckt? */
  hasRevealed: boolean;
}

/**
 * Der naechste Zug: welche verdeckte Karte drankommt und wie weit sie weg ist.
 *
 * Das Profil kannte bisher nur Zustaende — wie viel gehoert dir, was hast du
 * aufgedeckt, was liegt noch verdeckt. Alles davon in der Vergangenheitsform.
 * Das Produkt hat Standort, Karte und Fortschritt; die Seite, die einem den
 * Fortschritt zeigt, hatte davon nichts und endete deshalb im Nichts.
 *
 * Sitzt IN der Ink-Bank, als letzte Bank unter dem Berlin-Fortschritt, und
 * nicht als eigener Abschnitt darunter: ein Abschnitt kostet den vollen
 * Abschnitts-Abstand und haette die Sammlung wieder unter die Falz geschoben,
 * die der Kopf-Umbau gerade freigeraeumt hat. Dieselbe Form wie der
 * Fortschritt darueber — Haarlinie, gelbes Label links, Weg raus rechts.
 *
 * Uebernimmt dabei den Anstupser, den „Zuletzt aufgedeckt" bei null
 * Aufdeckungen schuldig blieb: wer noch nie eine Karte umgedreht hat, liest
 * hier zuerst, dass Karten vor Ort aufgehen.
 */
export default function ProfileNextMove({
  mustEats,
  faceUpIds,
  districtByRest,
  hasRevealed,
}: Props) {
  const t = useTranslations('profile');
  const locale = useLocale();
  const { location, loading, error, request } = useUserLocationContext();

  const move = useMemo(
    () =>
      pickNextMove({
        mustEats,
        faceUpIds,
        districtOf: (m) =>
          districtByRest.get(m.restaurant._id) ?? m.restaurant.district ?? FALLBACK_DISTRICT,
        location,
      }),
    [mustEats, faceUpIds, districtByRest, location]
  );

  if (!move) return null;

  const distance =
    move.meters === null
      ? null
      : formatLocalizedDistance(move.meters, locale === 'en' ? 'en' : 'de');

  /* Ein Schritt pro Zustand. Ohne Standort ist das Freigeben der Schritt — er
     macht aus dem Bezirk eine Entfernung. Nur wo er nichts mehr bewirkt (in
     den Browser-Einstellungen abgelehnt), bleibt der Weg auf die Map. */
  const canLocate = !location && error !== 'denied';

  const line = hasRevealed
    ? distance
      ? t('moveCoveredNear', { count: move.covered, district: move.district, distance })
      : t('moveCovered', { count: move.covered, district: move.district })
    : distance
      ? t('moveFirstNear', { district: move.district, distance })
      : t('moveFirst', { district: move.district });

  const body = (
    <>
      <span className={styles.moveTop}>
        <span className={styles.moveLabel}>
          {hasRevealed ? t('moveLabel') : t('moveFirstLabel')}
        </span>
        <span className={styles.moveCta}>
          {canLocate ? (loading ? getLocatingCopy(locale) : t('moveLocateCta')) : t('moveCta')}
        </span>
      </span>
      <span className={styles.moveLine}>{line}</span>
    </>
  );

  if (canLocate) {
    return (
      <button type="button" className={styles.move} onClick={() => void request()}>
        {body}
      </button>
    );
  }

  /* Auf die Karte selbst, nicht nur auf ihren Spot: ein Spot traegt mehrere
     Must Eats, und `?me=` oeffnet genau die gemeinte — auch verdeckt, denn
     die Huelle einer verdeckten Karte liegt in denselben Kartendaten. */
  return (
    <MapIntentLink
      href={`/map?me=${encodeURIComponent(move.target._id)}`}
      rel="nofollow"
      className={styles.move}
    >
      {body}
    </MapIntentLink>
  );
}
