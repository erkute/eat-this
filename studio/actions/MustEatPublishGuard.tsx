import {useEffect, useState} from 'react'
import {useClient, type DocumentActionComponent} from 'sanity'
import {MUST_EAT_CARD_SAVED, readMustEatCard} from '../lib/mustEatCard'

// Eine veröffentlichte Must Eat ohne Karte bei der App lässt die Map für
// alle stolpern, die sie offen sehen (die App liest Gericht und Bild dort
// und bricht ab, wenn sie fehlen). Deshalb geht „Veröffentlichen“ erst, wenn
// die Karte gespeichert ist und zum gewählten Spot gehört.

export function guardMustEatPublish(publish: DocumentActionComponent): DocumentActionComponent {
  const GuardedPublish: DocumentActionComponent = (props) => {
    const action = publish(props)
    const client = useClient({apiVersion: '2024-01-01'})
    const spot = (props.draft ?? props.published)?.restaurantRef as {_ref?: string} | undefined
    const spotId = spot?._ref
    const [problem, setProblem] = useState<string | null>('Karte wird geprüft …')
    const [checks, setChecks] = useState(0)

    useEffect(() => {
      const onSaved = (event: Event) => {
        if ((event as CustomEvent<string>).detail === props.id) setChecks((n) => n + 1)
      }
      window.addEventListener(MUST_EAT_CARD_SAVED, onSaved)
      return () => window.removeEventListener(MUST_EAT_CARD_SAVED, onSaved)
    }, [props.id])

    useEffect(() => {
      if (!spotId) {
        setProblem('Erst den Spot wählen.')
        return
      }
      let cancelled = false
      readMustEatCard(client, props.id, false)
        .then((card) => {
          if (cancelled) return
          if (!card.exists) setProblem('Erst die Karte speichern: Bild, Gericht und beide Beschreibungen.')
          else if (card.restaurantId !== spotId) setProblem('Die Karte gehört noch zum vorherigen Spot. Einmal „Karte speichern“.')
          else setProblem(null)
        })
        .catch((error: Error) => {
          if (!cancelled) setProblem(error.message)
        })
      return () => {
        cancelled = true
      }
    }, [client, props.id, spotId, checks])

    if (!action || !problem) return action
    return {...action, disabled: true, title: problem}
  }
  GuardedPublish.action = publish.action
  GuardedPublish.displayName = 'GuardedMustEatPublish'
  return GuardedPublish
}
