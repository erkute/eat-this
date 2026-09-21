// @vitest-environment jsdom
import { useRef, useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useDialogFocus } from './useDialogFocus';
function Dialog() {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useDialogFocus(open, panel, trigger);
  return (
    <>
      <button ref={trigger} onClick={() => setOpen(true)}>
        Open
      </button>
      <button>Outside</button>
      {open && (
        <div ref={panel} role="dialog" tabIndex={-1}>
          <button onClick={() => setOpen(false)}>Close</button>
          <button style={{ visibility: 'hidden' }}>Hidden</button>
          <button>Last</button>
        </div>
      )}
    </>
  );
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('enters, wraps both directions, contains outside focus, and returns focus on close', () => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue({ length: 1 } as DOMRectList);
  render(<Dialog />);
  screen.getByText('Open').focus();
  fireEvent.click(screen.getByText('Open'));
  expect(document.activeElement).toBe(screen.getByText('Close'));
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(document.activeElement).toBe(screen.getByText('Last'));
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(document.activeElement).toBe(screen.getByText('Close'));
  screen.getByText('Outside').focus();
  expect(document.activeElement).toBe(screen.getByText('Close'));
  fireEvent.click(screen.getByText('Close'));
  expect(document.activeElement).toBe(screen.getByText('Open'));
});
