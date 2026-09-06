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
      description: 'Das Schaufenster: rund 10 Karten liegen ohne Konto offen, damit überhaupt zu sehen ist, was eine Karte ist. Höchstens eine pro Lokal — die zweite bleibt verdeckt, sonst gibt es dort nichts mehr zu holen.',
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
