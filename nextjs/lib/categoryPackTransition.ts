let flying = false;

/** Carry the chosen pack from the category overview into the head of its
 *  category page. The destination pack carries the same transition name in
 *  DiscoveryDetail.module.css; the new snapshot waits until its image is
 *  decoded, otherwise the pack would land as an empty box. */
export function transitionToCategory(pack: HTMLImageElement, slug: string, navigate: () => void) {
  // A second tap mid-flight would skip the first transition, whose cleanup
  // then strips the names the second one just set.
  if (flying) return;
  flying = true;
  // Leaving one category for another („Oder doch …?"): the current head pack
  // carries the same name, and two of them would abort the transition.
  const leaving = Array.from(document.querySelectorAll<HTMLImageElement>('[data-category-pack] img'));
  leaving.forEach(image => { image.style.viewTransitionName = 'none'; });
  pack.style.viewTransitionName = 'category-pack';
  document.documentElement.dataset.categoryEntering = '';
  const transition = document.startViewTransition(() => new Promise<void>(resolve => {
    const observer = new MutationObserver(check);
    // The screen stays frozen while we wait; on a slow network, give up on
    // the flight early rather than hold the old page.
    const timeout = setTimeout(done, 1500);
    let arrived = false;
    function done() {
      clearTimeout(timeout);
      observer.disconnect();
      // React may reuse the head image across categories; whatever is on
      // screen now needs its stylesheet name back.
      leaving.forEach(image => { image.style.viewTransitionName = ''; });
      resolve();
    }
    function check() {
      if (arrived) return;
      const image = document.querySelector<HTMLImageElement>(`[data-category-pack="${CSS.escape(slug)}"] img`);
      if (!image) return;
      arrived = true;
      image.style.viewTransitionName = '';
      void image.decode().catch(() => {}).finally(done);
    }
    observer.observe(document.body, { childList: true, subtree: true });
    navigate();
    check();
  }));
  void transition.finished.catch(() => {}).finally(() => {
    pack.style.viewTransitionName = '';
    delete document.documentElement.dataset.categoryEntering;
    flying = false;
  });
}
