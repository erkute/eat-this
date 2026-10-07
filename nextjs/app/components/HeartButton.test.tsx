// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* Das Herz hängt an Konto, Favoriten und dem Live-Zähler — hier zählt nur,
   was der Knopf zeigt, solange der Server noch nicht geantwortet hat, und
   danach. `toggle` bleibt offen, bis der Test es auflöst. */
const state = vi.hoisted(() => ({
  user: { uid: 'u1' } as { uid: string } | null,
  favoriteIds: new Set<string>(),
  count: 12,
  toggle: vi.fn<() => Promise<boolean>>(),
}));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/lib/map/useFavorites', () => ({
  useFavorites: () => ({ favoriteIds: state.favoriteIds, toggle: state.toggle }),
}));
vi.mock('@/lib/map/useHeartCount', () => ({
  useHeartCount: () => ({ count: state.count, loading: false }),
}));

// Die Zeichnung (GSAP, DrawSVG) braucht ein echtes Layout; hier zählt nur der
// Zustand, den der Knopf meldet.
vi.mock('./HeartDraw', () => ({ default: () => null }));

import HeartButton from './HeartButton';

function deferred() {
  let resolve!: (ok: boolean) => void;
  const promise = new Promise<boolean>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const props = { restaurantId: 'r1', name: 'Kolo Coffee', displayName: 'Kolo Coffee', locale: 'de' };
const button = () => screen.getByRole('button');
const count = () => document.querySelector('[data-heart-count]')?.textContent ?? '';

beforeEach(() => {
  state.user = { uid: 'u1' };
  state.favoriteIds = new Set();
  state.count = 12;
  state.toggle = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('HeartButton', () => {
  it('fills the heart and counts up on tap, before the server answers', async () => {
    const call = deferred();
    state.toggle.mockReturnValue(call.promise);
    render(<HeartButton {...props} />);
    expect(button().getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(button());

    expect(button().getAttribute('aria-pressed')).toBe('true');
    expect(count()).toBe('geherzt von 13 Leuten');
    expect(button().getAttribute('aria-label')).toBe(
      'Herz für Kolo Coffee entfernen, geherzt von 13 Leuten'
    );
    await act(async () => call.resolve(true));
  });

  it('ignores a second tap while the first is still on its way', async () => {
    const call = deferred();
    state.toggle.mockReturnValue(call.promise);
    render(<HeartButton {...props} />);

    fireEvent.click(button());
    fireEvent.click(button());

    expect(state.toggle).toHaveBeenCalledTimes(1);
    expect(button().getAttribute('aria-pressed')).toBe('true');
    await act(async () => call.resolve(true));
  });

  it('springs back when the server call fails', async () => {
    const call = deferred();
    state.toggle.mockReturnValue(call.promise);
    render(<HeartButton {...props} />);

    fireEvent.click(button());
    await act(async () => call.resolve(false));

    expect(button().getAttribute('aria-pressed')).toBe('false');
    expect(count()).toBe('geherzt von 12 Leuten');
  });

  it('hands the live count back once it has moved', async () => {
    const call = deferred();
    state.toggle.mockReturnValue(call.promise);
    const { rerender } = render(<HeartButton {...props} />);

    fireEvent.click(button());
    await act(async () => call.resolve(true));
    expect(count()).toBe('geherzt von 13 Leuten');

    // Der Server hat gezählt, der Live-Zähler zieht nach — auch ein fremdes
    // Herz im selben Moment kommt so an.
    state.favoriteIds = new Set(['r1']);
    state.count = 14;
    rerender(<HeartButton {...props} />);
    expect(count()).toBe('geherzt von 14 Leuten');
    expect(button().getAttribute('aria-pressed')).toBe('true');
  });

  it('falls back to the live count when it never moves', async () => {
    vi.useFakeTimers();
    const call = deferred();
    state.toggle.mockReturnValue(call.promise);
    render(<HeartButton {...props} />);

    fireEvent.click(button());
    await act(async () => call.resolve(true));
    expect(count()).toBe('geherzt von 13 Leuten');

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    expect(count()).toBe('geherzt von 12 Leuten');
  });

  it('leaves the anonymous tap to useFavorites, without filling the heart', () => {
    state.user = null;
    state.toggle.mockResolvedValue(false);
    render(<HeartButton {...props} />);

    fireEvent.click(button());

    expect(state.toggle).toHaveBeenCalledTimes(1);
    expect(button().getAttribute('aria-pressed')).toBe('false');
    expect(count()).toBe('geherzt von 12 Leuten');
  });
});
