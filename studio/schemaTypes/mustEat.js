export default {
  name: 'mustEat',
  title: 'Must Eat',
  type: 'document',
  fields: [
    {
      name: 'restaurantRef',
      title: 'Restaurant',
      type: 'reference',
      to: [{type: 'restaurant'}],
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
    select: { restaurant: 'restaurantRef.name', order: 'order' },
    prepare({restaurant, order}) {
      return {
        title: restaurant ? `Must Eat · ${restaurant}` : 'Must Eat',
        subtitle: typeof order === 'number' ? `Reihenfolge ${order}` : undefined,
      }
    },
  },
}
