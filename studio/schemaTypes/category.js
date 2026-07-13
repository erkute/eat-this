import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'category',
  title: 'Kategorie',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name (Deutsch)',
      type: 'string',
      description: 'Anzeigename auf der DE-Site, z.B. "Café", "Frühstück", "Süßes".',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'nameEn',
      title: 'Name (English)',
      type: 'string',
      description: 'Anzeigename auf der EN-Site, z.B. "Coffee", "Breakfast", "Sweets".',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'nameEn', maxLength: 96},
      description: 'URL-Pfad (/kategorie/<slug>). Wird aus dem englischen Namen generiert.',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Beschreibung (Deutsch)',
      type: 'text',
      rows: 2,
      description: 'Kurzer Blurb für SEO + Hub-Seite. 1–2 Sätze.',
    }),
    defineField({
      name: 'descriptionEn',
      title: 'Description (English)',
      type: 'text',
      rows: 2,
      description: 'Short blurb for SEO + hub page. 1–2 sentences.',
    }),
    defineField({
      name: 'homeImage',
      title: 'Home Kategorie-Bild',
      type: 'image',
      description: 'Primäres Food-Bild für den Kategorien-Block auf der Startseite.',
      options: {hotspot: true, accept: 'image/*'},
    }),
    defineField({
      name: 'homeImages',
      title: 'Weitere Home Food-Bilder',
      type: 'array',
      description: 'Zusätzliche Food-Bilder für spätere Varianten der Kategorie-Rail.',
      of: [
        {
          type: 'image',
          options: {hotspot: true, accept: 'image/*'},
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
            }),
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {title: 'name', media: 'homeImage'},
  },
})
