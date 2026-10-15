import { describe, expect, it } from 'vitest';
import { cardNumber, sortByCardNumber } from './cardOrder';

const card = (_id: string, order?: number) => ({ _id, order });

describe('sortByCardNumber', () => {
  it('lays the deck out by card number, not by _id', () => {
    const deck = [card('must-eat-b', 22), card('mustead-main', 1), card('must-eat-a', 21)];
    expect(sortByCardNumber(deck).map((c) => c.order)).toEqual([1, 21, 22]);
  });

  it('puts a card without a number last', () => {
    const deck = [card('a'), card('b', 39), card('c', 1)];
    expect(sortByCardNumber(deck).map((c) => c._id)).toEqual(['c', 'b', 'a']);
  });

  it('breaks a tie on _id so the order never depends on the input', () => {
    const deck = [card('z', 5), card('a', 5)];
    expect(sortByCardNumber(deck).map((c) => c._id)).toEqual(['a', 'z']);
    expect(sortByCardNumber([...deck].reverse()).map((c) => c._id)).toEqual(['a', 'z']);
  });

  it('leaves the input untouched', () => {
    const deck = [card('b', 2), card('a', 1)];
    sortByCardNumber(deck);
    expect(deck.map((c) => c._id)).toEqual(['b', 'a']);
  });
});

describe('cardNumber', () => {
  it('prints the number the way the card does', () => {
    expect(cardNumber(7)).toBe('007');
    expect(cardNumber(39)).toBe('039');
    expect(cardNumber(120)).toBe('120');
  });

  it('invents no number for a card without one', () => {
    expect(cardNumber(undefined)).toBeNull();
  });
});
