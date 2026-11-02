// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapMustEat, MapRestaurant } from '@/lib/types';
import { useMapDeepLinks } from '../useMapDeepLinks';

const restaurant: MapRestaurant = {
  _id: 'restaurant-1',
  _createdAt: '2026-01-01T00:00:00Z',
  name: 'Test Spot',
  slug: 'test-spot',
  lat: 52.52,
  lng: 13.405,
  bezirk: { name: 'Mitte', slug: 'mitte' },
  mustEatCount: 1,
};

const mustEat: MapMustEat = {
  _id: 'must-eat-1',
  dish: 'Test Dish',
  restaurant: {
    _id: restaurant._id,
    name: restaurant.name,
    slug: restaurant.slug,
    lat: restaurant.lat,
    lng: restaurant.lng,
  },
};

function createHarness(mapRef: RefObject<MapRef | null>) {
  const onRestaurantSlugMatch = vi.fn();
  const onMustEatIdMatch = vi.fn();
  const onRestaurantCameraReady = vi.fn();
  const onMustEatCameraReady = vi.fn();
  const userInteractedRef = { current: false };
  const fitCameraToSpots = vi.fn();
  const stableArgs = {
    mapRef,
    restaurants: [restaurant],
    mustEats: [mustEat],
    userInteractedRef,
    onRestaurantSlugMatch,
    onMustEatIdMatch,
    onRestaurantCameraReady,
    onMustEatCameraReady,
    fitCameraToSpots,
  };

  return { stableArgs, onRestaurantSlugMatch, onMustEatIdMatch, userInteractedRef, fitCameraToSpots };
}

describe('useMapDeepLinks bounded map polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState({}, '', '/map');
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('opens a restaurant immediately, cancels while inactive, and resumes its camera match', () => {
    window.history.replaceState({}, '', '/map?r=test-spot');
    const mapRef: RefObject<MapRef | null> = { current: null };
    const { stableArgs, onRestaurantSlugMatch } = createHarness(mapRef);
    const { rerender } = renderHook(
      ({ isActive }: { isActive: boolean }) => useMapDeepLinks({ ...stableArgs, isActive }),
      { initialProps: { isActive: true } }
    );

    expect(onRestaurantSlugMatch).toHaveBeenCalledOnce();
    expect(onRestaurantSlugMatch).toHaveBeenCalledWith(restaurant);
    expect(vi.getTimerCount()).toBe(1);

    rerender({ isActive: false });
    expect(vi.getTimerCount()).toBe(0);

    mapRef.current = {} as MapRef;
    act(() => vi.advanceTimersByTime(30_000));
    expect(onRestaurantSlugMatch).toHaveBeenCalledOnce();

    rerender({ isActive: true });
    expect(onRestaurantSlugMatch).toHaveBeenCalledOnce();
    expect(stableArgs.onRestaurantCameraReady).toHaveBeenCalledExactlyOnceWith(restaurant);
    expect(onRestaurantSlugMatch).toHaveBeenLastCalledWith(restaurant);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not reopen a restaurant that was already selected by the server render', () => {
    window.history.replaceState({}, '', '/map?r=test-spot');
    const mapRef: RefObject<MapRef | null> = { current: null };
    const { stableArgs, onRestaurantSlugMatch } = createHarness(mapRef);
    renderHook(() =>
      useMapDeepLinks({
        ...stableArgs,
        isActive: true,
        initialRestaurant: restaurant,
      })
    );

    expect(onRestaurantSlugMatch).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    mapRef.current = {} as MapRef;
    act(() => vi.advanceTimersByTime(30_000));

    expect(onRestaurantSlugMatch).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('opens a Must-Eat immediately even if the map chunk never mounts', () => {
    window.history.replaceState({}, '', '/map?me=must-eat-1');
    const mapRef: RefObject<MapRef | null> = { current: null };
    const { stableArgs, onMustEatIdMatch, userInteractedRef } = createHarness(mapRef);
    renderHook(() => useMapDeepLinks({ ...stableArgs, isActive: true }));

    expect(onMustEatIdMatch).toHaveBeenCalledExactlyOnceWith(mustEat);
    act(() => vi.advanceTimersByTime(14_999));
    expect(onMustEatIdMatch).toHaveBeenCalledOnce();

    act(() => vi.advanceTimersByTime(1));
    expect(onMustEatIdMatch).toHaveBeenCalledOnce();
    expect(onMustEatIdMatch).toHaveBeenCalledWith(mustEat);
    expect(userInteractedRef.current).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels pending camera catchup after unmount', () => {
    window.history.replaceState({}, '', '/map?me=must-eat-1');
    const mapRef: RefObject<MapRef | null> = { current: null };
    const { stableArgs, onMustEatIdMatch } = createHarness(mapRef);
    const { unmount } = renderHook(() => useMapDeepLinks({ ...stableArgs, isActive: true }));

    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);

    act(() => vi.advanceTimersByTime(30_000));
    expect(onMustEatIdMatch).toHaveBeenCalledOnce();
    expect(stableArgs.onMustEatCameraReady).not.toHaveBeenCalled();
  });

  it('catches up the Must-Eat camera without replaying the selection handler', () => {
    window.history.replaceState({}, '', '/map?me=must-eat-1');
    const mapRef: RefObject<MapRef | null> = { current: null };
    const { stableArgs, onMustEatIdMatch } = createHarness(mapRef);
    const { rerender } = renderHook(
      ({ isActive }) => useMapDeepLinks({ ...stableArgs, isActive }),
      { initialProps: { isActive: true } }
    );
    expect(onMustEatIdMatch).toHaveBeenCalledExactlyOnceWith(mustEat);
    rerender({ isActive: false });
    expect(vi.getTimerCount()).toBe(0);
    mapRef.current = {} as MapRef;
    rerender({ isActive: true });
    expect(stableArgs.onMustEatCameraReady).toHaveBeenCalledExactlyOnceWith(mustEat);
    expect(onMustEatIdMatch).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds district camera polling when the map chunk never mounts', () => {
    window.history.replaceState({}, '', '/map?bezirk=mitte');
    const mapRef: RefObject<MapRef | null> = { current: null };
    const { stableArgs } = createHarness(mapRef);
    renderHook(() => useMapDeepLinks({ ...stableArgs, isActive: true }));

    expect(vi.getTimerCount()).toBe(1);

    act(() => vi.advanceTimersByTime(15_000));
    expect(vi.getTimerCount()).toBe(0);
  });
  it('frames the district through the same camera move as the Bezirk chip', () => {
    window.history.replaceState({}, '', '/map?bezirk=mitte');
    const mapRef = { current: {} as MapRef } as RefObject<MapRef | null>;
    const { stableArgs, fitCameraToSpots } = createHarness(mapRef);
    renderHook(() => useMapDeepLinks({ ...stableArgs, isActive: true }));

    expect(fitCameraToSpots).toHaveBeenCalledOnce();
    expect(fitCameraToSpots).toHaveBeenCalledWith([restaurant]);
  });
});
