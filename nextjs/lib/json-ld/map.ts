import { serializeJsonLd } from './serialize';
import { buildWebPageNodes } from './webpage';
import { localeUrl } from '@/lib/locale-url';
import { OG_CARD_VERSION, SITE_URL } from '@/lib/constants';
import { schemaImageUrl } from '@/lib/sanity-image-presets';
import type { MapRestaurant } from '@/lib/types';
import type { MapFaqEntry } from '@/lib/map/mapSeoCopy';

interface BuildMapJsonLdArgs {
  locale: 'de' | 'en';
  /** Wörtlich die FAQ, die MapSeoFooter rendert — siehe lib/map/mapSeoCopy.ts. */
  faqs: MapFaqEntry[];
  /** Name der ItemList, in der Sprache der Seite. */
  listName: string;
  /** Genau die Spots, die im ausgelieferten HTML als Zeilen stehen. */
  restaurants: MapRestaurant[];
}

/**
 * WebPage + FAQPage + ItemList für `/map`.
 *
 * Das Seitenbild ist die Markenkarte, nicht ein Restaurantfoto: die Karte zeigt
 * keinen Ort, sondern alle, und `primaryImageOfPage` soll sagen, was Google als
 * Thumbnail nehmen darf — dieselbe Überlegung wie auf der Startseite, nur ohne
 * deren zweite quadratische Variante (die gehört dem Home-Graph).
 *
 * Die ItemList führt bewusst nur die Zeilen, die wirklich im HTML stehen.
 * `RestaurantList` rendert zunächst `INITIAL_LIST_ROWS` Karten und lädt den Rest
 * über einen Sentinel nach; eine Liste über alle ~340 Spots wäre eine Behauptung
 * über eine Seite, die so nicht ausgeliefert wird. Deshalb bekommt der Builder
 * die Auswahl fertig übergeben — der Aufrufer schneidet sie mit demselben
 * Vergleich zu, nach dem die Liste sortiert (`byMustEatsThenName`).
 */
export function buildMapJsonLd({
  locale,
  faqs,
  listName,
  restaurants,
}: BuildMapJsonLdArgs): string {
  const pageUrl = localeUrl(locale, '/map');
  const brandCard = `${SITE_URL}/pics/og-card.png?v=${OG_CARD_VERSION}`;

  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      ...buildWebPageNodes({
        pageUrl,
        locale,
        image: brandCard,
        caption: 'EAT THIS – We tell you what to eat',
      }),
      ...(faqs.length > 0
        ? [
            {
              '@type': 'FAQPage',
              mainEntity: faqs.map(({ q, a }) => ({
                '@type': 'Question',
                name: q,
                acceptedAnswer: { '@type': 'Answer', text: a },
              })),
            },
          ]
        : []),
      ...(restaurants.length > 0
        ? [
            {
              '@type': 'ItemList',
              name: listName,
              numberOfItems: restaurants.length,
              // Die Reihenfolge der Liste ist keine Rangfolge — Must Eats zuerst,
              // darunter alphabetisch (siehe lib/map/listOrder.ts). `position`
              // bliebe sonst eine Qualitätsbehauptung, die niemand aufgestellt hat.
              itemListOrder: 'https://schema.org/ItemListUnordered',
              itemListElement: restaurants.map((r, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: {
                  '@type': 'Restaurant',
                  name: r.name,
                  url: localeUrl(locale, `/restaurant/${r.slug}`),
                  // `photo` ist upstream auf eine publizierbare Lizenz gefiltert
                  // (publishableRestaurantImageUrl) — fehlt sie, lassen wir den
                  // Key weg, statt eine URL zu nennen, die wir nicht zeigen dürfen.
                  ...(r.photo && { image: schemaImageUrl(r.photo) }),
                  ...(r.cuisineType && { servesCuisine: r.cuisineType }),
                  ...((r.bezirk?.name ?? r.district) && {
                    address: {
                      '@type': 'PostalAddress',
                      addressLocality: 'Berlin',
                      addressRegion: r.bezirk?.name ?? r.district,
                      addressCountry: 'DE',
                    },
                  }),
                },
              })),
            },
          ]
        : []),
    ],
  });
}
