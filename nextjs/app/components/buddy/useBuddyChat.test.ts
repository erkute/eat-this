import { describe, it, expect } from 'vitest';
import { limitNotice, parseNdjsonLines } from './useBuddyChat';
import type { BuddyStreamEvent } from '@/lib/buddy/types';

describe('parseNdjsonLines', () => {
  it('parses complete lines and keeps the trailing partial in the remainder', () => {
    const events: BuddyStreamEvent[] = [];
    const rest = parseNdjsonLines(
      '{"type":"text","value":"a"}\n{"type":"done"}\n{"type":"text","val',
      (e) => events.push(e)
    );
    expect(events).toEqual([{ type: 'text', value: 'a' }, { type: 'done' }]);
    expect(rest).toBe('{"type":"text","val');
  });

  it('ignores empty lines', () => {
    const events: BuddyStreamEvent[] = [];
    const rest = parseNdjsonLines('\n{"type":"done"}\n', (e) => events.push(e));
    expect(events).toEqual([{ type: 'done' }]);
    expect(rest).toBe('');
  });
});

describe('limitNotice', () => {
  it('never tells someone at a daily limit to ask again in a moment', () => {
    for (const reason of ['per_day', 'global']) {
      expect(limitNotice(reason, 'de')).not.toMatch(/gleich nochmal/);
      expect(limitNotice(reason, 'de')).toMatch(/morgen/i);
      expect(limitNotice(reason, 'en')).toMatch(/tomorrow/i);
    }
  });

  it('keeps the short "ask again" nudge for the per-minute limit and unknown reasons', () => {
    expect(limitNotice('per_minute', 'de')).toMatch(/gleich nochmal/);
    expect(limitNotice(undefined, 'en')).toMatch(/ask again/);
  });
});
