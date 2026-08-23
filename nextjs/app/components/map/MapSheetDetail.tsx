'use client';
import { type Ref } from 'react';
import type { MapRestaurant, MapMustEat } from '@/lib/types';
import type { UserLocation, UserTier } from '@/lib/map';
import type { UserLocationError } from '@/lib/map/useUserLocation';
import RestaurantDetail from './RestaurantDetail';
import MustEatDetail from './MustEatDetail';
import styles from './MapDetails.module.css';

type CommonProps = {
  contentRef: Ref<HTMLDivElement | null>;
  uid: string | null;
  userTier: UserTier;
  userLocation: UserLocation | null;
  unlockedIds: Set<string>;
};

type MustEatProps = CommonProps & {
  kind: 'mustEat';
  mustEat: MapMustEat;
  /* Only the must-eat detail needs these: it is the one surface where a
     missing fix blocks the whole point of the card. */
  locationError: UserLocationError | null;
  onRequestLocation: () => void;
  onUnlock: () => Promise<boolean>;
  onClose: () => void;
  onViewRestaurant: () => void;
  prevMustEat: MapMustEat | null;
  nextMustEat: MapMustEat | null;
  onPagePrev: () => void;
  onPageNext: () => void;
};

type RestaurantProps = CommonProps & {
  kind: 'restaurant';
  restaurant: MapRestaurant;
  mustEats: MapMustEat[];
  revealedMustEatIds: Set<string>;
  onClose: () => void;
  onMustEatClick: (m: MapMustEat) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  prevRestaurant: MapRestaurant | null;
  nextRestaurant: MapRestaurant | null;
  onPagePrev: () => void;
  onPageNext: () => void;
};

type Props = MustEatProps | RestaurantProps;

export default function MapSheetDetail(props: Props) {
  return (
    <div
      ref={props.contentRef}
      // mustEat: Mount endet am sichtbaren Viewport (kein URL-Bar-Apron) —
      // das fixe Karte+Text-Layout scrollt nicht, der Overhang wäre nur
      // toter Weißraum unterm Pager. Siehe .detailMountMustEat.
      className={`${styles.detailMount}${props.kind === 'mustEat' ? ` ${styles.detailMountMustEat}` : ''}`}
      data-detail-mount=""
      data-detail-kind={props.kind === 'mustEat' ? 'must-eat' : 'restaurant'}
    >
      {props.kind === 'mustEat' ? (
        <MustEatDetail
          mustEat={props.mustEat}
          userLocation={props.userLocation}
          locationError={props.locationError}
          onRequestLocation={props.onRequestLocation}
          isUnlocked={props.unlockedIds.has(props.mustEat._id)}
          onUnlock={props.onUnlock}
          onClose={props.onClose}
          onViewRestaurant={props.onViewRestaurant}
          prevMustEat={props.prevMustEat}
          nextMustEat={props.nextMustEat}
          prevUnlocked={!!props.prevMustEat && props.unlockedIds.has(props.prevMustEat._id)}
          nextUnlocked={!!props.nextMustEat && props.unlockedIds.has(props.nextMustEat._id)}
          onPagePrev={props.onPagePrev}
          onPageNext={props.onPageNext}
          uid={props.uid}
        />
      ) : (
        <RestaurantDetail
          restaurant={props.restaurant}
          mustEats={props.mustEats}
          unlockedIds={props.unlockedIds}
          revealedMustEatIds={props.revealedMustEatIds}
          userLocation={props.userLocation}
          uid={props.uid}
          userTier={props.userTier}
          onClose={props.onClose}
          onMustEatClick={props.onMustEatClick}
          isFavorite={props.isFavorite}
          onToggleFavorite={props.onToggleFavorite}
          prevRestaurant={props.prevRestaurant}
          nextRestaurant={props.nextRestaurant}
          onPagePrev={props.onPagePrev}
          onPageNext={props.onPageNext}
        />
      )}
    </div>
  );
}
