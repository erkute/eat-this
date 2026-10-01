// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { armDeckMouse } from './deckMouse';

function deckWith(count: number) {
  const stage = document.createElement('div');
  const deck = document.createElement('div');
  for (let i = 0; i < count; i++) {
    const li = document.createElement('li');
    li.dataset.deckIndex = String(i);
    const a = document.createElement('a');
    a.href = `#news-${i}`;
    li.append(a);
    deck.append(li);
  }
  stage.append(deck);
  document.body.append(stage);
  return { stage, deck, link: (i: number) => deck.querySelectorAll('a')[i] };
}

function click(el: Element, detail: number) {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, detail });
  el.dispatchEvent(event);
  return event.defaultPrevented;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('armDeckMouse', () => {
  it('brings a cover from the fan to the front instead of opening it', () => {
    const { stage, deck, link } = deckWith(3);
    const stop = armDeckMouse(stage, deck);
    expect(click(link(2), 1)).toBe(true);
    expect(deck.hasAttribute('data-gliding')).toBe(false); // already there in jsdom (width 0)
    stop();
  });

  it('opens the front cover as a normal link', () => {
    const { stage, deck, link } = deckWith(3);
    const stop = armDeckMouse(stage, deck);
    expect(click(link(0), 1)).toBe(false);
    stop();
  });

  it('leaves keyboard activation alone — Enter opens the article', () => {
    const { stage, deck, link } = deckWith(3);
    const stop = armDeckMouse(stage, deck);
    expect(click(link(2), 0)).toBe(false);
    stop();
  });

  it('removes every listener again', () => {
    const { stage, deck, link } = deckWith(3);
    armDeckMouse(stage, deck)();
    expect(click(link(2), 1)).toBe(false);
  });
});
