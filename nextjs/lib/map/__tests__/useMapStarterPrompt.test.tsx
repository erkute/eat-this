// @vitest-environment jsdom
import { act, renderHook, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMapStarterPrompt } from '../useMapStarterPrompt';

const mocks = vi.hoisted(() => ({ open: vi.fn(), paused: false, isOpen: false }));
vi.mock('@/lib/auth/LoginModalContext', () => ({
  useLoginModal: () => ({ open: mocks.open, isOpen: mocks.isOpen }),
}));
vi.mock('@/lib/auth/starterPromptCooldown', () => ({
  starterPromptPaused: () => mocks.paused,
}));

const initial = { active: true, guest: true, spotId: null as string | null, detailOpen: false };
function setup() {
  const hook = renderHook((props) => useMapStarterPrompt(props), { initialProps: initial });
  const visit = (id: string, seconds = 16) => {
    hook.rerender({ ...initial, spotId: id, detailOpen: true });
    act(() => {
      vi.advanceTimersByTime(seconds * 1000);
    });
  };
  const close = () => hook.rerender(initial);
  return { ...hook, visit, close };
}

beforeEach(() => {
  vi.useFakeTimers();
  mocks.open.mockClear();
  mocks.paused = false;
  mocks.isOpen = false;
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('map starter invitation', () => {
  it('waits for three different spots, 45 active seconds and closing the detail', () => {
    const { visit, close } = setup();
    visit('a');
    close();
    visit('b');
    close();
    visit('c');
    expect(mocks.open).not.toHaveBeenCalled();
    close();
    expect(mocks.open).toHaveBeenCalledExactlyOnceWith({ kind: 'map-prompt' });
  });

  it('does not count repeated visits as different spots', () => {
    const { visit, close } = setup();
    visit('a');
    close();
    visit('a');
    close();
    visit('b');
    close();
    expect(mocks.open).not.toHaveBeenCalled();
  });

  it('does not interrupt quick browsing', () => {
    const { visit, close } = setup();
    for (const id of ['a', 'b', 'c']) {
      visit(id, 2);
      close();
    }
    expect(mocks.open).not.toHaveBeenCalled();
  });

  it('does not count background time', () => {
    const { visit, close } = setup();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    for (const id of ['a', 'b', 'c']) {
      visit(id);
      close();
    }
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    visit('d', 1);
    close();
    expect(mocks.open).not.toHaveBeenCalled();
  });

  it('stops counting after inactivity and resumes on interaction', () => {
    const { visit, close } = setup();
    visit('a', 90);
    close();
    visit('b', 1);
    close();
    visit('c', 1);
    close();
    expect(mocks.open).not.toHaveBeenCalled();
    fireEvent.pointerDown(window);
    visit('d', 16);
    close();
    expect(mocks.open).toHaveBeenCalledOnce();
  });

  it.each(['cooldown', 'signed-in', 'auth-loading', 'inactive', 'modal'])(
    'does not open while %s',
    (condition) => {
      const { visit, close, rerender } = setup();
      visit('a');
      close();
      visit('b');
      close();
      visit('c');
      if (condition === 'cooldown') mocks.paused = true;
      if (condition === 'modal') mocks.isOpen = true;
      rerender({
        ...initial,
        active: condition !== 'inactive',
        guest: !['signed-in', 'auth-loading'].includes(condition),
      });
      expect(mocks.open).not.toHaveBeenCalled();
    }
  );

  it('does not stack over another dialog', () => {
    const { visit, close } = setup();
    visit('a');
    close();
    visit('b');
    close();
    visit('c');
    const dialog = document.createElement('div');
    dialog.setAttribute('aria-modal', 'true');
    document.body.append(dialog);
    close();
    expect(mocks.open).not.toHaveBeenCalled();
    dialog.remove();
  });
});

it('offers from the list when the time threshold is reached after closing the third spot', () => {
  const { visit, close } = setup();
  for (const id of ['a', 'b', 'c']) {
    visit(id, 10);
    close();
  }
  expect(mocks.open).not.toHaveBeenCalled();
  act(() => {
    vi.advanceTimersByTime(15_000);
  });
  expect(mocks.open).toHaveBeenCalledExactlyOnceWith({ kind: 'map-prompt' });
  act(() => {
    vi.advanceTimersByTime(10_000);
  });
  expect(mocks.open).toHaveBeenCalledOnce();
});

it('retries after the closing detail animation removes its dialog', () => {
  const { visit, close } = setup();
  visit('a');
  close();
  visit('b');
  close();
  visit('c');
  const dialog = document.createElement('div');
  dialog.setAttribute('aria-modal', 'true');
  document.body.append(dialog);
  close();
  expect(mocks.open).not.toHaveBeenCalled();
  dialog.remove();
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(mocks.open).toHaveBeenCalledOnce();
});
