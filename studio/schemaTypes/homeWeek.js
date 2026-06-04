import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'homeWeek',
  title: 'Home der Woche',
  type: 'document',
  description:
    'Wöchentliche Editorial-Kuration für den Hub: Bezirk der Woche + 1–3 Kategorie-Empfehlungen. Der Hub nimmt das Doc mit dem neuesten weekStart, das nicht in der Zukunft liegt.',
  fields: [
    defineField({
      name: 'weekStart',
      title: 'Woche ab (Montag)',
      type: 'date',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'bezirk',
      title: 'Bezirk der Woche',
      type: 'reference',
      to: [{ type: 'bezirk' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'bezirkTagline',
      title: 'Bezirk-Tagline',
      type: 'string',
      description: 'z. B. „Frische Welle vom Reuterkiez bis Sonnenallee".',
    }),
    defineField({
      name: 'bezirkSpots',
      title: 'Bezirk-Spots (4 Kacheln)',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'restaurant' }] }],
      validation: (Rule) => Rule.min(1).max(4),
    }),
    defineField({
      name: 'categories',
      title: 'Berlin nach Kategorien (1–3)',
      type: 'array',
      validation: (Rule) => Rule.max(3),
      of: [
        {
          type: 'object',
          name: 'categoryFeature',
          fields: [
            defineField({ name: 'category', title: 'Kategorie', type: 'reference', to: [{ type: 'category' }] }),
            defineField({ name: 'anchorSpot', title: 'Anker-Spot', type: 'reference', to: [{ type: 'restaurant' }] }),
            defineField({ name: 'line', title: 'Editorial-Zeile', type: 'string', description: 'z. B. „Slice für Slice. Slice Society als Anker."' }),
          ],
          preview: { select: { title: 'line', subtitle: 'category.name' } },
        },
      ],
    }),
  ],
  preview: {
    select: { title: 'weekStart', subtitle: 'bezirk.name' },
    prepare: ({ title, subtitle }) => ({ title: `Woche ${title}`, subtitle }),
  },
})
