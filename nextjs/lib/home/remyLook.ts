/**
 * Remys Blick als Verformung der Zeichnung (Ansage 01.10.2026: „was machen
 * wir mit seinem Gesicht? Das muss sich in diese Richtung bewegen … ein
 * bisschen nach rechts und links und oben und unten gucken"). Neu zeichnen
 * lässt sich der Kopf nicht; aber wie bei einer echten Drehung wandern die
 * Gesichtszüge — Brille, Nase, Schnurrbart, Mund — in Blickrichtung, während
 * der Kopfumriss stehen bleibt und die Haut dazwischen sich dehnt. Das Ohr
 * auf der Seite, zu der er schaut, rutscht ein Stück hinter die Wange. Hals
 * und Schultern bleiben, wo sie sind.
 *
 * Koordinaten im 1024er-Quadrat von /buddy/buddy.webp (gemessen 01.10.2026:
 * Gläser y 236–338, x 384–638; Kopf bis Kinn y ≈ 440; Ohren bei x ≈ 322 und
 * 702). `look` ist -1…1 je Achse; +x schaut nach rechts, +y nach unten.
 */
export type Point = { x: number; y: number };

/** Wie weit die Züge höchstens wandern (px im 1024er-Bild). */
export const LOOK_SHIFT = { x: 40, y: 26 } as const;

const FACE = { x: 512, y: 300, rx: 205, ry: 200 };
const EAR = { y: 300, rx: 42, ry: 75, left: 322, right: 702 };

const smooth = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const gauss = (p: Point, x: number, y: number, rx: number, ry: number) =>
  Math.exp(-2 * (((p.x - x) / rx) ** 2 + ((p.y - y) / ry) ** 2));

export function lookPose(lx: number, ly: number) {
  return (p: Point): Point => {
    // Der Kern des Gesichts wandert starr, zum Umriss hin klingt es aus.
    const r = Math.hypot((p.x - FACE.x) / FACE.rx, (p.y - FACE.y) / FACE.ry);
    const face = 1 - smooth(0.5, 1, r);
    let x = p.x + lx * LOOK_SHIFT.x * face;
    const y = p.y + ly * LOOK_SHIFT.y * face;
    // Das zugewandte Ohr rückt nach innen, das abgewandte bleibt.
    x -= Math.max(lx, 0) * 18 * gauss(p, EAR.right, EAR.y, EAR.rx, EAR.ry);
    x -= Math.min(lx, 0) * 18 * gauss(p, EAR.left, EAR.y, EAR.rx, EAR.ry);
    return { x, y };
  };
}
