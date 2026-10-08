import {defineField, defineType} from 'sanity'
import {DocumentTextIcon, ImageIcon, LinkIcon, PinIcon, StarIcon} from '@sanity/icons'
import {ArticleInput} from '../components/ArticleInput'
import {ArticleTextInput, ConclusionStyle, ImageBlock} from '../components/ArticleEditor'

// Das Etikett über dem Artikel („Guides“, „Openings“ …) leitet die Website
// aus der Kategorie ab (nextjs/lib/queries.ts, ARTICLE_LABEL_*).
const CATEGORIES = [
  {title: 'Guide', value: 'guides'},
  {title: 'Eröffnung', value: 'openings'},
  {title: 'Kultur', value: 'culture'},
]

const today = () => new Date().toISOString().slice(0, 10)

// Der Editor für DE und EN. Eingefügtes HTML oder Markdown wird zu
// Überschriften, Fett, Links; „## “ am Zeilenanfang macht eine Überschrift,
// „> “ ein Zitat.
const editor = {input: ArticleTextInput}

const contentBlocks = [
  {
    type: 'block',
    styles: [
      {title: 'Text', value: 'normal'},
      {title: 'Überschrift', value: 'h2'},
      {title: 'Zwischenüberschrift', value: 'h3'},
      {title: 'Zitat', value: 'blockquote'},
      // Der Schluss des Artikels. Kein h2: die Zeile wird zum Etikett eines
      // eigenen Blocks, und die Absätze darunter gehören sichtbar dazu. Auf
      // die Überschrift anwenden, nicht auf den Fließtext.
      {title: 'Fazit', value: 'conclusion', component: ConclusionStyle},
    ],
    lists: [
      {title: 'Aufzählung', value: 'bullet'},
      {title: 'Nummeriert', value: 'number'},
    ],
    marks: {
      decorators: [
        {title: 'Fett', value: 'strong'},
        {title: 'Kursiv', value: 'em'},
      ],
      annotations: [
        {
          name: 'link',
          type: 'object',
          title: 'Link',
          icon: LinkIcon,
          fields: [
            {
              name: 'href',
              type: 'url',
              title: 'Adresse',
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
    title: 'Bild',
    icon: ImageIcon,
    options: {hotspot: true, accept: 'image/*'},
    components: {block: ImageBlock},
    preview: {
      select: {caption: 'caption', media: 'asset'},
      prepare: ({caption, media}) => ({title: caption || 'Bild', media}),
    },
    fields: [
      {
        name: 'caption',
        title: 'Bildunterschrift',
        type: 'string',
        description: 'Steht unter dem Bild. Optional.',
      },
      {
        name: 'alt',
        title: 'Was ist zu sehen?',
        type: 'string',
        description: 'Kurz, für Google und Screenreader.',
        validation: (Rule) => Rule.required().warning('Beschreibung fehlt'),
      },
    ],
  },
  // Spot im Text: Bildkarte (Foto, Bezirk · Küche, Name, klickbar auf die
  // Map). Speist zusätzlich das „Spots im Artikel“-Raster und die Spotleiste.
  {
    type: 'object',
    name: 'spotCard',
    title: 'Spot',
    icon: PinIcon,
    fields: [
      {
        name: 'restaurantRef',
        title: 'Spot',
        type: 'reference',
        to: [{type: 'restaurant'}],
        validation: (Rule) => Rule.required(),
      },
    ],
    preview: {
      select: {name: 'restaurantRef.name', district: 'restaurantRef.district', cuisine: 'restaurantRef.cuisineType', media: 'restaurantRef.image'},
      prepare: ({name, district, cuisine, media}) => ({
        title: name || 'Spot wählen',
        subtitle: ['Spot', district, cuisine].filter(Boolean).join(' · '),
        media: media || PinIcon,
      }),
    },
  },
  // Must Eat im Text: verweist auf die private Karte, im öffentlichen Artikel
  // erscheint nur der zugehörige Spot.
  {
    type: 'object',
    name: 'mustEatCard',
    title: 'Must Eat',
    icon: StarIcon,
    fields: [
      {
        name: 'mustEatRef',
        title: 'Must Eat',
        type: 'reference',
        to: [{type: 'mustEat'}],
        validation: (Rule) => Rule.required(),
      },
    ],
    preview: {
      select: {restaurant: 'mustEatRef.restaurantRef.name', order: 'mustEatRef.order', media: 'mustEatRef.restaurantRef.image'},
      prepare: ({restaurant, order, media}) => ({
        title: restaurant ? `Must Eat bei ${restaurant}` : 'Must Eat wählen',
        subtitle: typeof order === 'number' ? `Karte ${order}` : 'Must Eat',
        media: media || StarIcon,
      }),
    },
  },
]

export default defineType({
  name: 'newsArticle',
  title: 'Artikel',
  type: 'document',
  icon: DocumentTextIcon,
  components: {input: ArticleInput},
  initialValue: () => ({date: today(), category: 'guides'}),
  groups: [
    {name: 'artikel', title: 'Artikel', default: true},
    {name: 'englisch', title: 'Englisch'},
    {name: 'cover', title: 'Cover & Google'},
  ],
  fieldsets: [{name: 'details', title: 'Einordnung', options: {columns: 2}}],
  fields: [
    // ── Artikel ───────────────────────────────────────────────────────────────
    defineField({
      name: 'titleDe',
      title: 'Titel',
      type: 'string',
      group: 'artikel',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Adresse der Seite',
      type: 'slug',
      group: 'artikel',
      description: 'eatthisdot.com/news/… Wird aus dem Titel erzeugt. Nach dem Livegang nicht mehr ändern.',
      options: {source: 'titleDe', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerptDe',
      title: 'Teaser',
      type: 'text',
      group: 'artikel',
      rows: 3,
      description: 'Zwei, drei Sätze für die Magazin-Übersicht und Google.',
    }),
    defineField({
      name: 'image',
      title: 'Aufmacher-Bild',
      type: 'image',
      group: 'artikel',
      description: 'Mindestens 1200 × 800 Pixel.',
      options: {hotspot: true, accept: 'image/*'},
      fields: [
        {
          name: 'alt',
          title: 'Was ist zu sehen?',
          type: 'string',
          description: 'Kurz, für Google und Screenreader.',
          validation: (Rule) => Rule.required().warning('Beschreibung fehlt'),
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'contentDe',
      title: 'Text',
      type: 'array',
      group: 'artikel',
      of: contentBlocks,
      components: editor,
    }),
    defineField({
      name: 'category',
      title: 'Kategorie',
      type: 'string',
      group: 'artikel',
      fieldset: 'details',
      options: {list: CATEGORIES},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Datum',
      type: 'date',
      group: 'artikel',
      fieldset: 'details',
      options: {dateFormat: 'DD.MM.YYYY'},
      validation: (Rule) => Rule.required(),
    }),

    // ── Englisch ──────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Titel',
      type: 'string',
      group: 'englisch',
      description: 'Leer = deutscher Titel.',
    }),
    defineField({
      name: 'excerpt',
      title: 'Teaser',
      type: 'text',
      group: 'englisch',
      rows: 3,
    }),
    defineField({
      name: 'content',
      title: 'Text',
      type: 'array',
      group: 'englisch',
      of: contentBlocks,
      components: editor,
    }),

    // ── Cover & Google ────────────────────────────────────────────────────────
    // Das Heft auf Startseite und /news (MagazineCover). Freisteller, Rahmen,
    // „Gericht erkannt“ und Quelle schreibt der Job „Heft-Cover freistellen“
    // (nextjs/scripts/build-cover-cutouts.mts) — von Hand wird nur der Look
    // gewählt.
    defineField({
      name: 'cover',
      title: 'Heft-Cover',
      type: 'object',
      group: 'cover',
      description:
        'Automatisch: Jedes Heft bekommt reihum einen Look. Ist ein Gericht auf dem Aufmacher-Bild, kommen auch die Freisteller-Looks dran — der Freisteller kommt von selbst, spätestens eine Stunde nach dem Veröffentlichen.',
      fields: [
        {
          name: 'look',
          title: 'Look',
          type: 'string',
          options: {
            list: [
              {title: 'Automatisch', value: 'auto'},
              {title: 'Nach LOVE (Logo Ton in Ton)', value: 'love'},
              {title: 'Nach System (weisses Feld unten)', value: 'system'},
              {title: 'Nach Holiday (weisses Riesenlogo)', value: 'holiday'},
              {title: 'Nach Beauty Papers (Logo in der Mitte)', value: 'beauty'},
              {title: 'Nach 032c (Silber, roter Rücken)', value: 'silver'},
              {title: 'Nach 032c (rotes Logo in der Mitte)', value: 'redlogo'},
              {title: 'Nach Purple (weisser Rahmen)', value: 'purple'},
              {title: 'Nach The Face (roter Block)', value: 'face'},
              {title: 'Teller', value: 'plate'},
              {title: 'Rote Fläche', value: 'field'},
              {title: 'Nach Perfect — braucht Freisteller', value: 'perfect'},
              {title: 'Nach PAPER — braucht Freisteller', value: 'paper'},
              {title: 'Fussband — braucht Freisteller', value: 'band'},
              {title: 'Vor dem Logo — braucht Freisteller', value: 'front'},
              {title: 'Stillleben — braucht Freisteller', value: 'still'},
            ],
          },
          initialValue: 'auto',
          description:
            'Die Looks mit „braucht Freisteller“ greifen nur, wenn unten ein Freisteller steht. Sonst bleibt es bei Automatisch.',
        },
        {
          name: 'cutout',
          title: 'Freisteller',
          type: 'image',
          readOnly: true,
          description: 'Kommt automatisch aus dem Aufmacher-Bild.',
        },
        {
          name: 'dish',
          title: 'Gericht erkannt',
          type: 'boolean',
          readOnly: true,
        },
        {
          name: 'box',
          title: 'Rahmen des Motivs',
          type: 'object',
          hidden: true,
          fields: ['x', 'y', 'w', 'h'].map((name) => ({name, type: 'number'})),
        },
        {
          name: 'source',
          title: 'Freigestellt aus',
          type: 'string',
          hidden: true,
        },
      ],
    }),
    defineField({
      name: 'seo',
      title: 'Google',
      type: 'object',
      group: 'cover',
      description: 'Alles optional. Leer = Titel und Teaser werden genutzt.',
      options: {columns: 2},
      fields: [
        {name: 'metaTitle', title: 'Titel Deutsch', type: 'string', validation: (Rule) => Rule.max(60)},
        {name: 'metaTitleEn', title: 'Titel Englisch', type: 'string', validation: (Rule) => Rule.max(60)},
        {
          name: 'metaDescription',
          title: 'Beschreibung Deutsch',
          type: 'text',
          rows: 3,
          validation: (Rule) => Rule.max(160),
        },
        {
          name: 'metaDescriptionEn',
          title: 'Beschreibung Englisch',
          type: 'text',
          rows: 3,
          validation: (Rule) => Rule.max(160),
        },
        {name: 'noIndex', title: 'Vor Google verstecken', type: 'boolean', initialValue: false},
      ],
    }),
  ],

  orderings: [{title: 'Neueste zuerst', name: 'dateDesc', by: [{field: 'date', direction: 'desc'}]}],
  preview: {
    select: {titleDe: 'titleDe', title: 'title', date: 'date', media: 'image', category: 'category'},
    prepare({titleDe, title, date, media, category}) {
      const label = CATEGORIES.find((c) => c.value === category)?.title
      const day = date ? date.split('-').reverse().join('.') : null
      return {
        title: titleDe || title || 'Ohne Titel',
        subtitle: [label, day].filter(Boolean).join(' · ') || 'Entwurf',
        media,
      }
    },
  },
})
