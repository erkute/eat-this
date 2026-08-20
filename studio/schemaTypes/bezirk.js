import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'bezirk',
  title: 'Bezirk',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'name', maxLength: 96},
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Beschreibung',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'descriptionEn',
      title: 'Description (EN)',
      type: 'text',
      rows: 3,
      description: 'Optional EN override. Leave empty to fall back to German.',
    }),
    defineField({
      name: 'topSpots',
      title: 'Top-Spots (kuratierte Reihenfolge)',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'restaurant'}]}],
      validation: Rule => Rule.max(10).unique(),
      description:
        'Die besten Spots dieses Bezirks, in Reihenfolge — Platz 1 ganz oben, per Drag & Drop ' +
        'sortieren. Sie erscheinen als nummerierte Bestenliste über der A–Z-Liste und bestimmen, ' +
        'welche Spots der Bezirk auf der Übersichtsseite zeigt. ' +
        'Leer lassen (oder unter 3 Einträge) = die Seite bleibt wie bisher rein alphabetisch.',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        {
          name: 'metaTitle',
          title: 'Meta Title',
          type: 'string',
          description: 'Leave empty to use the default page title. Max 60 characters.',
          validation: Rule => Rule.max(60),
        },
        {
          name: 'metaTitleEn',
          title: 'Meta Title (EN)',
          type: 'string',
          description: 'Optional EN override. Leave empty to fall back to German. Max 60 characters.',
          validation: Rule => Rule.max(60),
        },
        {
          name: 'metaDescription',
          title: 'Meta Description',
          type: 'text',
          rows: 2,
          description: 'Leave empty to use description. Max 160 characters.',
          validation: Rule => Rule.max(160),
        },
        {
          name: 'metaDescriptionEn',
          title: 'Meta Description (EN)',
          type: 'text',
          rows: 2,
          description: 'Optional EN override. Leave empty to fall back to German. Max 160 characters.',
          validation: Rule => Rule.max(160),
        },
        {
          name: 'ogImage',
          title: 'Social Sharing Image',
          type: 'image',
          description: 'Leave empty to use the bezirk image. Ideal: 1200x630px.',
          options: {hotspot: true},
        },
        {
          name: 'noIndex',
          title: 'Hide from search engines',
          type: 'boolean',
          initialValue: false,
        },
      ],
    }),
    defineField({
      name: 'image',
      title: 'Bild',
      type: 'image',
      options: {hotspot: true, accept: 'image/*'},
    }),
  ],
  preview: {
    select: {title: 'name', media: 'image'},
  },
})
