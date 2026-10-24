// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import type MapCanvasLayer from './MapCanvasLayer';

const download = vi.hoisted(() => {
  let finish!: () => void;
  const ready = new Promise<void>((resolve) => { finish = resolve; });
  return { ready, finish };
});

vi.mock('./MapCanvasLayer', async () => {
  await download.ready;
  return {
    default: ({ displayedRestaurants }: ComponentProps<typeof MapCanvasLayer>) => (
      <div aria-label="map-canvas">{displayedRestaurants.map((r) => r.name).join(', ')}</div>
    ),
  };
});

import LazyMapCanvasLayer from './LazyMapCanvasLayer';

describe('Map canvas download', () => {
  it('keeps the placeholder and honours changed filters when a slow download completes', async () => {
    const props: ComponentProps<typeof MapCanvasLayer> = {
      mapRef: { current: null },
      getInitialCamera: () => null,
      onMapClick: vi.fn(),
      onMoveEnd: vi.fn(),
      displayedRestaurants: [],
      selectedRestaurant: null,
      onRestaurantClick: vi.fn(),
      focusedRestaurantId: null,
      location: null,
    };
    const { container, rerender } = render(<LazyMapCanvasLayer {...props} />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
    const restaurant = { _id: 'filtered', name: 'Filtered spot' } as ComponentProps<typeof MapCanvasLayer>['displayedRestaurants'][number];
    rerender(<LazyMapCanvasLayer {...props} displayedRestaurants={[restaurant]} />);
    await act(async () => { download.finish(); await download.ready; });
    expect((await screen.findByLabelText('map-canvas')).textContent).toBe('Filtered spot');
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
