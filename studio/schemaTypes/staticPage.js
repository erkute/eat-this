import {DocumentIcon} from '@sanity/icons'

const body = (title) => ({
  title,
  type: 'array',
  of: [
    {
      type: 'block',
      styles: [
        {title: 'Fließtext', value: 'normal'},
        {title: 'Überschrift H2', value: 'h2'},
        {title: 'Überschrift H3', value: 'h3'},
        {title: 'Zitat', value: 'blockquote'},
      ],
      marks: {
        decorators: [
          {title: 'Fett', value: 'strong'},
          {title: 'Kursiv', value: 'em'},
        ],
      },
    },
  ],
})

export default {
  name: 'staticPage',
  title: 'Seite',
  type: 'document',
  icon: DocumentIcon,
  groups: [
    {name: 'de', title: 'Deutsch', default: true},
    {name: 'en', title: 'Englisch'},
  ],
  fields: [
    {
      name: 'slug',
      title: 'Adresse der Seite',
      type: 'slug',
      description: 'z. B. impressum, about, datenschutz. Nicht ändern — die Website sucht die Seite darüber.',
      options: {source: 'title'},
      validation: (Rule) => Rule.required(),
    },
    {name: 'titleDe', title: 'Titel', type: 'string', group: 'de'},
    {name: 'bodyDe', ...body('Text'), group: 'de'},
    {name: 'title', title: 'Titel', type: 'string', group: 'en', validation: (Rule) => Rule.required()},
    {name: 'body', ...body('Text'), group: 'en'},
  ],
  preview: {
    select: {title: 'titleDe', fallback: 'title', slug: 'slug.current'},
    prepare: ({title, fallback, slug}) => ({title: title || fallback, subtitle: slug ? `/${slug}` : undefined}),
  },
}
