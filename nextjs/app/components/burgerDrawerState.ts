'use client';

import { preloadMapSurface } from './map/preloadMapSurface';

function lockBody() {
  if (document.body.dataset.burgerLockMode) return;

  if (window.innerWidth < 768) {
    document.body.dataset.burgerLockMode = 'fixed';
    document.body.dataset.burgerLockY = String(window.scrollY);
    document.body.style.position = 'fixed';
    document.body.style.top = `-${window.scrollY}px`;
    document.body.style.width = '100%';
    return;
  }

  document.body.dataset.burgerLockMode = 'overflow';
  document.body.dataset.burgerPrevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
}

function unlockBody(restoreScroll: boolean) {
  const lockMode = document.body.dataset.burgerLockMode;
  if (lockMode === 'fixed') {
    const storedY = parseInt(document.body.dataset.burgerLockY || '0', 10) || 0;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    if (restoreScroll) requestAnimationFrame(() => window.scrollTo(0, storedY));
  } else if (lockMode === 'overflow') {
    document.body.style.overflow = document.body.dataset.burgerPrevOverflow || '';
  }

  delete document.body.dataset.burgerLockMode;
  delete document.body.dataset.burgerLockY;
  delete document.body.dataset.burgerPrevOverflow;
}

function preloadMapAfterDrawerOpen() {
  window.setTimeout(() => {
    const run = () => void preloadMapSurface();
    const ric = window.requestIdleCallback as
      | ((cb: IdleRequestCallback, opts?: IdleRequestOptions) => number)
      | undefined;

    if (ric) {
      ric(run, { timeout: 1200 });
      return;
    }

    run();
  }, 420);
}

export function openBurgerDrawer() {
  const drawer = document.getElementById('burgerDrawer');
  const openBtn = document.getElementById('burgerBtn');
  if (!drawer || drawer.classList.contains('active')) return;

  lockBody();
  drawer.removeAttribute('inert');
  drawer.removeAttribute('aria-hidden');
  openBtn?.setAttribute('aria-expanded', 'true');
  drawer.classList.add('active');
  preloadMapAfterDrawerOpen();
}

export function closeBurgerDrawer(restoreScroll = true) {
  const drawer = document.getElementById('burgerDrawer');
  if (!drawer?.classList.contains('active')) return;

  const openBtn = document.getElementById('burgerBtn');
  drawer.classList.remove('active');
  drawer.setAttribute('aria-hidden', 'true');
  drawer.setAttribute('inert', '');
  openBtn?.setAttribute('aria-expanded', 'false');
  unlockBody(restoreScroll);
}
