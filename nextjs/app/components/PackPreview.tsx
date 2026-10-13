import { getInitialAnonMapData } from '@/lib/map/server-initial-map-data';
import { selectPackPreview } from '@/lib/pack/preview';
import PackPreviewCard from './PackPreviewCard';

/** Keep the permanent public example identical for guests and signed-in accounts. */
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
    revealedIds: new Set(data.revealedMustEatIds),
    category,
  });
  return initialCard ? <PackPreviewCard card={initialCard} locale={locale} /> : null;
}
