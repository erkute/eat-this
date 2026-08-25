// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MapFilterPickerSheet, { type PickerItem } from './MapFilterPickerSheet';

/**
 * A picker row promises a result set. Before this, every row kept that promise
 * the same way — by being tappable — and a row reading 0 delivered a list that
 * could only say "keine Spots". Two of those zeroes were not the same thing:
 *
 *   - nothing free, but the paywall holding matches → an offer, still tappable
 *   - nothing at all                                → a dead end, not tappable
 */
const ITEMS: PickerItem[] = [
  { value: 'italian', label: 'Italienisch', sub: '4' },
  { value: 'peruvian', label: 'Peruanisch', sub: '3', lockedOnly: true },
  { value: 'georgian', label: 'Georgisch', sub: '0', disabled: true },
];

function open(props: Partial<React.ComponentProps<typeof MapFilterPickerSheet>> = {}) {
  return render(
    <MapFilterPickerSheet
      title="Küche"
      items={ITEMS}
      selectedValue={null}
      allLabel="Alle"
      allSub="12"
      onSelect={vi.fn()}
      onClose={vi.fn()}
      closeAriaLabel="Schließen"
      {...props}
    />
  );
}

describe('MapFilterPickerSheet rows', () => {
  it('keeps a row with nothing behind it listed, but not pickable', () => {
    open();
    // Listed: hiding it would reshuffle the picker between two openings, and
    // "Georgisch: 0" is an answer.
    const dead = screen.getByRole('button', { name: /Georgisch/ }) as HTMLButtonElement;
    expect(dead.disabled).toBe(true);
    expect(dead.textContent).toContain('0');
  });

  it('leaves a row that only the paywall is holding back tappable', () => {
    const onSelect = vi.fn();
    open({ onSelect });
    const offer = screen.getByRole('button', { name: /Peruanisch/ }) as HTMLButtonElement;
    expect(offer.disabled).toBe(false);
    // The number it carries is the locked count — what the pack would add.
    expect(offer.textContent).toContain('3');
    offer.click();
    expect(onSelect).toHaveBeenCalledWith('peruvian');
  });

  it('never disables the active row, whatever its count says', () => {
    /* The dialog hands focus to the current selection when it opens, and a
       disabled button cannot take it — the trap would break and leave focus on
       <body>, outside the modal. */
    open({ selectedValue: 'georgian' });
    const active = screen.getByRole('button', { name: /Georgisch/ }) as HTMLButtonElement;
    expect(active.disabled).toBe(false);
  });

  it('keeps the way out open: the reset row is never a dead end', () => {
    // Every escape from a zero runs through "Alle" or another chip.
    open();
    const reset = screen.getByRole('button', { name: /Alle/ }) as HTMLButtonElement;
    expect(reset.disabled).toBe(false);
  });
});
