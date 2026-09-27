const KEY = 'eat-this:starter-prompt-until';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
let memoryUntil = 0;

/** No identifier or browsing history: just when the automatic invitation may return. */
export function pauseStarterPrompt(): void {
  memoryUntil = Date.now() + WEEK_MS;
  try {
    localStorage.setItem(KEY, String(memoryUntil));
  } catch {
    // Storage may be unavailable; the current page still respects the pause.
  }
}

export function starterPromptPaused(): boolean {
  try {
    return Math.max(memoryUntil, Number(localStorage.getItem(KEY)) || 0) > Date.now();
  } catch {
    return memoryUntil > Date.now();
  }
}
