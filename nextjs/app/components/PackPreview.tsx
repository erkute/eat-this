import { getInitialAnonMapData } from '@/lib/map/server-initial-map-data';
import { selectPackPreview } from '@/lib/pack/preview';
import PackPreviewClient from './PackPreviewClient';

/** SSR ships only the permanent public shop window, never personalized cards. */
export default async function PackPreview({
  locale,
  category,
}: {
  locale: 'de' | 'en';
  category?: string;
}) {
  const data = await getInitialAnonMapData();
  const initialCard = selectPackPreview({
    mustEats: data.mustEats,
    restaurants: data.restaurants,
    revealedIds: new Set(data.revealedMustEatIds),
    category,
    permanentOnly: true,
  });
  return <PackPreviewClient initialCard={initialCard} locale={locale} category={category} />;
}
