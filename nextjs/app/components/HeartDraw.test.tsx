// @vitest-environment jsdom
import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const motion = vi.hoisted(() => ({ draw: vi.fn(), stop: vi.fn() }));
vi.mock('./drawHeart', () => ({ drawHeart: motion.draw }));
import HeartDraw from './HeartDraw';

beforeEach(() => {
  vi.clearAllMocks();
  motion.draw.mockReturnValue(motion.stop);
  window.matchMedia = vi.fn(() => ({ matches: false }) as MediaQueryList);
});

it('renders restored favorites without loading motion, animates a tap and cleans up', async () => {
  const view = render(<HeartDraw hearted={false} play={0} />);
  view.rerender(<HeartDraw hearted play={0} />);
  expect(view.container.querySelector('[data-hearted]')).not.toBeNull();
  expect(motion.draw).not.toHaveBeenCalled();
  view.rerender(<HeartDraw hearted={false} play={1} />);
  await waitFor(() => expect(motion.draw).toHaveBeenCalledOnce());
  expect(view.container.querySelector('[data-hearted]')).toBeNull();
  view.unmount();
  expect(motion.stop).toHaveBeenCalledOnce();
});

it('keeps the filled state immediate without animation for reduced motion', async () => {
  window.matchMedia = vi.fn(() => ({ matches: true }) as MediaQueryList);
  const view = render(<HeartDraw hearted={false} play={0} />);
  await act(async () => view.rerender(<HeartDraw hearted play={1} />));
  expect(view.container.querySelector('[data-hearted]')).not.toBeNull();
  expect(motion.draw).not.toHaveBeenCalled();
});
