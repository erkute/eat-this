import {useCallback, useEffect, useMemo, useState} from 'react'
import {Card, Checkbox, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {set, unset, useClient, type ArrayOfObjectsInputProps} from 'sanity'

/**
 * Custom array input that replaces Sanity's default "Add item" reference-array
 * UI with a checkbox list of every `category` document. Toggling a box
 * adds/removes a `{_type:'reference', _ref}` entry. Lets editors curate
 * categories at the same speed as the legacy `options.list` string array.
 */

interface CategoryDoc {
  _id: string
  name: string
  nameEn: string | null
  slug: string
}

interface ReferenceItem {
  _key?: string
  _type: 'reference'
  _ref: string
}

const CATEGORY_QUERY = `*[_type == "category"] | order(coalesce(nameEn, name) asc) {
  _id,
  name,
  nameEn,
  "slug": slug.current
}`

function makeKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  }
  return Math.random().toString(36).slice(2, 14)
}

export function CategoryCheckboxInput(props: ArrayOfObjectsInputProps) {
  const {value, onChange} = props
  const client = useClient({apiVersion: '2024-01-01'})
  const [cats, setCats] = useState<CategoryDoc[] | null>(null)

  useEffect(() => {
    let cancelled = false
    client
      .fetch<CategoryDoc[]>(CATEGORY_QUERY)
      .then((rows) => {
        if (!cancelled) setCats(rows)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[CategoryCheckboxInput] fetch failed:', err)
          setCats([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [client])

  const items = useMemo(() => (value as ReferenceItem[] | undefined) ?? [], [value])
  const checkedIds = useMemo(() => new Set(items.map((v) => v._ref)), [items])

  const toggle = useCallback(
    (id: string) => {
      if (checkedIds.has(id)) {
        const next = items.filter((v) => v._ref !== id)
        onChange(next.length ? set(next) : unset())
      } else {
        const next: ReferenceItem[] = [
          ...items,
          {_key: makeKey(), _type: 'reference', _ref: id},
        ]
        onChange(set(next))
      }
    },
    [items, checkedIds, onChange],
  )

  if (!cats) {
    return (
      <Card padding={3} radius={2} tone="transparent">
        <Spinner muted />
      </Card>
    )
  }

  if (cats.length === 0) {
    return (
      <Card padding={3} radius={2} tone="caution">
        <Text size={1}>
          Noch keine Kategorien angelegt — leg zuerst Einträge unter „Kategorien“ an.
        </Text>
      </Card>
    )
  }

  return (
    <Stack space={2}>
      {cats.map((c) => {
        const checked = checkedIds.has(c._id)
        const showEn = c.nameEn && c.nameEn !== c.name
        return (
          <Flex
            key={c._id}
            as="label"
            align="center"
            gap={3}
            paddingY={1}
            style={{cursor: 'pointer'}}
          >
            <Checkbox checked={checked} onChange={() => toggle(c._id)} />
            <Text size={2}>
              {c.name}
              {showEn ? (
                <Text as="span" size={1} muted style={{marginLeft: 8}}>
                  · {c.nameEn}
                </Text>
              ) : null}
            </Text>
          </Flex>
        )
      })}
    </Stack>
  )
}
