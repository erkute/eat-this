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
      name: 'restaurant',
      title: 'Restaurant',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'district',
      title: 'District',
      type: 'string',
    },
    {
      name: 'price',
      title: 'Price Range',
      type: 'string',
      description: 'E.g. €, €€, €€€',
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
    select: { title: 'dish', subtitle: 'restaurant', media: 'image' },
  },
}
