// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const claimSignupSpot = vi.fn();
vi.mock('./claimSignupSpot', () => ({ claimSignupSpot: (slug: string) => claimSignupSpot(slug) }));

import { useSignupSpotClaim } from './useSignupSpotClaim';

function at(search: string) {
  window.history.replaceState(null, '', `/map${search}`);
}

beforeEach(() => {
  claimSignupSpot.mockReset().mockResolvedValue(true);
});
afterEach(() => at(''));

describe('useSignupSpotClaim', () => {
  it('cashes in the intent the magic link carried', async () => {
    at('?r=tief-im-katalog&claim=1');
    const { result } = renderHook(() => useSignupSpotClaim('u1'));
    // Reported from the very first render — the gap between "signed in" and
    // "claim registered" is exactly where the pack offer used to flash.
    expect(result.current).toBe('tief-im-katalog');
    await waitFor(() => expect(claimSignupSpot).toHaveBeenCalledWith('tief-im-katalog'));
    await waitFor(() => expect(result.current).toBeNull());
  });

  it('drops `claim` afterwards but leaves `r` for the URL sync to own', async () => {
    at('?r=tief-im-katalog&claim=1');
    renderHook(() => useSignupSpotClaim('u1'));
    await waitFor(() => expect(window.location.search).toBe('?r=tief-im-katalog'));
  });

  it('does nothing for a logged-out visitor on a stale claim URL', () => {
    // Nothing is being claimed, so the sheet must read its normal offer rather
    // than sit on "Wir schliessen auf …" waiting for something that never runs.
    at('?r=tief-im-katalog&claim=1');
    const { result } = renderHook(() => useSignupSpotClaim(null));
    expect(result.current).toBeNull();
    expect(claimSignupSpot).not.toHaveBeenCalled();
  });

  it('ignores an ordinary deep link', () => {
    at('?r=tief-im-katalog');
    const { result } = renderHook(() => useSignupSpotClaim('u1'));
    expect(result.current).toBeNull();
    expect(claimSignupSpot).not.toHaveBeenCalled();
  });

  it('releases the hold even when the claim fails', async () => {
    claimSignupSpot.mockRejectedValue(new Error('offline'));
    at('?r=tief-im-katalog&claim=1');
    const { result } = renderHook(() => useSignupSpotClaim('u1'));
    await waitFor(() => expect(result.current).toBeNull());
  });
});
