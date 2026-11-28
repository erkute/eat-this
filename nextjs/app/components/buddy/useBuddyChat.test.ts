// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { loadThread, saveThread } from '@/lib/buddy/thread';
import { limitNotice, parseNdjsonLines, useBuddyChat } from './useBuddyChat';

vi.mock('next-intl', () => ({ useLocale: () => 'de' }));
vi.mock('@/lib/firebase/config', () => ({ auth: { currentUser: null } }));

afterEach(() => {
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
  window.localStorage.clear();
});
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


it('clears a saved conversation even when an answer is still arriving', async () => {
  const response = Promise.withResolvers<Response>();
  vi.stubGlobal('fetch', vi.fn(() => response.promise));
  saveThread([{ role: 'assistant', content: 'Der alte Tipp.' }]);

  const { result } = renderHook(useBuddyChat);
  let pending: Promise<void>;
  act(() => { pending = result.current.send('Noch ein Tipp?'); });
  expect(result.current.isStreaming).toBe(true);

  act(() => result.current.reset());
  expect(loadThread()).toEqual([]);

  await act(async () => {
    response.resolve(new Response(JSON.stringify({ type: 'error', value: 'buddy_out_of_credit' }) + '\n'));
    await pending;
  });
  expect(result.current.messages).toEqual([]);
  expect(loadThread()).toEqual([]);
});
