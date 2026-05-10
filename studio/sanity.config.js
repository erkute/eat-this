import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {DownloadIcon} from '@sanity/icons'
import {schemaTypes} from './schemaTypes'
import RestaurantImporter from './tools/RestaurantImporter'

export default defineConfig({
  name: 'default',
  title: 'eat-this',

  projectId: 'ehwjnjr2',
  dataset: 'production',

  plugins: [
    structureTool({
      // Structure builder is async so the sidebar titles can show live counts
      // (e.g. "📍 Restaurants (144)"). Counts are the published-doc total per
      // type; drafts in progress are intentionally excluded so the number
      // matches "what's live on the site". Structure re-runs on Studio reload,
      // so newly-created docs surface after a refresh.
      structure: async (S, context) => {
        const client = context.getClient({apiVersion: '2024-01-01'})
        const counts = await client.fetch(`{
          "newsArticle": count(*[_type=="newsArticle" && !(_id in path("drafts.**"))]),
          "staticPage":  count(*[_type=="staticPage"  && !(_id in path("drafts.**"))]),
          "mustEat":     count(*[_type=="mustEat"     && !(_id in path("drafts.**"))]),
          "restaurant":  count(*[_type=="restaurant"  && !(_id in path("drafts.**"))]),
          "bezirk":      count(*[_type=="bezirk"      && !(_id in path("drafts.**"))]),
          "category":    count(*[_type=="category"    && !(_id in path("drafts.**"))])
        }`)
        const label = (icon, title, n) => `${icon}  ${title} (${n ?? 0})`
        return S.list()
          .title('Content')
          .items([
            // ── News ─────────────────────────────────────────────────────
            S.documentTypeListItem('newsArticle').title(label('📰', 'News', counts.newsArticle)),

            S.divider(),

            // ── Static Pages ─────────────────────────────────────────────
            S.documentTypeListItem('staticPage').title(label('📄', 'Seiten', counts.staticPage)),

            S.divider(),

            // ── Other content types ───────────────────────────────────────
            S.documentTypeListItem('mustEat').title(label('🍽', 'Must-Eats', counts.mustEat)),
            S.documentTypeListItem('restaurant').title(label('📍', 'Restaurants', counts.restaurant)),
            S.documentTypeListItem('bezirk').title(label('🏙', 'Bezirke', counts.bezirk)),
            S.documentTypeListItem('category').title(label('🏷', 'Kategorien', counts.category)),
          ])
      },
    }),
    visionTool(),
  ],

  // Custom sidebar tool for one-shot restaurant import from a Maps URL.
  // Sanity v5's initial-value-template parameter-dialog flow only fires for
  // programmatic invocations (e.g. reference fields), not user-driven create
  // actions, so a dedicated tool with its own form is the canonical UI.
  tools: (prev) => [
    ...prev,
    {
      name: 'restaurant-importer',
      title: 'Import Restaurant',
      icon: DownloadIcon,
      component: RestaurantImporter,
    },
  ],

  schema: {
    types: schemaTypes,
  },
})
