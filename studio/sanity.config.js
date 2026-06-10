import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'eat-this',

  projectId: 'ehwjnjr2',
  dataset: 'production',

  plugins: [
    structureTool({
      // Structure builder is async so the sidebar titles can show live counts.
      // Default counts are published-doc totals per type — they mirror what's
      // on the site. For Restaurants we additionally show the total entity
      // count (unique slug across published + standalone drafts) so the
      // import-vs-publish backlog is visible from the sidebar: e.g.
      // "📍 Restaurants (169 / 353)" = 169 live, 353 entities in Sanity.
      // Structure re-runs on Studio reload, so newly-created docs surface
      // after a refresh.
      structure: async (S, context) => {
        const client = context.getClient({apiVersion: '2024-01-01'})
        const counts = await client.fetch(`{
          "newsArticle": count(*[_type=="newsArticle" && !(_id in path("drafts.**"))]),
          "staticPage":  count(*[_type=="staticPage"  && !(_id in path("drafts.**"))]),
          "mustEat":     count(*[_type=="mustEat"     && !(_id in path("drafts.**"))]),
          "restaurantLive":  count(*[_type=="restaurant"  && !(_id in path("drafts.**"))]),
          "restaurantTotal": count(array::unique(*[_type=="restaurant" && defined(slug.current)].slug.current)),
          "bezirk":      count(*[_type=="bezirk"      && !(_id in path("drafts.**"))]),
          "category":    count(*[_type=="category"    && !(_id in path("drafts.**"))]),
          "homeWeek":    count(*[_type=="homeWeek"    && !(_id in path("drafts.**"))]),
        }`)
        const label = (icon, title, n) => `${icon}  ${title} (${n ?? 0})`
        const labelPair = (icon, title, live, total) =>
          `${icon}  ${title} (${live ?? 0} / ${total ?? 0})`
        return S.list()
          .title('Content')
          .items([
            // ── News ─────────────────────────────────────────────────────
            S.documentTypeListItem('newsArticle').title(label('📰', 'News', counts.newsArticle)),

            S.divider(),

            // ── Static Pages ─────────────────────────────────────────────
            S.documentTypeListItem('staticPage').title(label('📄', 'Seiten', counts.staticPage)),

            S.divider(),

            // ── Editorial / Home ─────────────────────────────────────────
            S.documentTypeListItem('homeWeek').title(label('🏠', 'Home der Woche', counts.homeWeek)),

            S.divider(),

            // ── Other content types ───────────────────────────────────────
            S.documentTypeListItem('mustEat').title(label('🍽', 'Must-Eats', counts.mustEat)),
            S.documentTypeListItem('restaurant').title(labelPair('📍', 'Restaurants', counts.restaurantLive, counts.restaurantTotal)),
            S.documentTypeListItem('bezirk').title(label('🏙', 'Bezirke', counts.bezirk)),
            S.documentTypeListItem('category').title(label('🏷', 'Kategorien', counts.category)),

          ])
      },
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
