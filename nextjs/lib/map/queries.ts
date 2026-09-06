import {
  presetQuery,
  publishableRestaurantImageUrl,
  restaurantPhotoCredit,
  restaurantPhotoCreditUrl,
} from '@/lib/sanity-image-presets';
import { liveRestaurant } from '../sanity-filters';
// Category projection — only resolves reference entries. See lib/queries.ts.
const CATEGORY_PROJECTION = `categories[defined(@->_id)]->{
  "slug": slug.current,
  name,
  nameEn
}`;

// Map list/marker payload — deliberately WITHOUT the detail-only fields
// (address, phone, website, menuUrl, reservationUrl, mapsUrl, instagramHandle, tip,
// description, photoCredit*). Those are fetched on demand when the detail
// sheet opens (restaurantMapDetailQuery / /api/restaurant-detail). Two wins:
// the anon map payload shrinks (description is the bulk), and the whole
// catalog's contact data no longer ships up-front for every locked spot.
// `openingHours` MUST stay — the list + marker render the open-now badge.
export const mapRestaurantsQuery = `
  *[_type == "restaurant" && ${liveRestaurant()}] {
    _id,
    _createdAt,
    name,
    "slug": slug.current,
    district,
    "bezirk": bezirkRef->{ name, "slug": slug.current },
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
    }
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
