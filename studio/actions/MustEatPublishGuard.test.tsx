import {act, cleanup, renderHook, waitFor} from '@testing-library/react'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import type {DocumentActionComponent, DocumentActionProps} from 'sanity'
import {guardMustEatPublish} from './MustEatPublishGuard'
import {readMustEatCard} from '../lib/mustEatCard'

vi.mock('sanity', () => {
  const client = {}
  return {useClient: () => client}
})
vi.mock('../lib/mustEatCard', () => ({readMustEatCard: vi.fn(), MUST_EAT_CARD_SAVED: 'card-saved'}))
const publish = (() => ({label: 'Publish', disabled: false})) as DocumentActionComponent
const Guard = guardMustEatPublish(publish)
const card = {exists: true, restaurantId: 'spot-a', version: 'version-a'}
const props = (spot = 'spot-a', version = 'version-a') => ({
  id: 'card', draft: {restaurantRef: {_ref: spot}, cardVersion: version}, published: null,
}) as unknown as DocumentActionProps
beforeEach(() => vi.mocked(readMustEatCard).mockResolvedValue(card as never))
afterEach(() => {cleanup(); vi.clearAllMocks()})

it('only allows publishing the checked card revision and restaurant', async () => {
  const hook = renderHook((input) => Guard(input), {initialProps: props()})
  expect(hook.result.current?.disabled).toBe(true)
  await waitFor(() => expect(hook.result.current?.disabled).toBe(false))
  vi.mocked(readMustEatCard).mockReturnValueOnce(new Promise(() => { /* response stays pending */ }))
  hook.rerender(props('spot-b', 'version-b'))
  expect(hook.result.current?.disabled).toBe(true)
})

it('keeps publishing blocked if the server returns a different revision', async () => {
  vi.mocked(readMustEatCard).mockResolvedValueOnce({...card, version: 'old'} as never)
  const hook = renderHook(() => Guard(props()))
  await waitFor(() => expect(hook.result.current?.title).toContain('synchronisiert'))
  expect(hook.result.current?.disabled).toBe(true)
})

it('does not unlock a new selection when an old request resolves later', async () => {
  let resolve!: (value: never) => void
  vi.mocked(readMustEatCard).mockReturnValueOnce(new Promise((done) => {resolve = done}))
  const hook = renderHook((input) => Guard(input), {initialProps: props()})
  vi.mocked(readMustEatCard).mockResolvedValueOnce({...card, exists: false} as never)
  hook.rerender(props('spot-b', 'version-b'))
  await waitFor(() => expect(hook.result.current?.title).toContain('Erst die Karte'))
  await act(async () => resolve(card as never))
  expect(hook.result.current?.disabled).toBe(true)
})
