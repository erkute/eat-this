// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

/* Der Drawer hängt an Übersetzung, Auth und dem next-intl-Router — für diesen
   Test zählt nur, was ein Klick auf einen Menü-Eintrag mit der Scrollposition
   macht. Die Link-Attrappe ruft `preventDefault`, wie Nexts `Link` es tut:
   sonst versucht jsdom zu navigieren und der Klick sagt nichts mehr aus. */
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, lang: 'de', setLang: vi.fn() }),
}));
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: null }),
  useLoginModal: () => ({ open: vi.fn() }),
}));
vi.mock('@/i18n/navigation', () => {
  const Anchor = ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    prefetch?: boolean;
  }) => {
    const { prefetch: _, ...attrs } = rest;
    return (
      <a href={href} onClick={(e) => e.preventDefault()} {...attrs}>
        {children}
      </a>
    );
  };
  return {
    Link: Anchor,
    usePathname: () => '/kategorie',
    useRouter: () => ({ prefetch: vi.fn(), push: vi.fn() }),
  };
});
vi.mock('./MapIntentLink', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href} onClick={(e) => e.preventDefault()}>
      {children}
    </a>
  ),
}));

import BurgerDrawer from './BurgerDrawer';
import { openBurgerDrawer } from './burgerDrawerState';

describe('BurgerDrawer scroll handover', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
    document.body.removeAttribute('style');
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 1500 });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: vi.fn((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }),
    });
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() });
  });

  /* Der Fehler, den das verhindert: unter 768px sperrt der Drawer den Body per
     `position: fixed`, und beim Schließen fährt er `window.scrollTo(0, storedY)`
     nach. Bei einem Menü-Link landete damit die Position der ALTEN Seite auf
     der neuen — live gemessen am 04.09.2026: /kategorie (y=1500) → /packs kam
     bei 1500 heraus. */
  it('gibt einem Menü-Link keine Scrollposition mit — die Zielseite beginnt oben', () => {
    render(<BurgerDrawer />);
    openBurgerDrawer();
    expect(document.body.dataset.burgerLockMode).toBe('fixed');

    fireEvent.click(screen.getByText('burger.categories'));

    expect(document.getElementById('burgerDrawer')?.classList.contains('active')).toBe(false);
    expect(document.body.style.position).toBe('');
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('legt die Position zurück, wenn das Menü nur weggetippt wird', () => {
    render(<BurgerDrawer />);
    openBurgerDrawer();

    fireEvent.click(document.getElementById('burgerClose') as HTMLButtonElement);

    expect(window.scrollTo).toHaveBeenCalledWith(0, 1500);
  });
});
