// nextjs/lib/buddy/homeStage.ts
// Window-event bridge between the home hub's "Frag Remy" stage section and the
// globally mounted BuddyWidget. Plain CustomEvents (not React context) because
// the section lives inside the hub page tree while the widget hangs off the
// SPA layout — they share no convenient ancestor.

export const BUDDY_ASK_EVENT = 'buddy:ask'

export interface BuddyAskDetail {
  // Question to send right away; omit to just open the chat panel.
  question?: string
}

// The widget is code-split and normally mounts on idle. Keep the latest ask so
// a quick stage interaction is not lost while its chunk is still loading.
let pendingBuddyAsk: BuddyAskDetail | null = null

export function dispatchBuddyAsk(detail: BuddyAskDetail = {}): void {
  pendingBuddyAsk = detail
  window.dispatchEvent(new CustomEvent<BuddyAskDetail>(BUDDY_ASK_EVENT, { detail }))
}

export function consumePendingBuddyAsk(): BuddyAskDetail | null {
  const detail = pendingBuddyAsk
  pendingBuddyAsk = null
  return detail
}
