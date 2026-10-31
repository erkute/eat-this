let finishNavigation: (() => void) | undefined;

/** Hold the new snapshot until the destination map has mounted. */
export function transitionToDistrictMap(navigate: () => void) {
  if (!document.startViewTransition) { navigate(); return; }
  document.startViewTransition(() => new Promise<void>(resolve => {
    const timeout = window.setTimeout(done, 3000);
    function done() {
      window.clearTimeout(timeout);
      finishNavigation = undefined;
      resolve();
    }
    finishNavigation = done;
    navigate();
  }));
}

export function districtMapReady() { finishNavigation?.(); }

/** Carry the selected shape to its actual position in the district header.
 *  `fill` is the colour the shape has at the moment of the click. */
export function transitionToDistrict(path: SVGPathElement, slug: string, navigate: () => void, fill = '#000') {
  const bounds = path.getBBox();
  const screen = path.getBoundingClientRect();
  const pad = Math.max(bounds.width, bounds.height) * .08;
  const scale = screen.width / bounds.width;
  const snapshot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  snapshot.setAttribute('viewBox', `${bounds.x - pad} ${bounds.y - pad} ${bounds.width + pad * 2} ${bounds.height + pad * 2}`);
  snapshot.setAttribute('aria-hidden', 'true');
  Object.assign(snapshot.style, {
    position: 'fixed', left: `${screen.left - pad * scale}px`, top: `${screen.top - pad * scale}px`,
    width: `${(bounds.width + pad * 2) * scale}px`, height: `${(bounds.height + pad * 2) * scale}px`,
    pointerEvents: 'none', zIndex: '1000', viewTransitionName: 'district-opening',
    fill, stroke: 'var(--et-white)', strokeWidth: '1.5',
  });
  snapshot.append(path.cloneNode(true));
  document.body.append(snapshot);
  const oldVisibility = path.style.visibility;
  path.style.visibility = 'hidden';
  document.documentElement.dataset.districtEntering = '';
  const transition = document.startViewTransition(() => new Promise<void>(resolve => {
    const observer = new MutationObserver(check);
    function done() {
      clearTimeout(timeout);
      observer.disconnect();
      snapshot.remove();
      path.style.visibility = oldVisibility;
      resolve();
    }
    function check() {
      if (document.querySelector(`[data-district-outline="${CSS.escape(slug)}"]`)) done();
    }
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = setTimeout(done, 3000);
    navigate();
    check();
  }));
  void transition.finished.catch(() => {}).finally(() => {
    snapshot.remove();
    path.style.visibility = oldVisibility;
    delete document.documentElement.dataset.districtEntering;
  });
}
