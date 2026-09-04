// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MapFilterPickerSheet, { type PickerItem } from './MapFilterPickerSheet';

/**
 * A picker row promises a result set, and every row used to keep that promise
 * the same way: by being tappable. A row reading 0 then delivered a list that
 * could only say "keine Spots" — the one thing nobody opened a filter for.
 *
 * The counts include the paywalled spots (they stand in the list too), so a
 * zero here means the catalogue has nothing, and the row stops leading
 * anywhere.
 */
const ITEMS: PickerItem[] = [
  { value: 'italian', label: 'Italienisch', sub: '4' },
  { value: 'peruvian', label: 'Peruanisch', sub: '3' },
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

  it('leaves every row with something behind it tappable', () => {
    const onSelect = vi.fn();
    open({ onSelect });
    const live = screen.getByRole('button', { name: /Peruanisch/ }) as HTMLButtonElement;
    expect(live.disabled).toBe(false);
    live.click();
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

/**
 * Der Chip schaltet die Leiste selbst um (auf == zu). Schließt der
 * Außenklick-Wächter vorher, zieht derselbe Klick sie danach wieder auf —
 * die Leiste ginge beim zweiten Tippen nie zu. Deshalb ist die ganze
 * Chip-Zeile von ihm ausgenommen, nicht nur der eigene Chip.
 *
 * Der Wächter gilt nur noch für die eingeklappte Desktop-Variante: als
 * Bottom-Sheet liegt ein Backdrop über allem, und der schließt über seinen
 * eigenen Klick (siehe „wegtippen" weiter unten).
 */
describe('MapFilterPickerSheet: Außenklick', () => {
  it('lässt die Chip-Zeile in Ruhe — sonst öffnet der zweite Klick neu', () => {
    const row = document.createElement('div');
    row.setAttribute('data-filter-chip-row', '');
    const chip = document.createElement('button');
    row.appendChild(chip);
    document.body.appendChild(row);
    const onClose = vi.fn();
    open({ onClose, inline: true });

    fireEvent.click(chip);

    expect(onClose).not.toHaveBeenCalled();
    row.remove();
  });

  it('schließt weiterhin bei einem Klick irgendwo sonst', () => {
    const elsewhere = document.createElement('div');
    document.body.appendChild(elsewhere);
    const onClose = vi.fn();
    open({ onClose, inline: true });

    fireEvent.click(elsewhere);

    expect(onClose).toHaveBeenCalled();
    elsewhere.remove();
  });
});

/**
 * Wegtippen darf nie auf der Karte darunter ankommen.
 *
 * Das Sheet schloss auf `touchstart`/`mousedown` an `document`. Damit war der
 * Backdrop weg, bevor der Klick kam — der Klick landete auf der Karte und
 * oeffnete einen Spot. Dagegen stand ein Abfaenger, der genau den naechsten
 * Klick schluckte, mit einer Frist von 400 ms. Ein bedaechtiger Tipp ist
 * laenger: mit 600 ms Finger auf demselben Punkt ging reproduzierbar ein
 * fremder Spot auf.
 *
 * Jetzt nimmt der Backdrop den Klick selbst an — damit ist der Tipp
 * verbraucht und es gibt gar kein Zeitfenster mehr. Diese Tests halten beide
 * Haelften fest.
 */
describe('MapFilterPickerSheet wegtippen', () => {
  const backdrop = (container: HTMLElement) =>
    container.ownerDocument.body.querySelector('[aria-hidden="true"]') as HTMLElement;

  it('schliesst, wenn der Backdrop geklickt wird', () => {
    const onClose = vi.fn();
    const { container } = open({ onClose });
    fireEvent.click(backdrop(container));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('schliesst NICHT schon beim Aufsetzen des Fingers', () => {
    const onClose = vi.fn();
    const { container } = open({ onClose });
    const el = backdrop(container);
    fireEvent.touchStart(el);
    fireEvent.mouseDown(el);
    fireEvent.pointerDown(el);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('haelt auch den Aussenklick der eingeklappten Desktop-Variante auf click fest', () => {
    const onClose = vi.fn();
    open({ onClose, inline: true });
    fireEvent.mouseDown(document.body);
    fireEvent.touchStart(document.body);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
