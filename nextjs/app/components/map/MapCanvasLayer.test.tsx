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

/* Ein gesperrter Spot trägt seit dem 27.08.2026 denselben Pin wie ein freier,
   nur in Grau — und heißt wie das Restaurant, wie jeder Marker. Was die beiden
   hier auseinanderhält, ist deshalb die Grau-Klasse, nicht mehr der Punkt. */
const lockedPins = () => document.querySelectorAll('[class*="pinLogoLocked"]');

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
  free: MapRestaurant[],
  locked: MapRestaurant[],
  selected: MapRestaurant | null = null,
  selectedIsLocked = false,
  focusedRestaurantId: string | null = selected?._id ?? null
) {
  return (
    <MapCanvasLayer
      mapRef={{ current: null }}
      onMapClick={vi.fn()}
      onMoveEnd={vi.fn()}
      displayedRestaurants={free}
      displayedLockedRestaurants={locked}
      selectedRestaurant={selected}
      selectedIsLocked={selectedIsLocked}
      onRestaurantClick={vi.fn()}
      onLockedClick={vi.fn()}
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

function layerWithRef(free: MapRestaurant[], locked: MapRestaurant[], ref: never) {
  return (
    <MapCanvasLayer
      mapRef={ref}
      onMapClick={vi.fn()}
      onMoveEnd={vi.fn()}
      displayedRestaurants={free}
      displayedLockedRestaurants={locked}
      selectedRestaurant={null}
      selectedIsLocked={false}
      onRestaurantClick={vi.fn()}
      onLockedClick={vi.fn()}
      focusedRestaurantId={null}
      location={null}
    />
  );
}

describe('MapCanvasLayer viewport culling', () => {
  /* Ungrouping the markers took the default camera from 169 DOM markers to
     340. Only what is near the viewport gets a node, or the DOM cost of one
     spot per icon lands on every page load. */
  const nearby = () => spot('nearby', { lat: 52.52, lng: 13.405 });
  const faraway = () => spot('faraway', { lat: 52.9, lng: 14.9 });

  it('skips spots outside the padded viewport', async () => {
    render(layerWithRef([nearby(), faraway()], [], mapRefWithBounds(13.3, 52.45, 13.5, 52.58)));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getByLabelText('nearby')).toBeTruthy();
    expect(screen.queryByLabelText('faraway')).toBeNull();
  });

  it('culls the locked dots on the same window', async () => {
    render(layerWithRef([], [nearby(), faraway()], mapRefWithBounds(13.3, 52.45, 13.5, 52.58)));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(lockedPins()).toHaveLength(1);
  });

  it('keeps a spot just outside the edge, because the window is padded', async () => {
    // 0.6 of the span on each side: a 0.2° wide window reaches 0.12° further.
    const justOutside = spot('just-outside', { lat: 52.52, lng: 13.58 });
    render(layerWithRef([justOutside], [], mapRefWithBounds(13.3, 52.45, 13.5, 52.58)));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getByLabelText('just-outside')).toBeTruthy();
  });

  it('renders everything when the map has not reported bounds yet', async () => {
    render(layer([nearby(), faraway()], []));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getAllByRole('button')).toHaveLength(2);
  });
});

describe('MapCanvasLayer locked spots', () => {
  it('draws one dot per locked spot alongside the free pins', async () => {
    render(layer(spread('free-1', 'free-2'), spread('locked-1', 'locked-2', 'locked-3')));

    // Markers are held back until the basemap reports its first paint; the
    // fallback timer reveals them regardless.
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(lockedPins()).toHaveLength(3);
    expect(screen.getAllByLabelText(/^locked-/)).toHaveLength(3);
    expect(screen.getAllByLabelText(/^free-/)).toHaveLength(2);
  });

  it('renders the dots before the pins so an overlapping pin wins the tap', async () => {
    render(layer(spread('free-1'), spread('locked-1', 'locked-2')));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    // MapLibre stacks markers purely by DOM order — it sets no z-index — so
    // "locked first" is what keeps a free pin on top of the dots around it.
    const labels = screen.getAllByRole('button').map((el) => el.getAttribute('aria-label'));
    expect(labels).toEqual(['locked-1', 'locked-2', 'free-1']);
  });

  it('does not hand an open locked spot the free-spot pin', async () => {
    // The "selected spot may sit outside the visible set" fallback exists for
    // deep links. Ein gesperrter Spot ist schon als grauer Pin gezeichnet, und
    // ein zweiter, gelber auf derselben Koordinate wäre ein Spot zu viel.
    const target = spot('locked-1');
    render(layer([spot('free-1')], [target], target, true));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    const marker = screen.getAllByLabelText('locked-1');
    expect(marker).toHaveLength(1);
    // Die Grau-Klasse sitzt am Knopf selbst, nicht in ihm.
    expect(marker[0].className).toMatch(/pinLogoLocked/);
    expect(lockedPins()).toHaveLength(1);
  });

  it('still gives a deep-linked free spot a pin when it is outside the set', async () => {
    const target = spot('deep-linked');
    render(layer([spot('free-1')], [], target, false));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getByLabelText('deep-linked')).toBeTruthy();
  });

  it('draws nothing extra when no locked spot matches the filter', async () => {
    render(layer([spot('free-1')], []));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(lockedPins()).toHaveLength(0);
  });
});

