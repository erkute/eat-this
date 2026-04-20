import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'newsArticle',
  title: 'News Article',
  type: 'document',
  groups: [
    {name: 'english', title: '🇬🇧 English'},
    {name: 'german', title: '🇩🇪 Deutsch'},
    {name: 'meta', title: 'Meta'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    // ── Shared ────────────────────────────────────────────────────────────────
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'meta',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      group: 'meta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category (internal)',
      type: 'string',
      group: 'meta',
      options: {list: ['guides', 'openings', 'culture'], layout: 'radio'},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Hero Image',
      type: 'image',
      group: 'meta',
      options: {hotspot: true},
    }),
    defineField({
      name: 'alt',
      title: 'Hero Image Alt Text',
      type: 'string',
      group: 'meta',
    }),

    // ── English ───────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title (EN)',
      type: 'string',
      group: 'english',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'categoryLabel',
      title: 'Category Label (EN)',
      type: 'string',
      group: 'english',
      description: 'Displayed label, e.g. "Openings", "Guides", "Culture"',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt (EN)',
      type: 'text',
      group: 'english',
      rows: 3,
    }),
    defineField({
      name: 'content',
      title: 'Full Content (EN)',
      type: 'array',
      group: 'english',
      of: [
        {
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading 2', value: 'h2'},
            {title: 'Heading 3', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          marks: {
            decorators: [
              {title: 'Bold', value: 'strong'},
              {title: 'Italic', value: 'em'},
              {title: 'Underline', value: 'underline'},
            ],
          },
        },
        {
          type: 'image',
          options: {hotspot: true},
          fields: [
            {name: 'alt', title: 'Alt Text', type: 'string'},
            {name: 'caption', title: 'Caption', type: 'string'},
          ],
        },
      ],
    }),

    // ── Deutsch ───────────────────────────────────────────────────────────────
    defineField({
      name: 'titleDe',
      title: 'Titel (DE)',
      type: 'string',
      group: 'german',
    }),
    defineField({
      name: 'categoryLabelDe',
      title: 'Kategorie-Label (DE)',
      type: 'string',
      group: 'german',
      description: 'Angezeigtes Label, z.B. „Eröffnungen", „Guides", „Kultur"',
    }),
    defineField({
      name: 'excerptDe',
      title: 'Teaser (DE)',
      type: 'text',
      group: 'german',
      rows: 3,
    }),
    defineField({
      name: 'contentDe',
      title: 'Vollständiger Inhalt (DE)',
      type: 'array',
      group: 'german',
      of: [
        {
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading 2', value: 'h2'},
            {title: 'Heading 3', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          marks: {
            decorators: [
              {title: 'Bold', value: 'strong'},
              {title: 'Italic', value: 'em'},
              {title: 'Underline', value: 'underline'},
            ],
          },
        },
        {
          type: 'image',
          options: {hotspot: true},
          fields: [
            {name: 'alt', title: 'Alt Text', type: 'string'},
            {name: 'caption', title: 'Caption', type: 'string'},
          ],
        },
      ],
    }),

    // ── SEO ───────────────────────────────────────────────────────────────────
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'object',
      group: 'seo',
      fields: [
        {
          name: 'metaTitle',
          title: 'Meta Title',
          type: 'string',
          description: 'Leave empty to use article title. Max 60 characters.',
          validation: (Rule) => Rule.max(60),
        },
        {
          name: 'metaDescription',
          title: 'Meta Description',
          type: 'text',
          rows: 3,
          description: 'Leave empty to use excerpt. Max 160 characters.',
          validation: (Rule) => Rule.max(160),
        },
        {
          name: 'ogImage',
          title: 'Social Sharing Image',
          type: 'image',
          description: 'Leave empty to use hero image. Ideal: 1200×630px.',
        },
        {
          name: 'noIndex',
          title: 'Hide from search engines',
          type: 'boolean',
          initialValue: false,
        },
      ],
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'categoryLabel', media: 'image'},
  },
})
