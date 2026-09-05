'use client';
import { memo } from 'react';
import type { MapRestaurant } from '@/lib/types';
import MarkerButton from './MarkerButton';
import styles from './MapMarkers.module.css';

interface LockedMarkerProps {
  restaurant: MapRestaurant;
  /** The open sheet belongs to this dot — grow it so the tap is visible. */
  isSelected?: boolean;
  /** Eine Detailansicht steht offen und meint einen anderen Spot — dieser
   *  hier tritt zurück. Bleibt sichtbar und anklickbar, nur leiser. */
  isDimmed?: boolean;
  onClick: (restaurant: MapRestaurant) => void;
}

/**
 * Ein gesperrter Spot — derselbe Pin wie ein freier, nur in Rot (User,
 * 2026-09-04; davor Grau, das auf dem dunklen Basemap-Grund die hellste
 * Fläche der Karte war).
 *
 * Vorher war es ein 11px-Punkt, und zwar mit Grund: an der Standardkamera auf
 * einem 375px-Fenster stehen 15 freien Spots 194 gesperrte gegenüber. Als
 * volle Pins ist das ein dichter Teppich, in dem die gelben weniger
 * herausstechen. Die Entscheidung ist bewusst gefallen — ein grauer Pin sagt
 * „hier ist auch ein Spot" deutlicher als ein Punkt, den man für eine
 * Kartenmarkierung halten kann.
 *
 * Rot statt Gelb bei sonst gleichem Pin: die Form ist dieselbe, das Logo ist
 * dasselbe, allein die Füllung trägt den Unterschied. Der Stapel bleibt
 * richtig herum — freie Pins liegen über den roten, weil nur sie
 * `markerRootFree` (z-index 5) bekommen.
 *
 * Tapping opens the sheet like any other spot; a group of dots zooms in
 * instead.
 *
 * Named after the spot, like every other marker. It used to announce itself as
 * "Gesperrter Spot" — which made 194 markers share one name, and told a screen
 * reader the one thing nothing else on the map says out loud: the paywall is
 * the detail's business (user decision 25.08.2026).
 */
function LockedMarker({
  restaurant,
  isSelected = false,
  isDimmed = false,
  onClick,
}: LockedMarkerProps) {
  return (
    <MarkerButton
      lat={restaurant.lat}
      lng={restaurant.lng}
      anchor="bottom"
      rootClassName={
        isSelected ? `${styles.markerRoot} ${styles.markerRootActive}` : styles.markerRoot
      }
      className={[
        styles.pinLogo,
        styles.pinLogoLocked,
        isSelected && styles.pinLogoActive,
        isDimmed && styles.pinLogoDim,
      ]
        .filter(Boolean)
        .join(' ')}
      label={restaurant.name}
      onActivate={() => onClick(restaurant)}
    >
      <span className={styles.pinLogoShape} aria-hidden="true">
        {/* Dieselbe 128px-Variante wie am freien Pin — gleiche Datei, gleicher
            Cache-Eintrag. */}
        <img
          src="/pics/eat-this-square-sm.webp"
          alt=""
          width={128}
          height={136}
          draggable={false}
        />
      </span>
    </MarkerButton>
  );
}

export default memo(
  LockedMarker,
  (prev, next) =>
    prev.restaurant._id === next.restaurant._id &&
    prev.isSelected === next.isSelected &&
    prev.isDimmed === next.isDimmed &&
    prev.restaurant.lat === next.restaurant.lat &&
    prev.restaurant.lng === next.restaurant.lng &&
    prev.restaurant.name === next.restaurant.name &&
    prev.onClick === next.onClick
);
