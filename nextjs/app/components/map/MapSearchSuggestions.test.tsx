// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MapRestaurant } from '@/lib/types';
import MapSearchSuggestions from './MapSearchSuggestions';

const spot = (partial: Partial<MapRestaurant>) =>
  ({ _id: 'x', name: 'x', lat: 0, lng: 0, ...partial }) as MapRestaurant;
const base = { locale: 'de' as const, onPick: () => {} };

describe('MapSearchSuggestions', () => {
  it('zeigt Name, Bezirk und Küche und meldet den getippten Spot', () => {
    const onPick = vi.fn();
    const zola = spot({
      _id: 'zola',
      name: 'Zola',
      bezirk: { name: 'Prenzlauer Berg' } as MapRestaurant['bezirk'],
      cuisineType: 'Italian',
    });
    render(<MapSearchSuggestions {...base} spots={[zola]} onPick={onPick} />);

    expect(screen.getByText('Zola')).toBeTruthy();
    expect(screen.getByText('Prenzlauer Berg · Italienisch')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Zola/ }));
    expect(onPick).toHaveBeenCalledWith(zola);
  });

  it('nennt den Bezirk nicht doppelt, wenn er schon im Namen steht', () => {
    const aera = spot({
      name: 'AERA Charlottenburg',
      district: 'Charlottenburg',
      bezirk: { name: 'Charlottenburg' } as MapRestaurant['bezirk'],
    });
    render(<MapSearchSuggestions {...base} spots={[aera]} />);
    expect(screen.getByText('AERA')).toBeTruthy();
    expect(screen.queryByText('AERA Charlottenburg')).toBeNull();
  });

  it('sagt es, wenn nichts passt', () => {
    render(<MapSearchSuggestions {...base} spots={[]} />);
    expect(screen.getByText('Kein Spot gefunden')).toBeTruthy();
  });

  it('hält den Fokus im Feld, bis der Tipp gelandet ist', () => {
    render(<MapSearchSuggestions {...base} spots={[spot({ name: 'Zola' })]} />);
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    screen.getByRole('button', { name: /Zola/ }).dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  });

  /* Am Telefon ging das Wischen sonst an die Map oder Liste dahinter. */
  it('hält eine Geste fest, die die Vorschläge nicht bewegen kann', () => {
    render(<MapSearchSuggestions {...base} spots={[spot({ name: 'Zola' })]} />);
    const list = screen.getByRole('listbox');
    fireEvent.touchStart(list, { touches: [{ clientY: 200 }] });
    const move = new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [{ clientY: 150 } as Touch],
    });
    list.dispatchEvent(move);
    expect(move.defaultPrevented).toBe(true);
  });
});
