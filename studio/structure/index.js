import {
  ClockIcon,
  DocumentIcon,
  DocumentTextIcon,
  EarthGlobeIcon,
  EditIcon,
  ErrorOutlineIcon,
  ImageIcon,
  PinIcon,
  StarIcon,
  TagIcon,
  WarningOutlineIcon,
} from '@sanity/icons'
import {DASHBOARD_PARAMS, DASHBOARD_QUERY, SPOT_FILTERS} from './queries'

const withCount = (title, n) => (typeof n === 'number' ? `${title} (${n})` : title)

/** Eine gefilterte Spot-Liste; zeigt nur, was den Filter trifft. */
function spotList(S, id, title, filter, params = {}) {
  return S.documentList()
    .id(`${id}-list`)
    .title(title)
    .schemaType('restaurant')
    .filter(filter)
    .params(params)
    .defaultOrdering([{field: 'name', direction: 'asc'}])
}

// Die Seitenleiste lädt ihre Zahlen einmal beim Öffnen des Studios; neue
// Dokumente tauchen in den Zählungen nach einem Neuladen auf.
export async function structure(S, context) {
  const client = context.getClient({apiVersion: '2024-01-01'})
  const c = await client.fetch(DASHBOARD_QUERY, DASHBOARD_PARAMS)
  // Die Listen laufen in der Entwurfs-Perspektive: Dort trägt ein Entwurf die
  // veröffentlichte ID, ohne „drafts.“. Beide Formen mitgeben, sonst bleibt
  // die Liste leer.
  const spotDraftIds = (c.drafts ?? []).filter((d) => d._type === 'restaurant').map((d) => d._id)
  const spotDraftMatchIds = spotDraftIds.flatMap((id) => [id, id.replace(/^drafts\./, '')])

  const spots = S.listItem()
    .id('spots')
    .title(withCount('Spots', c.spots))
    .icon(PinIcon)
    .child(
      S.list()
        .id('spots-menu')
        .title('Spots')
        .items([
          S.listItem()
            .id('alle')
            .title('Alle Spots')
            .icon(PinIcon)
            .child(
              S.documentTypeList('restaurant')
                .title('Alle Spots')
                .defaultOrdering([{field: 'name', direction: 'asc'}]),
            ),
          S.listItem()
            .id('zuletzt')
            .title('Zuletzt bearbeitet')
            .icon(ClockIcon)
            .child(
              S.documentTypeList('restaurant')
                .title('Zuletzt bearbeitet')
                .defaultOrdering([{field: '_updatedAt', direction: 'desc'}]),
            ),
          S.divider(),
          S.listItem()
            .id('nach-bezirk')
            .title('Nach Bezirk')
            .icon(EarthGlobeIcon)
            .child(
              S.documentTypeList('bezirk')
                .title('Bezirk wählen')
                .defaultOrdering([{field: 'name', direction: 'asc'}])
                .child((bezirkId) =>
                  spotList(S, `bezirk-${bezirkId}`, 'Spots im Bezirk', '_type == "restaurant" && bezirkRef._ref == $id', {
                    id: bezirkId,
                  }),
                ),
            ),
          S.listItem()
            .id('nach-kategorie')
            .title('Nach Kategorie')
            .icon(TagIcon)
            .child(
              S.documentTypeList('category')
                .title('Kategorie wählen')
                .defaultOrdering([{field: 'name', direction: 'asc'}])
                .child((categoryId) =>
                  spotList(S, `kategorie-${categoryId}`, 'Spots der Kategorie', '_type == "restaurant" && $id in categories[]._ref', {
                    id: categoryId,
                  }),
                ),
            ),
          S.divider(),
          S.listItem()
            .id('offene-aenderungen')
            .title(withCount('Offene Änderungen', spotDraftIds.length))
            .icon(EditIcon)
            .child(
              spotList(S, 'offene-aenderungen', 'Noch nicht veröffentlicht', '_type == "restaurant" && _id in $ids', {
                ids: spotDraftMatchIds,
              }),
            ),
          S.listItem()
            .id('ohne-foto')
            .title(withCount('Ohne Titelfoto', c.noPhoto))
            .icon(ImageIcon)
            .child(spotList(S, 'ohne-foto', 'Ohne Titelfoto', SPOT_FILTERS.noPhoto)),
          S.listItem()
            .id('foto-unsichtbar')
            .title(withCount('Foto wird nicht gezeigt', c.photoHidden))
            .icon(ErrorOutlineIcon)
            .child(
              spotList(S, 'foto-unsichtbar', 'Copyright oder Quelle fehlt', SPOT_FILTERS.photoHidden, DASHBOARD_PARAMS),
            ),
          S.listItem()
            .id('ohne-tipp')
            .title(withCount('Ohne Insider-Tipp', c.noTip))
            .icon(DocumentTextIcon)
            .child(spotList(S, 'ohne-tipp', 'Ohne Insider-Tipp', SPOT_FILTERS.noTip)),
          S.listItem()
            .id('ohne-kategorie')
            .title(withCount('Ohne Kategorie', c.noCategory))
            .icon(TagIcon)
            .child(spotList(S, 'ohne-kategorie', 'Ohne Kategorie', SPOT_FILTERS.noCategory)),
          S.divider(),
          S.listItem()
            .id('voruebergehend-zu')
            .title(withCount('Vorübergehend zu', c.tempClosed))
            .icon(WarningOutlineIcon)
            .child(spotList(S, 'voruebergehend-zu', 'Vorübergehend zu', SPOT_FILTERS.tempClosed)),
          S.listItem()
            .id('geschlossen')
            .title(withCount('Dauerhaft geschlossen', c.closed))
            .icon(WarningOutlineIcon)
            .child(spotList(S, 'geschlossen', 'Dauerhaft geschlossen', SPOT_FILTERS.closed)),
        ]),
    )

  return S.list()
    .title('Eat This')
    .items([
      spots,
      S.listItem()
        .id('magazin')
        .title(withCount('Magazin', c.articles))
        .icon(DocumentTextIcon)
        .child(
          S.documentTypeList('newsArticle')
            .title('Magazin')
            .defaultOrdering([{field: 'date', direction: 'desc'}]),
        ),
      S.listItem()
        .id('must-eats')
        .title(withCount('Must Eats', c.mustEats))
        .icon(StarIcon)
        .child(
          S.documentTypeList('mustEat')
            .title('Must Eats')
            .defaultOrdering([{field: 'order', direction: 'asc'}]),
        ),
      S.divider(),
      S.listItem()
        .id('bezirke')
        .title(withCount('Bezirke', c.bezirke))
        .icon(EarthGlobeIcon)
        .child(
          S.documentTypeList('bezirk')
            .title('Bezirke')
            .defaultOrdering([{field: 'name', direction: 'asc'}]),
        ),
      S.listItem()
        .id('kategorien')
        .title(withCount('Kategorien', c.categories))
        .icon(TagIcon)
        .child(
          S.documentTypeList('category')
            .title('Kategorien')
            .defaultOrdering([{field: 'name', direction: 'asc'}]),
        ),
      S.divider(),
      S.listItem()
        .id('seiten')
        .title(withCount('Seiten', c.pages))
        .icon(DocumentIcon)
        .child(S.documentTypeList('staticPage').title('Seiten')),
    ])
}
