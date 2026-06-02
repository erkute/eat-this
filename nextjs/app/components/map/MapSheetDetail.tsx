'use client'
import { type Ref } from 'react'
import type { MapRestaurant, MapMustEat } from '@/lib/types'
import type { UserLocation, UserTier } from '@/lib/map'
import RestaurantDetail from './RestaurantDetail'
import MustEatDetail from './MustEatDetail'
import styles from './map.module.css'

type CommonProps = {
  contentRef: Ref<HTMLDivElement | null>
  uid: string | null
  userTier: UserTier
  userLocation: UserLocation | null
  unlockedIds: Set<string>
}

type MustEatProps = CommonProps & {
  kind: 'mustEat'
  mustEat: MapMustEat
  onUnlock: () => void
  onClose: () => void
  onBack?: () => void
  onViewAllMustEats?: () => void
  onViewRestaurant: () => void
}

type RestaurantProps = CommonProps & {
  kind: 'restaurant'
  restaurant: MapRestaurant
  mustEats: MapMustEat[]
  revealedMustEatIds: Set<string>
  onClose: () => void
  onMustEatClick: (m: MapMustEat) => void
  isFavorite: boolean
  onToggleFavorite: () => void
  prevRestaurant: MapRestaurant | null
  nextRestaurant: MapRestaurant | null
  onPagePrev: () => void
  onPageNext: () => void
}

type Props = MustEatProps | RestaurantProps

export default function MapSheetDetail(props: Props) {
  return (
    <div ref={props.contentRef} className={styles.detailMount}>
      {props.kind === 'mustEat' ? (
        <MustEatDetail
          mustEat={props.mustEat}
          userLocation={props.userLocation}
          isUnlocked={props.unlockedIds.has(props.mustEat._id)}
          onUnlock={props.onUnlock}
          onClose={props.onClose}
          onBack={props.onBack}
          onViewAllMustEats={props.onViewAllMustEats}
          onViewRestaurant={props.onViewRestaurant}
          uid={props.uid}
          inSheet
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
  )
}
