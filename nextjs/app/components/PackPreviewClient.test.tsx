// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { MapMustEat } from '@/lib/types';
const state = vi.hoisted(() => ({
  user: { uid: 'a' } as { uid: string } | null,
  dataUid: 'a',
  cards: [] as MapMustEat[],
  revealed: new Set<string>(),
}));
const mapHook = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: state.user, loading: false }) }));
vi.mock('@/lib/map/useMapData', () => ({
  useMapData: () => {
    mapHook();
    return {
      dataUid: state.dataUid,
      mustEats: state.cards,
      revealedMustEatIds: state.revealed,
      restaurants: [{ _id: 'spot', categories: [{ slug: 'lunch' }, { slug: 'fast-food' }] }],
    };
  },
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
import PackPreviewClient from './PackPreviewClient';
const card = (id: string, dish: string): MapMustEat => ({
  _id: id,
  dish,
  image: `/api/must-eat-image/${id}`,
  restaurant: { _id: 'spot', name: 'Spot', slug: 'spot', lat: 0, lng: 0 },
});
afterEach(() => {
  cleanup();
  state.user = { uid: 'a' };
  state.dataUid = 'a';
  state.cards = [];
  state.revealed = new Set();
  mapHook.mockClear();
});
describe('account pack previews', () => {
  it.each([
    ['lunch', 'Rinderschaufel'],
    ['fast-food', 'Döner'],
  ])('prefers the requested dish for %s when authorized', (category, dish) => {
    state.cards = [card('other', 'Other dish'), card('preferred', dish)];
    state.revealed = new Set(['other', 'preferred']);
    const { getByRole, queryByText } = render(
      <PackPreviewClient locale="de" category={category} initialCard={null} />
    );
    expect(getByRole('heading').textContent).toBe(dish);
    expect(queryByText('Diese Karte ist für dich freigeschaltet.')).not.toBeNull();
  });
  it('never promotes a preferred dish without server authorization', () => {
    state.cards = [card('preferred', 'Rinderschaufel'), card('open', 'Open dish')];
    state.revealed = new Set(['open']);
    const { getByRole } = render(
      <PackPreviewClient locale="de" category="lunch" initialCard={null} />
    );
    expect(getByRole('heading').textContent).toBe('Open dish');
  });
  it('drops account content immediately on account change or logout', () => {
    state.cards = [card('owned', 'Rinderschaufel')];
    state.revealed = new Set(['owned']);
    const props = {
      locale: 'de' as const,
      category: 'lunch',
      initialCard: card('public', 'Public dish'),
    };
    const view = render(<PackPreviewClient {...props} />);
    expect(view.getByRole('heading').textContent).toBe('Rinderschaufel');
    state.user = { uid: 'b' };
    view.rerender(<PackPreviewClient {...props} />);
    expect(view.getByRole('heading').textContent).toBe('Public dish');
    state.user = null;
    view.rerender(<PackPreviewClient {...props} />);
    expect(view.getByRole('heading').textContent).toBe('Public dish');
  });
  it('does not load account data for guests', () => {
    state.user = null;
    const view = render(
      <PackPreviewClient locale="en" initialCard={card('public', 'Public dish')} />
    );
    expect(view.getByRole('heading').textContent).toBe('Public dish');
    expect(mapHook).not.toHaveBeenCalled();
  });
});
