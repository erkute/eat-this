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
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            // ── News ─────────────────────────────────────────────────────
            S.documentTypeListItem('newsArticle').title('📰  News'),

            S.divider(),

            // ── Static Pages ─────────────────────────────────────────────
            S.documentTypeListItem('staticPage').title('📄  Seiten'),

            S.divider(),

            // ── Other content types ───────────────────────────────────────
            S.documentTypeListItem('mustEat').title('🍽  Must-Eats'),
            S.documentTypeListItem('restaurant').title('📍  Restaurants'),
            S.documentTypeListItem('bezirk').title('🏙  Bezirke'),
            S.documentTypeListItem('category').title('🏷  Kategorien'),
          ]),
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
