// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const claimSignupSpot = vi.fn();
vi.mock('./claimSignupSpot', () => ({ claimSignupSpot: (slug: string) => claimSignupSpot(slug) }));

import { useSignupSpotClaim, CLAIM_HOLD_TIMEOUT_MS } from './useSignupSpotClaim';

function at(search: string) {
  window.history.replaceState(null, '', `/map${search}`);
}

/** Nothing is open — the state a locked spot's sheet is in. */
const nothingOpen = () => false;
const everythingOpen = () => true;

beforeEach(() => {
  claimSignupSpot.mockReset().mockResolvedValue('granted');
});
afterEach(() => at(''));

describe('useSignupSpotClaim', () => {
  it('cashes in the intent the magic link carried', async () => {
    at('?r=tief-im-katalog&claim=1');
    const { result } = renderHook(() => useSignupSpotClaim('u1', nothingOpen));
    // Reported from the very first render — the gap between "signed in" and
    // "claim registered" is where the pack offer used to flash.
    expect(result.current.claimingSlug).toBe('tief-im-katalog');
    await waitFor(() => expect(claimSignupSpot).toHaveBeenCalledWith('tief-im-katalog'));
  });

  it('holds the sheet until the SPOT is open, not until the POST comes back', async () => {
    /* The bug this exists for (User, 2026-08-26): releasing on the response
       left the write → listener → refetch round trip running unguarded, and
       for a second or two a pack banner sat on the spot the mail had just
       promised. */
    at('?r=tief-im-katalog&claim=1');
    let open = false;
    const { result, rerender } = renderHook(() => useSignupSpotClaim('u1', () => open));
    await waitFor(() => expect(claimSignupSpot).toHaveBeenCalled());
    // POST is through — and the hold is still on, because the map has not
    // caught up yet.
    expect(result.current.claimingSlug).toBe('tief-im-katalog');

    open = true;
    rerender();
    await waitFor(() => expect(result.current.claimingSlug).toBeNull());
  });

  it('reports WHY a claim came back empty, so the banner can say it', async () => {
    /* Ein verbrauchter Gratis-Spot ist der Fall, den der Leser erklärt bekommen
       muss: das Sheet hat ihm ausgeloggt einen Spot versprochen, den sein Konto
       schon ausgegeben hatte (User, 26.08.2026). */
    claimSignupSpot.mockResolvedValue('spent');
    at('?r=tief-im-katalog&claim=1');
    const { result } = renderHook(() => useSignupSpotClaim('u1', nothingOpen));
    await waitFor(() => expect(result.current.outcome).toBe('spent'));
  });

  it('lets go right away when the claim is refused', async () => {
    // Nothing is coming, so holding the sheet only delays an offer the reader
    // can actually act on.
    claimSignupSpot.mockResolvedValue('spent');
    at('?r=tief-im-katalog&claim=1');
    const { result } = renderHook(() => useSignupSpotClaim('u1', nothingOpen));
    await waitFor(() => expect(result.current.claimingSlug).toBeNull());
  });

  it('gives up after the timeout rather than stranding a completed sign-up', async () => {
    vi.useFakeTimers();
    try {
      at('?r=tief-im-katalog&claim=1');
      const { result } = renderHook(() => useSignupSpotClaim('u1', nothingOpen));
      expect(result.current.claimingSlug).toBe('tief-im-katalog');
      await act(async () => {
        vi.advanceTimersByTime(CLAIM_HOLD_TIMEOUT_MS + 10);
      });
      expect(result.current.claimingSlug).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not spend the claim on a spot that is already open', () => {
    at('?r=schon-offen&claim=1');
    const { result } = renderHook(() => useSignupSpotClaim('u1', everythingOpen));
    expect(claimSignupSpot).not.toHaveBeenCalled();
    expect(result.current.claimingSlug).toBeNull();
  });

  it('drops `claim` afterwards but leaves `r` for the URL sync to own', async () => {
    at('?r=tief-im-katalog&claim=1');
    renderHook(() => useSignupSpotClaim('u1', nothingOpen));
    await waitFor(() => expect(window.location.search).toBe('?r=tief-im-katalog'));
  });

  it('does nothing for a logged-out visitor on a stale claim URL', () => {
    // Nothing is being claimed, so the sheet must read its normal offer rather
    // than sit on "Wir schliessen auf …" waiting for something that never runs.
    at('?r=tief-im-katalog&claim=1');
    const { result } = renderHook(() => useSignupSpotClaim(null, nothingOpen));
    expect(result.current.claimingSlug).toBeNull();
    expect(claimSignupSpot).not.toHaveBeenCalled();
  });

  it('ignores an ordinary deep link', () => {
    at('?r=tief-im-katalog');
    const { result } = renderHook(() => useSignupSpotClaim('u1', nothingOpen));
    expect(result.current.claimingSlug).toBeNull();
    expect(claimSignupSpot).not.toHaveBeenCalled();
  });

  it('releases the hold even when the claim throws', async () => {
    claimSignupSpot.mockRejectedValue(new Error('offline'));
    at('?r=tief-im-katalog&claim=1');
    const { result } = renderHook(() => useSignupSpotClaim('u1', nothingOpen));
    await waitFor(() => expect(result.current.claimingSlug).toBeNull());
  });
});
