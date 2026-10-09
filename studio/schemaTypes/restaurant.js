import {PinIcon} from '@sanity/icons'
import {CategoryCheckboxInput} from '../components/CategoryCheckboxInput'
import {BezirkDropdownInput} from '../components/BezirkDropdownInput'
import {GalleryInput, SpotPhotoInput} from '../components/PhotoInputs'
import {OpeningHoursInput} from '../components/OpeningHoursInput'

// Spiegel von FIRST_PARTY_RESTAURANT_PHOTO_SLUGS in
// nextjs/lib/sanity-image-presets.ts — Spots, deren Foto von uns selbst stammt
// und deshalb ohne Credit-URL ausgespielt wird. Beim Ändern beide Stellen.
const FIRST_PARTY_PHOTO_SLUGS = ['bar-basta', 'sardinen-bar']

const slugify = (input) =>
  input
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/['’]/g, '')
    // Übrige Akzente (é, á, ì, ō, č …) auf ASCII zurückführen, statt sie im
    // [^a-z0-9]-Schritt zu verlieren.
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export default {
  name: 'restaurant',
  title: 'Spot',
  type: 'document',
  icon: PinIcon,
  groups: [
    {name: 'spot', title: 'Spot', default: true},
    {name: 'texte', title: 'Texte'},
    {name: 'fotos', title: 'Fotos'},
    {name: 'infos', title: 'Infos'},
    {name: 'seo', title: 'SEO & Technik'},
  ],
  fieldsets: [
    {name: 'status', title: 'Status', options: {columns: 2}},
    {name: 'kurz', title: 'Kurzbeschreibung', description: 'Für Vorschauen und Google. Höchstens 160 Zeichen.', options: {columns: 2}},
    {name: 'lang', title: 'Beschreibung', description: 'Der Text auf der Spot-Seite, Absätze durch eine Leerzeile getrennt. Höchstens 2000 Zeichen.', options: {columns: 2}},
    {name: 'tipp', title: 'Insider-Tipp', description: 'Ein Satz fürs Popup auf der Map.', options: {columns: 2}},
    {name: 'links', title: 'Links', options: {columns: 2}},
    {name: 'ort', title: 'Position auf der Map', options: {collapsible: true, collapsed: true, columns: 2}},
  ],
  fields: [
    // ── Spot ───────────────────────────────────────────────────────────────
    {
      name: 'name',
      title: 'Name',
      type: 'string',
      group: 'spot',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Adresse der Seite',
      type: 'slug',
      group: 'spot',
      description: 'eatthisdot.com/restaurant/… Wird aus dem Namen erzeugt. Nach dem Livegang nicht mehr ändern.',
      options: {source: 'name', maxLength: 96, slugify},
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'isOpen',
      title: 'Gibt es noch',
      type: 'boolean',
      group: 'spot',
      fieldset: 'status',
      initialValue: true,
      description: 'Aus = dauerhaft geschlossen. Der Spot fliegt aus allen Listen.',
    },
    {
      name: 'isClosed',
      title: 'Vorübergehend zu',
      type: 'boolean',
      group: 'spot',
      fieldset: 'status',
      initialValue: false,
      description: 'An = bleibt sichtbar, mit Hinweis „vorübergehend geschlossen“.',
    },
    {
      name: 'bezirkRef',
      title: 'Bezirk',
      type: 'reference',
      group: 'spot',
      to: [{type: 'bezirk'}],
      components: {input: BezirkDropdownInput},
    },
    {
      name: 'district',
      title: 'Kiez-Angabe',
      type: 'string',
      group: 'spot',
      description: 'So steht der Ort auf Karten und Kacheln, meist wie der Bezirk.',
    },
    {
      name: 'categories',
      title: 'Kategorien',
      type: 'array',
      group: 'spot',
      of: [{type: 'reference', to: [{type: 'category'}]}],
      components: {input: CategoryCheckboxInput},
    },
    {
      name: 'cuisineType',
      title: 'Küche',
      type: 'string',
      group: 'spot',
      description: 'Englisch, wie bei den anderen Spots: Italian, Japanese / Ramen, Bakery, Café …',
    },
    {
      name: 'tags',
      title: 'Gerichte & Eigenschaften',
      type: 'array',
      group: 'spot',
      of: [{type: 'string'}],
      options: {
        layout: 'grid',
        list: [
          {title: 'Pizza', value: 'pizza'},
          {title: 'Burger', value: 'burger'},
          {title: 'Döner / Kebab', value: 'döner'},
          {title: 'Pasta', value: 'pasta'},
          {title: 'Ramen', value: 'ramen'},
          {title: 'Sushi', value: 'sushi'},
          {title: 'Frühstück / Brunch', value: 'frühstück'},
          {title: 'Kaffee / Specialty Coffee', value: 'kaffee'},
          {title: 'Natural Wine', value: 'natural wine'},
          {title: 'Cocktails / Bar', value: 'bar'},
          {title: 'Dessert / Eis', value: 'dessert'},
          {title: 'Vegan', value: 'vegan'},
          {title: 'Vegetarisch', value: 'vegetarisch'},
          {title: 'Date-Spot', value: 'date-spot'},
          {title: 'Günstig / Casual', value: 'casual'},
          {title: 'Fine Dining', value: 'fine dining'},
        ],
      },
      description: 'Zum Anhaken. Für Suche und Remy, am stärksten gewichtet, wenn jemand nach einem Gericht fragt.',
    },
    {
      name: 'featured',
      title: 'Vorne zeigen',
      type: 'boolean',
      group: 'spot',
      initialValue: false,
      description: 'Steht auf den Bezirks- und Kategorie-Übersichten unter den ersten Beispielen und zählt bei Remy mehr.',
    },

    // ── Texte ──────────────────────────────────────────────────────────────
    {
      name: 'shortDescription',
      title: 'Deutsch',
      type: 'text',
      rows: 3,
      group: 'texte',
      fieldset: 'kurz',
      validation: (Rule) => Rule.max(160),
    },
    {
      name: 'shortDescriptionEn',
      title: 'Englisch (leer = Deutsch)',
      type: 'text',
      rows: 3,
      group: 'texte',
      fieldset: 'kurz',
      validation: (Rule) => Rule.max(160),
    },
    {
      name: 'description',
      title: 'Deutsch',
      type: 'text',
      rows: 10,
      group: 'texte',
      fieldset: 'lang',
      validation: (Rule) => Rule.max(2000),
    },
    {
      name: 'descriptionEn',
      title: 'Englisch (leer = Deutsch)',
      type: 'text',
      rows: 10,
      group: 'texte',
      fieldset: 'lang',
      validation: (Rule) => Rule.max(2000),
    },
    {
      name: 'tip',
      title: 'Deutsch',
      type: 'string',
      group: 'texte',
      fieldset: 'tipp',
    },
    {
      name: 'tipEn',
      title: 'Englisch (leer = Deutsch)',
      type: 'string',
      group: 'texte',
      fieldset: 'tipp',
    },

    // ── Fotos ──────────────────────────────────────────────────────────────
    {
      name: 'image',
      title: 'Titelfoto',
      type: 'image',
      group: 'fotos',
      options: {hotspot: true},
      components: {input: SpotPhotoInput},
      description: 'Erscheint nur mit Copyright und Link zur Quelle. Den Bildausschnitt setzt der Kreis in der Vorschau.',
      // Die Website spielt ein Foto NUR aus, wenn Credit UND Credit-URL gesetzt
      // sind, ODER der Spot einen `instagramHandle` hat, ODER der Slug in der
      // First-Party-Liste steht. Quelle der Wahrheit ist
      // `publishableRestaurantImageCondition` in nextjs/lib/sanity-image-presets.ts;
      // hier die Kopie, damit das Studio es vor dem Speichern merkt. Ohne die
      // Prüfung ist der Fehler unsichtbar (Son Kitchen, 25.08.2026).
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (!value || !value.asset) return true
          if (value.credit && value.creditUrl) return true
          const doc = context.document || {}
          if (doc.instagramHandle) return true
          if (FIRST_PARTY_PHOTO_SLUGS.includes(doc.slug && doc.slug.current)) return true
          return value.credit
            ? 'Copyright ohne Link zur Quelle reicht nicht — die Website blendet das Foto dann aus.'
            : 'Ohne Copyright und Link zur Quelle zeigt die Website das Foto nicht.'
        }),
      fields: [
        {
          name: 'credit',
          title: 'Copyright',
          type: 'string',
          description: 'Steht unter dem Foto, z. B. „Foto: Max Muster“.',
        },
        {
          name: 'creditUrl',
          title: 'Link zur Quelle',
          type: 'url',
          description: 'Wohin der Credit führt: Website oder Instagram des Fotografen oder Betriebs.',
        },
      ],
    },
    {
      name: 'gallery',
      title: 'Galerie',
      type: 'array',
      group: 'fotos',
      components: {input: GalleryInput},
      options: {layout: 'grid'},
      of: [
        {
          type: 'image',
          options: {hotspot: true},
          fields: [
            {
              name: 'credit',
              title: 'Copyright',
              type: 'string',
              description: 'z. B. „Foto: Max Muster“.',
            },
            {name: 'creditUrl', title: 'Link zur Quelle', type: 'url'},
            {
              name: 'alt',
              title: 'Was ist zu sehen?',
              type: 'string',
              description: 'Kurz, für Google und Screenreader.',
            },
          ],
          preview: {select: {media: 'asset', title: 'alt', subtitle: 'credit'}},
        },
      ],
    },

    // ── Infos ──────────────────────────────────────────────────────────────
    {
      name: 'address',
      title: 'Adresse',
      type: 'string',
      group: 'infos',
    },
    {
      name: 'openingHours',
      title: 'Öffnungszeiten',
      type: 'array',
      group: 'infos',
      description: 'Schalter aus = Ruhetag. Ohne Uhrzeit fehlt der Tag auf der Website. Nach Mitternacht einfach weiter: 18:00 bis 02:00.',
      components: {input: OpeningHoursInput},
      of: [
        {
          type: 'object',
          name: 'daySlot',
          fields: [
            {name: 'days', title: 'Tage', type: 'string', description: 'z. B. „Mon–Fri“ oder „Sat“'},
            {name: 'hours', title: 'Zeiten', type: 'string', description: 'z. B. „12:00–22:00“ oder „closed“'},
          ],
          preview: {select: {title: 'days', subtitle: 'hours'}},
        },
      ],
    },
    {
      name: 'priceRange',
      title: 'Preisspanne pro Person',
      type: 'object',
      group: 'infos',
      description: 'Wird als „10–20 €“ angezeigt. Ohne Höchstwert steht „ab …“ da.',
      options: {columns: 3},
      fields: [
        {name: 'min', title: 'Von', type: 'number'},
        {name: 'max', title: 'Bis', type: 'number'},
        {
          name: 'currency',
          title: 'Währung',
          type: 'string',
          initialValue: 'EUR',
          options: {list: ['EUR', 'USD', 'GBP', 'CHF'].map((code) => ({title: code, value: code}))},
        },
      ],
    },
    {
      name: 'phone',
      title: 'Telefon',
      type: 'string',
      group: 'infos',
      fieldset: 'links',
      description: 'International, z. B. +49 30 12345678',
    },
    {
      name: 'instagramHandle',
      title: 'Instagram',
      type: 'string',
      group: 'infos',
      fieldset: 'links',
      description: 'Nur der Name ohne @, z. B. buba.berlin',
    },
    {
      name: 'website',
      title: 'Website',
      type: 'url',
      group: 'infos',
      fieldset: 'links',
    },
    {
      name: 'menuUrl',
      title: 'Speisekarte',
      type: 'url',
      group: 'infos',
      fieldset: 'links',
    },
    {
      name: 'reservationUrl',
      title: 'Reservierung',
      type: 'url',
      group: 'infos',
      fieldset: 'links',
      description: 'Resy, OpenTable, eigene Seite …',
    },

    // ── SEO & Technik ──────────────────────────────────────────────────────
    {
      name: 'seo',
      title: 'Google',
      type: 'object',
      group: 'seo',
      description: 'Alles optional. Leer = Name und Kurzbeschreibung werden genutzt.',
      options: {columns: 2},
      fields: [
        {
          name: 'metaTitle',
          title: 'Titel Deutsch',
          type: 'string',
          validation: (Rule) => Rule.max(60),
        },
        {
          name: 'metaTitleEn',
          title: 'Titel Englisch',
          type: 'string',
          validation: (Rule) => Rule.max(60),
        },
        {
          name: 'metaDescription',
          title: 'Beschreibung Deutsch',
          type: 'text',
          rows: 2,
          validation: (Rule) => Rule.max(160),
        },
        {
          name: 'metaDescriptionEn',
          title: 'Beschreibung Englisch',
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
    },
    {
      name: 'lat',
      title: 'Breitengrad',
      type: 'number',
      group: 'seo',
      fieldset: 'ort',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'lng',
      title: 'Längengrad',
      type: 'number',
      group: 'seo',
      fieldset: 'ort',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'mapsUrl',
      title: 'Google-Maps-Link',
      type: 'url',
      group: 'seo',
    },
    {
      name: 'googlePlaceId',
      title: 'Google Place ID',
      type: 'string',
      group: 'seo',
      readOnly: true,
      description: 'Setzt der Import. Erkennt doppelte Spots.',
    },
  ],
  orderings: [
    {title: 'Name A–Z', name: 'nameAsc', by: [{field: 'name', direction: 'asc'}]},
    {title: 'Zuletzt bearbeitet', name: 'updatedDesc', by: [{field: '_updatedAt', direction: 'desc'}]},
  ],
  preview: {
    select: {
      title: 'name',
      bezirk: 'bezirkRef.name',
      district: 'district',
      cuisine: 'cuisineType',
      media: 'image',
      isOpen: 'isOpen',
      isClosed: 'isClosed',
    },
    prepare({title, bezirk, district, cuisine, media, isOpen, isClosed}) {
      const status = isOpen === false ? 'Geschlossen' : isClosed ? 'Vorübergehend zu' : null
      const place = bezirk || district
      return {
        title: title || 'Neuer Spot',
        subtitle: [status, place, cuisine].filter(Boolean).join(' · '),
        media: media || PinIcon,
      }
    },
  },
}
