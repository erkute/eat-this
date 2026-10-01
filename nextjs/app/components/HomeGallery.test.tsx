// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomeGallery from './HomeGallery';

const motion = vi.hoisted(() => ({
  reduced: false,
  native: false,
  top: 0,
  changed: () => {},
  frames: [] as FrameRequestCallback[],
}));
vi.mock('gsap', () => ({
  default: {
    quickSetter: (el: HTMLElement, property: string) => (value: number) =>
      el.style.setProperty(property, String(value)),
  },
}));

function Gallery({ count = 3 }: { count?: number }) {
  return (
    <HomeGallery label="Spots">
      {Array.from({ length: count }, (_, i) => (
        <a key={i} href={`/spot/${i}`}>
          Spot {i + 1}
        </a>
      ))}
    </HomeGallery>
  );
}
const root = () =>
  screen.getByRole('list', { name: 'Spots' }).closest('[data-home-gallery]') as HTMLElement;
const scroll = (top: number) => {
  motion.top = top;
  fireEvent.scroll(window);
  act(() => motion.frames.splice(0).forEach((cb) => cb(0)));
};

beforeEach(() => {
  motion.reduced = false;
  motion.native = false;
  motion.top = 0;
  motion.frames = [];
  vi.stubGlobal('CSS', { supports: () => motion.native });
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return motion.reduced;
    },
    addEventListener: (_event: string, cb: () => void) => {
      motion.changed = cb;
    },
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    motion.frames.push(cb);
    return motion.frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    return this.hasAttribute('data-home-gallery') ? 1000 : 400;
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    return { top: this.hasAttribute('data-home-gallery') ? motion.top : 0 } as DOMRect;
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('HomeGallery — vertical scroll', () => {
  it('drives the gallery from page scrolling and reverses on scrolling up', () => {
    render(<Gallery />);
    expect(root().getAttribute('data-motion')).toBe('gsap');
    scroll(-300);
    expect(root().style.getPropertyValue('--gallery-position')).toBe('1');
    scroll(-150);
    expect(root().style.getPropertyValue('--gallery-position')).toBe('0.5');
    scroll(-900);
    expect(root().style.getPropertyValue('--gallery-position')).toBe('2');
    scroll(200);
    expect(root().style.getPropertyValue('--gallery-position')).toBe('0');
  });

  it('uses the native scroll timeline when available, without writing a competing inline position', () => {
    motion.native = true;
    render(<Gallery />);
    expect(root().getAttribute('data-motion')).toBe('native');
    scroll(-300);
    expect(root().style.getPropertyValue('--gallery-position')).toBe('');
  });

  it('has no carousel controls or counters and retains every real destination', () => {
    render(<Gallery />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(/1\s*\/\s*3/)).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Spot 3' }).getAttribute('href')).toBe('/spot/2');
  });

  it('removes the pinned journey for reduced motion and can enable it again', () => {
    render(<Gallery />);
    scroll(-300);
    motion.reduced = true;
    act(() => motion.changed());
    expect(root().hasAttribute('data-motion')).toBe(false);
    expect(root().style.getPropertyValue('--gallery-position')).toBe('');
    motion.reduced = false;
    act(() => motion.changed());
    expect(root().getAttribute('data-motion')).toBe('gsap');
  });

  it('leaves a single result unpinned and cleans up a changed live set', () => {
    const { rerender } = render(<Gallery />);
    scroll(-300);
    rerender(<Gallery count={1} />);
    expect(root().hasAttribute('data-motion')).toBe(false);
    expect(root().style.getPropertyValue('--gallery-position')).toBe('');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });
});
