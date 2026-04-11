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
  ],
  preview: {
    select: { title: 'name', subtitle: 'district' },
  },
}
