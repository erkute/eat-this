import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

const STATIC_SLUGS = ['about', 'contact', 'press', 'impressum', 'datenschutz', 'agb']
const STATIC_LABELS = {
  about: 'About',
  contact: 'Get in Touch',
  press: 'Press & Media',
  impressum: 'Impressum',
  datenschutz: 'Datenschutz / Privacy Policy',
  agb: 'AGB / Terms',
}

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
            // ── Hero (Singleton) ──────────────────────────────────────────
            S.listItem()
              .title('🖼  Hero')
              .id('heroSettings')
              .child(
                S.document()
                  .schemaType('heroSettings')
                  .documentId('heroSettings'),
              ),

            // ── Startseite (Singleton) ────────────────────────────────────
            S.listItem()
              .title('🏠  Startseite')
              .id('startContent')
              .child(
                S.document()
                  .schemaType('startContent')
                  .documentId('startContent'),
              ),

            S.divider(),

            // ── News ─────────────────────────────────────────────────────
            S.documentTypeListItem('newsArticle').title('📰  News'),

            S.divider(),

            // ── Static Pages ─────────────────────────────────────────────
            S.listItem()
              .title('📄  Seiten')
              .child(
                S.list()
                  .title('Seiten')
                  .items(
                    STATIC_SLUGS.map((slug) =>
                      S.listItem()
                        .title(STATIC_LABELS[slug])
                        .id(slug)
                        .child(
                          S.documentList()
                            .title(STATIC_LABELS[slug])
                            .schemaType('staticPage')
                            .filter(`_type == "staticPage" && slug.current == "${slug}"`),
                        ),
                    ),
                  ),
              ),

            S.divider(),

            // ── Other content types ───────────────────────────────────────
            S.documentTypeListItem('mustEat').title('🍽  Must-Eats'),
            S.documentTypeListItem('restaurant').title('📍  Restaurants'),
            S.documentTypeListItem('cardPack').title('🃏  Card Packs'),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
