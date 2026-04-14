export default {
  name: 'staticPage',
  title: 'Static Page',
  type: 'document',
  fields: [
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'e.g. "impressum", "about", "datenschutz"',
      options: { source: 'title' },
      validation: Rule => Rule.required()
    },
    { name: 'title',   title: 'Title (EN)',    type: 'string', validation: Rule => Rule.required() },
    { name: 'titleDe', title: 'Title (DE)',    type: 'string' },
    {
      name: 'body',
      title: 'Content (EN)',
      type: 'array',
      of: [{
        type: 'block',
        styles: [
          { title: 'Normal',    value: 'normal' },
          { title: 'Heading 2', value: 'h2' },
          { title: 'Heading 3', value: 'h3' },
        ],
        marks: {
          decorators: [
            { title: 'Bold',   value: 'strong' },
            { title: 'Italic', value: 'em' },
          ]
        }
      }]
    },
    {
      name: 'bodyDe',
      title: 'Content (DE)',
      type: 'array',
      of: [{
        type: 'block',
        styles: [
          { title: 'Normal',    value: 'normal' },
          { title: 'Heading 2', value: 'h2' },
          { title: 'Heading 3', value: 'h3' },
        ],
        marks: {
          decorators: [
            { title: 'Bold',   value: 'strong' },
            { title: 'Italic', value: 'em' },
          ]
        }
      }]
    }
  ],
  preview: {
    select: { title: 'title', subtitle: 'slug.current' }
  }
}
