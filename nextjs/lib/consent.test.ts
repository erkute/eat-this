// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CONSENT_COOKIE,
  CONSENT_ID_COOKIE,
  CONSENT_VERSION,
  clearConsent,
  ensureConsentId,
  parseConsentCookie,
  readConsent,
  readConsentId,
  writeConsent,
} from './consent';

function wipe() {
  for (const name of [CONSENT_COOKIE, CONSENT_ID_COOKIE]) {
    document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
}

describe('parseConsentCookie', () => {
  it('reads value and version', () => {
    expect(parseConsentCookie('accepted.2')).toEqual({ value: 'accepted', version: 2 });
    expect(parseConsentCookie('declined.7')).toEqual({ value: 'declined', version: 7 });
  });

  it.each([null, '', 'accepted', 'maybe.2', 'accepted.', 'accepted.x', 'accepted.2.5'])(
    'rejects %s',
    (raw) => {
      expect(parseConsentCookie(raw)).toBeNull();
    }
  );
});

describe('consent cookies', () => {
  beforeEach(wipe);

  it('round-trips an answer at the current version', () => {
    writeConsent('accepted');
    expect(readConsent()).toBe('accepted');
  });

  /* The version is the whole point of the record: an answer to an older
   * question cannot stand in for an answer to this one. */
  it('reports an older version as undecided', () => {
    document.cookie = `${CONSENT_COOKIE}=accepted.${CONSENT_VERSION - 1}; Path=/`;
    expect(readConsent()).toBeNull();
  });

  it('reports a versionless answer as undecided', () => {
    document.cookie = `${CONSENT_COOKIE}=accepted; Path=/`;
    expect(readConsent()).toBeNull();
  });

  it('issues one id and keeps it', () => {
    const first = ensureConsentId();
    expect(first).toMatch(/^[a-f0-9-]{8,64}$/);
    expect(ensureConsentId(), 'a second call must not mint a new id').toBe(first);
    expect(readConsentId()).toBe(first);
  });

  /* Withdrawing consent must not orphan the log: the new decision has to land
   * under the same id as the one it supersedes. */
  it('keeps the id when the decision is cleared', () => {
    writeConsent('accepted');
    const id = ensureConsentId();

    clearConsent();

    expect(readConsent()).toBeNull();
    expect(readConsentId()).toBe(id);
    expect(ensureConsentId()).toBe(id);
  });

  it('has no id before anything is answered', () => {
    expect(readConsentId()).toBeNull();
  });
});
