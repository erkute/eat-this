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
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
