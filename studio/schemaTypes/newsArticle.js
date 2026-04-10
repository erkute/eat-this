export default {
  name: 'newsArticle',
  title: 'News Article',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: Rule => Rule.required(),
    },
    {
      name: 'language',
      title: 'Language',
      type: 'string',
      options: { list: ['en', 'de'], layout: 'radio' },
      initialValue: 'en',
      validation: Rule => Rule.required(),
    },
    {
      name: 'category',
      title: 'Category (internal)',
      type: 'string',
      options: { list: ['guides', 'openings', 'culture'], layout: 'radio' },
      validation: Rule => Rule.required(),
    },
    {
      name: 'categoryLabel',
      title: 'Category Label (displayed)',
      type: 'string',
      description: 'E.g. "Guides", "Openings", "Culture"',
    },
    {
      name: 'date',
      title: 'Date',
      type: 'date',
      validation: Rule => Rule.required(),
    },
    {
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'alt',
      title: 'Image Alt Text',
      type: 'string',
    },
    {
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
    },
    {
      name: 'content',
      title: 'Full Content',
      type: 'text',
      rows: 10,
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'categoryLabel', media: 'image' },
  },
}
