import { describe, expect, it } from 'vitest';
import { LOOK_SHIFT, lookPose } from './remyLook';

describe('lookPose', () => {
  const glasses = { x: 512, y: 287 };
  const shoulder = { x: 200, y: 800 };
  const crown = { x: 512, y: 20 };

  it('lässt ihn geradeaus ruhen', () => {
    expect(lookPose(0, 0)(glasses)).toEqual(glasses);
  });

  it('schiebt die Brille ganz in Blickrichtung', () => {
    const right = lookPose(1, 0)(glasses);
    expect(right.x).toBeCloseTo(glasses.x + LOOK_SHIFT.x, 0);
    const up = lookPose(0, -1)(glasses);
    expect(up.y).toBeCloseTo(glasses.y - LOOK_SHIFT.y, 0);
  });

  it('lässt Schultern und Scheitel stehen', () => {
    const pose = lookPose(1, 1);
    expect(pose(shoulder)).toEqual(shoulder);
    expect(Math.abs(pose(crown).x - crown.x)).toBeLessThan(1);
  });

  it('zieht nur das zugewandte Ohr nach innen', () => {
    const rightEar = { x: 702, y: 300 };
    const leftEar = { x: 322, y: 300 };
    const pose = lookPose(1, 0);
    // Das zugewandte rückt deutlich nach innen, das abgewandte nimmt nur den
    // Ausklang der Gesichtszone mit.
    expect(rightEar.x - pose(rightEar).x).toBeGreaterThan(10);
    expect(Math.abs(pose(leftEar).x - leftEar.x)).toBeLessThan(5);
  });
});
