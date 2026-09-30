export type Point = { x: number; y: number };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const weight = (p: Point, x: number, y: number, rx: number, ry: number) =>
  Math.exp(-2 * (((p.x - x) / rx) ** 2 + ((p.y - y) / ry) ** 2));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

const rest = {
  back: [{ x: 474, y: 735 }, { x: 350, y: 990 }, { x: 146, y: 1231 }],
  front: [{ x: 589, y: 740 }, { x: 791, y: 954 }, { x: 709, y: 1233 }],
};

function knee(hip: Point, ankle: Point, bones: Point[]) {
  const upper = distance(bones[0], bones[1]);
  const lower = distance(bones[1], bones[2]);
  const d = Math.min(distance(hip, ankle), upper + lower - 0.01);
  const dx = (ankle.x - hip.x) / distance(hip, ankle);
  const dy = (ankle.y - hip.y) / distance(hip, ankle);
  const along = (upper * upper - lower * lower + d * d) / (2 * d);
  const restDx = bones[2].x - bones[0].x;
  const restDy = bones[2].y - bones[0].y;
  const direction = Math.sign((bones[1].x - bones[0].x) * restDy - (bones[1].y - bones[0].y) * restDx);
  const bend = direction * Math.sqrt(Math.max(0, upper * upper - along * along));
  return { x: hip.x + dx * along + dy * bend, y: hip.y + dy * along - dx * bend };
}

function bonePoint(p: Point, a: Point, b: Point, targetA: Point, targetB: Point) {
  const angle = Math.atan2(targetB.y - targetA.y, targetB.x - targetA.x)
    - Math.atan2(b.y - a.y, b.x - a.x);
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return { x: targetA.x + (p.x - a.x) * cos - (p.y - a.y) * sin,
    y: targetA.y + (p.x - a.x) * sin + (p.y - a.y) * cos };
}

/** A single connected texture mesh. Every pixel has one source location;
 * skin, jaw and trouser folds deform together without duplicated cutouts. */
export function remyPose(seconds: number) {
  const cycle = seconds / 1.5;
  const effort = (1 - Math.cos(cycle * Math.PI * 2)) / 2;
  const shift = 40 * effort;
  const targets = Object.entries(rest).map(([name, bones], index) => {
    const phase = ((cycle + index * 0.5) % 1 + 1) % 1;
    // Long loaded stroke, short recovery with almost no clearance.
    const contact = 0.72;
    const recovery = Math.max(0, (phase - contact) / (1 - contact));
    const tangent = (1 - contact) / contact;
    const travel = phase < contact ? phase / contact : 1 - smooth(0, 1, recovery)
      + tangent * (2 * recovery ** 3 - 3 * recovery ** 2 + recovery);
    // Rear knee was previously placed on the outer trouser fold, behind
    // the hip–ankle axis. That made IK bend it backwards. Its centre is
    // inside the leg; the shorter rear shuffle also stays within its reach.
    const ankle = { x: name === 'back'
      ? bones[2].x + shift + 45 + (0.5 - travel) * 90
      : bones[2].x + (0.5 - travel) * 150,
      y: bones[2].y - 13 * Math.sin(recovery * Math.PI) ** 2 };
    const hip = { x: bones[0].x + shift, y: bones[0].y };
    return { name, bones, hip, ankle, knee: knee(hip, ankle, bones) };
  });
  return (p: Point): Point => {
    // Upper body presses forward while the fingertips keep their contact.
    const handLock = 1 - smooth(840, 1090, p.x);
    let x = p.x + shift * handLock;
    let y = p.y;
    const arm = weight(p, 843, 465, 240, 110);
    y += 24 * effort * arm * handLock;
    // Head inclines from the neck, rather than stretching the face as a block.
    const head = (1 - smooth(305, 385, p.y)) * (1 - smooth(850, 950, p.x));
    const angle = -0.032 * effort * head;
    const hx = p.x - 703, hy = p.y - 352;
    x += (hx * (Math.cos(angle) - 1) - hy * Math.sin(angle)) * head;
    y += (hx * Math.sin(angle) + hy * (Math.cos(angle) - 1)) * head;
    // Clench the teeth, then release. Neighbouring cheek/chin pixels follow.
    const mouth = weight(p, 736, 285, 78, 35);
    y += -(p.y - 278) * 0.4 * effort * mouth;
    x += (p.x - 736) * 0.04 * effort * mouth;
    y += 8 * effort * weight(p, 733, 141, 96, 24);
    y += 3 * effort * weight(p, 740, 319, 74, 35);

    if (p.y < 660) return { x, y };
    const posed = targets.map(({ bones, hip, ankle, knee: joint }) => {
      const upper = bonePoint(p, bones[0], bones[1], hip, joint);
      const lower = bonePoint(p, bones[1], bones[2], joint, ankle);
      const bend = smooth(bones[1].y - 100, bones[1].y + 85, p.y);
      const foot = smooth(1190, 1247, p.y);
      return {
        x: mix(mix(upper.x, lower.x, bend), p.x + ankle.x - bones[2].x, foot),
        y: mix(mix(upper.y, lower.y, bend), p.y + ankle.y - bones[2].y, foot),
      };
    });
    // The transition follows the transparent gap between the drawn legs.
    const split = 530 - Math.max(0, p.y - 820) * 0.1;
    const side = smooth(split - 32, split + 32, p.x);
    const pelvis = smooth(665, 825, p.y);
    return { x: mix(x, mix(posed[0].x, posed[1].x, side), pelvis),
      y: mix(y, mix(posed[0].y, posed[1].y, side), pelvis) };
  };
}
