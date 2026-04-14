export default {
  name: 'cardPack',
  title: 'Card Pack',
  type: 'document',
  fields: [
    { name: 'title',   title: 'Title (EN)', type: 'string', validation: Rule => Rule.required() },
    { name: 'titleDe', title: 'Title (DE)', type: 'string', description: 'Falls back to EN if empty.' },
    {
      name: 'slug', title: 'Pack ID (slug)', type: 'slug',
      options: { source: 'title' }, validation: Rule => Rule.required(),
      description: 'Firestore document ID. E.g. "starter", "newsletter", "premium-1".',
    },
    {
      name: 'packType', title: 'Pack Type', type: 'string',
      options: { list: [
        { title: 'Starter (auto-unlock on signup)', value: 'starter' },
        { title: 'Newsletter', value: 'newsletter' },
        { title: 'Premium (paid)', value: 'premium' },
      ]},
      validation: Rule => Rule.required(),
    },
    { name: 'coverImage', title: 'Cover Image', type: 'image', options: { hotspot: true }, description: 'Shown on locked booster pack cards.' },
    { name: 'price', title: 'Price (EUR)', type: 'number', description: 'Premium packs only.' },
    {
      name: 'cards', title: 'Cards', type: 'array',
      of: [{
        type: 'object', name: 'cardItem', title: 'Card',
        fields: [
          { name: 'image', title: 'Card Image', type: 'image', options: { hotspot: true }, validation: Rule => Rule.required() },
          { name: 'dish',       title: 'Dish (metadata)',        type: 'string' },
          { name: 'restaurant', title: 'Restaurant (metadata)',  type: 'string' },
          { name: 'district',   title: 'District (metadata)',    type: 'string' },
          { name: 'price',      title: 'Price Range (metadata)', type: 'string' },
        ],
        preview: {
          select: { title: 'dish', subtitle: 'restaurant', media: 'image' },
          prepare: ({ title, subtitle, media }) => ({ title: title || 'Card', subtitle: subtitle || '', media }),
        },
      }],
    },
    { name: 'order', title: 'Display Order', type: 'number', description: 'Lower = shown first.' },
  ],
  orderings: [{ title: 'Display Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'packType', media: 'coverImage' } },
}
