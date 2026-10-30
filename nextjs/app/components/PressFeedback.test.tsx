// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PressFeedback from './PressFeedback';

function pointer(target: Element, type: string, extra = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { isPrimary: true, pointerId: 1, button: 0, clientX: 20, clientY: 20, ...extra });
  target.dispatchEvent(event);
  return event;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

function setup() {
  const view = render(<>
    <PressFeedback />
    <button><span>Menu</span></button>
    <button disabled>Disabled</button>
    <a href="#unavailable" aria-disabled="true">Unavailable</a>
  </>);
  const button = view.getByRole('button', { name: 'Menu' });
  return { ...view, button };
}

it('makes a short tap visible without blocking the event or keeping the state', () => {
  const { button, getByText } = setup();
  const event = pointer(getByText('Menu'), 'pointerdown');
  expect(button.hasAttribute('data-et-pressed')).toBe(true);
  expect(event.defaultPrevented).toBe(false);
  pointer(button, 'pointerup');
  expect(button.hasAttribute('data-et-pressed')).toBe(true);
  vi.advanceTimersByTime(150);
  expect(button.hasAttribute('data-et-pressed')).toBe(false);
});

it('clears a held press on release immediately', () => {
  const { button } = setup();
  pointer(button, 'pointerdown');
  vi.advanceTimersByTime(500);
  pointer(button, 'pointerup');
  expect(button.hasAttribute('data-et-pressed')).toBe(false);
});

for (const cancel of ['pointercancel', 'scroll', 'pointermove', 'blur']) {
  it(`clears feedback on ${cancel}`, () => {
    const { button } = setup();
    pointer(button, 'pointerdown');
    if (cancel === 'blur') window.dispatchEvent(new Event('blur'));
    else pointer(button, cancel, { clientX: 60 });
    expect(button.hasAttribute('data-et-pressed')).toBe(false);
  });
}

it('ignores disabled controls and secondary pointers', () => {
  const { button, getByText } = setup();
  for (const target of [getByText('Disabled'), getByText('Unavailable')]) {
    pointer(target, 'pointerdown');
    expect(target.hasAttribute('data-et-pressed')).toBe(false);
  }
  pointer(button, 'pointerdown', { isPrimary: false });
  expect(button.hasAttribute('data-et-pressed')).toBe(false);
  pointer(button, 'pointerdown', { button: 2 });
  expect(button.hasAttribute('data-et-pressed')).toBe(false);
});

it('removes its state and listeners on unmount', () => {
  const { button, unmount } = setup();
  pointer(button, 'pointerdown');
  unmount();
  expect(button.hasAttribute('data-et-pressed')).toBe(false);
  const target = document.createElement('button');
  document.body.append(target);
  pointer(target, 'pointerdown');
  expect(target.hasAttribute('data-et-pressed')).toBe(false);
  target.remove();
});
