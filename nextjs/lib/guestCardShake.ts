'use client';

/**
 * Der Tipp auf einen Kartenrücken ohne Konto: erst zittert die Karte, dann
 * öffnet das Anmeldeformular (Betreiber, 07.09.2026 — „genauso vibriert und
 * zittert, und dann kommt das Anmeldefenster"). Map-Detail und
 * Startseiten-Teaser teilen sich Dauer und Reduced-Motion-Regel, damit
 * derselbe Griff sich überall gleich anfühlt.
 *
 * Die Dauer steht zwangsläufig doppelt: hier und als `animation-duration` in
 * den beiden CSS-Modulen (`.mustEatCardTapping` in MapDetails,
 * `.photoTapping` im Teaser). CSS-Module vergeben eigene Keyframe-Namen, eine
 * gemeinsame Animation gibt es also nicht — die Zahl muss zusammen wandern.
 */
export const GUEST_SHAKE_MS = 520;

/** Ohne Bewegung wäre die Wartezeit ein toter Moment — dann sofort öffnen. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
