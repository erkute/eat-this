import {defineField, defineType} from 'sanity'
import {TagIcon} from '@sanity/icons'

export default defineType({
  name: 'category',
  title: 'Kategorie',
  type: 'document',
  icon: TagIcon,
  fieldsets: [
    {name: 'name', title: 'Name', options: {columns: 2}},
    {name: 'text', title: 'Beschreibung', description: '1–2 Sätze für die Kategorieseite und Google.', options: {columns: 2}},
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Deutsch',
      type: 'string',
      fieldset: 'name',
      description: 'z. B. „Frühstück“, „Süßes“',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'nameEn',
      title: 'Englisch',
      type: 'string',
      fieldset: 'name',
      description: 'z. B. „Breakfast“, „Sweets“',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Adresse der Seite',
      type: 'slug',
      options: {source: 'nameEn', maxLength: 96},
      description: 'eatthisdot.com/kategorie/… Kommt aus dem englischen Namen. Nach dem Livegang nicht mehr ändern.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Deutsch',
      type: 'text',
      rows: 3,
      fieldset: 'text',
    }),
    defineField({
      name: 'descriptionEn',
      title: 'Englisch',
      type: 'text',
      rows: 3,
      fieldset: 'text',
    }),
    defineField({
      name: 'topSpots',
      title: 'Bestenliste',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{type: 'restaurant'}],
          options: {
            // Nur Spots dieser Kategorie anbieten — und keine geschlossenen:
            // die fliegen im Frontend ohnehin aus der Liste (GROQ filtert
            // isOpen == false), im Picker wären sie stille Nieten.
            filter: ({document}) => {
              const categoryId = (document._id || '').replace(/^drafts\./, '')
              if (!categoryId) return {filter: 'isOpen != false'}
              return {
                filter: '$categoryId in categories[]._ref && isOpen != false',
                params: {categoryId},
              }
            },
          },
        },
      ],
      validation: (Rule) => Rule.max(10).unique(),
      description:
        'Die besten Spots der Kategorie, Platz 1 oben, per Ziehen sortieren. Erscheint als ' +
        'nummerierte Liste über A–Z. Unter drei Einträgen bleibt die Seite rein alphabetisch.',
    }),
  ],
  // Kein Bild: Wo eine Kategorie eins zeigt (Hub, Index, OG), kommt es aus
  // `lib/categoryArt.ts` bzw. `public/pics/og/`, nicht aus dem Dokument.
  preview: {
    select: {title: 'name', en: 'nameEn', top: 'topSpots'},
    prepare: ({title, en, top}) => ({
      title,
      subtitle: [en !== title ? en : null, top?.length >= 3 ? `Bestenliste mit ${top.length} Spots` : 'Ohne Bestenliste']
        .filter(Boolean)
        .join(' · '),
      media: TagIcon,
    }),
  },
})
