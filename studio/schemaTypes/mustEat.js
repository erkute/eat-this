export default {
  name: 'mustEat',
  title: 'Must Eat',
  type: 'document',
  fields: [
    {
      name: 'dish',
      title: 'Dish Name',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'restaurantRef',
      title: 'Restaurant',
      type: 'reference',
      to: [{type: 'restaurant'}],
      validation: Rule => Rule.required(),
    },
    {
      name: 'district',
      title: 'Bezirk',
      type: 'string',
    },
    {
      name: 'price',
      title: 'Preis',
      type: 'string',
      description: 'z.B. €, €€, €€€',
    },
    {
      name: 'description',
      title: 'Beschreibung (DE)',
      type: 'text',
      rows: 2,
      description: 'Kurze Beschreibung des Gerichts auf Deutsch (Standard, wird DE-Besuchern gezeigt)',
    },
    {
      name: 'descriptionEn',
      title: 'Beschreibung (EN)',
      type: 'text',
      rows: 2,
      description: 'English description — shown to EN visitors (falls back to DE if empty)',
    },
    {
      name: 'image',
      title: 'Card Image',
      type: 'image',
      options: { hotspot: true },
      validation: Rule => Rule.required(),
    },
    {
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Lower number = shown first',
    },
    {
      name: 'revealedForAnon',
      title: 'Anon-Demo — offen sichtbar ohne Login',
      type: 'boolean',
      initialValue: false,
      description: 'Anhaken bei genau ~10 Must-Eats, verteilt über die Anon-Tier-Restaurants. Diese werden auf der Map offen gezeigt für anonyme Besucher als Vorgeschmack auf das Reveal-Spiel. Pflicht: nur auf Restaurants mit tierAnon: true setzen.',
    },
  ],
  orderings: [
    {
      title: 'Display Order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'dish', subtitle: 'restaurantRef.name', media: 'image' },
  },
}
