/** Blockierende Einwilligung und Hintergrundtabs sind keine sichtbare Inhaltszeit. */
export function isContentVisible(): boolean {
  return (
    document.visibilityState === 'visible' &&
    !document.documentElement.hasAttribute('data-consent-pending') &&
    document.documentElement.dataset.consentGate !== 'open'
  );
}
