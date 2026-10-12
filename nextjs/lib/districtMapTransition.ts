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
