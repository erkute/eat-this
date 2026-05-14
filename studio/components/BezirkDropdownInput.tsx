import {useCallback, useEffect, useState} from 'react'
import {Card, Select, Spinner, Text} from '@sanity/ui'
import {set, unset, useClient, type ObjectInputProps} from 'sanity'

/**
 * Replaces Sanity's default autocomplete reference picker for `bezirkRef`
 * with a native dropdown over all bezirk documents. 20 Berliner Bezirke
 * make the search UI unnecessary friction.
 */

interface BezirkDoc {
  _id: string
  name: string
}

interface ReferenceValue {
  _type: 'reference'
  _ref?: string
}

const BEZIRK_QUERY = `*[_type == "bezirk"] | order(name asc) { _id, name }`

export function BezirkDropdownInput(props: ObjectInputProps) {
  const {onChange} = props
  const value = props.value as ReferenceValue | undefined
  const client = useClient({apiVersion: '2024-01-01'})
  const [bezirke, setBezirke] = useState<BezirkDoc[] | null>(null)

  useEffect(() => {
    let cancelled = false
    client
      .fetch<BezirkDoc[]>(BEZIRK_QUERY)
      .then((rows) => {
        if (!cancelled) setBezirke(rows)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[BezirkDropdownInput] fetch failed:', err)
          setBezirke([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [client])

  const onSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value
      if (!id) {
        onChange(unset())
      } else {
        onChange(set({_type: 'reference', _ref: id}))
      }
    },
    [onChange],
  )

  if (!bezirke) {
    return (
      <Card padding={3} radius={2} tone="transparent">
        <Spinner muted />
      </Card>
    )
  }

  if (bezirke.length === 0) {
    return (
      <Card padding={3} radius={2} tone="caution">
        <Text size={1}>
          Noch keine Bezirke angelegt — leg zuerst Einträge unter „Bezirke“ an.
        </Text>
      </Card>
    )
  }

  return (
    <Select value={value?._ref ?? ''} onChange={onSelect}>
      <option value="">— Bezirk wählen —</option>
      {bezirke.map((b) => (
        <option key={b._id} value={b._id}>
          {b.name}
        </option>
      ))}
    </Select>
  )
}
