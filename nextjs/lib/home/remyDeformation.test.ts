import { describe, expect, it } from 'vitest';
import { remyPose } from './remyDeformation';

describe('continuous Remy drawing', () => {
  it('keeps the rear knee forward of its hip–ankle axis throughout the push', () => {
    for (let t = 0; t < 1.5; t += 0.01) {
      const pose = remyPose(t);
      const hip = pose({x:474,y:735});
      const knee = pose({x:350,y:990});
      const ankle = pose({x:146,y:1231});
      const bend = (knee.x-hip.x)*(ankle.y-hip.y) - (knee.y-hip.y)*(ankle.x-hip.x);
      expect(bend).toBeGreaterThan(0);
    }
  });
  it('keeps the pushing fingertips fixed', () => {
    for (let t = 0; t < 1.5; t += 0.03) {
      const p = { x: 1110, y: 370 };
      const q = remyPose(t)(p);
      expect(Math.hypot(p.x-q.x,p.y-q.y)).toBeLessThan(0.01);
    }
  });
  it('retains the shoe shape while moving the feet close to the ground', () => {
    for (let t = 0; t < 1.5; t += 0.03) {
      const pose = remyPose(t);
      for (const x of [140, 715]) {
        const a = pose({ x, y: 1300 });
        const b = pose({ x:x+50, y:1300 });
        expect(Math.hypot(a.x-b.x,a.y-b.y)).toBeCloseTo(50, 5);
        expect(a.y).toBeGreaterThanOrEqual(1287);
        expect(a.y).toBeLessThanOrEqual(1300.01);
      }
    }
  });
  it('is seamless when the push cycle loops', () => {
    for (const p of [{x:740,y:285},{x:280,y:977},{x:791,y:954},{x:140,y:1300}]) {
      const a = remyPose(1.5-0.00001)(p);
      const b = remyPose(1.5+0.00001)(p);
      expect(Math.hypot(a.x-b.x,a.y-b.y)).toBeLessThan(0.1);
    }
  });
});
