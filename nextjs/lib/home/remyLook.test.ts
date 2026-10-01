import { describe, expect, it } from 'vitest';
import { HEAD_SHIFT, lookPose } from './remyLook';

describe('lookPose', () => {
  const glasses = { x: 512, y: 287 };
  const chin = { x: 512, y: 440 };
  const crown = { x: 512, y: 20 };
  const shoulder = { x: 200, y: 800 };

  it('lässt ihn geradeaus ruhen', () => {
    expect(lookPose(0, 0)(glasses)).toEqual(glasses);
    expect(lookPose(0, 0)(crown)).toEqual(crown);
  });

  it('bewegt den ganzen Kopf mit — Scheitel und Kinn, nicht nur das Gesicht', () => {
    const right = lookPose(1, 0);
    expect(right(crown).x - crown.x).toBeGreaterThan(HEAD_SHIFT.x);
    expect(right(chin).x - chin.x).toBeGreaterThan(HEAD_SHIFT.x * 0.9);
    const down = lookPose(0, 1);
    expect(down(chin).y - chin.y).toBeGreaterThan(HEAD_SHIFT.y * 0.9);
  });

  it('schiebt die Züge weiter als den Umriss', () => {
    const right = lookPose(1, 0);
    expect(right(glasses).x - glasses.x).toBeGreaterThan(right(chin).x - chin.x);
  });

  it('lässt die Schultern stehen', () => {
    expect(lookPose(1, 1)(shoulder)).toEqual(shoulder);
    expect(lookPose(-1, -1)(shoulder)).toEqual(shoulder);
  });

  it('zieht das zugewandte Ohr nach innen', () => {
    const rightEar = { x: 702, y: 300 };
    const leftEar = { x: 322, y: 300 };
    const pose = lookPose(1, 0);
    // Beide Ohren gehen mit dem Kopf; das zugewandte bleibt dabei zurück.
    const leftMove = pose(leftEar).x - leftEar.x;
    const rightMove = pose(rightEar).x - rightEar.x;
    expect(rightMove).toBeLessThan(leftMove - 10);
  });
});
