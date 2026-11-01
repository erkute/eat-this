'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { useMapData } from '@/lib/map/useMapData';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';
import { mustEatCardSrc } from '@/lib/must-eat/cardImage';
import styles from './NewsArticleShell.module.css';

const Cards = createContext<InitialMapData | null>(null);

/** Ein Datenabruf pro Artikel; die Map entscheidet auch hier über Freigaben. */
export function ArticleMustEatProvider({ initialData, children }: { initialData: InitialMapData; children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;
  const live = useMapData({ uid, authLoading, initialMapData: initialData });
  // Beim Kontowechsel bleiben ausschließlich öffentliche Karten sichtbar,
  // bis der Server die Freigaben des aktuellen Kontos geliefert hat.
  let data = initialData;
  if (uid !== null && !authLoading && live.dataUid === uid) {
    const cards = new Map(live.mustEats.map(card => [card._id, card]));
    // Der lokale Map-Cache enthält keine Motive/Freigaben. Die öffentlich
    // offenen SSR-Karten bleiben deshalb auch vor dem Kontenabruf sichtbar.
    for (const card of initialData.mustEats) {
      if (initialData.revealedMustEatIds.includes(card._id)
        && (!live.revealedMustEatIds.has(card._id) || !cards.get(card._id)?.image)) {
        cards.set(card._id, card);
      }
    }
    data = {
      ...initialData,
      mustEats: [...cards.values()],
      revealedMustEatIds: [...new Set([...initialData.revealedMustEatIds, ...live.revealedMustEatIds])],
    };
  }
  return <Cards.Provider value={data}>{children}</Cards.Provider>;
}

export default function ArticleMustEatArtwork({ id }: { id?: string }) {
  const data = useContext(Cards);
  const card = id && data?.revealedMustEatIds.includes(id)
    ? data.mustEats.find(m => m._id === id)
    : undefined;
  const image = card?.image ? mustEatCardSrc(card.image, 440) : '/pics/card-back.webp?v=20261028';
  return (
    <div className={styles.mustEatPh} data-article-card-state={card?.image ? 'open' : 'covered'}>
      {/* Protected artwork keeps its capability cookie through the native image request. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} width={760} height={1044} alt="" loading="lazy" decoding="async" />
    </div>
  );
}
