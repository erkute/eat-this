import {
  groqImageUrl,
  publishableRestaurantImageUrl,
  restaurantPhotoCredit,
  restaurantPhotoCreditUrl,
} from './sanity-image-presets';
import { liveRestaurant } from './sanity-filters';
// `defined(@->_id)` drops dangling refs, which would otherwise project as null
// rows.
const CATEGORY_PROJECTION = `categories[defined(@->_id)]->{
  "slug": slug.current,
  name,
  nameEn,
  description,
  descriptionEn
}`;

/* Shared so the restaurant page and the OG-image route cannot drift apart. */
const RESTAURANT_DETAIL_FIELDS = `
    _id,
    name,
    "slug": slug.current,
    isOpen,
    isClosed,
    cuisineType,
    shortDescription,
    shortDescriptionEn,
    district,
    "bezirk": bezirkRef->{ _id, name, "slug": slug.current },
    address,
    ${CATEGORY_PROJECTION},
    priceRange,
    lat,
    lng,
    phone,
    mapsUrl,
    website,
    menuUrl,
    instagramHandle,
    reservationUrl,
    openingHours[] { days, hours },
    tip,
    tipEn,
    description,
    descriptionEn,
    "photo": ${publishableRestaurantImageUrl('image', 'detailHero')},
    "photoCredit": ${restaurantPhotoCredit('image')},
    "photoCreditUrl": ${restaurantPhotoCreditUrl('image')},
    "gallery": gallery[]{
      _key,
      "thumb": ${groqImageUrl('@', 'galleryThumb')},
      "full": ${groqImageUrl('@', 'detailHero')},
      alt,
      credit,
      creditUrl
    },
    seo {
      metaTitle,
      metaTitleEn,
      metaDescription,
      metaDescriptionEn,
      noIndex
    }
`;

// katalog-ausnahme: generateStaticParams. Ein geschlossener Laden behält seine
// Seite (noindex,follow), die sagt, dass er zu hat, statt eines 404.
export const allRestaurantSlugsQuery = `
  *[_type == "restaurant" && defined(slug.current)] {
    "slug": slug.current
  }
`;

// Public article payloads resolve only the restaurant side of a Must-Eat
// reference; dish text and images must never reach an indexed response.
const ARTICLE_LABEL_DE = `select(category == "openings" => "Eröffnungen", category == "culture" => "Kultur", "Guides")`;
const ARTICLE_LABEL_EN = `select(category == "openings" => "Openings", category == "culture" => "Culture", "Guides")`;
const ARTICLE_LABELS = `"categoryLabel": ${ARTICLE_LABEL_EN}, "categoryLabelDe": ${ARTICLE_LABEL_DE}`;

const articleContentProjection = `{
    ...,
    _type == "mustEatCard" => {
      _type,
      _key,
      "mustEatId": mustEatRef->_id,
      "restaurantName": mustEatRef->restaurantRef->name,
      "restaurantSlug": mustEatRef->restaurantRef->slug.current,
      "district": coalesce(mustEatRef->restaurantRef->district, mustEatRef->restaurantRef->bezirkRef->name, mustEatRef->district),
      "cuisineType": mustEatRef->restaurantRef->cuisineType,
      "restaurantPhoto": ${publishableRestaurantImageUrl('mustEatRef->restaurantRef->image', 'articleDishRestaurant', 'mustEatRef->restaurantRef->slug.current', 'mustEatRef->restaurantRef->instagramHandle')}
    },
    _type == "spotCard" => {
      _type,
      _key,
      "restaurantName": restaurantRef->name,
      "restaurantSlug": restaurantRef->slug.current,
      "district": coalesce(restaurantRef->district, restaurantRef->bezirkRef->name),
      "cuisineType": restaurantRef->cuisineType,
      "restaurantPhoto": ${publishableRestaurantImageUrl('restaurantRef->image', 'card', 'restaurantRef->slug.current', 'restaurantRef->instagramHandle')}
    },
    _type == "articleCard" => {
      _type,
      _key,
      "articleSlug": articleRef->slug.current
    },
    _type == "image" => {
      _type,
      _key,
      alt,
      caption,
      "imageUrl": ${groqImageUrl('@', 'articleImage')},
      "imageWidth": @.asset->metadata.dimensions.width,
      "imageHeight": @.asset->metadata.dimensions.height
    }
  }`;

