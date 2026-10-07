// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MapRestaurant } from '@/lib/types';
import MapSearchSuggestions from './MapSearchSuggestions';

const spot = (partial: Partial<MapRestaurant>) =>
  ({ _id: 'x', name: 'x', lat: 0, lng: 0, ...partial }) as MapRestaurant;

describe('MapSearchSuggestions', () => {
  it('zeigt Name, Bezirk und Küche und meldet den getippten Spot', () => {
    const onPick = vi.fn();
    const zola = spot({
      _id: 'zola',
      name: 'Zola',
      bezirk: { name: 'Prenzlauer Berg' } as MapRestaurant['bezirk'],
      cuisineType: 'Italian',
    });
    render(<MapSearchSuggestions spots={[zola]} locale="de" onPick={onPick} />);

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
    render(<MapSearchSuggestions spots={[aera]} locale="de" onPick={() => {}} />);
    expect(screen.getByText('AERA')).toBeTruthy();
    expect(screen.queryByText('AERA Charlottenburg')).toBeNull();
  });

  it('sagt es, wenn nichts passt', () => {
    render(<MapSearchSuggestions spots={[]} locale="de" onPick={() => {}} />);
    expect(screen.getByText('Kein Spot gefunden')).toBeTruthy();
  });

  it('hält den Fokus im Feld, bis der Tipp gelandet ist', () => {
    render(<MapSearchSuggestions spots={[spot({ name: 'Zola' })]} locale="de" onPick={() => {}} />);
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    screen.getByRole('button', { name: /Zola/ }).dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  });
});
