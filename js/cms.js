// ─── Sanity CMS Client ────────────────────────────────────────────────────────
// Fetches content from Sanity. Project: eat-this (ehwjnjr2 / production)
// Uses the public read-only CDN — no API key needed for published content.

const SANITY_PROJECT  = 'ehwjnjr2';
const SANITY_DATASET  = 'production';
const SANITY_API_VER  = '2024-01-01';
const SANITY_CDN      = `https://${SANITY_PROJECT}.apicdn.sanity.io/v${SANITY_API_VER}/data/query/${SANITY_DATASET}`;

async function sanityFetch(query, params = {}) {
  let url = `${SANITY_CDN}?query=${encodeURIComponent(query)}`;
  for (const [key, value] of Object.entries(params)) {
    url += `&$${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json?.result ?? null;
  } catch (err) {
    console.warn('[CMS] Fetch failed:', err.message); // eslint-disable-line no-console
    return null;
  }
}

// Build a CDN image URL from a Sanity image asset reference.
// ref example: "image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x3000-jpg"
function sanityImageUrl(ref, { width } = {}) {
  if (!ref) return '';
  const parts = ref.split('-');
  const ext   = parts.pop();
  const dims  = parts.pop();
  const id    = parts.slice(1).join('-');
  let url = `https://cdn.sanity.io/images/${SANITY_PROJECT}/${SANITY_DATASET}/${id}-${dims}.${ext}`;
  if (width) url += `?w=${width}&auto=format`;
  return url;
}

// ─── Public API ───────────────────────────────────────────────────────────────

window.CMS = {
  /** Fetch all published news articles, newest first. */
  fetchNews(lang = 'en') {
    const query = `*[_type == "newsArticle" && language == "${lang}"] | order(date desc) {
      _id,
      "id": slug.current,
      title,
      category,
      categoryLabel,
      "date": date,
      "dateISO": date,
      "imageUrl": image.asset->url + "?w=900&auto=format&q=80",
      alt,
      excerpt,
      content
    }`;
    return sanityFetch(query);
  },

  /** Fetch a single news article by slug. */
  fetchArticleBySlug(slug, lang = 'en') {
    const query = `*[_type == "newsArticle" && slug.current == $slug && language == $lang][0] {
      _id,
      "id": slug.current,
      title,
      category,
      categoryLabel,
      "date": date,
      "dateISO": date,
      "imageUrl": image.asset->url + "?w=900&auto=format&q=80",
      alt,
      excerpt,
      content,
      seo
    }`;
    return sanityFetch(query, { slug, lang });
  },

  /** Fetch all must-eat cards, sorted by order field. */
  fetchMustEats() {
    const query = `*[_type == "mustEat"] | order(order asc) {
      _id,
      dish,
      restaurant,
      district,
      price,
      "imageUrl": image.asset->url + "?w=600&auto=format&q=80",
      order
    }`;
    return sanityFetch(query);
  },

  /** Fetch all card packs with their cards, ordered by display order. */
  fetchCardPacks() {
    const query = `*[_type == "cardPack"] | order(order asc) {
      _id, title, titleDe,
      "slug": slug.current,
      packType,
      "coverImageUrl": coverImage.asset->url + "?w=400&auto=format&q=80",
      price,
      "cards": cards[]{
        "imageUrl": image.asset->url + "?w=600&auto=format&q=80",
        dish, restaurant, district, "cardPrice": price
      },
      order
    }`;
    return sanityFetch(query);
  },

  /** Fetch all map restaurants. */
  fetchRestaurants() {
    const query = `*[_type == "restaurant"] | order(name asc) {
      _id,
      name,
      district,
      address,
      categories,
      price,
      lat,
      lng,
      mapsUrl,
      website,
      reservationUrl,
      openingHours,
      tip,
      "photo": image.asset->url + "?w=800&auto=format&q=80"
    }`;
    return sanityFetch(query);
  },

  imageUrl: sanityImageUrl,

  /** Fetch a single static page by slug — always fresh from Sanity. */
  async fetchStaticPage(slug) {
    const ALLOWED = ['about', 'contact', 'press', 'impressum', 'datenschutz', 'agb'];
    if (!ALLOWED.includes(slug)) return null;
    const query = `*[_type == "staticPage" && slug.current == "${slug}"][0]{ title, titleDe, body, bodyDe }`;
    return sanityFetch(query);
  },
};
