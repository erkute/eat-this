'use client';

const BURGER_CANVAS_COLOR = '#15120e';
let focusBeforeDrawer: HTMLElement | null = null;
let settleCleanup: (() => void) | null = null;

/* Die Wort-Kaskade (CSS: `.bd-settled`) startet erst, wenn die Tür steht.
   Der Öffnungs-Frame trägt schon den lockBody-Reflow, den Canvas-Tint und
   den ersten Panel-Raster — acht gleichzeitig anlaufende Animationen
   obendrauf waren das Ruckeln (Performance-Trace, 30.08.2026). Das
   transitionend des Panels ist der Taktgeber; der Timeout fängt den Fall,
   dass es nie feuert (z. B. Panel schon an Ort und Stelle). */
function disarmSettle() {
  settleCleanup?.();
  settleCleanup = null;
}

function armSettle(drawer: HTMLElement) {
  disarmSettle();
  const panel = drawer.querySelector<HTMLElement>('.burger-drawer-panel');
  const settle = () => {
    disarmSettle();
    drawer.classList.add('bd-settled');
  };
  const onEnd = (event: TransitionEvent) => {
    if (event.target === panel && event.propertyName === 'transform') settle();
  };
  const timer = window.setTimeout(settle, 420);
  panel?.addEventListener('transitionend', onEnd);
  settleCleanup = () => {
    window.clearTimeout(timer);
    panel?.removeEventListener('transitionend', onEnd);
  };
}

function tintMobileCanvasForDrawer() {
  if (!window.matchMedia('(max-width: 1023.98px)').matches) return;

  document.documentElement.dataset.burgerPrevBg = document.documentElement.style.backgroundColor;
  document.body.dataset.burgerPrevBg = document.body.style.backgroundColor;
  document.documentElement.style.backgroundColor = BURGER_CANVAS_COLOR;
  document.body.style.backgroundColor = BURGER_CANVAS_COLOR;
}

function restoreMobileCanvasTint() {
  if ('burgerPrevBg' in document.documentElement.dataset) {
    document.documentElement.style.backgroundColor =
      document.documentElement.dataset.burgerPrevBg || '';
    delete document.documentElement.dataset.burgerPrevBg;
  }
  if ('burgerPrevBg' in document.body.dataset) {
    document.body.style.backgroundColor = document.body.dataset.burgerPrevBg || '';
    delete document.body.dataset.burgerPrevBg;
  }
}

function lockBody() {
  if (document.body.dataset.burgerLockMode) return;

  tintMobileCanvasForDrawer();

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
  restoreMobileCanvasTint();
}

export function openBurgerDrawer() {
  const drawer = document.getElementById('burgerDrawer');
  const openBtn = document.getElementById('burgerBtn');
  if (!drawer || drawer.classList.contains('active')) return;

  focusBeforeDrawer = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  lockBody();
  drawer.hidden = false;
  drawer.removeAttribute('inert');
  drawer.removeAttribute('aria-hidden');
  openBtn?.setAttribute('aria-expanded', 'true');
  // Record the off-canvas panel state after leaving display:none so adding
  // .active below still animates the opening transform.
  void drawer.offsetWidth;
  drawer.classList.add('active');
  armSettle(drawer);
  window.requestAnimationFrame(() => {
    document.getElementById('burgerClose')?.focus({ preventScroll: true });
  });
}

export function closeBurgerDrawer(restoreScroll = true) {
  const drawer = document.getElementById('burgerDrawer');
  if (!drawer?.classList.contains('active')) return;

  const openBtn = document.getElementById('burgerBtn');
  disarmSettle();
  drawer.classList.remove('active');
  drawer.classList.remove('bd-settled');
  drawer.setAttribute('aria-hidden', 'true');
  drawer.setAttribute('inert', '');
  openBtn?.setAttribute('aria-expanded', 'false');
  // iOS Safari can keep sampling an opacity-hidden fixed layer behind its URL
  // and status bars. Remove the full-screen ink sheet from rendering before
  // restoring the page canvas and scroll position.
  drawer.hidden = true;
  void drawer.offsetWidth;
  unlockBody(restoreScroll);
  const restoreTarget = focusBeforeDrawer;
  focusBeforeDrawer = null;
  if (restoreScroll) {
    window.requestAnimationFrame(() => restoreTarget?.focus({ preventScroll: true }));
  }
}
