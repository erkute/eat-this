import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'waitlistSignup',
  title: 'Waitlist Signup',
  type: 'document',
  fields: [
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: Rule => Rule.required().email(),
    }),
    defineField({
      name: 'packType',
      title: 'Pack Type',
      type: 'string',
      options: {
        list: [
          {title: 'Category Packs (€2,99)', value: 'category'},
          {title: 'Complete Berlin (€20)', value: 'complete'},
        ],
        layout: 'radio',
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'locale',
      title: 'Locale',
      type: 'string',
      options: {
        list: [
          {title: 'Deutsch', value: 'de'},
          {title: 'English', value: 'en'},
        ],
      },
    }),
    defineField({
      name: 'userAgent',
      title: 'User Agent',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  preview: {
    select: {email: 'email', packType: 'packType', createdAt: 'createdAt'},
    prepare: ({email, packType, createdAt}) => ({
      title: email,
      subtitle: `${packType} · ${createdAt ? new Date(createdAt).toLocaleDateString() : ''}`,
    }),
  },
  orderings: [
    {
      title: 'Created (newest first)',
      name: 'createdAtDesc',
      by: [{field: 'createdAt', direction: 'desc'}],
    },
  ],
})
