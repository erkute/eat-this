type Box = { top: number; height: number };

const EDGE: Record<string, number> = { top: 0, center: 0.5, bottom: 1 };

/**
 * Wie weit ein Element auf seiner Scrollstrecke ist (0 … 1), in der Notation,
 * die ScrollTrigger dafür hatte: „top 70%" heißt „Oberkante des Elements auf
 * 70 % der Höhe des Scrollbereichs". `top|center|bottom` fürs Element,
 * `top|center|bottom|N%` für den Bereich — mehr braucht die Startseite nicht.
 * Beide Rechtecke im selben Koordinatensystem (getBoundingClientRect).
 */
export function scrollProgress(el: Box, view: Box, start: string, end: string): number {
  // Wie weit die genannte Kante noch unter ihrer Marke steht (> 0 = noch
  // nicht erreicht). Beim Hinunterscrollen schrumpfen beide Abstände im
  // Gleichschritt, der Start kommt zuerst.
  const gap = (spec: string) => {
    const [edge, mark = 'top'] = spec.split(' ');
    const at = mark.endsWith('%') ? parseFloat(mark) / 100 : (EDGE[mark] ?? 0);
    return el.top + el.height * (EDGE[edge] ?? 0) - (view.top + view.height * at);
  };
  const toStart = gap(start);
  const span = gap(end) - toStart;
  if (span <= 0) return toStart > 0 ? 0 : 1;
  return Math.min(1, Math.max(0, -toStart / span));
}
