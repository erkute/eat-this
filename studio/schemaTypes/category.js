import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'category',
  title: 'Kategorie',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name (Deutsch)',
      type: 'string',
      description: 'Anzeigename auf der DE-Site, z.B. "Café", "Frühstück", "Süßes".',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'nameEn',
      title: 'Name (English)',
      type: 'string',
      description: 'Anzeigename auf der EN-Site, z.B. "Coffee", "Breakfast", "Sweets".',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'nameEn', maxLength: 96},
      description: 'URL-Pfad (/kategorie/<slug>). Wird aus dem englischen Namen generiert.',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Beschreibung (Deutsch)',
      type: 'text',
      rows: 2,
      description: 'Kurzer Blurb für SEO + Hub-Seite. 1–2 Sätze.',
    }),
    defineField({
      name: 'descriptionEn',
      title: 'Description (English)',
      type: 'text',
      rows: 2,
      description: 'Short blurb for SEO + hub page. 1–2 sentences.',
    }),
    defineField({
      name: 'topSpots',
      title: 'Top-Spots (kuratierte Reihenfolge)',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'restaurant'}]}],
      validation: Rule => Rule.max(10).unique(),
      description:
        'Die besten Spots dieser Kategorie, in Reihenfolge — Platz 1 ganz oben, per Drag & Drop ' +
        'sortieren. Sie erscheinen als nummerierte Bestenliste über der A–Z-Liste. ' +
        'Leer lassen (oder unter 3 Einträge) = die Seite bleibt wie bisher rein alphabetisch.',
    }),
  ],
  // Kein `media`: die Vorschau hing an `homeImage`, und das Feld gibt es nicht
  // mehr. Es hielt die freigestellten Teller-Fotos und wurde von der App nie
  // gelesen — einziger Treffer im Code war das Import-Skript, das es befüllt
  // hat. Wo eine Kategorie wirklich ein Bild zeigt (Hub, Index, Boost, OG),
  // kommt es aus `lib/categoryArt.ts` bzw. `public/pics/og/` und hat mit dem
  // Dokument nichts zu tun.
  preview: {
    select: {title: 'name'},
  },
})
