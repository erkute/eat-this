// @vitest-environment jsdom
// nextjs/lib/buddy/homeStage.test.ts
import { describe, it, expect } from 'vitest'
import {
  BUDDY_ASK_EVENT,
  dispatchBuddyAsk,
  type BuddyAskDetail,
} from './homeStage'

describe('homeStage event bridge', () => {
  it('round-trips an ask event with a question', () => {
    let got: BuddyAskDetail | null = null
    const onAsk = (e: Event) => {
      got = (e as CustomEvent<BuddyAskDetail>).detail
    }
    window.addEventListener(BUDDY_ASK_EVENT, onAsk)
    dispatchBuddyAsk({ question: 'Wo gibt’s gute Pizza?' })
    window.removeEventListener(BUDDY_ASK_EVENT, onAsk)
    expect(got).toEqual({ question: 'Wo gibt’s gute Pizza?' })
  })

  it('defaults ask to an empty detail (open only)', () => {
    let got: BuddyAskDetail | null = null
    const onAsk = (e: Event) => {
      got = (e as CustomEvent<BuddyAskDetail>).detail
    }
    window.addEventListener(BUDDY_ASK_EVENT, onAsk)
    dispatchBuddyAsk()
    window.removeEventListener(BUDDY_ASK_EVENT, onAsk)
    expect(got).toEqual({})
  })
})
