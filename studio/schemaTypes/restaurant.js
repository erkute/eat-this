import {CategoryCheckboxInput} from '../components/CategoryCheckboxInput'
import {BezirkDropdownInput} from '../components/BezirkDropdownInput'

export default {
  name: 'restaurant',
  title: 'Restaurant (Map)',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
        // Slugify: German digraph mapping first, then NFD-normalize and strip
        // combining marks so other diacritics (é, á, ì, ō, č, …) reduce to ASCII
        // instead of being deleted by the [^a-z0-9] sweep.
        slugify: input =>
          input
            .toLowerCase()
            .replace(/ä/g, 'ae')
            .replace(/ö/g, 'oe')
            .replace(/ü/g, 'ue')
            .replace(/ß/g, 'ss')
            .replace(/['’]/g, '')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, ''),
      },
      validation: Rule => Rule.required(),
    },
    {
      name: 'isOpen',
      title: 'Geöffnet',
      type: 'boolean',
      initialValue: true,
      description: 'Deaktivieren wenn das Restaurant dauerhaft geschlossen ist.',
    },
    {
      name: 'isClosed',
      title: 'Vorübergehend geschlossen',
      type: 'boolean',
      initialValue: false,
      description: 'Aktivieren wenn das Restaurant vorübergehend geschlossen ist.',
    },
    {
      name: 'featured',
      title: 'Auf Landingpage anzeigen',
      type: 'boolean',
      initialValue: false,
      description: 'Anhaken, um dieses Restaurant in der Featured-Spots-Section auf der Landingpage zu zeigen. Max. 12 werden angezeigt. Wenn keiner angehakt ist, fällt die Landing auf die Top-Restaurants nach Must-Eat-Anzahl zurück.',
    },
    {
      name: 'tierAnon',
      title: 'Anon-Tier — sichtbar ohne Login',
      type: 'boolean',
      initialValue: false,
      description: 'Anhaken um dieses Restaurant in den ~20 anonymen Spots zu zeigen, die jeder ohne Login auf der Map sieht. Sollte ein Restaurant mit mindestens einem Must-Eat sein.',
    },
    {
      name: 'cuisineType',
      title: 'Küche / Cuisine',
      type: 'string',
      description: 'z.B. Italian, Japanese / Ramen, Coffee, Bakery …',
    },
    {
      name: 'shortDescription',
      title: 'Kurzbeschreibung (SEO)',
      type: 'text',
      rows: 2,
      description: 'Für Meta Description & Vorschau. Max. 160 Zeichen.',
      validation: Rule => Rule.max(160),
    },
    {
      name: 'shortDescriptionEn',
      title: 'Short Description (EN, SEO)',
      type: 'text',
      rows: 2,
      description: 'Optional EN override. Leave empty to fall back to German. Max 160 characters.',
      validation: Rule => Rule.max(160),
    },
    {
      name: 'description',
      title: 'Beschreibung',
      type: 'text',
      rows: 8,
      description: 'Ausführliche Beschreibung auf der Detail-Seite. Max 700 Zeichen (Voice-B Long-form: Ziel 500–650).',
      validation: Rule => Rule.max(700),
    },
    {
      name: 'descriptionEn',
      title: 'Description (EN)',
      type: 'text',
      rows: 8,
      description: 'Optional EN override. Leave empty to fall back to German. Max 700 characters (Voice-B Long-form: target 500–650).',
      validation: Rule => Rule.max(700),
    },
    {
      name: 'seo',
      title: 'SEO',
      type: 'object',
      options: { collapsible: true, collapsed: true },
      fields: [
        {
          name: 'metaTitle',
          title: 'Meta Title',
          type: 'string',
          description: 'Leave empty to use restaurant name. Max 60 characters.',
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
          description: 'Leave empty to use restaurant photo. Ideal: 1200x630px.',
          options: { hotspot: true },
        },
        {
          name: 'noIndex',
          title: 'Hide from search engines',
          type: 'boolean',
          initialValue: false,
        },
      ],
    },
    {
      name: 'district',
      title: 'District',
      type: 'string',
    },
    {
      name: 'bezirkRef',
      title: 'Bezirk',
      type: 'reference',
      to: [{ type: 'bezirk' }],
      description: 'Berliner Bezirk (verknüpft)',
      components: { input: BezirkDropdownInput },
    },
    {
      name: 'address',
      title: 'Address',
      type: 'string',
    },
    {
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'category' }] }],
      description:
        'Anhaken um zuzuordnen. DE/EN-Label gepflegt unter „Kategorien".',
      components: { input: CategoryCheckboxInput },
    },
    {
      name: 'phone',
      title: 'Telefon',
      type: 'string',
      description:
        'Internationale E.164-Form (z.B. +49 30 12345678). Aus der Google Places API gezogen.',
    },
    {
      name: 'priceRange',
      title: 'Preisspanne',
      type: 'object',
      description:
        'Wird beim Import aus Google Places gezogen und überall als "10–20 €" angezeigt. Manuell editieren wenn Places keine Daten hat.',
      options: { collapsible: true, collapsed: false },
      fields: [
        { name: 'min', title: 'Min', type: 'number' },
        { name: 'max', title: 'Max', type: 'number' },
        {
          name: 'currency',
          title: 'Währung',
          type: 'string',
          initialValue: 'EUR',
          options: { list: ['EUR', 'USD', 'GBP', 'CHF'] },
        },
      ],
    },
    {
      name: 'lat',
      title: 'Latitude',
      type: 'number',
      validation: Rule => Rule.required(),
    },
    {
      name: 'lng',
      title: 'Longitude',
      type: 'number',
      validation: Rule => Rule.required(),
    },
    {
      name: 'mapsUrl',
      title: 'Google Maps URL',
      type: 'url',
    },
    {
      name: 'googlePlaceId',
      title: 'Google Place ID',
      type: 'string',
      readOnly: true,
      description:
        'Kanonische Google-Place-ID (z.B. ChIJ…). Wird beim Import gesetzt und als Dedup-Key verwendet — selbe Filiale derselben Marke an unterschiedlichen Standorten haben unterschiedliche IDs.',
    },
    {
      name: 'website',
      title: 'Website',
      type: 'url',
    },
    {
      name: 'instagramHandle',
      title: 'Instagram Handle',
      type: 'string',
      description:
        'Nur den Handle ohne @ (z.B. "buba.berlin"). Wenn gesetzt UND das Photo kein eigenes Credit hat, erscheint der Hero-Credit als "via @handle" mit Link auf instagram.com/handle.',
    },
    {
      name: 'image',
      title: 'Photo',
      type: 'image',
      options: { hotspot: true },
      fields: [
        {
          name: 'credit',
          title: 'Photo Credit',
          type: 'string',
          description:
            'Pflicht bei Bildern aus Google Places (z.B. "Foto: Max Mustermann"). Wird als figcaption unter dem Bild angezeigt.',
        },
        {
          name: 'creditUrl',
          title: 'Photo Credit URL',
          type: 'url',
          description:
            'Optional: Profil-URL des Fotografen. Macht das Credit-Label klickbar.',
        },
      ],
    },
    {
      name: 'gallery',
      title: 'Galerie',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              title: 'Alt-Text',
              type: 'string',
              description: 'Kurze Bildbeschreibung für SEO & Barrierefreiheit',
            },
            {
              name: 'credit',
              title: 'Photo Credit',
              type: 'string',
              description:
                'Pflicht bei Bildern aus Google Places (z.B. "Foto: Max Mustermann").',
            },
            {
              name: 'creditUrl',
              title: 'Photo Credit URL',
              type: 'url',
            },
          ],
        },
      ],
    },
    {
      name: 'lastReviewed',
      title: 'Zuletzt besucht',
      type: 'date',
      options: { dateFormat: 'DD.MM.YYYY' },
    },
    {
      name: 'reservationUrl',
      title: 'Reservation Link (Resy, OpenTable, etc.)',
      type: 'url',
    },
    {
      name: 'openingHours',
      title: 'Opening Hours',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'daySlot',
          fields: [
            {
              name: 'days',
              title: 'Days',
              type: 'string',
              description: 'e.g. "Mon–Fri" or "Saturday"',
            },
            {
              name: 'hours',
              title: 'Hours',
              type: 'string',
              description: 'e.g. "12:00–22:00" or "closed"',
            },
          ],
          preview: {
            select: { title: 'days', subtitle: 'hours' },
          },
        },
      ],
    },
    {
      name: 'tip',
      title: 'Insider Tip',
      type: 'string',
      description: 'Short recommendation shown in the map popup',
    },
    {
      name: 'tipEn',
      title: 'Insider Tip (EN)',
      type: 'string',
      description: 'Optional EN override. Leave empty to fall back to German.',
    },
  ],
  preview: {
    select: { title: 'name', subtitle: 'district' },
  },
}