const articleProjection = `{
    _id,
    "slug": slug.current,
    "title": coalesce(title, titleDe),
    "titleEn": title,
    titleDe,
    category,
    ${ARTICLE_LABELS},
    date,
    revised,
    "imageUrl": ${groqImageUrl('image', 'detailHero')},
    "alt": image.alt,
    excerpt, excerptDe,
    content[] ${articleContentProjection},
    contentDe[] ${articleContentProjection},
    "hiddenMustEats": hiddenMustEats[]._ref,
    seo {
      metaTitle,
      metaTitleEn,
      metaDescription,
      metaDescriptionEn,
      noIndex
    }
  }`;

export const articleBySlugQuery = `
  *[_type == "newsArticle" && slug.current == $slug][0] ${articleProjection}
`;

// Studio-Vorschau nach Dokument-ID (ein Entwurf hat noch keinen Slug), mit der
// `drafts`-Perspektive.
export const articleByIdQuery = `
  *[_type == "newsArticle" && _id == $id][0] ${articleProjection}
`;

export const allArticleSlugsQuery = `
  *[_type == "newsArticle" && defined(slug.current)] {
    "slug": slug.current
  }
`;

export const restaurantsByBezirkQuery = `
  *[_type == "restaurant" && ${liveRestaurant()} && bezirkRef->slug.current == $bezirkSlug] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    cuisineType,
    shortDescription,
    shortDescriptionEn,
    district,
    ${CATEGORY_PROJECTION},
    priceRange,
    lat,
    lng,
    tip,
    tipEn,
    "photo": ${publishableRestaurantImageUrl('image', 'card')},
    _updatedAt
  }
`;

export const restaurantsByCategoryQuery = `
  *[_type == "restaurant" && ${liveRestaurant()}
    && $categorySlug in categories[]->slug.current
  ] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    cuisineType,
    shortDescription,
    shortDescriptionEn,
    district,
    "bezirk": bezirkRef->{ _id, name, "slug": slug.current },
    ${CATEGORY_PROJECTION},
    priceRange,
    lat,
    lng,
    tip,
    tipEn,
    "photo": ${publishableRestaurantImageUrl('image', 'card')},
    _updatedAt
  }
`;

const RESTAURANT_SIBLING_CARD_PROJECTION = `{
  _id,
  name,
  "slug": slug.current,
  cuisineType,
  priceRange,
  "bezirk": bezirkRef->{name},
  "photo": ${publishableRestaurantImageUrl('image', 'card')}
}`;

/**
 * Ein Fenster der alphabetischen Nachbarschaft im Bezirk: höchstens vier
 * Dokumente statt des ganzen Bezirks. Als Funktion, weil sich die beiden
 * Fenster in genau einem Zeichen unterscheiden.
 */
const siblingWindow = (cmp: '>' | '<') => `*[
      _type == "restaurant" && ${liveRestaurant()}
      && defined(^.bezirkRef._ref) && bezirkRef._ref == ^.bezirkRef._ref
      && slug.current != ^.slug.current
      && (name ${cmp} ^.name || (name == ^.name && slug.current ${cmp} ^.slug.current))
    ] | order(name asc, slug.current asc)[0...$siblingLimit] ${RESTAURANT_SIBLING_CARD_PROJECTION}`;

// Drei: Darüber kommen nur Hub-Guides, in denen der Spot einer von vielen ist.
export const RESTAURANT_ARTICLE_LIMIT = 3;

// Jeder Artikel ist ein Heft mit Nummer ab dem ältesten; alle Seiten brauchen
// dieselbe Menge und Reihenfolge, `_id` bricht Gleichstände am selben Tag.
const publishedNews = `_type == "newsArticle" && defined(slug.current)`;
const newsOrder = `date desc, _id asc`;

// Das Heft-Cover (lib/magazineCover.ts): Look, Gerichtserkennung, Freisteller
// samt Rahmen und Pixelmaßen (für „Vor dem Logo“) und die Bildfarben (für „Nach
// LOVE“).
const newsCoverProjection = `"cover": {
    "look": cover.look,
    "dish": cover.dish,
    "box": cover.box,
    "cutout": cover.cutout.asset->url,
    "cutoutWidth": cover.cutout.asset->metadata.dimensions.width,
    "cutoutHeight": cover.cutout.asset->metadata.dimensions.height,
    "palette": image.asset->metadata.palette{
      "dominant": dominant{background, foreground},
      "dark": darkMuted.background,
      "light": lightMuted.background
    }
  }`;

