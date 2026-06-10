// nextjs/lib/buddy/homeStage.ts
// Window-event bridge between the home hub's "Frag Remy" stage section and the
// globally mounted BuddyWidget. Plain CustomEvents (not React context) because
// the section lives inside the hub page tree while the widget hangs off the
// SPA layout — they share no convenient ancestor.

export const BUDDY_ASK_EVENT = 'buddy:ask'
export const BUDDY_STAGE_EVENT = 'buddy:stage'

export interface BuddyAskDetail {
  // Question to send right away; omit to just open the chat panel.
  question?: string
}

// Viewport-coordinate box of the stage avatar. The widget uses the last known
// rect as the FLIP origin when Remy "flies" from the stage into the corner
// launcher. Absent on section unmount — the launcher then just appears.
export interface BuddyStageRect {
  left: number
  top: number
  width: number
  height: number
}

export interface BuddyStageDetail {
  visible: boolean
  rect?: BuddyStageRect
}

export function dispatchBuddyAsk(detail: BuddyAskDetail = {}): void {
  window.dispatchEvent(new CustomEvent<BuddyAskDetail>(BUDDY_ASK_EVENT, { detail }))
}

export function dispatchBuddyStage(detail: BuddyStageDetail): void {
  window.dispatchEvent(new CustomEvent<BuddyStageDetail>(BUDDY_STAGE_EVENT, { detail }))
}
