// @vitest-environment jsdom
import gsap from 'gsap';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { DECK_GO_EVENT } from './magazineDeck';
import {
  armMagazineTable,
  fanPose,
  ringDepth,
  stepsBetween,
  type FanGeometry,
} from './magazineTable';

const GEO: FanGeometry = { spread: 4, shrink: 0.04, x: [-16, -21], y: [-5, -11], r: [-2.6, -3.8] };

describe('ringDepth', () => {
  it('counts places behind the front cover, round the ring', () => {
    expect(ringDepth(0, 0, 6)).toBe(0);
    expect(ringDepth(3, 1, 6)).toBe(2);
    expect(ringDepth(0, 1, 6)).toBe(5);
  });
});

describe('stepsBetween', () => {
  it('takes the shorter way round the ring', () => {
    expect(stepsBetween(0, 2, 6)).toBe(2);
    expect(stepsBetween(0, 5, 6)).toBe(-1);
    expect(stepsBetween(4, 1, 6)).toBe(3);
    expect(stepsBetween(2, 2, 6)).toBe(0);
  });
});

describe('fanPose', () => {
  it('lays the front cover flat and fans the others out to the left', () => {
    expect(fanPose(0, 0, GEO)).toEqual({ x: 0, y: 0, r: 0, s: 1 });
    expect(fanPose(2, 0, GEO)).toEqual({ x: -32, y: -10, r: -5.2, s: 0.92 });
  });

  it('opens the fan further under the mouse', () => {
    expect(fanPose(1, 1, GEO).x).toBe(-21);
    expect(fanPose(1, 0.5, GEO).x).toBeCloseTo(-18.5);
  });

  it('hides covers beyond the fan exactly under its last one', () => {
    expect(fanPose(5, 0, GEO)).toEqual(fanPose(4, 0, GEO));
  });

  it('moves smoothly between two places', () => {
    expect(fanPose(0.5, 0, GEO).x).toBeCloseTo(-8);
  });
});

