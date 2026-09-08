// @vitest-environment jsdom
// nextjs/lib/buddy/thread.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { loadThread, saveThread, clearThread, THREAD_KEY, MAX_STORED_MESSAGES } from './thread';
import type { StoredMessage } from './thread';

const msg = (i: number): StoredMessage => ({ role: 'user', content: `Frage ${i}` });

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buddy thread storage', () => {
  it('legt den Faden ab und liest ihn zurück', () => {
    const thread: StoredMessage[] = [
      { role: 'user', content: 'pizza?' },
      {
        role: 'assistant',
        content: 'Da:\n[[spot:zola]]',
        spots: [
          {
            _id: 'r1',
            name: 'ZOLA',
            slug: 'zola',
            cuisineType: 'Italienisch',
            bezirk: 'Kreuzberg',
            shortDescription: null,
            tip: null,
            priceRange: null,
            mapsUrl: null,
            image: null,
            openNow: null,
            openLabel: null,
            distanceLabel: null,
          },
        ],
      },
    ];
    saveThread(thread);
    // Die Karten müssen mit — ohne sie stünde nach dem Seitenwechsel ein
    // Absatz mit einem Marker da, für den es keine Karte mehr gibt.
    expect(loadThread()).toEqual(thread);
  });

  it('behält nur die letzten Nachrichten — mehr schickt die Route ohnehin nicht', () => {
    saveThread(Array.from({ length: MAX_STORED_MESSAGES + 8 }, (_, i) => msg(i)));
    const back = loadThread();
    expect(back).toHaveLength(MAX_STORED_MESSAGES);
    expect(back[back.length - 1].content).toBe(`Frage ${MAX_STORED_MESSAGES + 7}`);
  });

  it('räumt ab statt eine leere Hülle zu hinterlassen', () => {
    saveThread([msg(1)]);
    saveThread([]);
    expect(window.sessionStorage.getItem(THREAD_KEY)).toBeNull();
    clearThread();
    expect(loadThread()).toEqual([]);
  });

  it('verwirft Kaputtes, statt den Chat mitzureißen', () => {
    window.sessionStorage.setItem(THREAD_KEY, '{ das ist kein json');
    expect(loadThread()).toEqual([]);

    window.sessionStorage.setItem(THREAD_KEY, JSON.stringify({ v: 99, messages: [msg(1)] }));
    expect(loadThread()).toEqual([]);

    window.sessionStorage.setItem(
      THREAD_KEY,
      JSON.stringify({ v: 1, messages: [msg(1), { role: 'system', content: 'x' }, null, 7] })
    );
    expect(loadThread()).toEqual([msg(1)]);
  });

  it('lebt auch ohne Speicher weiter (privates Fenster, volle Quote)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => saveThread([msg(1)])).not.toThrow();

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });
    expect(loadThread()).toEqual([]);
  });
});