/**
 * Die Artikel, in denen dieser Spot vorkommt, rückwärts über die
 * `restaurantRef` ihrer spotCards gelesen statt am Restaurant gepflegt.
 * Sortiert nach Spezifität: Je weniger Spots ein Artikel nennt, desto mehr
 * handelt er von diesem.
 */
export const articlesAboutRestaurant = `"articles": *[_type == "newsArticle" && defined(slug.current)
    && (^._id in content[].restaurantRef._ref || ^._id in contentDe[].restaurantRef._ref)]
    | order(count(coalesce(contentDe, content)[defined(restaurantRef)]) asc, date desc)[0...$articleLimit] {
      _id,
      "slug": slug.current,
      "title": coalesce(title, titleDe),
      titleDe,
      ${ARTICLE_LABELS},
      date,
      "imageUrl": ${groqImageUrl('image', 'card')},
      "alt": image.alt,
      // Für das Heft unter „Im Magazin“: Ausgabe wie auf /news, dazu der Look.
      "issue": count(*[${publishedNews}]) - count(*[${publishedNews} && (date > ^.date || (date == ^.date && _id < ^._id))]),
      ${newsCoverProjection}
    }`;

// katalog-ausnahme: die Detailseite eines Spots, auch geschlossen (siehe
// allRestaurantSlugsQuery). Alles in einer Abfrage; `generateMetadata` und die
// Seite nutzen dieselbe, damit Next sie dedupliziert.
export const restaurantPageQuery = `
  *[_type == "restaurant" && slug.current == $slug][0] {${RESTAURANT_DETAIL_FIELDS},
    "mustEats": *[_type == "mustEat" && restaurantRef._ref == ^._id] | order(order asc) {
      _id,
      order
    },
    ${articlesAboutRestaurant},
    "siblingsAfter": ${siblingWindow('>')},
    "siblingsWrap": ${siblingWindow('<')}
  }
`;

// Die Beispiel-Spots der Anmelde-Mail: Gelesen wird der ganze Stapel, damit
// scripts/build-email-spots.mts dasselbe Schaufenster rechnet wie die Seite; in
// die Mail kommen nur offene Karten.
export const emailMustEatsQuery = `
  *[_type == "mustEat" && ${liveRestaurant('restaurantRef->')}] | order(_id asc) {
    _id,
    revealedForAnon,
    "previewCategory": *[_type == "category" && packPreview._ref == ^._id][0].slug.current,
    "restaurant": restaurantRef-> {
      _id,
      name,
      "slug": slug.current,
      "area": coalesce(bezirkRef->name, district),
      "photo": ${publishableRestaurantImageUrl('image', 'card')}
    }
  }
`;

export const allBezirkeWithStatsQuery = `
  *[_type == "bezirk"] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    "restaurantCount": count(*[_type == "restaurant" && bezirkRef._ref == ^._id && ${liveRestaurant()}])
  }
`;

export const bezirkBySlugQuery = `
  *[_type == "bezirk" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    description,
    descriptionEn,
    "topSpots": topSpots[defined(@->slug.current)]->slug.current,
    seo {
      metaTitle,
      metaTitleEn,
      metaDescription,
      metaDescriptionEn,
      noIndex
    }
  }
`;

// Sorted by EN name so the order is stable across locales.
export const allCategoriesQuery = `
  *[_type == "category"] | order(coalesce(nameEn, name) asc) {
    _id,
    name,
    nameEn,
    "slug": slug.current,
    description,
    descriptionEn
  }
`;

// Mit Anzahl und Beispiel-Spots für den /kategorie-Index; getrennt von der
// schlanken `allCategoriesQuery` für Sitemap und Chips.
export const allCategoriesWithStatsQuery = `
  *[_type == "category"] | order(coalesce(nameEn, name) asc) {
    _id,
    name,
    nameEn,
    "slug": slug.current,
    "restaurantCount": count(*[_type == "restaurant" && ${liveRestaurant()} && ^._id in categories[]._ref])
  }
`;

