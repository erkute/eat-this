/** Carry the chosen pack from the category overview into the head of its
 *  category page. The destination pack carries the same transition name in
 *  DiscoveryDetail.module.css; the new snapshot waits until its image is
 *  decoded, otherwise the pack would land as an empty box. */
export function transitionToCategory(pack: HTMLImageElement, slug: string, navigate: () => void) {
  pack.style.viewTransitionName = 'category-pack';
  document.documentElement.dataset.categoryEntering = '';
  const transition = document.startViewTransition(() => new Promise<void>(resolve => {
    const observer = new MutationObserver(check);
    const timeout = setTimeout(done, 3000);
    let arrived = false;
    function done() {
      clearTimeout(timeout);
      observer.disconnect();
      resolve();
    }
    function check() {
      if (arrived) return;
      const image = document.querySelector<HTMLImageElement>(`[data-category-pack="${CSS.escape(slug)}"] img`);
      if (!image) return;
      arrived = true;
      void image.decode().catch(() => {}).finally(done);
    }
    observer.observe(document.body, { childList: true, subtree: true });
    navigate();
    check();
  }));
  void transition.finished.catch(() => {}).finally(() => {
    pack.style.viewTransitionName = '';
    delete document.documentElement.dataset.categoryEntering;
  });
}
