// Geteilt von der Seitenleiste und der Startseite, damit beide dieselben
// Zahlen zeigen.

export const FIRST_PARTY_PHOTO_SLUGS = ['bar-basta', 'sardinen-bar']

export const SPOT_FILTERS = {
  noPhoto: '_type == "restaurant" && !defined(image.asset)',
  // Foto da, aber die Website zeigt es nicht (siehe Validierung in restaurant.js).
  photoHidden: `_type == "restaurant" && defined(image.asset)
    && !(defined(image.credit) && defined(image.creditUrl))
    && !defined(instagramHandle)
    && !(slug.current in $firstParty)`,
  noTip: '_type == "restaurant" && isOpen != false && !defined(tip)',
  noCategory: '_type == "restaurant" && isOpen != false && count(coalesce(categories, [])) == 0',
  tempClosed: '_type == "restaurant" && isClosed == true',
  closed: '_type == "restaurant" && isOpen == false',
}

// Entwürfe kommen als Liste zurück, nicht als Zählung: Die Dokumentlisten im
// Studio laufen als Live-Abfragen und vertragen keine Joins — ein Filter mit
// der Unterabfrage zeigte stillschweigend nichts. Deshalb filtern die Listen
// über `_id in $ids`. string::split(id, "drafts.")[1] ist die veröffentlichte ID.
export const DASHBOARD_QUERY = `{
  "spots": count(*[_type == "restaurant" && !(_id in path("drafts.**"))]),
  "articles": count(*[_type == "newsArticle" && !(_id in path("drafts.**"))]),
  "mustEats": count(*[_type == "mustEat" && !(_id in path("drafts.**"))]),
  "bezirke": count(*[_type == "bezirk" && !(_id in path("drafts.**"))]),
  "categories": count(*[_type == "category" && !(_id in path("drafts.**"))]),
  "pages": count(*[_type == "staticPage" && !(_id in path("drafts.**"))]),
  "drafts": *[_id in path("drafts.**") && _type in ["restaurant", "newsArticle", "bezirk", "category", "mustEat", "staticPage"]]{
    _id,
    _type,
    _updatedAt,
    "title": coalesce(name, titleDe, title, restaurantRef->name),
    "isNew": count(*[_id == string::split(^._id, "drafts.")[1]]) == 0
  } | order(_updatedAt desc),
  "noPhoto": count(*[${SPOT_FILTERS.noPhoto} && !(_id in path("drafts.**"))]),
  "photoHidden": count(*[${SPOT_FILTERS.photoHidden} && !(_id in path("drafts.**"))]),
  "noTip": count(*[${SPOT_FILTERS.noTip} && !(_id in path("drafts.**"))]),
  "noCategory": count(*[${SPOT_FILTERS.noCategory} && !(_id in path("drafts.**"))]),
  "tempClosed": count(*[${SPOT_FILTERS.tempClosed} && !(_id in path("drafts.**"))]),
  "closed": count(*[${SPOT_FILTERS.closed} && !(_id in path("drafts.**"))]),
}`

export const DASHBOARD_PARAMS = {firstParty: FIRST_PARTY_PHOTO_SLUGS}
