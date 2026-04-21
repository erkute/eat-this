import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'city',
  title: 'Stadt',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'name', maxLength: 96},
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'isLive',
      title: 'Live',
      type: 'boolean',
      initialValue: false,
      description: 'Stadt ist öffentlich zugänglich',
    }),
    defineField({
      name: 'comingSoon',
      title: 'Coming Soon',
      type: 'boolean',
      initialValue: false,
      description: 'Stadt wird bald veröffentlicht',
    }),
  ],
  preview: {
    select: {title: 'name', isLive: 'isLive'},
    prepare({title, isLive}) {
      return {title: `${isLive ? '🟢' : '⚪️'} ${title}`}
    },
  },
})
