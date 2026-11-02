/** Give the blocking consent question priority over map initialization. */
export function afterConsentGate(run: () => void): () => void {
  const root = document.documentElement;
  const blocked = () => root.hasAttribute('data-consent-pending') || root.getAttribute('data-consent-gate') === 'open';
  if (!blocked()) {
    run();
    return () => {};
  }
  const observer = new MutationObserver(() => {
    if (blocked()) return;
    observer.disconnect();
    run();
  });
  observer.observe(root, { attributes: true, attributeFilter: ['data-consent-pending', 'data-consent-gate'] });
  return () => observer.disconnect();
}
