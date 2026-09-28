'use client';
import { useEffect, useState } from 'react';

/** So lange muss nach der letzten Geste Ruhe sein. */
export const EXPLORATION_SETTLE_MS = 1500;

/**
 * Hat der Besucher die Karte schon angefasst — verschoben, gezoomt, die Liste
 * gescrollt — und ist die Geste zur Ruhe gekommen?
 *
 * Die Standort-Frage kam bis 28.09.2026 800 ms nach der Cookie-Antwort: zwei
 * Dialoge hintereinander, bevor man die Karte überhaupt gesehen hatte. Jetzt
 * wartet sie hierauf. Die Ruhe-Frist verhindert, dass die Frage samt Scrim
 * mitten ins Wischen springt.
 *
 * Gezählt wird Eingabe, nicht Bewegung: Scrollrad, Wischen, Ziehen mit
 * gedrückter Maustaste. Programmatisches Scrollen (Scroll-Keeper, Detail
 * öffnen) und blosses Überfahren mit der Maus sind keine Geste. Kommt keine,
 * bleibt es aus.
 */
export function useExplorationSettled(): boolean {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (settled) return;
    let timer: number | undefined;
    const onGesture = (event: Event) => {
      if (event.type === 'pointermove' && !(event as PointerEvent).buttons) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setSettled(true), EXPLORATION_SETTLE_MS);
    };
    const options = { passive: true, capture: true };
    window.addEventListener('wheel', onGesture, options);
    window.addEventListener('touchmove', onGesture, options);
    window.addEventListener('pointermove', onGesture, options);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('wheel', onGesture, options);
      window.removeEventListener('touchmove', onGesture, options);
      window.removeEventListener('pointermove', onGesture, options);
    };
  }, [settled]);

  return settled;
}
