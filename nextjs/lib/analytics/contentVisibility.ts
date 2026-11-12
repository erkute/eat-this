/** Hintergrundtabs sind keine sichtbare Inhaltszeit. */
export function isContentVisible(): boolean {
  return document.visibilityState === 'visible';
}