describe('armMagazineTable', () => {
  // Die Zeit von GSAP von Hand weiterdrehen, statt auf Frames zu warten.
  let now = 0;
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += 0.05) {
      gsap.updateRoot((now += 0.05));
      gsap.ticker.tick(); // draws (the root update is unhooked from it)
    }
  };
  beforeAll(() => {
    gsap.ticker.remove(gsap.updateRoot);
    now = gsap.ticker.time;
  });
  afterAll(() => {
    gsap.ticker.add(gsap.updateRoot);
  });
  afterEach(() => {
    document.body.replaceChildren();
  });

  function table(count: number) {
    const section = document.createElement('section');
    section.dataset.hubMagazine = '';
    const stage = document.createElement('div');
    const deck = document.createElement('div');
    for (let i = 0; i < count; i++) {
      const li = document.createElement('li');
      li.dataset.deckIndex = String(i);
      li.style.zIndex = String(count - i);
      const a = document.createElement('a');
      a.href = `#news-${i}`;
      li.append(a);
      deck.append(li);
    }
    const dots = document.createElement('div');
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('button');
      dot.dataset.deckDot = '';
      dots.append(dot);
    }
    stage.append(deck);
    section.append(stage, dots);
    document.body.append(section);
    return {
      stage,
      deck,
      link: (i: number) => deck.querySelectorAll('a')[i],
      card: (i: number) => deck.querySelectorAll<HTMLElement>('[data-deck-index]')[i],
      current: () =>
        Array.from(dots.children).findIndex((d) => d.getAttribute('aria-current') === 'true'),
    };
  }

  function click(el: Element, detail: number) {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, detail });
    el.dispatchEvent(event);
    return event.defaultPrevented;
  }

  it('brings a cover from the fan to the front instead of opening it', () => {
    const { stage, deck, link, current } = table(6);
    const stop = armMagazineTable(stage, deck);
    expect(current()).toBe(0);
    expect(click(link(2), 1)).toBe(true);
    run(2);
    expect(current()).toBe(2);
    stop();
  });

  it('deals one cover after the other, never all at once', () => {
    const { stage, deck, link, current } = table(6);
    const stop = armMagazineTable(stage, deck);
    click(link(3), 1);
    // The first goes at once, the next ones follow in turn.
    expect(current()).toBe(1);
    run(2);
    expect(current()).toBe(3);
    stop();
  });

  it('throws the front cover on top of everything, then lays it under the fan', () => {
    const { stage, deck, link, card } = table(6);
    const stop = armMagazineTable(stage, deck);
    click(link(1), 1);
    const z = (i: number) => Number(card(i).style.zIndex);
    expect(z(0)).toBeGreaterThan(Math.max(...[1, 2, 3, 4, 5].map(z)));
    run(2);
    expect(z(0)).toBeLessThan(Math.min(...[1, 2, 3, 4, 5].map(z)));
    expect(card(0).style.transform).toMatch(
      /^translate\(0px, 0px\) rotate\(0deg\) translate\(-64%/
    );
    stop();
  });

  it('keeps the first thrown cover above the next one while both are in the air', () => {
    const { stage, deck, link, card } = table(6);
    const stop = armMagazineTable(stage, deck);
    click(link(2), 1);
    run(0.25); // the second is lifting, the first still on its way out
    const z = (i: number) => Number(card(i).style.zIndex);
    expect(z(0)).toBeGreaterThan(z(1));
    expect(z(1)).toBeGreaterThan(Math.max(z(2), z(3), z(4), z(5)));
    stop();
  });

  it('never lets a landed cover peek out behind the one in front of it', () => {
    const { stage, deck, link, card } = table(6);
    const stop = armMagazineTable(stage, deck);
    // Fan offset of a card, in % of a cover (more negative = further left).
    const fanX = (i: number) =>
      Number(/\) translate\((-?[\d.]+)%/.exec(card(i).style.transform)![1]);
    const z = (i: number) => Number(card(i).style.zIndex);
    click(link(2), 1); // deals 0, then 1; both land behind the fan
    const flown = new Set<number>();
    let checked = 0;
    for (let t = 0; t < 2.5; t += 0.05) {
      run(0.05);
      [0, 1].forEach((i) => z(i) > 100 && flown.add(i));
      // Once both are back in the fan, 1 lies under 0 and must not stick out to its left.
      if (flown.size === 2 && z(0) < 100 && z(1) < 100) {
        expect(z(1)).toBeLessThan(z(0));
        expect(fanX(1)).toBeGreaterThanOrEqual(fanX(0) - 0.01);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(5);
    stop();
  });

  it('opens the front cover as a normal link', () => {
    const { stage, deck, link } = table(6);
    const stop = armMagazineTable(stage, deck);
    expect(click(link(0), 1)).toBe(false);
    stop();
  });

  it('leaves keyboard activation alone — Enter opens the article', () => {
    const { stage, deck, link } = table(6);
    const stop = armMagazineTable(stage, deck);
    expect(click(link(2), 0)).toBe(false);
    stop();
  });

  it('follows the dots', () => {
    const { stage, deck, current } = table(6);
    const stop = armMagazineTable(stage, deck);
    const go = new CustomEvent(DECK_GO_EVENT, { detail: 5, cancelable: true });
    expect(deck.dispatchEvent(go)).toBe(false);
    run(2);
    expect(current()).toBe(5);
    stop();
  });

  it('turns a sideways trackpad swipe into exactly one step', () => {
    const { stage, deck, current } = table(6);
    const stop = armMagazineTable(stage, deck);
    for (let i = 0; i < 12; i++) {
      deck.dispatchEvent(new WheelEvent('wheel', { deltaX: 30, cancelable: true }));
    }
    run(2);
    expect(current()).toBe(1);
    stop();
  });

  it('leaves vertical scrolling to the page', () => {
    const { stage, deck } = table(6);
    const stop = armMagazineTable(stage, deck);
    const wheel = new WheelEvent('wheel', { deltaX: 4, deltaY: 40, cancelable: true });
    deck.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
    stop();
  });

  it('hands the cards back to the stylesheet and removes every listener', () => {
    const { stage, deck, link, card, current } = table(6);
    armMagazineTable(stage, deck)();
    expect(card(0).style.transform).toBe('');
    expect(card(0).style.zIndex).toBe('6');
    expect(current()).toBe(-1);
    expect(click(link(2), 1)).toBe(false);
  });
});
