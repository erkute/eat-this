import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  formatWalkingTime,
} from './distance';

describe('haversineDistance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistance(52.52, 13.405, 52.52, 13.405)).toBe(0);
  });

  it('calculates ~1600m between Alexanderplatz and Ostbahnhof', () => {
    const dist = haversineDistance(52.5219, 13.4132, 52.5107, 13.4341);
    expect(dist).toBeGreaterThan(1400);
    expect(dist).toBeLessThan(2000);
  });
});

describe('formatWalkingTime', () => {
  it('rounds up so short walks read as at least 1 Min', () => {
    expect(formatWalkingTime(50)).toBe('1 Min');
  });

  it('returns minutes within the 1600m comfort threshold', () => {
    expect(formatWalkingTime(800)).toBe('10 Min');
    expect(formatWalkingTime(1600)).toBe('20 Min');
  });

  it('returns null beyond the 1600m walking threshold', () => {
    expect(formatWalkingTime(1601)).toBeNull();
    expect(formatWalkingTime(5000)).toBeNull();
  });
});
