import {StarIcon} from '@sanity/icons'
import {MustEatCardInput} from '../components/MustEatCardInput'

// Nur die öffentliche Hülle der Karte: Gericht und Bild liegen privat in
// Firestore (`privateMustEats/<id>`) und Storage, nicht hier. Gepflegt
// werden sie im Formular darunter (MustEatCardInput), über die App.
export default {
  name: 'mustEat',
  title: 'Must Eat',
  type: 'document',
  icon: StarIcon,
  components: {input: MustEatCardInput},
  // Neue Karte bekommt die nächste freie Nummer.
  initialValue: async (_params, {getClient}) => {
    const highest = await getClient({apiVersion: '2024-01-01'}).fetch('math::max(*[_type == "mustEat"].order)')
    return {order: (highest ?? 0) + 1, revealedForAnon: false}
  },
  fields: [
    {
      name: 'restaurantRef',
      title: 'Spot',
      type: 'reference',
      to: [{type: 'restaurant'}],
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'order',
      title: 'Kartennummer',
      type: 'number',
      description: 'Steht auf der Karte und bestimmt die Reihenfolge im Stapel.',
    },
    {
      name: 'revealedForAnon',
      title: 'Ohne Konto offen',
      type: 'boolean',
      initialValue: false,
      description:
        'Das Schaufenster: rund 10 Karten liegen ohne Konto offen, damit zu sehen ist, was eine Karte ist. Höchstens eine pro Spot — die zweite bleibt verdeckt, sonst gibt es dort nichts mehr zu holen.',
    },
  ],
  orderings: [{title: 'Kartennummer', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]}],
  preview: {
    select: {
      restaurant: 'restaurantRef.name',
      order: 'order',
      media: 'restaurantRef.image',
      open: 'revealedForAnon',
    },
    prepare({restaurant, order, media, open}) {
      return {
        title: restaurant || 'Must Eat ohne Spot',
        subtitle: [typeof order === 'number' ? `Karte ${order}` : null, open ? 'ohne Konto offen' : null]
          .filter(Boolean)
          .join(' · '),
        media: media || StarIcon,
      }
    },
  },
}
