import {defineField, defineType} from 'sanity'
import {PortableTextInputWithPaste} from '../lib/portableTextPaste'

// Custom input: auto-converts pasted HTML or Markdown into Portable Text
// (headings, bold, italic, links, blockquote). Applied to contentDe + content below.
const contentInputComponents = {input: PortableTextInputWithPaste}

// Shared Portable Text config reused in DE + EN content fields
const contentBlocks = [
  {
    type: 'block',
    styles: [
      {title: 'Fließtext', value: 'normal'},
      {title: 'Überschrift H2', value: 'h2'},
      {title: 'Überschrift H3', value: 'h3'},
      {title: 'Zitat', value: 'blockquote'},
    ],
    marks: {
      decorators: [
        {title: 'Fett', value: 'strong'},
        {title: 'Kursiv', value: 'em'},
        {title: 'Unterstrichen', value: 'underline'},
      ],
      annotations: [
        {
          name: 'link',
          type: 'object',
          title: 'Link',
          fields: [
            {
              name: 'href',
              type: 'url',
              title: 'URL',
              validation: (Rule) => Rule.uri({scheme: ['http', 'https', 'mailto']}),
            },
            {
              name: 'blank',
              type: 'boolean',
              title: 'In neuem Tab öffnen',
              initialValue: true,
            },
          ],
        },
      ],
    },
  },
  {
    type: 'image',
    title: 'Bild einfügen',
    // Sanity CDN liefert automatisch WebP via ?auto=format — kein manuelles Konvertieren nötig
    options: {hotspot: true, accept: 'image/*'},
    fields: [
      {
        name: 'alt',
        title: 'Alt-Text',
        type: 'string',
        description: 'Kurze Bildbeschreibung für SEO & Barrierefreiheit',
        validation: (Rule) => Rule.required().warning('Alt-Text fehlt — bitte ausfüllen'),
      },
      {
        name: 'caption',
        title: 'Bildunterschrift (optional)',
        type: 'string',
      },
    ],
  },
]

export default defineType({
  name: 'newsArticle',
  title: 'News-Artikel',
  type: 'document',
  groups: [
    {name: 'meta', title: '⚙️ Allgemein', default: true},
    {name: 'german', title: '🇩🇪 Deutsch'},
    {name: 'english', title: '🇬🇧 Englisch'},
    {name: 'seo', title: '🔍 SEO'},
  ],
  fields: [
    // ── Allgemein ─────────────────────────────────────────────────────────────
    defineField({
      name: 'date',
      title: 'Veröffentlichungsdatum',
      type: 'date',
      group: 'meta',
      options: {dateFormat: 'DD.MM.YYYY'},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Kategorie',
      type: 'string',
      group: 'meta',
      options: {
        list: [
          {title: 'Eröffnungen', value: 'openings'},
          {title: 'Guides', value: 'guides'},
          {title: 'Kultur', value: 'culture'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Aufmacher-Bild',
      type: 'image',
      group: 'meta',
      description: 'Wird automatisch als WebP ausgeliefert. Empfohlen: min. 1200 × 800 px.',
      options: {hotspot: true, accept: 'image/*'},
      fields: [
        {
          name: 'alt',
          title: 'Alt-Text',
          type: 'string',
          description: 'Kurze Bildbeschreibung — wichtig für SEO & Barrierefreiheit',
          validation: (Rule) => Rule.required().warning('Alt-Text fehlt'),
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Alt-Text (veraltet)',
      type: 'string',
      group: 'meta',
      hidden: true,
    }),
    defineField({
      name: 'slug',
      title: 'URL-Slug',
      type: 'slug',
      group: 'meta',
      options: {source: 'titleDe', maxLength: 96},
      description: 'Wird automatisch aus dem DE-Titel generiert',
      validation: (Rule) => Rule.required(),
    }),

    // ── Deutsch (primär) ──────────────────────────────────────────────────────
    defineField({
      name: 'titleDe',
      title: 'Titel',
      type: 'string',
      group: 'german',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'categoryLabelDe',
      title: 'Kategorie-Label',
      type: 'string',
      group: 'german',
      description: 'z.B. „Eröffnungen", „Guides", „Kultur"',
    }),
    defineField({
      name: 'excerptDe',
      title: 'Teaser',
      type: 'text',
      group: 'german',
      rows: 3,
      description: 'Kurze Zusammenfassung — erscheint in der News-Übersicht',
    }),
    defineField({
      name: 'contentDe',
      title: 'Inhalt',
      type: 'array',
      group: 'german',
      of: contentBlocks,
      components: contentInputComponents,
    }),

    // ── Englisch (optional) ───────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'english',
      description: 'Falls leer, wird der DE-Titel als Fallback verwendet',
    }),
    defineField({
      name: 'categoryLabel',
      title: 'Category Label',
      type: 'string',
      group: 'english',
      description: 'e.g. "Openings", "Guides", "Culture"',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      group: 'english',
      rows: 3,
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      group: 'english',
      of: contentBlocks,
      components: contentInputComponents,
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
          title: 'Meta-Titel',
          type: 'string',
          description: 'Leer lassen → Artikel-Titel wird verwendet. Max. 60 Zeichen.',
          validation: (Rule) => Rule.max(60),
        },
        {
          name: 'metaDescription',
          title: 'Meta-Beschreibung',
          type: 'text',
          rows: 3,
          description: 'Leer lassen → Teaser wird verwendet. Max. 160 Zeichen.',
          validation: (Rule) => Rule.max(160),
        },
        {
          name: 'ogImage',
          title: 'Social-Sharing-Bild',
          type: 'image',
          description: 'Leer lassen → Aufmacher-Bild wird genutzt. Ideal: 1200×630 px. Wird automatisch als WebP geliefert.',
          options: {accept: 'image/*'},
        },
        {
          name: 'noIndex',
          title: 'Aus Suchmaschinen ausblenden',
          type: 'boolean',
          initialValue: false,
        },
      ],
    }),
  ],

  preview: {
    select: {
      titleDe: 'titleDe',
      title: 'title',
      date: 'date',
      media: 'image',
      category: 'category',
    },
    prepare({titleDe, title, date, media, category}) {
      const icons = {openings: '🏠', guides: '📖', culture: '🎭'}
      const icon = icons[category] || '📰'
      const displayTitle = titleDe || title || 'Kein Titel'
      return {
        title: `${icon} ${displayTitle}`,
        subtitle: date || 'Kein Datum',
        media,
      }
    },
  },
})
