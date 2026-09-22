// @vitest-environment jsdom
import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MapRestaurant } from '@/lib/types';

// Stand-in for the maplibre surface: each Marker becomes a plain element so
// the assertions below are about what MapCanvasLayer renders and in which
// order, not about maplibre itself.
vi.mock('react-map-gl/maplibre', () => ({
  Marker: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-marker className={className}>
      {children}
    </div>
  ),
}));
// Reports first paint immediately, the way a healthy basemap does — otherwise
// every case here would sit out the 2.5s "CDN never reported" fallback.
vi.mock('./MapCanvas', () => {
  function MapCanvasStub({
    children,
    onFirstPaint,
  }: {
    children: React.ReactNode;
    onFirstPaint: () => void;
  }) {
    useEffect(() => onFirstPaint(), [onFirstPaint]);
    return <div data-canvas>{children}</div>;
  }
  return { default: MapCanvasStub };
});
vi.mock('./UserLocationMarker', () => ({ default: () => <div data-user-marker /> }));
/* Die Bahnhofs-Ebene wird im Canvas gezeichnet, nicht im DOM — hier steht sie
   nur im Weg, weil sie MapLibre-Kontext braucht, den der Stub oben nicht hat. */
vi.mock('./TransitLayer', () => ({ default: () => null }));

import MapCanvasLayer from './MapCanvasLayer';

function spot(id: string, over: Partial<MapRestaurant> = {}): MapRestaurant {
  return {
    _id: id,
    _createdAt: '2026-01-01T00:00:00Z',
    name: id,
    slug: id,
    isClosed: false,
    lat: 52.52,
    lng: 13.405,
    mustEatCount: 0,
    ...over,
  } as MapRestaurant;
}

/* Distinct coordinates. Nothing depends on the spacing any more — every spot
   is its own marker regardless — but keeping them apart matches how the cases
   read. */
function spread(...ids: string[]): MapRestaurant[] {
  return ids.map((id, i) => spot(id, { lat: 52.42 + i * 0.03, lng: 13.31 + i * 0.03 }));
}

function layer(
  spots: MapRestaurant[],
  selected: MapRestaurant | null = null,
  focusedRestaurantId: string | null = selected?._id ?? null
) {
  return (
    <MapCanvasLayer
      mapRef={{ current: null }}
      onMapClick={vi.fn()}
      onMoveEnd={vi.fn()}
      displayedRestaurants={spots}
      selectedRestaurant={selected}
      onRestaurantClick={vi.fn()}
      focusedRestaurantId={focusedRestaurantId}
      location={null}
    />
  );
}

/* A map ref whose bounds cover Berlin-Mitte only, so the culling window can be
   exercised. `moveend` is registered but never fired — the initial read is
   what the assertions below depend on. */
function mapRefWithBounds(west: number, south: number, east: number, north: number) {
  const map = {
    getBounds: () => ({
      getWest: () => west,
      getSouth: () => south,
      getEast: () => east,
      getNorth: () => north,
    }),
    on: () => {},
    off: () => {},
  };
  return { current: { getMap: () => map } } as never;
}

function layerWithRef(spots: MapRestaurant[], ref: never) {
  return (
    <MapCanvasLayer
      mapRef={ref}
      onMapClick={vi.fn()}
      onMoveEnd={vi.fn()}
      displayedRestaurants={spots}
      selectedRestaurant={null}
      onRestaurantClick={vi.fn()}
      focusedRestaurantId={null}
      location={null}
    />
  );
}

describe('MapCanvasLayer viewport culling', () => {
  /* Ungrouping the markers took the default camera from 169 DOM markers to
     340 — und seit die Karte frei ist, sind es alle 465. Nur was nahe am
     Viewport liegt, bekommt einen Knoten, sonst landet die DOM-Last eines
     Icons pro Spot auf jedem Seitenaufruf. */
  const nearby = () => spot('nearby', { lat: 52.52, lng: 13.405 });
  const faraway = () => spot('faraway', { lat: 52.9, lng: 14.9 });

  it('skips spots outside the padded viewport', async () => {
    render(layerWithRef([nearby(), faraway()], mapRefWithBounds(13.3, 52.45, 13.5, 52.58)));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getByLabelText('nearby')).toBeTruthy();
    expect(screen.queryByLabelText('faraway')).toBeNull();
  });

  it('keeps a spot just outside the edge, because the window is padded', async () => {
    // 0.6 of the span on each side: a 0.2° wide window reaches 0.12° further.
    const justOutside = spot('just-outside', { lat: 52.52, lng: 13.58 });
    render(layerWithRef([justOutside], mapRefWithBounds(13.3, 52.45, 13.5, 52.58)));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getByLabelText('just-outside')).toBeTruthy();
  });

  it('renders everything when the map has not reported bounds yet', async () => {
    render(layer([nearby(), faraway()]));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getAllByRole('button')).toHaveLength(2);
  });
});

describe('MapCanvasLayer draws every spot on its own', () => {
  /* Markers used to be grouped by pixel radius. They are not any more (user
     decision 2026-08-19): a grouped pin hides which spot is underneath, and
     "hungry, standing here" wants to see and tap the actual spots. The
     assertions below are the ones that guard against grouping coming back by
     accident. */

  it('gives each pin its own marker even at one coordinate', async () => {
    render(layer([spot('spot-1'), spot('spot-2'), spot('spot-3')]));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getByLabelText('spot-1')).toBeTruthy();
    expect(screen.getByLabelText('spot-2')).toBeTruthy();
    expect(screen.getByLabelText('spot-3')).toBeTruthy();
  });

  it('draws the open spot once, not twice', async () => {
    // It is filtered out of its list and re-added last so it paints on top.
    const target = spot('spot-2');
    render(layer([spot('spot-1'), target, spot('spot-3')], target));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getAllByLabelText('spot-2')).toHaveLength(1);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('still gives a deep-linked spot a pin when it is outside the set', async () => {
    const target = spot('deep-linked');
    render(layer([spot('spot-1')], target));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getByLabelText('deep-linked')).toBeTruthy();
  });
});

/* Steht eine Detailansicht offen, tritt der Rest der Karte zurück — sonst
   verschwindet der eine Spot, um den es geht, zwischen 400 gleich hellen
   Pins, und genau darin sollte man sich umsehen können. */
describe('MapCanvasLayer dims everything but the open spot', () => {
  const dimmed = () => document.querySelectorAll('[class*="pinLogoDim"]');

  it('leaves every pin at full strength while no detail is open', async () => {
    render(layer(spread('spot-1', 'spot-2', 'spot-3')));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(dimmed()).toHaveLength(0);
  });

  it('dims the others but never the open spot', async () => {
    const target = spot('spot-2');
    render(layer([spot('spot-1'), target, spot('spot-3'), spot('spot-4')], target));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(dimmed()).toHaveLength(3);
    expect(screen.getByLabelText('spot-2').className).not.toMatch(/pinLogoDim/);
  });

  /* Ein offenes Must Eat setzt `selectedRestaurant` auf null (siehe
     handleMustEatClick), gehört aber zu einem Spot — auf der Karte ist das
     derselbe Punkt, und der muss stehen bleiben. */
  it('keeps the must-eat spot lit when nothing is selected', async () => {
    render(layer(spread('spot-1', 'spot-2'), null, 'spot-2'));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(dimmed()).toHaveLength(1);
    expect(screen.getByLabelText('spot-2').className).not.toMatch(/pinLogoDim/);
  });
});
