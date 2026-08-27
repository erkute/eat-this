// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapRestaurant } from '@/lib/types';
import { MAP_FILTER_DEFAULTS, type MapFilterState } from '../mapFilterParams';
import { useMapFilterUrl } from '../useMapFilterUrl';

const rows = [
  {
    _id: 'r1',
    _createdAt: '2026-01-01T00:00:00Z',
    name: 'Slice Society',
    slug: 'slice-society',
    isClosed: false,
    lat: 52.52,
    lng: 13.405,
    bezirk: { name: 'Mitte', slug: 'mitte' },
    cuisineType: 'Italian',
    categories: [{ name: 'Pizza', slug: 'pizza' }],
    mustEatCount: 1,
  },
] as unknown as MapRestaurant[];

/** Renders the hook against a mutable filter state, the way MapSection holds
 *  it — the setters have to feed back in, or the writer never sees a change. */
function renderSync(initialUrl: string, restaurants = rows) {
  window.history.replaceState({}, '', initialUrl);
  let state: MapFilterState = { ...MAP_FILTER_DEFAULTS };
  const setSnap = vi.fn();
  const view = renderHook(() =>
    useMapFilterUrl({
      isActive: true,
      restaurants,
      lockedRestaurants: [],
      ...state,
      setCategory: (c) => (state = { ...state, category: c }),
      setBezirk: (b) => (state = { ...state, bezirk: b }),
      setPrice: (id: string | null) => (state = { ...state, price: id }),
      setSearch: (s) => (state = { ...state, search: s }),
      setOpenOnly: (o) => (state = { ...state, openOnly: o }),
      sheetView: 'list',
      setSnap,
    })
  );
  const set = (patch: Partial<MapFilterState>) =>
    act(() => {
      state = { ...state, ...patch };
      view.rerender();
    });
  return { set, setSnap, current: () => state, rerender: () => act(() => view.rerender()) };
}

describe('useMapFilterUrl', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/map');
  });

  it('applies the filters an inbound URL carries and raises the sheet', () => {
    const sync = renderSync('/map?cat=pizza&bezirk=mitte&open=1');
    expect(sync.current()).toMatchObject({ category: 'pizza', bezirk: 'Mitte', openOnly: true });
    expect(sync.setSnap).toHaveBeenCalledWith('mid');
  });

  it('leaves a clean /map alone and does not raise the sheet', () => {
    const sync = renderSync('/map');
    expect(window.location.search).toBe('');
    expect(sync.setSnap).not.toHaveBeenCalled();
  });

  it('does not strip the inbound params it was handed', () => {
    renderSync('/map?cat=pizza');
    expect(window.location.search).toBe('?cat=pizza');
  });

  it('writes a chip selection into the URL', () => {
    const sync = renderSync('/map');
    sync.set({ category: 'pizza' });
    expect(window.location.search).toBe('?cat=pizza');
    sync.set({ price: '20', openOnly: true });
    expect(window.location.search).toBe('?cat=pizza&price=20&open=1');
  });

  it('pushes exactly one entry however many chips are changed', () => {
    const before = window.history.length;
    const sync = renderSync('/map');
    sync.set({ category: 'pizza' });
    expect(window.history.length).toBe(before + 1);
    sync.set({ bezirk: 'Mitte' });
    sync.set({ price: '20' });
    sync.set({ openOnly: true });
    expect(window.history.length).toBe(before + 1);
  });

  it('never pushes for typing in the search box', () => {
    const before = window.history.length;
    const sync = renderSync('/map');
    sync.set({ search: 'R' });
    sync.set({ search: 'Ra' });
    sync.set({ search: 'Ram' });
    expect(window.location.search).toBe('?q=Ram');
    expect(window.history.length).toBe(before);
  });

  it('restores the filter state a popstate lands on', () => {
    const sync = renderSync('/map');
    sync.set({ category: 'pizza', openOnly: true });
    act(() => {
      window.history.replaceState({}, '', '/map');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(sync.current()).toMatchObject({ category: 'All', openOnly: false });
  });

  it('waits for the rows before resolving a slug, then applies it', () => {
    window.history.replaceState({}, '', '/map?cat=pizza');
    let state: MapFilterState = { ...MAP_FILTER_DEFAULTS };
    let restaurants: MapRestaurant[] = [];
    const view = renderHook(() =>
      useMapFilterUrl({
        isActive: true,
        restaurants,
        lockedRestaurants: [],
        ...state,
        setCategory: (c) => (state = { ...state, category: c }),
        setBezirk: (b) => (state = { ...state, bezirk: b }),
        setPrice: (id: string | null) => (state = { ...state, price: id }),
        setSearch: (s) => (state = { ...state, search: s }),
        setOpenOnly: (o) => (state = { ...state, openOnly: o }),
        sheetView: 'list',
        setSnap: vi.fn(),
      })
    );
    expect(state.category).toBe('All');
    expect(window.location.search).toBe('?cat=pizza');
    act(() => {
      restaurants = rows;
      view.rerender();
    });
    expect(state.category).toBe('pizza');
  });
});
