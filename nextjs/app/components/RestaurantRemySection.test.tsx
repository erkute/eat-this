// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { BUDDY_ASK_EVENT } from '@/lib/buddy/homeStage';
import RestaurantRemySection from './RestaurantRemySection';

afterEach(() => cleanup());

describe('RestaurantRemySection', () => {
  it('dispatches the tapped question as a buddy ask', () => {
    const asks: string[] = [];
    const onAsk = (e: Event) => {
      asks.push((e as CustomEvent<{ question?: string }>).detail?.question ?? '');
    };
    window.addEventListener(BUDDY_ASK_EVENT, onAsk);
    try {
      const { getByText } = render(
        <RestaurantRemySection locale="de" name="BARI" bezirk="Neukölln" />
      );
      fireEvent.click(getByText('Was bestell ich hier am besten?'));
      expect(asks).toEqual(['Was bestell ich hier am besten?']);
    } finally {
      window.removeEventListener(BUDDY_ASK_EVENT, onAsk);
    }
  });

  it('binds the similar-spots chip to the bezirk and drops it without one', () => {
    const withBezirk = render(<RestaurantRemySection locale="de" name="BARI" bezirk="Neukölln" />);
    expect(withBezirk.getByText('Was Ähnliches in Neukölln?')).toBeTruthy();
    withBezirk.unmount();

    const withoutBezirk = render(<RestaurantRemySection locale="de" name="BARI" />);
    expect(withoutBezirk.queryByText(/Was Ähnliches/)).toBeNull();
  });

  it('names the restaurant in the lead so the offer reads page-specific', () => {
    const { getByText } = render(
      <RestaurantRemySection locale="en" name="BARI" bezirk="Neukölln" />
    );
    expect(getByText(/what to order at BARI/)).toBeTruthy();
  });

  it('sends a freely typed question and clears the field', () => {
    const asks: string[] = [];
    const onAsk = (e: Event) => {
      asks.push((e as CustomEvent<{ question?: string }>).detail?.question ?? '');
    };
    window.addEventListener(BUDDY_ASK_EVENT, onAsk);
    try {
      const { getByLabelText, container } = render(
        <RestaurantRemySection locale="de" name="BARI" bezirk="Neukölln" />
      );
      const input = getByLabelText('Frag mich was zu BARI…') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Gibt es dort Pasta?' } });
      fireEvent.submit(container.querySelector('form')!);

      expect(asks).toEqual(['Gibt es dort Pasta?']);
      expect(input.value).toBe('');
    } finally {
      window.removeEventListener(BUDDY_ASK_EVENT, onAsk);
    }
  });

  it('ignores an empty submit instead of opening an empty chat', () => {
    let fired = 0;
    const onAsk = () => {
      fired += 1;
    };
    window.addEventListener(BUDDY_ASK_EVENT, onAsk);
    try {
      const { container } = render(<RestaurantRemySection locale="de" name="BARI" />);
      fireEvent.submit(container.querySelector('form')!);
      expect(fired).toBe(0);
    } finally {
      window.removeEventListener(BUDDY_ASK_EVENT, onAsk);
    }
  });
});
