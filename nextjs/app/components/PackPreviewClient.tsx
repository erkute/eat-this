'use client';

import { useAuth } from '@/lib/auth';
import { useMapData } from '@/lib/map/useMapData';
import { selectPackPreview } from '@/lib/pack/preview';
import type { MapMustEat } from '@/lib/types';
import PackPreviewCard from './PackPreviewCard';

interface Props {
  initialCard: MapMustEat | null;
  locale: 'de' | 'en';
  category?: string;
}

export default function PackPreviewClient(props: Props) {
  const { user, loading } = useAuth();
  if (user && !loading) return <AccountPreview key={user.uid} uid={user.uid} {...props} />;
  return props.initialCard ? (
    <PackPreviewCard card={props.initialCard} locale={props.locale} />
  ) : null;
}

function AccountPreview({ uid, initialCard, locale, category }: Props & { uid: string }) {
  // Reuse the map's authenticated fetch, entitlement updates and stripped cache.
  // A keyed mount plus dataUid prevents a previous account's cards flashing on switch.
  const live = useMapData({ uid, authLoading: false });
  const card =
    live.dataUid === uid
      ? selectPackPreview({
          mustEats: live.mustEats,
          restaurants: live.restaurants,
          revealedIds: live.revealedMustEatIds,
          category,
        })
      : null;
  if (card) return <PackPreviewCard card={card} locale={locale} personal />;
  return initialCard ? <PackPreviewCard card={initialCard} locale={locale} /> : null;
}