describe('MapCanvasLayer draws every spot on its own', () => {
  /* Markers used to be grouped by pixel radius. They are not any more (user
     decision 2026-08-19): a grouped pin hides which spot is underneath, and
     "hungry, standing here" wants to see and tap the actual spots. The
     assertions below are the ones that guard against grouping coming back by
     accident. */

  it('gives each free pin its own marker even at one coordinate', async () => {
    render(layer([spot('free-1'), spot('free-2'), spot('free-3')], []));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getByLabelText('free-1')).toBeTruthy();
    expect(screen.getByLabelText('free-2')).toBeTruthy();
    expect(screen.getByLabelText('free-3')).toBeTruthy();
  });

  it('gives each locked dot its own marker too', async () => {
    render(layer([], [spot('locked-1'), spot('locked-2'), spot('locked-3'), spot('locked-4')]));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(lockedPins()).toHaveLength(4);
    expect(screen.getByLabelText('locked-4')).toBeTruthy();
  });

  it('draws the open spot once, not twice', async () => {
    // It is filtered out of its list and re-added last so it paints on top.
    const target = spot('free-2');
    render(layer([spot('free-1'), target, spot('free-3')], [], target, false));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getAllByLabelText('free-2')).toHaveLength(1);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('draws an open locked spot once', async () => {
    const target = spot('locked-2');
    render(layer([], [spot('locked-1'), target, spot('locked-3')], target, true));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(lockedPins()).toHaveLength(3);
    expect(screen.getAllByLabelText('locked-2')).toHaveLength(1);
  });

  it('still paints the dots before the pins where they overlap', async () => {
    render(layer([spot('free-1'), spot('free-2')], [spot('locked-1'), spot('locked-2')]));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    const labels = screen.getAllByRole('button').map((el) => el.getAttribute('aria-label'));
    expect(labels).toEqual(['locked-1', 'locked-2', 'free-1', 'free-2']);
  });
});

/* Steht eine Detailansicht offen, tritt der Rest der Karte zurück — sonst
   verschwindet der eine Spot, um den es geht, zwischen 400 gleich hellen
   Pins, und genau darin sollte man sich umsehen können. */
describe('MapCanvasLayer dims everything but the open spot', () => {
  const dimmed = () => document.querySelectorAll('[class*="pinLogoDim"]');

  it('leaves every pin at full strength while no detail is open', async () => {
    render(layer(spread('free-1', 'free-2'), spread('locked-1')));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(dimmed()).toHaveLength(0);
  });

  it('dims the others but never the open spot', async () => {
    const target = spot('free-2');
    render(layer([spot('free-1'), target, spot('free-3')], [spot('locked-1')], target, false));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    // free-1, free-3 und der gesperrte Spot — der offene bleibt hell.
    expect(dimmed()).toHaveLength(3);
    expect(screen.getByLabelText('free-2').className).not.toMatch(/pinLogoDim/);
  });

  it('dims around an open locked spot as well', async () => {
    const target = spot('locked-1');
    render(layer([spot('free-1')], [target, spot('locked-2')], target, true));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(dimmed()).toHaveLength(2);
    expect(screen.getByLabelText('locked-1').className).not.toMatch(/pinLogoDim/);
  });

  /* Ein offenes Must Eat setzt `selectedRestaurant` auf null (siehe
     handleMustEatClick), gehört aber zu einem Spot — auf der Karte ist das
     derselbe Punkt, und der muss stehen bleiben. */
  it('keeps the must-eat spot lit when nothing is selected', async () => {
    render(layer(spread('free-1', 'free-2'), [], null, false, 'free-2'));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(dimmed()).toHaveLength(1);
    expect(screen.getByLabelText('free-2').className).not.toMatch(/pinLogoDim/);
  });
});
