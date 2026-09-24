import { describe, it, expect } from 'vitest';
import { isOutOfCredit } from './outOfCredit';

const CREDIT_MESSAGE =
  'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.';

describe('isOutOfCredit', () => {
  it('recognises the SDK error as it arrived in production (23.09.2026)', () => {
    // Shape of the Anthropic SDK's APIError: message carries status + body,
    // `error` the parsed body.
    const err = Object.assign(
      new Error(
        `400 {"type":"error","error":{"type":"invalid_request_error","message":"${CREDIT_MESSAGE}"}}`
      ),
      {
        status: 400,
        error: { type: 'error', error: { type: 'invalid_request_error', message: CREDIT_MESSAGE } },
      }
    );
    expect(isOutOfCredit(err)).toBe(true);
  });

  it('recognises the nested body even when the top-level message is generic', () => {
    expect(isOutOfCredit({ message: '400', error: { error: { message: CREDIT_MESSAGE } } })).toBe(
      true
    );
  });

  it('does not mistake other failures for an empty balance', () => {
    expect(isOutOfCredit(new Error('400 invalid_request_error: messages: field required'))).toBe(
      false
    );
    expect(isOutOfCredit(new Error('Socket timed out'))).toBe(false);
    expect(isOutOfCredit(null)).toBe(false);
    expect(isOutOfCredit('credit balance is too low')).toBe(false);
  });
});
