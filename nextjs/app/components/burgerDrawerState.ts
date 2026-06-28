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

export function openBurgerDrawer() {
  const drawer = document.getElementById('burgerDrawer');
  const openBtn = document.getElementById('burgerBtn');
  if (!drawer || drawer.classList.contains('active')) return;

  void preloadMapSurface();
  drawer.classList.add('active');
  drawer.removeAttribute('aria-hidden');
  openBtn?.setAttribute('aria-expanded', 'true');
  lockBody();
}

export function closeBurgerDrawer(restoreScroll = true) {
  const drawer = document.getElementById('burgerDrawer');
  if (!drawer?.classList.contains('active')) return;

  const openBtn = document.getElementById('burgerBtn');
  drawer.classList.remove('active');
  drawer.setAttribute('aria-hidden', 'true');
  openBtn?.setAttribute('aria-expanded', 'false');
  unlockBody(restoreScroll);
}
