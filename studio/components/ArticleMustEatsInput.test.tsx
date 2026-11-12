import {cleanup, render, screen} from '@testing-library/react'
import {ThemeProvider} from '@sanity/ui'
import {buildTheme} from '@sanity/ui/theme'
import {afterEach, expect, it, vi} from 'vitest'
import type {ArrayOfObjectsInputProps} from 'sanity'
import {ArticleMustEatsInput} from './ArticleMustEatsInput'

const doc = vi.hoisted(() => ({value: {} as Record<string, unknown>}))
const cards = [
  {_id: 'kreuzberg', order: 95, restaurant: {_id: 'spot-k', name: 'Frühstück 3000 Kreuzberg', slug: 'fk', district: 'Kreuzberg'}},
  {_id: 'gazzo', order: 12, restaurant: {_id: 'spot-g', name: 'Gazzo', slug: 'gazzo', district: 'Neukölln'}},
]
vi.mock('sanity', () => {
  const client = {withConfig: () => ({fetch: () => Promise.resolve(cards)})}
  return {
    useClient: () => client,
    useFormValue: ([field]: string[]) => doc.value[field],
    insert: vi.fn(),
    setIfMissing: vi.fn(),
    unset: vi.fn(),
  }
})
afterEach(cleanup)

const text = (t: string) => ({_type: 'block', _key: t, style: 'normal', children: [{_type: 'span', text: t}]})
const spot = {_type: 'spotCard', _key: 's', restaurantRef: {_ref: 'spot-k'}}
const mustEat = (id: string) => ({_type: 'mustEatCard', _key: `m-${id}`, mustEatRef: {_ref: id}})

function show(hidden: string[] = []) {
  const props = {value: hidden.map((id) => ({_key: id, _ref: id})), onChange: vi.fn()} as unknown as ArrayOfObjectsInputProps
  render(
    <ThemeProvider theme={buildTheme()}>
      <ArticleMustEatsInput {...props} />
    </ThemeProvider>,
  )
}

it('offers the card a spot block brings in, with a switch', async () => {
  doc.value = {titleDe: 'Chicken 3000', contentDe: [text('Eine Waffel.'), spot]}
  show(['kreuzberg'])
  expect(await screen.findByText('Ausgeblendet. Käme sonst von selbst in den Text (Deutsch).')).toBeTruthy()
  expect(screen.getByLabelText(/von selbst einsetzen/)).toBeTruthy()
})

it('lists a hand-placed card without a switch, even when it was switched off before', async () => {
  doc.value = {titleDe: 'Chicken 3000', contentDe: [text('Eine Waffel.'), spot, mustEat('kreuzberg')]}
  show(['kreuzberg'])
  expect(await screen.findByText('Von Hand im Text (Deutsch).')).toBeTruthy()
  expect(screen.queryByLabelText(/von selbst einsetzen/)).toBeNull()
})

it('keeps the switch for a language where the card still comes in by itself', async () => {
  doc.value = {
    titleDe: 'Pizza',
    title: 'Pizza',
    contentDe: [mustEat('gazzo')],
    content: [text('Pizza at Gazzo is great.')],
  }
  show()
  expect(await screen.findByText('Von Hand im Text (Deutsch).')).toBeTruthy()
  expect(screen.getByText('Kommt von selbst in den Text (Englisch).')).toBeTruthy()
  expect(screen.getByLabelText(/von selbst einsetzen/)).toBeTruthy()
})
