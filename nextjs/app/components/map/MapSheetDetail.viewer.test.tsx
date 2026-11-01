// @vitest-environment jsdom
import { useRef, useState, type ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MapMustEat } from '@/lib/types';

// Wie der echte Zoom hält dieser Prüf-Doppelgänger sein Bild auch beim
// Rückflug und bei kurz fehlender Bildquelle. Nur Unmount verwirft es sofort.
vi.mock('./MustEatDetail', () => ({ default: function DetailWithRetainedZoom({ mustEat }: { mustEat: MapMustEat }) {
  const [phase, setPhase] = useState('closed');
  const image = useRef(mustEat.image);
  return <>
    <button onClick={() => setPhase('open')}>Open private zoom</button>
    <button onClick={() => setPhase('closing')}>Start return flight</button>
    {phase !== 'closed' && createPortal(<span data-testid="retained-private-image">{image.current}</span>, document.body)}
  </>;
} }));
vi.mock('./RestaurantDetail', () => ({ default: () => null }));
import MapSheetDetail from './MapSheetDetail';

const privateCard: MapMustEat = { _id: 'card', image: '/PRIVATE_ACCOUNT_IMAGE', restaurant: { _id: 'spot', name: 'Spot', slug: 'spot', lat: 0, lng: 0 } };
const initial: ComponentProps<typeof MapSheetDetail> = {
  kind: 'mustEat', contentRef: null, uid: 'owner', viewerKey: 'owner:ready', userTier: 'starter',
  userLocation: null, unlockedIds: new Set(['card']), mustEat: privateCard,
  locationError: null, onRequestLocation: vi.fn(), onUnlock: async () => true,
  onClose: vi.fn(), onViewRestaurant: vi.fn(), prevMustEat: null, nextMustEat: null,
  onPagePrev: vi.fn(), onPageNext: vi.fn(),
};
afterEach(cleanup);

describe('map detail viewer boundary', () => {
  for (const phase of ['open', 'closing']) {
    it.each(['owner:pending', 'other:ready', 'guest'])(`discards a ${phase} private zoom when viewer becomes %s`, viewerKey => {
      const page = render(<MapSheetDetail {...initial} />);
      fireEvent.click(screen.getByRole('button', { name: 'Open private zoom' }));
      if (phase === 'closing') fireEvent.click(screen.getByRole('button', { name: 'Start return flight' }));
      expect(screen.getByTestId('retained-private-image').textContent).toBe('/PRIVATE_ACCOUNT_IMAGE');
      page.rerender(<MapSheetDetail {...initial} viewerKey={viewerKey} mustEat={{ ...privateCard, image: undefined }} unlockedIds={new Set()} />);
      expect(screen.queryByTestId('retained-private-image')).toBeNull();
    });
  }
});
