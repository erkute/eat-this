// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    key === 'revealCollected' ? 'Neu in deiner Sammlung' : key,
}));
// Das Gesicht gilt sofort als zeichenbar — die Wartezeit auf das Bild ist
// nicht, was hier geprüft wird.
vi.mock('@/lib/dom/imageReady', () => ({ whenImageReady: () => Promise.resolve() }));

import { normalizeName } from '@/lib/normalizeName';
import MustEatRevealOverlay from './MustEatRevealOverlay';

const origin = {
  left: 40,
  top: 120,
  width: 200,
  height: 275,
  right: 240,
  bottom: 395,
  x: 40,
  y: 120,
  toJSON: () => ({}),
} as DOMRect;

function renderStage(props: Partial<React.ComponentProps<typeof MustEatRevealOverlay>> = {}) {
  const onCovered = vi.fn();
  const onDone = vi.fn();
  const onAbort = vi.fn();
  const utils = render(
    <MustEatRevealOverlay
      imageUrl="/api/must-eat-image/me-1"
      dish="Döner mit allem"
      originRect={origin}
      status="pending"
      collection={{ count: 12, total: 25 }}
      onCovered={onCovered}
      onDone={onDone}
      onAbort={onAbort}
      {...props}
    />
  );
  return { ...utils, onCovered, onDone, onAbort };
}

const phase = () => document.querySelector('[data-phase]')?.getAttribute('data-phase');

/* In kleinen Schritten: React übernimmt einen Phasenwechsel erst am Ende
   eines act() — liefe die Uhr in einem Stück, startete jede Folgephase erst
   danach. */
async function advance(ms: number) {
  for (let left = ms; left > 0; left -= 10) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(10, left));
    });
  }
}

describe('MustEatRevealOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('holds the card in suspense until the server has answered', async () => {
    const { rerender, onDone, onCovered } = renderStage();
    expect(onCovered).not.toHaveBeenCalled();
    await advance(500);
    expect(phase()).toBe('charge');
    // Die Bühne ist ganz offen — das Sheet darunter darf umschalten.
    expect(onCovered).toHaveBeenCalledOnce();

    // Minutenlang ohne Antwort: die Karte bleibt verdeckt auf der Bühne.
    await advance(5000);
    expect(phase()).toBe('charge');
    expect(screen.queryByText('Neu in deiner Sammlung')).toBeNull();

    rerender(
      <MustEatRevealOverlay
        imageUrl="/api/must-eat-image/me-1"
        dish="Döner mit allem"
        originRect={origin}
        status="ok"
        collection={{ count: 12, total: 25 }}
        onCovered={vi.fn()}
        onDone={onDone}
        onAbort={vi.fn()}
      />
    );
    await advance(50);
    expect(phase()).toBe('flip');
  });

  it('shows the prize on its own stage, ticks the collection up, then flies home', async () => {
    const { onDone, onAbort } = renderStage({ status: 'ok' });

    await advance(460 + 1100 + 50);
    expect(phase()).toBe('flip');
    await advance(1150);
    expect(phase()).toBe('show');

    // Was man bekommen hat, steht auf der Bühne — mit dem alten Stand zuerst.
    expect(screen.getByText('Neu in deiner Sammlung')).toBeTruthy();
    expect(screen.getByText(normalizeName('Döner mit allem'))).toBeTruthy();
    expect(screen.getByText('11')).toBeTruthy();
    await advance(700);
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('/ 25', { exact: false })).toBeTruthy();

    // Lang genug zum Lesen, dann von selbst in den Platz im Sheet.
    await advance(2950);
    expect(phase()).toBe('collect');
    expect(onDone).not.toHaveBeenCalled();
    await advance(640);
    expect(onDone).toHaveBeenCalledOnce();
    expect(onAbort).not.toHaveBeenCalled();
    expect(phase()).toBeUndefined();
  });

  it('puts the card back face-down when the unlock failed', async () => {
    const { rerender, onDone, onAbort } = renderStage();
    await advance(500);
    rerender(
      <MustEatRevealOverlay
        imageUrl="/api/must-eat-image/me-1"
        dish="Döner mit allem"
        originRect={origin}
        status="failed"
        collection={{ count: 11, total: 25 }}
        onCovered={vi.fn()}
        onDone={onDone}
        onAbort={onAbort}
      />
    );
    await advance(10);
    expect(phase()).toBe('abort');
    expect(screen.queryByText('Neu in deiner Sammlung')).toBeNull();
    await advance(640);
    expect(onAbort).toHaveBeenCalledOnce();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('leaves the count out when the collection is unknown', async () => {
    renderStage({ status: 'ok', collection: undefined });
    await advance(460 + 1100 + 50 + 1150 + 700);
    expect(phase()).toBe('show');
    expect(screen.queryByText('/ 25', { exact: false })).toBeNull();
  });
});
