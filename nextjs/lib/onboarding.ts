/** Reopen the product introduction without navigating away from the current spot. */
export const OPEN_ONBOARDING_EVENT = 'eatthis:open-onboarding';

/** `trigger` gets focus back when the tour closes. */
export function openOnboarding(trigger?: HTMLElement | null) {
  window.dispatchEvent(
    new CustomEvent<HTMLElement | null>(OPEN_ONBOARDING_EVENT, { detail: trigger ?? null })
  );
}
