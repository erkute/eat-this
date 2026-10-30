// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  getDb: vi.fn(), doc: vi.fn(), onSnapshot: vi.fn(), unsubscribe: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/lib/map/useFavorites', () => ({ useFavorites: () => ({ favoriteIds: new Set(), toggle: vi.fn() }) }));
vi.mock('@/lib/firebase/config', () => ({ getDb: state.getDb }));
vi.mock('firebase/firestore', () => ({ doc: state.doc, onSnapshot: state.onSnapshot }));
vi.mock('./HeartDraw', () => ({ default: () => null }));
import HeartButton from './HeartButton';

let observe: IntersectionObserverCallback;
const props = { restaurantId: 'r1', name: 'Engelbecken', displayName: 'Engelbecken', locale: 'de' };
beforeEach(() => {
  vi.clearAllMocks();
  state.getDb.mockResolvedValue('db');
  state.doc.mockReturnValue('ref');
  state.onSnapshot.mockReturnValue(state.unsubscribe);
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { observe = callback; }
    observe() {}
    disconnect() {}
  });
});
afterEach(() => vi.unstubAllGlobals());

it('opens the real counter subscription only near the viewport and keeps live updates', async () => {
  const view = render(<HeartButton {...props} />);
  await act(async () => observe([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
  expect(state.getDb).not.toHaveBeenCalled();
  expect(state.onSnapshot).not.toHaveBeenCalled();
  await act(async () => observe([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
  expect(state.doc).toHaveBeenCalledWith('db', 'restaurants', 'r1');
  const next = state.onSnapshot.mock.calls[0][1];
  act(() => next({ exists: () => true, data: () => ({ heartCount: 12 }) }));
  expect(screen.getByText('geherzt von 12 Leuten')).toBeTruthy();
  act(() => next({ exists: () => true, data: () => ({ heartCount: 13 }) }));
  expect(screen.getByText('geherzt von 13 Leuten')).toBeTruthy();
  expect(state.onSnapshot).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(state.unsubscribe).toHaveBeenCalledTimes(1);
});

it('also starts the counter on keyboard focus', async () => {
  render(<HeartButton {...props} />);
  await act(async () => fireEvent.focus(screen.getByRole('button')));
  expect(state.onSnapshot).toHaveBeenCalledTimes(1);
});

it('loads normally when IntersectionObserver is unavailable', async () => {
  vi.stubGlobal('IntersectionObserver', undefined);
  render(<HeartButton {...props} />);
  await act(async () => {});
  expect(state.onSnapshot).toHaveBeenCalledTimes(1);
});
