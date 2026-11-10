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
    const version = (props.draft ?? props.published)?.cardVersion
    const [checks, setChecks] = useState(0)
    const key = JSON.stringify([props.id, spotId, version, checks])
    const [result, setResult] = useState<{key: string; problem: string | null} | null>(null)
    const problem = result?.key === key ? result.problem : 'Karte wird geprüft …'

    useEffect(() => {
      const onSaved = (event: Event) => {
        if ((event as CustomEvent<string>).detail === props.id) setChecks((n) => n + 1)
      }
      window.addEventListener(MUST_EAT_CARD_SAVED, onSaved)
      return () => window.removeEventListener(MUST_EAT_CARD_SAVED, onSaved)
    }, [props.id])

    useEffect(() => {
      const setProblem = (problem: string | null) => setResult({key, problem})
      if (!spotId) {
        setProblem('Erst den Spot wählen.')
        return
      }
      setProblem('Karte wird geprüft …')
      let cancelled = false
      readMustEatCard(client, props.id, false)
        .then((card) => {
          if (cancelled) return
          if (!card.exists) setProblem('Erst die Karte speichern: Bild, Gericht und beide Beschreibungen.')
          else if (card.restaurantId !== spotId) setProblem('Die Karte gehört noch zum vorherigen Spot. Einmal „Karte speichern“.')
          else if (card.version !== version) setProblem('Die Kartenfassung wird noch synchronisiert. Bitte erneut speichern.')
          else setProblem(null)
        })
        .catch((error: Error) => {
          if (!cancelled) setProblem(error.message)
        })
      return () => {
        cancelled = true
      }
    }, [client, props.id, spotId, version, key])

    if (!action || !problem) return action
    return {...action, disabled: true, title: problem}
  }
  GuardedPublish.action = publish.action
  GuardedPublish.displayName = 'GuardedMustEatPublish'
  return GuardedPublish
}
