/** Reopen the product introduction without navigating away from the current spot. */
export const OPEN_ONBOARDING_EVENT = 'eatthis:open-onboarding';

export function openOnboarding() {
  window.dispatchEvent(new Event(OPEN_ONBOARDING_EVENT));
}
