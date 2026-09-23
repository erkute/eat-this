// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { mirrorMapStrip } from './mapStripMirror';

/* jsdom has no 2D canvas, no ResizeObserver and no MapLibre — the strip is
   exercised against a fake map that keeps the parts the mirror touches: the
   canvas it copies from, the container the markers hang in, and `render`. */
function setup() {
  const container = document.createElement('div');
  const source = document.createElement('canvas');
  source.width = 1170;
  source.height = 2400;
  container.appendChild(source);
  document.body.appendChild(container);

  const host = document.createElement('div');
  host.innerHTML = '<canvas></canvas><div data-map-strip-pins></div>';
  document.body.appendChild(host);
  Object.defineProperty(host, 'clientHeight', { value: 130 });

  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);

  const listeners = new Set<() => void>();
  const map = {
    getCanvas: () => source,
    getCanvasContainer: () => container,
    getPixelRatio: () => 3,
    triggerRepaint: vi.fn(),
    on: (_: string, fn: () => void) => listeners.add(fn),
    off: (_: string, fn: () => void) => listeners.delete(fn),
  };
  const render = () => listeners.forEach((fn) => fn());
  const pins = () => [...host.querySelector('[data-map-strip-pins]')!.children] as HTMLElement[];
  const addMarker = (transform: string, className = '') => {
    const el = document.createElement('div');
    el.className = `maplibregl-marker ${className}`.trim();
    el.style.transform = transform;
    el.innerHTML = '<button class="pin"></button>';
    container.appendChild(el);
    return el;
  };
  return { map: map as unknown as MapLibreMap, host, render, pins, addMarker, drawImage, map_: map };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('mirrorMapStrip', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it("copies the map's top slice on every frame the map draws", () => {
    const s = setup();
    const stop = mirrorMapStrip(s.map, s.host);
    /* An idle map draws nothing until asked. */
    expect(s.map_.triggerRepaint).toHaveBeenCalled();

    s.render();
    /* 130 css px × pixel ratio 3, full width, from the very top. */
    expect(s.drawImage).toHaveBeenCalledWith(
      s.map.getCanvas(),
      0,
      0,
      1170,
      390,
      0,
      0,
      1170,
      390
    );
    const strip = s.host.querySelector('canvas')!;
    expect([strip.width, strip.height]).toEqual([1170, 390]);
    stop();
    s.render();
    expect(s.drawImage).toHaveBeenCalledTimes(1);
  });

  it('mirrors the pins and moves them with the frame', async () => {
    const s = setup();
    const a = s.addMarker('translate(10px, 20px)');
    mirrorMapStrip(s.map, s.host);
    expect(s.pins()).toHaveLength(1);
    expect(s.pins()[0]).not.toBe(a);

    const b = s.addMarker('translate(30px, 40px)');
    await flush();
    expect(s.pins()).toHaveLength(2);

    a.style.transform = 'translate(11px, 22px)';
    b.style.transform = 'translate(33px, 44px)';
    s.render();
    expect(s.pins().map((p) => p.style.transform)).toEqual([
      'translate(11px, 22px)',
      'translate(33px, 44px)',
    ]);
  });

  it('shows only the pins in the strip', () => {
    const s = setup();
    /* 130px strip: a pin anchored at 150 still reaches up into it, one at
       400 does not, one just above the top edge has left it. */
    s.addMarker('translate(-50%, -100%) translate(10px, 150px)');
    const far = s.addMarker('translate(-50%, -100%) translate(10px, 400px)');
    s.addMarker('translate(-50%, -100%) translate(10px, -20px)');
    mirrorMapStrip(s.map, s.host);
    s.render();
    expect(s.pins().map((p) => p.style.display)).toEqual(['', 'none', 'none']);

    far.style.transform = 'translate(-50%, -100%) translate(10px, 60px)';
    s.render();
    expect(s.pins()[1].style.display).toBe('');
    expect(s.pins()[1].style.transform).toBe(far.style.transform);
  });

  it('re-clones a pin whose state changes and drops one that goes', async () => {
    const s = setup();
    const a = s.addMarker('translate(0px, 0px)');
    const b = s.addMarker('translate(5px, 5px)');
    mirrorMapStrip(s.map, s.host);
    const [cloneA, cloneB] = s.pins();

    /* Dimmed, selected: the state lives in classes, anywhere in the marker. */
    a.querySelector('button')!.classList.add('dim');
    await flush();
    expect(s.pins()[0]).not.toBe(cloneA);
    expect(s.pins()[0].querySelector('button')!.classList.contains('dim')).toBe(true);
    /* Untouched pins keep their node, and with it any running transition. */
    expect(s.pins()[1]).toBe(cloneB);

    b.remove();
    await flush();
    expect(s.pins()).toHaveLength(1);
  });

  it('keeps the stacking order of the markers', async () => {
    const s = setup();
    s.addMarker('translate(0px, 0px)', 'first');
    const second = s.addMarker('translate(0px, 0px)', 'second');
    mirrorMapStrip(s.map, s.host);

    /* MapLibre stacks markers by DOM order; when that order changes, the copy follows. */
    second.parentElement!.insertBefore(second, second.parentElement!.firstChild);
    await flush();
    expect(s.pins().map((p) => p.className)).toEqual([
      'maplibregl-marker second',
      'maplibregl-marker first',
    ]);
  });
});
