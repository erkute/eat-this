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
      name: 'restaurant',
      title: 'Restaurant (alt)',
      type: 'string',
      hidden: true,
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
      title: 'Beschreibung',
      type: 'text',
      rows: 2,
      description: 'Kurze Beschreibung des Gerichts',
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
