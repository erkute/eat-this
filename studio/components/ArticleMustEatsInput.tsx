import {useEffect, useMemo, useState} from 'react'
import {Badge, Card, Flex, Spinner, Stack, Switch, Text} from '@sanity/ui'
import {insert, setIfMissing, unset, useClient, useFormValue, type ArrayOfObjectsInputProps} from 'sanity'
import {addArticleMustEats} from '../../nextjs/lib/article-must-eats'
import {liveRestaurant} from '../../nextjs/lib/sanity-filters'

type Block = {_type: string; _key?: string} & Record<string, unknown>
type Ref = {_key: string; _ref: string}

interface Candidate {
  _id: string
  order?: number
  restaurant: {_id: string; name: string; slug: string; district?: string}
}

// Dieselbe Liste, aus der die Website die Karten setzt (mapMustEatsQuery):
// veröffentlicht, Spot im Katalog.
const CARDS_QUERY = `*[_type == "mustEat" && ${liveRestaurant('restaurantRef->')}] | order(order asc, _id asc) {
  _id, order,
  "restaurant": restaurantRef->{_id, name, "slug": slug.current, district}
}`

/** Rohe Blöcke in die Form bringen, die die Website nach ihrer Abfrage sieht. */
function resolved(blocks: Block[] | undefined, slugs: Map<string, string>): Block[] {
  return (blocks ?? []).map((block) => {
    const ref = (block as {restaurantRef?: {_ref?: string}; mustEatRef?: {_ref?: string}})
    if (block._type === 'spotCard') return {...block, restaurantSlug: slugs.get(ref.restaurantRef?._ref ?? '')}
    if (block._type === 'mustEatCard') return {...block, mustEatId: ref.mustEatRef?._ref}
    return block
  })
}

function autoPlaced(blocks: Block[], cards: Candidate[], title: string): Set<string> {
  if (!blocks.length) return new Set()
  return new Set(
    addArticleMustEats(blocks, cards, title)
      .filter((b) => typeof b._key === 'string' && b._key.startsWith('auto-must-eat-'))
      .map((b) => b.mustEatId as string),
  )
}

function placedByHand(blocks: Block[] | undefined): Set<string> {
  return new Set(
    (blocks ?? []).flatMap((b) => {
      const ref = (b as {mustEatRef?: {_ref?: string}}).mustEatRef?._ref
      return b._type === 'mustEatCard' && ref ? [ref] : []
    }),
  )
}

const languages = (de: boolean, en: boolean) => [de && 'Deutsch', en && 'Englisch'].filter(Boolean).join(' und ')

/**
 * Die Website setzt Must Eats von selbst in den Text, sobald ein Spot mit
 * Must Eat genannt oder verlinkt ist. Hier stehen diese Karten, jede mit
 * einem Schalter; ausgeschaltete landen in `hiddenMustEats`. Von Hand
 * eingefügte Must-Eat-Blöcke stehen mit dabei: Sie erscheinen immer und
 * gehen nur weg, wenn der Block aus dem Text gelöscht wird.
 */
export function ArticleMustEatsInput(props: ArrayOfObjectsInputProps) {
  const client = useClient({apiVersion: '2024-01-01'})
  const contentDe = useFormValue(['contentDe']) as Block[] | undefined
  const content = useFormValue(['content']) as Block[] | undefined
  const titleDe = (useFormValue(['titleDe']) as string | undefined) ?? ''
  const title = (useFormValue(['title']) as string | undefined) || titleDe
  const hidden = useMemo(() => (props.value ?? []) as Ref[], [props.value])

  const [cards, setCards] = useState<Candidate[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    client
      .withConfig({perspective: 'published'})
      .fetch<Candidate[]>(CARDS_QUERY)
      .then((list) => !cancelled && setCards(list.filter((c) => c.restaurant?.name && c.restaurant.slug)))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [client])

  const slugs = useMemo(() => {
    const map = new Map<string, string>()
    for (const card of cards ?? []) map.set(card.restaurant._id, card.restaurant.slug)
    return map
  }, [cards])

  // Spot-Blöcke zu Spots ohne Must Eat stehen nicht in `slugs` — sie können
  // auch keine Karte auslösen.
  const rows = useMemo(() => {
    if (!cards) return []
    const de = autoPlaced(resolved(contentDe, slugs), cards, titleDe)
    const en = autoPlaced(resolved(content, slugs), cards, title)
    const handDe = placedByHand(contentDe)
    const handEn = placedByHand(content)
    const hiddenIds = new Set(hidden.map((r) => r._ref))
    return cards
      .filter((c) => [de, en, handDe, handEn, hiddenIds].some((set) => set.has(c._id)))
      .map((card) => ({
        card,
        auto: languages(de.has(card._id), en.has(card._id)),
        hand: languages(handDe.has(card._id), handEn.has(card._id)),
        shown: !hiddenIds.has(card._id),
      }))
  }, [cards, contentDe, content, slugs, titleDe, title, hidden])

  const toggle = (id: string, show: boolean) => {
    if (show) {
      const ref = hidden.find((r) => r._ref === id)
      if (ref) props.onChange(unset([{_key: ref._key}]))
    } else {
      props.onChange([
        setIfMissing([]),
        insert([{_type: 'reference', _ref: id, _key: id, _weak: true}], 'after', [-1]),
      ])
    }
  }

  if (error) return <Text size={1}>Must Eats ließen sich nicht laden: {error}</Text>
  if (!cards) return <Spinner muted />
  if (!rows.length) {
    return (
      <Card padding={3} radius={2} tone="transparent" border>
        <Text size={1} muted>
          Keine Must Eats im Text. Sie kommen von selbst, sobald ein Spot mit Must Eat genannt oder als Spot eingefügt ist. Oder im Text über „Must Eat“ einfügen.
        </Text>
      </Card>
    )
  }
  return (
    <Stack gap={2}>
      {rows.map(({card, auto, hand, shown}) => {
        // Der Schalter regelt nur das automatische Einsetzen. Steht die Karte
        // von Hand im Text, setzt die Website sie dort nicht noch einmal ein.
        const switchable = Boolean(auto) || !hand
        const lines = [
          hand && `Von Hand im Text (${hand}).`,
          auto && (shown ? `Kommt von selbst in den Text (${auto}).` : `Ausgeblendet. Käme sonst von selbst in den Text (${auto}).`),
          !auto && !shown && !hand && 'Ausgeblendet. Kommt im Text gerade nicht vor.',
        ].filter(Boolean)
        const visible = Boolean(hand) || (Boolean(auto) && shown)
        return (
          <Card key={card._id} padding={3} radius={2} border tone={visible ? 'default' : 'transparent'}>
            <Flex align="center" gap={3}>
              {switchable ? (
                <Switch
                  checked={shown}
                  onChange={(e) => toggle(card._id, e.currentTarget.checked)}
                  aria-label={`Must Eat bei ${card.restaurant.name} von selbst einsetzen`}
                />
              ) : null}
              <Stack flex={1} gap={2}>
                <Text size={1} weight="semibold" muted={!visible}>
                  {card.restaurant.name}
                  {card.restaurant.district ? ` · ${card.restaurant.district}` : ''}
                </Text>
                {lines.map((line) => (
                  <Text key={line as string} size={1} muted>
                    {line}
                  </Text>
                ))}
              </Stack>
              {typeof card.order === 'number' ? <Badge>Karte {card.order}</Badge> : null}
            </Flex>
          </Card>
        )
      })}
    </Stack>
  )
}
