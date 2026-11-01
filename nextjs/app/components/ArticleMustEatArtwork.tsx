'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useVisibleMustEats } from '@/lib/must-eat/useVisibleMustEats';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';
import { mustEatCardSrc } from '@/lib/must-eat/cardImage';
import styles from './NewsArticleShell.module.css';

const Cards = createContext<InitialMapData | null>(null);

/** Ein Datenabruf pro Artikel; die Map entscheidet auch hier über Freigaben. */
export function ArticleMustEatProvider({ initialData, children }: { initialData: InitialMapData; children: ReactNode }) {
  const data = useVisibleMustEats(initialData);
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
