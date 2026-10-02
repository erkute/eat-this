// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rememberCards } from './cardsFlip';

afterEach(() => vi.unstubAllGlobals());

describe('rememberCards', () => {
  it('merkt sich nichts bei reduzierter Bewegung — die Karten springen um', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
    const rail = document.createElement('ul');
    expect(await rememberCards(rail)).toBeNull();
  });

  it('spielt den Weg und beginnt die Leiste wieder vorne', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const rail = document.createElement('ul');
    rail.innerHTML = '<li data-flip-id="a"></li><li data-flip-id="b"></li>';
    document.body.appendChild(rail);
    const flip = await rememberCards(rail);
    expect(flip).not.toBeNull();
    rail.innerHTML = '<li data-flip-id="b"></li><li data-flip-id="c"></li>';
    rail.scrollTo = vi.fn();
    flip!.play(rail);
    expect(rail.scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'instant' });
    rail.remove();
  });
});
