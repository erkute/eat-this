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

/**
 * Die Website setzt Must Eats von selbst in den Text, sobald ein Spot mit
 * Must Eat genannt oder verlinkt ist. Hier stehen diese Karten, jede mit
 * einem Schalter; ausgeschaltete landen in `hiddenMustEats`.
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
    const hiddenIds = new Set(hidden.map((r) => r._ref))
    return cards
      .filter((c) => de.has(c._id) || en.has(c._id) || hiddenIds.has(c._id))
      .map((card) => ({card, de: de.has(card._id), en: en.has(card._id), shown: !hiddenIds.has(card._id)}))
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
          Keine Must Eats im Text. Sie kommen von selbst, sobald ein Spot mit Must Eat genannt oder als Spot eingefügt ist.
        </Text>
      </Card>
    )
  }
  return (
    <Stack gap={2}>
      {rows.map(({card, de, en, shown}) => {
        const where = [de && 'Deutsch', en && 'Englisch'].filter(Boolean).join(' und ')
        return (
          <Card key={card._id} padding={3} radius={2} border tone={shown ? 'default' : 'transparent'}>
            <Flex align="center" gap={3}>
              <Switch
                checked={shown}
                onChange={(e) => toggle(card._id, e.currentTarget.checked)}
                aria-label={`Must Eat bei ${card.restaurant.name} zeigen`}
              />
              <Stack flex={1} gap={2}>
                <Text size={1} weight="semibold" muted={!shown}>
                  {card.restaurant.name}
                  {card.restaurant.district ? ` · ${card.restaurant.district}` : ''}
                </Text>
                <Text size={1} muted>
                  {shown
                    ? `Steht im Text (${where}).`
                    : where
                      ? `Ausgeblendet. Würde sonst im Text stehen (${where}).`
                      : 'Ausgeblendet. Kommt im Text gerade nicht vor.'}
                </Text>
              </Stack>
              {typeof card.order === 'number' ? <Badge>Karte {card.order}</Badge> : null}
            </Flex>
          </Card>
        )
      })}
    </Stack>
  )
}
