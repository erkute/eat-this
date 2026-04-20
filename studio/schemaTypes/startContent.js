import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'startContent',
  title: 'Startseite',
  type: 'document',
  groups: [
    {name: 's1', title: '① Intro'},
    {name: 's2', title: '② Konzept'},
    {name: 'philo', title: '③ Standards'},
    {name: 's5', title: '④ Wie wir auswählen'},
    {name: 's6', title: '⑤ Ausblick'},
  ],
  fields: [
    // ── Section 1: Intro ──────────────────────────────────────────────────────
    defineField({name: 's1LabelEn', title: 'Label (EN)', type: 'string', group: 's1'}),
    defineField({name: 's1LabelDe', title: 'Label (DE)', type: 'string', group: 's1'}),
    defineField({name: 's1TitleEn', title: 'Überschrift (EN)', type: 'string', group: 's1'}),
    defineField({name: 's1TitleDe', title: 'Überschrift (DE)', type: 'string', group: 's1'}),
    defineField({name: 's1BodyEn', title: 'Text (EN)', type: 'text', rows: 3, group: 's1'}),
    defineField({name: 's1BodyDe', title: 'Text (DE)', type: 'text', rows: 3, group: 's1'}),

    // ── Section 2: Konzept ────────────────────────────────────────────────────
    defineField({name: 's2LabelEn', title: 'Label (EN)', type: 'string', group: 's2'}),
    defineField({name: 's2LabelDe', title: 'Label (DE)', type: 'string', group: 's2'}),
    defineField({name: 's2TitleEn', title: 'Überschrift (EN)', type: 'string', group: 's2'}),
    defineField({name: 's2TitleDe', title: 'Überschrift (DE)', type: 'string', group: 's2'}),
    defineField({name: 's2Body1En', title: 'Absatz 1 (EN)', type: 'text', rows: 3, group: 's2'}),
    defineField({name: 's2Body1De', title: 'Absatz 1 (DE)', type: 'text', rows: 3, group: 's2'}),
    defineField({name: 's2Body2En', title: 'Absatz 2 (EN)', type: 'text', rows: 3, group: 's2'}),
    defineField({name: 's2Body2De', title: 'Absatz 2 (DE)', type: 'text', rows: 3, group: 's2'}),

    // ── Section 3: Philosophy ─────────────────────────────────────────────────
    defineField({name: 'philoLabelEn', title: 'Label (EN)', type: 'string', group: 'philo'}),
    defineField({name: 'philoLabelDe', title: 'Label (DE)', type: 'string', group: 'philo'}),
    defineField({name: 'philo1TitleEn', title: '01 Titel (EN)', type: 'string', group: 'philo'}),
    defineField({name: 'philo1TitleDe', title: '01 Titel (DE)', type: 'string', group: 'philo'}),
    defineField({name: 'philo1TextEn', title: '01 Text (EN)', type: 'text', rows: 2, group: 'philo'}),
    defineField({name: 'philo1TextDe', title: '01 Text (DE)', type: 'text', rows: 2, group: 'philo'}),
    defineField({name: 'philo2TitleEn', title: '02 Titel (EN)', type: 'string', group: 'philo'}),
    defineField({name: 'philo2TitleDe', title: '02 Titel (DE)', type: 'string', group: 'philo'}),
    defineField({name: 'philo2TextEn', title: '02 Text (EN)', type: 'text', rows: 2, group: 'philo'}),
    defineField({name: 'philo2TextDe', title: '02 Text (DE)', type: 'text', rows: 2, group: 'philo'}),
    defineField({name: 'philo3TitleEn', title: '03 Titel (EN)', type: 'string', group: 'philo'}),
    defineField({name: 'philo3TitleDe', title: '03 Titel (DE)', type: 'string', group: 'philo'}),
    defineField({name: 'philo3TextEn', title: '03 Text (EN)', type: 'text', rows: 2, group: 'philo'}),
    defineField({name: 'philo3TextDe', title: '03 Text (DE)', type: 'text', rows: 2, group: 'philo'}),

    // ── Section 5: Wie wir auswählen ──────────────────────────────────────────
    defineField({name: 's5LabelEn', title: 'Label (EN)', type: 'string', group: 's5'}),
    defineField({name: 's5LabelDe', title: 'Label (DE)', type: 'string', group: 's5'}),
    defineField({name: 's5TitleEn', title: 'Überschrift (EN)', type: 'string', group: 's5'}),
    defineField({name: 's5TitleDe', title: 'Überschrift (DE)', type: 'string', group: 's5'}),
    defineField({name: 's5BodyEn', title: 'Text (EN)', type: 'text', rows: 3, group: 's5'}),
    defineField({name: 's5BodyDe', title: 'Text (DE)', type: 'text', rows: 3, group: 's5'}),

    // ── Section 6: Ausblick ───────────────────────────────────────────────────
    defineField({name: 's6LabelEn', title: 'Label (EN)', type: 'string', group: 's6'}),
    defineField({name: 's6LabelDe', title: 'Label (DE)', type: 'string', group: 's6'}),
    defineField({name: 's6TitleEn', title: 'Überschrift (EN)', type: 'string', group: 's6'}),
    defineField({name: 's6TitleDe', title: 'Überschrift (DE)', type: 'string', group: 's6'}),
    defineField({name: 's6BodyEn', title: 'Text (EN)', type: 'text', rows: 3, group: 's6'}),
    defineField({name: 's6BodyDe', title: 'Text (DE)', type: 'text', rows: 3, group: 's6'}),
    defineField({name: 's6CitiesEn', title: 'Städte-Zeile (EN)', type: 'string', group: 's6'}),
    defineField({name: 's6CitiesDe', title: 'Städte-Zeile (DE)', type: 'string', group: 's6'}),
  ],
  preview: {
    prepare() {
      return {title: 'Startseite'}
    },
  },
})
