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
      name: 'district',
      title: 'District',
      type: 'string',
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
      of: [{ type: 'string' }],
      options: {
        list: ['Dinner', 'Lunch', 'Breakfast', 'Coffee', 'Sweets', 'Pizza'],
      },
    },
    {
      name: 'price',
      title: 'Price Range',
      type: 'string',
      options: { list: ['€', '€€', '€€€', '€€€€'], layout: 'radio' },
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
      name: 'website',
      title: 'Website',
      type: 'url',
    },
    {
      name: 'image',
      title: 'Photo',
      type: 'image',
      options: { hotspot: true },
    },
  ],
  preview: {
    select: { title: 'name', subtitle: 'district' },
  },
}
