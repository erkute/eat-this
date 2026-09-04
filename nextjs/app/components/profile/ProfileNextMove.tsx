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
 * Seit 04.09.2026 mit der Karte selbst, verdeckt, klein: der Block sagte bis
 * dahin „Noch 3 Must Eats in Kreuzberg verdeckt" und zeigte nichts davon.
 * Die Rueckseite daneben macht aus der Auskunft ein Ziel — dasselbe Bild,
 * das im Album auf seinen Platz wartet.
 *
 * Und er heisst nicht mehr „Erstes Must Eat", wenn dieses Konto noch nichts
 * selbst aufgedeckt hat (Nutzer, 04.09.2026). „Das erste" war schlicht
 * falsch: die zehn oeffentlich aufgedeckten Karten liegen von Anfang an
 * offen im Deck. Was hier steht, ist immer das NAECHSTE.
 *
 * Eine Zeile, kein Kasten (Nutzer, 04.09.2026: „uebelst dick geloest, das
 * muss kleiner sein, einfach nur mit nem Standort"). Er stand mit
 * Kicker-Zeile, Satz und gefuelltem Knopf untereinander auf 110 px — mehr
 * Hoehe als eine Kartenreihe, fuer eine Auskunft. Jetzt laufen Karte,
 * Beschriftung, Satz und die Standort-Freigabe in EINER Zeile, und die
 * Freigabe ist eine Pille in der Groesse der Bezirks-Reiter darunter statt
 * des lautesten Knopfes der Seite.
 */
export default function ProfileNextMove({ mustEats, faceUpIds, districtByRest }: Props) {
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

  /* Immer die Verdeckt-Fassung, seit der Slogan ueber dem Deck steht
     (05.09.2026). Fuer ein Konto ohne eigene Aufdeckung hiess es hier
     „Must Eats deckst du vor Ort auf. Das naechste wartet in Mitte." — und
     genau das sagt der Slogan zwei Zeilen darueber jetzt besser. Die Zahl
     der verdeckten Karten sagt er nicht, also bleibt sie hier. */
  const line = distance
    ? t('moveCoveredNear', { count: move.covered, district: move.district, distance })
    : t('moveCovered', { count: move.covered, district: move.district });

  const label = t('moveLabel');
  /* Die kurze Fassung ist kein eigener Satz, sondern zwei Angaben mit einem
     Trennzeichen — deshalb hier zusammengesetzt und nicht als Textbaustein:
     an „478 m · Kreuzberg" gibt es nichts zu uebersetzen. */
  const short = distance ? `${distance} · ${move.district}` : move.district;
  /* Nur noch die Standort-Beschriftung: „Auf der Map" ist mit dem zweiten
     Knopf entfallen, den Weg traegt jetzt die Karte. */
  const cta = loading ? getLocatingCopy(locale) : t('moveLocateCta');
  const ctaShort = loading ? getLocatingCopy(locale) : t('moveLocateShort');

  return (
    <div className={styles.move}>
      <p className={styles.moveLine}>
        {/* Die Beschriftung laeuft im Satz mit, nicht als eigene Zeile
            darueber: sie sagt, worum es geht, und kostet so keine Hoehe. */}
        <span className={styles.moveLabel}>{label}</span>
        {/* Zwei Fassungen, eine sichtbar. Auf dem Telefon war der ganze Satz
            drei bis vier Zeilen hoch (Nutzer, 05.09.2026: „viel zu viel Text
            ... muss eine Zeile auf mobile"); dort steht nur noch, WO die
            naechste Karte liegt und wie weit es ist. Der Satz, der erklaert,
            wie das Aufdecken geht, steht seit demselben Tag ohnehin ueber dem
            Deck — er muss hier nicht noch einmal stehen.

            `display: none` und nicht `visibility`: die versteckte Fassung
            faellt damit auch aus dem Vorlese-Baum, sonst haette die Zeile
            beides hintereinander angesagt. */}
        <span className={styles.moveLong}>{line}</span>
        <span className={styles.moveShort}>{short}</span>
      </p>
      {/* Nur noch EIN Knopf, und nur dort, wo er etwas bewirkt: ohne
          Standort ist das Freigeben der Schritt — er macht aus einem Bezirk
          eine Entfernung. Ist der Standort da oder in den Browser-
          Einstellungen abgelehnt, steht hier nichts mehr; der Weg auf die
          Map liegt in der Karte rechts. */}
      {canLocate && (
        <button type="button" className={styles.moveCta} onClick={() => void request()}>
          {/* Dieselbe Teilung wie beim Satz: „Standort freigeben" sprengt auf
              350 px die Zeile, „Standort" passt. Waehrend des Suchens steht in
              beiden dasselbe. */}
          <span className={styles.moveLong}>{cta}</span>
          <span className={styles.moveShort}>{ctaShort}</span>
        </button>
      )}
      {/* Die Karte, um die es geht — verdeckt, also ihre Rueckseite. Sie IST
          der Weg: seit 04.09.2026 gibt es keinen „Auf der Map"-Knopf mehr
          daneben (Nutzer: „das kann jetzt weg, weil man ja auf die Karte
          klicken und landen kann"). Vorher war sie nur Dekoration, und der
          Block hatte zwei Ausgaenge fuer dasselbe Ziel.

          Am RECHTEN Ende der Zeile, seit 05.09.2026 (Nutzer: „mach mal die
          Karte auf die rechte Seite, das macht mehr Sinn"). Links stand sie
          dem Text vor: die Zeile fing damit 56 px weiter innen an als
          Ueberschrift, Reiter und Raster. Jetzt schliesst sie die Zeile ab,
          und der Text beginnt an derselben Kante wie alles darunter.

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
    </div>
  );
}
