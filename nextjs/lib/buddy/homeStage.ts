// nextjs/lib/buddy/homeStage.ts
// Window-event bridge between the home hub's "Frag Remy" stage section and the
// globally mounted BuddyWidget. Plain CustomEvents (not React context) because
// the section lives inside the hub page tree while the widget hangs off the
// SPA layout — they share no convenient ancestor.

export const BUDDY_ASK_EVENT = 'buddy:ask';

export interface BuddyAskDetail {
  // Question to send right away; omit to just open the chat panel.
  question?: string;
}

// The widget is code-split and normally mounts on idle. Keep the latest ask so
// a quick stage interaction is not lost while its chunk is still loading.
let pendingBuddyAsk: BuddyAskDetail | null = null;

export function dispatchBuddyAsk(detail: BuddyAskDetail = {}): void {
  pendingBuddyAsk = detail;
  window.dispatchEvent(new CustomEvent<BuddyAskDetail>(BUDDY_ASK_EVENT, { detail }));
}

export function consumePendingBuddyAsk(): BuddyAskDetail | null {
  const detail = pendingBuddyAsk;
  pendingBuddyAsk = null;
  return detail;
}

// Fragt man auf Remys Tafel (Antwort antippen oder abschicken), nickt Remy
// erst und redet kurz, dann geht der Chat auf (Idee vom 01.10.2026: Tafel und
// Chat sollen sichtbar zusammenhängen). Das Nicken gehört HubMotion
// (`armRemyLook`): es nimmt das Ereignis an (`preventDefault`) und ruft `ask`
// selbst, sobald er genickt hat. Nimmt es niemand an — keine Bewegung, kein
// WebGL, Remy nicht im Bild —, geht der Chat sofort auf.
export const REMY_NOD_EVENT = 'remy:nod';

export interface RemyNodDetail {
  ask: () => void;
}

export function askRemyWithNod(from: Element, detail: BuddyAskDetail): void {
  const ask = () => dispatchBuddyAsk(detail);
  const nod = new CustomEvent<RemyNodDetail>(REMY_NOD_EVENT, {
    bubbles: true,
    cancelable: true,
    detail: { ask },
  });
  if (from.dispatchEvent(nod)) ask();
}
