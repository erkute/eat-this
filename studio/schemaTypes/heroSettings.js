import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'heroSettings',
  title: 'Hero',
  type: 'document',
  fields: [
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'Kurze Zeile unter dem Logo (z.B. "We tell you what to eat")',
    }),
    defineField({
      name: 'desktopImage',
      title: 'Hintergrundbild Desktop',
      type: 'image',
      description: 'Hintergrundbild für Bildschirme breiter als 1023px',
      options: {hotspot: true},
    }),
    defineField({
      name: 'mobileImage',
      title: 'Hintergrundbild Mobile',
      type: 'image',
      description: 'Hintergrundbild für Mobilgeräte (≤1023px)',
      options: {hotspot: true},
    }),
  ],
  preview: {
    select: {title: 'tagline'},
    prepare({title}) {
      return {title: 'Hero', subtitle: title}
    },
  },
})
