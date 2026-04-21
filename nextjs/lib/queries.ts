export const restaurantBySlugQuery = `
  *[_type == "restaurant" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    district,
    address,
    categories,
    price,
    lat,
    lng,
    mapsUrl,
    website,
    reservationUrl,
    openingHours[] { days, hours },
    tip,
    description,
    "photo": image.asset->url + "?w=1200&auto=format&q=85",
    seo {
      metaTitle,
      metaDescription,
      "ogImageUrl": ogImage.asset->url
    }
  }
`

export const allRestaurantSlugsQuery = `
  *[_type == "restaurant" && defined(slug.current)] {
    "slug": slug.current
  }
`

export const articleBySlugQuery = `
  *[_type == "newsArticle" && slug.current == $slug][0] {
    _id,
    "slug": slug.current,
    title, titleDe,
    category,
    categoryLabel, categoryLabelDe,
    date,
    "imageUrl": image.asset->url + "?w=1200&auto=format&q=85",
    alt,
    excerpt, excerptDe,
    content, contentDe,
    seo {
      metaTitle,
      metaDescription,
      "ogImageUrl": ogImage.asset->url,
      noIndex
    }
  }
`

export const allArticleSlugsQuery = `
  *[_type == "newsArticle" && defined(slug.current)] {
    "slug": slug.current
  }
`
