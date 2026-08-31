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
 * Der naechste Zug: welches verdeckte Must Eat drankommt und wie weit es weg ist.
 *
 * Das Profil kannte bisher nur Zustaende — wie viel gehoert dir, was hast du
 * aufgedeckt, was liegt noch verdeckt. Alles davon in der Vergangenheitsform.
 * Das Produkt hat Standort, Karte und Fortschritt; die Seite, die einem den
 * Fortschritt zeigt, hatte davon nichts und endete deshalb im Nichts.
 *
 * Sitzt seit 31.08.2026 IM Deck, als Einleitung zwischen der Ueberschrift und
 * den Bezirken — nicht mehr in der Ink-Tafel des Kopfes. Er handelt vom Deck
 * und war dort oben ein Untermieter (Nutzer: „sollte das nicht runter zum
 * Deck?"). Als Teil des Abschnitts kostet er keinen zusaetzlichen
 * Abschnitts-Abstand.
 *
 * Nicht mehr eine grosse klickbare Flaeche, sondern Text plus Knopf. Als
 * Flaeche war der ganze Block ein Control, und sein zugaenglicher Name damit
 * sein gesamter Inhalt: „Erstes Must EatMust Eats deckst du vor Ort auf. Das
 * erste liegt 478 m von hier, in Kreuzberg.Standort freigeben".
 *
 * Uebernimmt dabei den Anstupser, den „Zuletzt aufgedeckt" bei null
 * Aufdeckungen schuldig blieb: wer noch nie eines umgedreht hat, liest hier
 * zuerst, dass man Must Eats vor Ort aufdeckt.
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

  const label = hasRevealed ? t('moveLabel') : t('moveFirstLabel');
  const cta = canLocate ? (loading ? getLocatingCopy(locale) : t('moveLocateCta')) : t('moveCta');

  return (
    <div className={styles.move}>
      <p className={styles.moveLabel}>{label}</p>
      <p className={styles.moveLine}>{line}</p>
      {canLocate ? (
        /* Ohne Standort ist das Freigeben der Schritt — er macht aus einem
           Bezirk eine Entfernung. */
        <button type="button" className={styles.moveCta} onClick={() => void request()}>
          {cta}
        </button>
      ) : (
        /* Auf das Must Eat selbst, nicht nur auf seinen Spot: ein Spot traegt
           mehrere, und `?me=` oeffnet genau das gemeinte — auch verdeckt, denn
           die Huelle einer verdeckten Karte liegt in denselben Kartendaten. */
        <MapIntentLink
          href={`/map?me=${encodeURIComponent(move.target._id)}`}
          rel="nofollow"
          className={styles.moveCta}
        >
          {cta}
        </MapIntentLink>
      )}
    </div>
  );
}
