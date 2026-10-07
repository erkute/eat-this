import {
  presetQuery,
  publishableRestaurantImageUrl,
  restaurantPhotoCredit,
  restaurantPhotoCreditUrl,
} from '@/lib/sanity-image-presets';
import { liveRestaurant } from '../sanity-filters';
import { articlesAboutRestaurant } from '../queries';
// Category projection — only resolves reference entries. See lib/queries.ts.
const CATEGORY_PROJECTION = `categories[defined(@->_id)]->{
  "slug": slug.current,
  name,
  nameEn
}`;

/** The homepage preview follows the same editorial lists as category pages. */
export const homeMapCategoriesQuery = `
  {
    "categories": *[_type == "category" && slug.current in $slugs] {
      name,
      "slug": slug.current,
      "topSpots": topSpots[defined(@->slug.current)]->slug.current
    },
    "articles": *[_type == "newsArticle" && defined(slug.current)] {
      "slug": slug.current,
      "spots": coalesce(contentDe, content)[_type == "spotCard"].restaurantRef->slug.current
    }
  }
`;

// Map list/marker payload — deliberately WITHOUT the detail-only fields
// (phone, website, menuUrl, reservationUrl, mapsUrl, instagramHandle, tip,
// description, photoCredit*). Those are fetched on demand when the detail
// sheet opens (restaurantMapDetailQuery / /api/restaurant-detail), which keeps
// the map payload small (description is the bulk).
// `openingHours` MUST stay — the list + marker render the open-now badge.
// `address` stays too: the search finds a spot by its street (spotSearch).
// Dropped with the detail fields, "kastanienallee" found nothing for weeks
// while the search code still read the field (audit 28.09.2026). ~9 KB raw
// for the whole catalogue; it is public anyway, and no spot is locked since
// the map went free.
export const mapRestaurantsQuery = `
  *[_type == "restaurant" && ${liveRestaurant()}] {
    _id,
    _createdAt,
    name,
    "slug": slug.current,
    district,
    "bezirk": bezirkRef->{ name, "slug": slug.current },
    address,
    ${CATEGORY_PROJECTION},
    cuisineType,
    priceRange,
    lat,
    lng,
    openingHours,
    "photo": ${publishableRestaurantImageUrl('image', 'mapCard')},
    "mustEatCount": count(*[_type == "mustEat" && restaurantRef._ref == ^._id])
  }
`;

// On-demand detail fields for the map detail sheet — fetched by slug when a
// spot is opened. Mirrors the fields RestaurantDetail renders below the hero.
// katalog-ausnahme: Nachlade-Abfrage für das geöffnete Detail-Sheet, per Slug.
// Wer hier ankommt, hat auf einen Pin geklickt — und die Pin-Liste darüber
// (mapRestaurantsQuery) filtert bereits. Ein zweiter Filter könnte das Sheet
// nur leer laufen lassen, wenn ein Spot zwischen Liste und Klick zumacht.
export const restaurantMapDetailQuery = `
  *[_type == "restaurant" && slug.current == $slug][0] {
    address,
    phone,
    mapsUrl,
    website,
    menuUrl,
    instagramHandle,
    reservationUrl,
    tip,
    tipEn,
    description,
    descriptionEn,
    shortDescription,
    shortDescriptionEn,
    "photo": ${publishableRestaurantImageUrl('image', 'sheetHero')},
    "photoCredit": ${restaurantPhotoCredit('image')},
    "photoCreditUrl": ${restaurantPhotoCreditUrl('image')},
    "gallery": gallery[]{
      _key,
      "thumb": asset->url + "${presetQuery('galleryThumb')}",
      "full": asset->url + "${presetQuery('detailHero')}",
      alt,
      credit,
      creditUrl
    },
    ${articlesAboutRestaurant}
  }
`;

/* Derselbe Katalogfilter wie oben. Ohne ihn hing Karte 022 (Crapulix) an einem
   geschlossenen Lokal: die Map liess den Spot weg, schickte die Karte aber mit
   — im Album stand ein Platz, den niemand mehr vor Ort umdrehen kann, und das
   All-Berlin-Pack versprach 25 Karten, waehrend das Deck 26 Plaetze zeigte.
   Solange die Karten das Produkt sind, muessen alle vier Flaechen (Map, Album,
   geteiltes Deck, Pack-Zahl) dieselbe Menge meinen. */
export const mapMustEatsQuery = `
  *[_type == "mustEat" && ${liveRestaurant('restaurantRef->')}] {
    _id,
    revealedForAnon,
    order,
    "restaurant": restaurantRef-> {
      _id,
      name,
      "slug": slug.current,
      lat,
      lng,
      district,
      address,
      "photo": ${publishableRestaurantImageUrl('image', 'mapCard')}
    }
  }
`;
