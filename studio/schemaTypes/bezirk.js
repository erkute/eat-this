import {defineField, defineType} from 'sanity'
import {EarthGlobeIcon} from '@sanity/icons'

export default defineType({
  name: 'bezirk',
  title: 'Bezirk',
  type: 'document',
  icon: EarthGlobeIcon,
  groups: [
    {name: 'seite', title: 'Seite', default: true},
    {name: 'seo', title: 'Google'},
  ],
  fieldsets: [
    {name: 'text', title: 'Beschreibung', description: 'Steht oben auf der Bezirksseite.', options: {columns: 2}},
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      group: 'seite',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Adresse der Seite',
      type: 'slug',
      group: 'seite',
      description: 'eatthisdot.com/bezirk/… Nach dem Livegang nicht mehr ändern.',
      options: {source: 'name', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Deutsch',
      type: 'text',
      rows: 4,
      group: 'seite',
      fieldset: 'text',
    }),
    defineField({
      name: 'descriptionEn',
      title: 'Englisch (leer = Deutsch)',
      type: 'text',
      rows: 4,
      group: 'seite',
      fieldset: 'text',
    }),
    defineField({
      name: 'topSpots',
      title: 'Bestenliste',
      type: 'array',
      group: 'seite',
      of: [
        {
          type: 'reference',
          to: [{type: 'restaurant'}],
          options: {
            // Nur Spots dieses Bezirks anbieten — und keine geschlossenen:
            // die fliegen im Frontend ohnehin aus der Liste (GROQ filtert
            // isOpen == false), im Picker wären sie stille Nieten.
            filter: ({document}) => {
              const bezirkId = (document._id || '').replace(/^drafts\./, '')
              if (!bezirkId) return {filter: 'isOpen != false'}
              return {
                filter: 'bezirkRef._ref == $bezirkId && isOpen != false',
                params: {bezirkId},
              }
            },
          },
        },
      ],
      validation: (Rule) => Rule.max(10).unique(),
      description:
        'Die besten Spots des Bezirks, Platz 1 oben, per Ziehen sortieren. Erscheint als ' +
        'nummerierte Liste über A–Z und bestimmt die Beispiele auf der Übersicht. ' +
        'Unter drei Einträgen bleibt die Seite rein alphabetisch.',
    }),
    defineField({
      name: 'seo',
      title: 'Google',
      type: 'object',
      group: 'seo',
      description: 'Alles optional. Bezirksseiten hängen keine Marke an, der Titel darf die vollen 60 Zeichen nutzen.',
      fields: [
        {
          name: 'metaTitle',
          title: 'Titel bei Google',
          type: 'string',
          description: 'Leer = „Restaurants in Berlin-<Bezirk>“.',
          validation: (Rule) => Rule.max(60),
        },
        {
          name: 'metaTitleEn',
          title: 'Titel bei Google (Englisch)',
          type: 'string',
          validation: (Rule) => Rule.max(60),
        },
        {
          name: 'metaDescription',
          title: 'Beschreibung bei Google',
          type: 'text',
          rows: 2,
          description: 'Leer = die Beschreibung oben.',
          validation: (Rule) => Rule.max(160),
        },
        {
          name: 'metaDescriptionEn',
          title: 'Beschreibung bei Google (Englisch)',
          type: 'text',
          rows: 2,
          validation: (Rule) => Rule.max(160),
        },
        {
          name: 'noIndex',
          title: 'Vor Google verstecken',
          type: 'boolean',
          initialValue: false,
        },
      ],
    }),
  ],
  preview: {
    select: {title: 'name', top: 'topSpots'},
    prepare: ({title, top}) => ({
      title,
      subtitle: top?.length >= 3 ? `Bestenliste mit ${top.length} Spots` : 'Ohne Bestenliste',
      media: EarthGlobeIcon,
    }),
  },
})
