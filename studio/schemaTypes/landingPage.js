import {defineField, defineType} from 'sanity'

// ── helper: paired DE/EN string fields ─────────────────────────────
const pair = (base, titleBase, opts = {}) => [
  defineField({
    name: `${base}De`,
    title: `${titleBase} (DE)`,
    type: opts.type || 'string',
    ...(opts.rows ? {rows: opts.rows} : {}),
    validation: opts.required ? Rule => Rule.required() : undefined,
  }),
  defineField({
    name: `${base}En`,
    title: `${titleBase} (EN)`,
    type: opts.type || 'string',
    ...(opts.rows ? {rows: opts.rows} : {}),
    validation: opts.required ? Rule => Rule.required() : undefined,
  }),
]

// ── helper: array-of-strings DE/EN pair ────────────────────────────
const pairList = (base, titleBase, min, max) => [
  defineField({
    name: `${base}De`,
    title: `${titleBase} (DE)`,
    type: 'array',
    of: [{type: 'string'}],
    validation: Rule => Rule.required().min(min).max(max),
  }),
  defineField({
    name: `${base}En`,
    title: `${titleBase} (EN)`,
    type: 'array',
    of: [{type: 'string'}],
    validation: Rule => Rule.required().min(min).max(max),
  }),
]

export default defineType({
  name: 'landingPage',
  title: 'Landing Page',
  type: 'document',
  // Singleton — only one document of this type is editable. Pinned in sanity.config.js.
  fields: [
    // ── Hero ─────────────────────────────────────────────────────────
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      options: {collapsible: true, collapsed: false},
      fields: [
        ...pair('headline', 'Headline (visually hidden, used for SEO H1)', {required: true}),
        ...pair('body', 'Body', {type: 'text', rows: 3, required: true}),
        ...pair('ctaLabel', 'CTA Label', {required: true}),
        defineField({name: 'ctaHref', title: 'CTA Href', type: 'string', initialValue: '/'}),
        defineField({name: 'image', title: 'Hero Image (optional)', type: 'image', options: {hotspot: true, accept: 'image/*'}}),
      ],
    }),

    // ── Trust Bar ────────────────────────────────────────────────────
    defineField({
      name: 'trustBar',
      title: 'Trust Bar',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        ...pair('line', 'Line — use {count} for live restaurant total', {required: true}),
      ],
    }),

    // ── Map Preview ──────────────────────────────────────────────────
    defineField({
      name: 'mapPreview',
      title: 'Map Preview',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        ...pair('headline', 'Headline', {required: true}),
        ...pair('body', 'Body', {type: 'text', rows: 4, required: true}),
        defineField({name: 'screenshot', title: 'Screenshot (optional)', type: 'image', options: {hotspot: true, accept: 'image/*'}}),
      ],
    }),

    // ── Must Eats ────────────────────────────────────────────────────
    defineField({
      name: 'mustEats',
      title: 'Must Eats',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        ...pair('headline', 'Headline', {required: true}),
        ...pair('body', 'Body', {type: 'text', rows: 4, required: true}),
        ...pair('ctaLabel', 'CTA Label'),
        defineField({name: 'ctaHref', title: 'CTA Href', type: 'string', initialValue: '/onboarding'}),
      ],
    }),

    // ── How We Curate ────────────────────────────────────────────────
    defineField({
      name: 'howWeCurate',
      title: 'How We Curate',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        ...pair('headline', 'Headline', {required: true}),
        ...pair('body', 'Body', {type: 'text', rows: 3, required: true}),
      ],
    }),

    // ── Inside The Map ───────────────────────────────────────────────
    defineField({
      name: 'insideMap',
      title: 'Inside The Map',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        ...pair('headline', 'Headline', {required: true}),
        ...pairList('items', 'Bullet Items', 1, 8),
        defineField({
          name: 'screenshots',
          title: 'Screenshots (optional, 3 — Umgebung, Filter, Restaurant-Sheet)',
          type: 'array',
          of: [{type: 'image', options: {hotspot: true, accept: 'image/*'}}],
          validation: Rule => Rule.max(3),
        }),
      ],
    }),

    // ── Categories ───────────────────────────────────────────────────
    defineField({
      name: 'categories',
      title: 'Categories Section',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        ...pair('headline', 'Headline', {required: true}),
      ],
    }),

    // ── Recently Added ───────────────────────────────────────────────
    defineField({
      name: 'recentlyAdded',
      title: 'Recently Added',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        ...pair('headline', 'Headline', {required: true}),
        ...pair('body', 'Body', {type: 'text', rows: 2}),
        ...pair('sectionCtaLabel', 'Section CTA Label'),
      ],
    }),

    // ── Packs ────────────────────────────────────────────────────────
    defineField({
      name: 'packs',
      title: 'Packs Section',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        ...pair('headline', 'Headline', {required: true}),
        ...pair('body', 'Body', {type: 'text', rows: 4}),
        // Starter
        defineField({
          name: 'starter',
          title: 'Starter Pack (Free, real)',
          type: 'object',
          fields: [
            ...pair('title', 'Title', {required: true}),
            ...pair('body', 'Body', {type: 'text', rows: 2}),
            ...pair('ctaLabel', 'CTA Label'),
            defineField({name: 'image', title: 'Image (optional)', type: 'image', options: {hotspot: true}}),
          ],
        }),
        // Category Packs
        defineField({
          name: 'category',
          title: 'Category Packs (€2,99, waitlist)',
          type: 'object',
          fields: [
            ...pair('title', 'Title', {required: true}),
            ...pair('body', 'Body', {type: 'text', rows: 2}),
            ...pairList('bullets', 'Category Bullets', 1, 12),
            ...pair('ctaLabel', 'CTA Label'),
            defineField({name: 'image', title: 'Image (optional)', type: 'image', options: {hotspot: true}}),
          ],
        }),
        // Complete Berlin
        defineField({
          name: 'complete',
          title: 'Complete Berlin (€20, waitlist)',
          type: 'object',
          fields: [
            ...pair('title', 'Title', {required: true}),
            ...pair('body', 'Body', {type: 'text', rows: 2}),
            ...pairList('bullets', 'Value Bullets', 1, 6),
            ...pair('ctaLabel', 'CTA Label'),
            defineField({name: 'image', title: 'Image (optional)', type: 'image', options: {hotspot: true}}),
          ],
        }),
      ],
    }),

    // ── Why Eat This ─────────────────────────────────────────────────
    defineField({
      name: 'whyEatThis',
      title: 'Why Eat This',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        ...pair('headline', 'Headline', {required: true}),
        ...pair('body', 'Body', {type: 'text', rows: 3, required: true}),
      ],
    }),

    // ── Newsletter ───────────────────────────────────────────────────
    defineField({
      name: 'newsletter',
      title: 'Newsletter',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        ...pair('headline', 'Headline', {required: true}),
        ...pair('body', 'Body', {type: 'text', rows: 2, required: true}),
        ...pair('ctaLabel', 'CTA Label'),
      ],
    }),

    // ── Final CTA ────────────────────────────────────────────────────
    defineField({
      name: 'finalCta',
      title: 'Final CTA',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        ...pair('headline', 'Headline', {required: true}),
        ...pair('body', 'Body', {type: 'text', rows: 2}),
        ...pair('ctaLabel', 'CTA Label', {required: true}),
        defineField({name: 'ctaHref', title: 'CTA Href', type: 'string', initialValue: '/'}),
      ],
    }),
  ],

  preview: {
    prepare: () => ({title: 'Landing Page'}),
  },
})
