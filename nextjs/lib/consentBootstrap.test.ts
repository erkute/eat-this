// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONSENT_BOOTSTRAP, CONSENT_INTERACTIVE_EVENT } from './consentBootstrap';
import { CONSENT_VERSION, readConsent } from './consent';

beforeEach(() => {
  document.cookie = 'cookieConsent=; Max-Age=0; Path=/';
  document.documentElement.removeAttribute('data-consent-pending');
});

afterEach(() => { window.dispatchEvent(new Event(CONSENT_INTERACTIVE_EVENT)); });

describe('pre-paint consent state', () => {
  it.each([
    `accepted.${CONSENT_VERSION}`,
    `declined.${CONSENT_VERSION}`,
    `accepted%2E${CONSENT_VERSION}`,
    `declined.0${CONSENT_VERSION}`,
    `accepted.${CONSENT_VERSION - 1}`,
    `declined.${CONSENT_VERSION + 1}`,
    `accepted.${CONSENT_VERSION}.extra`,
    'accepted', 'maybe.4', '',
  ])('uses the same decision as hydration for %s without writing a choice', (raw) => {
    document.cookie = 'unrelated=1; Path=/';
    if (raw) document.cookie = `cookieConsent=${raw}; Path=/`;
    const before = document.cookie;
    const pending = readConsent() === null;
    // Exercise the exact script delivered in the static HTML, not a second
    // parser or a mock of the server/client boundary.
    new Function(CONSENT_BOOTSTRAP)();
    expect(document.documentElement.hasAttribute('data-consent-pending')).toBe(pending);
    expect(document.cookie).toBe(before);
  });
});

// React delegates focusin to the hydration root. Replaying a focus event
// captured before the consent boundary hydrates can continually schedule
// hydration retries; the bootstrap already owns that focus until handover.
it('keeps early focus local until React takes over the question', () => {
  document.body.innerHTML = '<div id="cookieConsent" tabindex="-1"><button>Answer</button></div>';
  const rootFocus = vi.fn();
  document.body.addEventListener('focusin', rootFocus, true);
  try {
    new Function(CONSENT_BOOTSTRAP)();
    const button = document.querySelector('button')!;
    button.focus();
    expect(document.activeElement).toBe(button);
    expect(rootFocus).not.toHaveBeenCalled();
    window.dispatchEvent(new Event(CONSENT_INTERACTIVE_EVENT));
    button.blur();
    button.focus();
    expect(rootFocus).toHaveBeenCalledTimes(1);
  } finally {
    document.body.removeEventListener('focusin', rootFocus, true);
    document.body.innerHTML = '';
  }
});
