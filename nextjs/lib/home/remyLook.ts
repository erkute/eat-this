/**
 * Remys Blick als Verformung der Zeichnung (Ansage 01.10.2026: „was machen
 * wir mit seinem Gesicht? Das muss sich in diese Richtung bewegen … ein
 * bisschen nach rechts und links und oben und unten gucken"; danach: „nimm
 * seinen ganzen Kopf … das Kinn und den oberen Kopfbereich mehr bewegen").
 * Neu zeichnen lässt sich der Kopf nicht; also bewegt sich der ganze Kopf —
 * Scheitel bis Kinn — als Einheit: er verschiebt sich in Blickrichtung und
 * neigt sich leicht um die Halsbasis. Das Gesicht (Brille, Nase,
 * Schnurrbart, Mund und — Ansage 01.10.2026 abends: „Kinn auch
 * mitbewegen" — Kinn und Kieferlinie) wandert noch ein Stück weiter als der
 * Umriss des Schädels, so wirkt es wie eine Drehung und nicht wie ein
 * Schieben. Bis dahin lief die Gesichtszone schon über dem Kinn aus: Brille
 * und Schnurrbart wanderten, das Kinn blieb fast stehen. Das Ohr auf der
 * Seite, zu der er schaut, rutscht hinter die Wange. Der Hals dehnt sich,
 * die Schultern bleiben, wo sie sind.
 *
 * Koordinaten im 1024er-Quadrat von /buddy/buddy.webp (gemessen 01.10.2026:
 * Gläser y 236–338, x 384–638; Kinn y ≈ 440; Hals y 480–590, 220px breit;
 * Schultern ab y ≈ 600; Ohren bei x ≈ 322 und 702). `look` ist -1…1 je
 * Achse; +x schaut nach rechts, +y nach unten.
 */
export type Point = { x: number; y: number };

/** Wie weit der ganze Kopf wandert (px im 1024er-Bild). */
export const HEAD_SHIFT = { x: 44, y: 30 } as const;
/** Wie weit die Gesichtszüge insgesamt wandern — Kopf plus Drehung. */
export const LOOK_SHIFT = { x: 64, y: 44 } as const;
/** Neigung um die Halsbasis je Einheit Blick zur Seite (rad, ~1,7°). Klein
 *  gehalten: die Neigung schwingt den Scheitel weit und das Kinn kaum — mit
 *  ~3° blieb das Kinn stehen, während der Kopf oben wanderte. */
const TILT = 0.03;

const NECK = { top: 450, bottom: 600 };
const PIVOT = { x: 512, y: 600 };
/** Die Gesichtszone: voll bis über Kinn und Kiefer (r < 0,6), läuft zum
 *  Schädelumriss und in den Hals aus. */
const FACE = { x: 512, y: 330, rx: 210, ry: 235 };
const EAR = { y: 300, rx: 42, ry: 75, left: 322, right: 702 };

const smooth = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const gauss = (p: Point, x: number, y: number, rx: number, ry: number) =>
  Math.exp(-2 * (((p.x - x) / rx) ** 2 + ((p.y - y) / ry) ** 2));

export function lookPose(lx: number, ly: number) {
  return (p: Point): Point => {
    // Der ganze Kopf bis zum Kinn, über den Hals ausklingend.
    const head = 1 - smooth(NECK.top, NECK.bottom, p.y);
    const angle = lx * TILT * head;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = p.x - PIVOT.x;
    const dy = p.y - PIVOT.y;
    let x = PIVOT.x + dx * cos - dy * sin + lx * HEAD_SHIFT.x * head;
    let y = PIVOT.y + dx * sin + dy * cos + ly * HEAD_SHIFT.y * head;
    // Das Gesicht samt Kinn wandert weiter als der Umriss — das macht die
    // Drehung. Unter dem Kinn klingt es mit dem Hals aus.
    const r = Math.hypot((p.x - FACE.x) / FACE.rx, (p.y - FACE.y) / FACE.ry);
    const face = (1 - smooth(0.6, 1.05, r)) * head;
    x += lx * (LOOK_SHIFT.x - HEAD_SHIFT.x) * face;
    y += ly * (LOOK_SHIFT.y - HEAD_SHIFT.y) * face;
    // Das zugewandte Ohr rückt nach innen, das abgewandte bleibt.
    x -= Math.max(lx, 0) * 18 * gauss(p, EAR.right, EAR.y, EAR.rx, EAR.ry);
    x -= Math.min(lx, 0) * 18 * gauss(p, EAR.left, EAR.y, EAR.rx, EAR.ry);
    return { x, y };
  };
}
