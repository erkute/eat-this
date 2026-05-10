import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

// API base for the import endpoint — production talks to the live Next.js
// app, dev hits localhost. Studio is a Vite-based static React app, so this
// resolves at build/dev time via import.meta.env.MODE.
const API_BASE = import.meta.env.MODE === 'production'
  ? 'https://www.eatthisdot.com'
  : 'http://localhost:3000'

const IMPORT_SECRET = import.meta.env.SANITY_STUDIO_IMPORT_SECRET

/** "+ Create new" template that imports a restaurant from a Google Maps URL.
 *  Calls the Next.js /api/admin/import-restaurant endpoint, which resolves
 *  the URL through Places, uploads the photo, and runs the AI generators
 *  (DE description, EN translations, SEO). Returns a draft-ready value the
 *  Studio uses as the new document's initial state. ~25–45s wait. */
const restaurantFromMapsUrlTemplate = {
  id: 'restaurant-from-maps-url',
  title: 'Import from Google Maps URL',
  schemaType: 'restaurant',
  parameters: [
    {
      name: 'url',
      title: 'Google Maps URL',
      type: 'string',
      description:
        'Paste a Google Maps URL (e.g. https://maps.app.goo.gl/X). Pulls Places data, photo, and AI-generated descriptions/SEO. ~30 seconds.',
    },
  ],
  value: async ({url}) => {
    if (!IMPORT_SECRET) {
      throw new Error(
        'SANITY_STUDIO_IMPORT_SECRET is not set. Add it to studio/.env.local matching nextjs/.env.local IMPORT_SECRET.',
      )
    }
    const trimmed = (url ?? '').trim()
    if (!trimmed) throw new Error('URL is required.')

    const res = await fetch(`${API_BASE}/api/admin/import-restaurant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${IMPORT_SECRET}`,
      },
      body: JSON.stringify({url: trimmed}),
    })
    if (!res.ok) {
      let payload = {}
      try {
        payload = await res.json()
      } catch {
        // ignore — fall through to status-based error
      }
      const msg = payload.error ?? `HTTP ${res.status}`
      const hint = payload.hint ? ` (${payload.hint})` : ''
      throw new Error(`${msg}${hint}`)
    }
    const data = await res.json()
    return data.doc
  },
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
            // ── News ─────────────────────────────────────────────────────
            S.documentTypeListItem('newsArticle').title('📰  News'),

            S.divider(),

            // ── Static Pages ─────────────────────────────────────────────
            S.documentTypeListItem('staticPage').title('📄  Seiten'),

            S.divider(),

            // ── Other content types ───────────────────────────────────────
            S.documentTypeListItem('mustEat').title('🍽  Must-Eats'),
            // Restaurants — explicitly register both initial-value templates
            // (default empty + import from Maps URL) so the "+ Create" button
            // in the list view shows the picker. Sanity hides
            // parameter-bearing templates from UIs that can't enter params,
            // so listing them here is the canonical place.
            S.listItem()
              .title('📍  Restaurants')
              .schemaType('restaurant')
              .child(
                S.documentTypeList('restaurant')
                  .title('Restaurants')
                  .initialValueTemplates([
                    S.initialValueTemplateItem('restaurant'),
                    S.initialValueTemplateItem('restaurant-from-maps-url'),
                  ]),
              ),
            S.documentTypeListItem('bezirk').title('🏙  Bezirke'),
            S.documentTypeListItem('category').title('🏷  Kategorien'),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
    templates: (prev) => [...prev, restaurantFromMapsUrlTemplate],
  },
})
