// @vitest-environment jsdom
import { act, useEffect, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapMustEat } from '@/lib/types';
import type { MustEatImageLightboxProps } from './map/MustEatImageLightbox';
const account = vi.hoisted(() => ({ uid: 'owner' as string | null, loading: false }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: account.uid ? { uid: account.uid } : null, loading: account.loading }) }));
vi.mock('next-intl', () => ({ useLocale: () => 'de' }));
vi.mock('./MapIntentLink', () => ({ default: ({ href, children, onClick }: { href: string; children: ReactNode; onClick: () => void }) => <a href={href} onClick={onClick}>{children}</a> }));
vi.mock('./map/LazyMustEatImageLightbox', () => ({ default: function MockLightbox({ active, originRect, onOpenReady, onExitComplete, imageUrl, alt, action, onClose }: MustEatImageLightboxProps & { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    if (originRect) onOpenReady?.();
    else onExitComplete?.();
  }, [active, originRect, onOpenReady, onExitComplete]);
  return active && originRect ? (
    <div role="dialog" aria-label={alt}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl!} alt={alt} />
      {action}<button onClick={onClose}>Close</button>
    </div>
  ) : null;
} }));
import { MustEatCardZoomProvider, MustEatZoomCard } from './MustEatCardZoom';
const card: MapMustEat = { _id: 'card', dish: 'Private dish', image: '/api/must-eat-image/card', restaurant: { _id: 'spot', name: 'Spot', slug: 'spot', lat: 0, lng: 0 } };
let host: HTMLDivElement, root: Root;
const render = (image = card.image!, imageAlt = card.dish!) => root.render(<MustEatCardZoomProvider><MustEatZoomCard card={card} imageUrl={image} imageAlt={imageAlt}>Card</MustEatZoomCard></MustEatCardZoomProvider>);
beforeEach(async () => {
  account.uid = 'owner'; account.loading = false;
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => render());
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

describe('catalogue card zoom', () => {
  it('opens the selected artwork and offers its spot on the map', async () => {
    await act(async () => (host.querySelector('[aria-haspopup]') as HTMLButtonElement).click());
    expect(host.querySelector('[role="dialog"] img')?.getAttribute('src')).toBe(card.image);
    expect(host.querySelector('a')?.getAttribute('href')).toBe('/map?r=spot');
    expect(host.querySelector('a')?.textContent).toBe('Zum Spot');
    expect((host.querySelector('[aria-haspopup]') as HTMLElement).style.visibility).toBe('hidden');
    await act(async () => (host.querySelector('[role="dialog"] button') as HTMLButtonElement).click());
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect((host.querySelector('[aria-haspopup]') as HTMLElement).style.visibility).not.toBe('hidden');
    expect(document.activeElement).toBe(host.querySelector('[aria-haspopup]'));
  });
  it('zooms the covered face without announcing a hidden dish', async () => {
    await act(async () => render('/pics/card-back.webp', 'Verdeckt'));
    await act(async () => (host.querySelector('[aria-haspopup]') as HTMLButtonElement).click());
    expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Verdeckt');
    expect(host.querySelector('[role="dialog"] img')?.getAttribute('src')).toContain('card-back');
  });
  it.each([null, 'other-account'])('closes private artwork when the account becomes %s', async uid => {
    await act(async () => (host.querySelector('[aria-haspopup]') as HTMLButtonElement).click());
    account.uid = uid;
    await act(async () => render());
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });
});