// Only the `topSpots` slugs: the page already loads every restaurant of the
// category.
export const categoryBySlugQuery = `
  *[_type == "category" && slug.current == $slug][0] {
    _id,
    name,
    nameEn,
    "slug": slug.current,
    description,
    descriptionEn,
    "topSpots": topSpots[defined(@->slug.current)]->slug.current
  }
`;

export const allNewsArticlesQuery = `
  *[${publishedNews}] | order(${newsOrder}) {
    _id,
    "slug": slug.current,
    "title": coalesce(title, titleDe),
    titleDe,
    category,
    ${ARTICLE_LABELS},
    date,
    "imageUrl": ${groqImageUrl('image', 'card')},
    "alt": image.alt,
    ${newsCoverProjection},
    excerpt, excerptDe, previewExcerpt, previewExcerptDe
  }
`;

// Teilt Filter und Reihenfolge mit allNewsArticlesQuery, damit die Heftnummer
// dieselben Artikel sieht wie die Liste.
export const latestNewsArticlesQuery = `{
  "total": count(*[${publishedNews}]),
  "articles": *[${publishedNews}] | order(${newsOrder})[0...$limit] {
    _id,
    "title": coalesce(title, titleDe),
    titleDe,
    "slug": slug.current,
    date,
    excerpt, excerptDe,
    "imageUrl": ${groqImageUrl('image', 'card')},
    ${newsCoverProjection}
  }
}`;

// Ohne content: Der Hub braucht nur die Überschrift. Die Sprache wird in GROQ
// gewählt, damit die andere nicht in der RSC-Payload landet.
export const guideTeaserBySlugQuery = `
  *[_type == "newsArticle" && slug.current == $slug][0] {
    "slug": slug.current,
    "title": select(
      $locale == "de" => coalesce(titleDe, title),
      coalesce(title, titleDe)
    ),
    "excerpt": select(
      $locale == "de" => coalesce(excerptDe, excerpt),
      coalesce(excerpt, excerptDe)
    ),
    "kicker": select(
      $locale == "de" => ${ARTICLE_LABEL_DE},
      ${ARTICLE_LABEL_EN}
    ),
    date,
    "imageUrl": ${groqImageUrl('image', 'card')},
    ${newsCoverProjection},
    "noIndex": seo.noIndex == true,
    // Die Ausgabennummer wie auf /news (Anzahl − Position in derselben
    // Reihenfolge), damit das Heft auf der Bezirksseite dieselbe trägt.
    "issue": count(*[${publishedNews}]) - count(*[${publishedNews} && (date > ^.date || (date == ^.date && _id < ^._id))])
  }
`;

// The language is selected in GROQ so the other page documents and translation
// fields stay out of the RSC payload.
export const staticPageBySlugQuery = `
  *[_type == "staticPage" && slug.current == $slug][0] {
    "slug": slug.current,
    "title": select(
      $locale == "de" => coalesce(titleDe, title),
      coalesce(title, titleDe)
    ),
    "body": select(
      $locale == "de" => coalesce(bodyDe, body),
      coalesce(body, bodyDe)
    )
  }
`;

/**
 * How much a Booster Pack contains. The catalogue filter is `liveRestaurant()`,
 * as in `mapRestaurantsQuery`, so the number never counts spots the map does
 * not show; one shared category tag is enough (`ownsCategoryOf`).
 */
export const packContentsQuery = `
  {
    "categories": *[_type == "category" && defined(slug.current)] {
      "slug": slug.current,
      "spots": count(*[_type == "restaurant" && ${liveRestaurant()}
        && ^.slug.current in categories[]->slug.current]),
      "mustEats": count(*[_type == "mustEat" && ${liveRestaurant('restaurantRef->')}
        && ^.slug.current in restaurantRef->categories[]->slug.current])
    },
    "allBerlin": {
      "spots": count(*[_type == "restaurant" && ${liveRestaurant()}]),
      "mustEats": count(*[_type == "mustEat" && ${liveRestaurant('restaurantRef->')}])
    }
  }
`;

// Für den Sanity-Webhook: Eine Karte hat keinen Slug, ihre Seite ist die ihres
// Spots.
export const mustEatRestaurantSlugQuery = `
  *[_type == "mustEat" && _id == $id][0].restaurantRef->slug.current
`;
