'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import MapIntentLink from '@/app/components/MapIntentLink';
import { formatLocalizedDistance } from '@/lib/map/distance';
import { normalizeName } from '@/lib/normalizeName';
import { getLocatingCopy } from '@/lib/map/locationStatus';
import { useUserLocationContext } from '@/lib/map/UserLocationContext';
import { FALLBACK_DISTRICT, pickNextMove } from '@/lib/profile/nextMove';
import type { MapMustEat } from '@/lib/types';
import styles from './Profile.module.css';

const CARD_BACK = '/pics/card-back.webp?v=7';

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
 *
 * Seit 04.09.2026 mit der Karte selbst, verdeckt, klein: der Block sagte bis
 * dahin „Noch 3 Must Eats in Kreuzberg verdeckt" und zeigte nichts davon.
 * Die Rueckseite daneben macht aus der Auskunft ein Ziel — dasselbe Bild,
 * das im Album auf seinen Platz wartet.
 *
 * Und er heisst nicht mehr „Erstes Must Eat", wenn dieses Konto noch nichts
 * selbst aufgedeckt hat (Nutzer, 04.09.2026). „Das erste" war schlicht
 * falsch: die zehn oeffentlich aufgedeckten Karten liegen von Anfang an
 * offen im Deck. Was hier steht, ist immer das NAECHSTE.
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

  const label = t('moveLabel');
  /* Nur noch die Standort-Beschriftung: „Auf der Map" ist mit dem zweiten
     Knopf entfallen, den Weg traegt jetzt die Karte. */
  const cta = loading ? getLocatingCopy(locale) : t('moveLocateCta');

  return (
    <div className={styles.move}>
      {/* Die Karte, um die es geht — verdeckt, also ihre Rueckseite. Sie IST
          der Weg: seit 04.09.2026 gibt es keinen „Auf der Map"-Knopf mehr
          daneben (Nutzer: „das kann jetzt weg, weil man ja auf die Karte
          klicken und landen kann"). Vorher war sie nur Dekoration, und der
          Block hatte zwei Ausgaenge fuer dasselbe Ziel.

          Auf den SPOT, nicht auf das Must Eat — dieselbe Wahl wie im Zoom des
          Albums: ein Spot traegt mehrere Karten, und wer hier steht, will
          wissen, wo er hin muss. */}
      <MapIntentLink
        href={`/map?r=${encodeURIComponent(move.target.restaurant.slug)}`}
        rel="nofollow"
        className={styles.moveCard}
        aria-label={t('albumToSpot', { name: normalizeName(move.target.restaurant.name) })}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CARD_BACK} alt="" />
      </MapIntentLink>
      <div className={styles.moveCopy}>
        <p className={styles.moveLabel}>{label}</p>
        <p className={styles.moveLine}>{line}</p>
        {/* Nur noch EIN Knopf, und nur dort, wo er etwas bewirkt: ohne
            Standort ist das Freigeben der Schritt — er macht aus einem Bezirk
            eine Entfernung. Ist der Standort da oder in den Browser-
            Einstellungen abgelehnt, steht hier nichts mehr; der Weg auf die
            Map liegt in der Karte links. */}
        {canLocate && (
          <button type="button" className={styles.moveCta} onClick={() => void request()}>
            {cta}
          </button>
        )}
      </div>
    </div>
  );
}
