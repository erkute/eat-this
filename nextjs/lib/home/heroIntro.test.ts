// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { afterHeroIntro } from './heroIntro';

const html = document.documentElement;
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('afterHeroIntro', () => {
  afterEach(() => {
    html.removeAttribute('data-hero-intro');
    vi.useRealTimers();
  });

  it('läuft sofort, wenn kein Auftritt läuft', () => {
    const run = vi.fn();
    afterHeroIntro(run);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('wartet, bis der Auftritt vorbei ist, und läuft genau einmal', async () => {
    html.setAttribute('data-hero-intro', '');
    const run = vi.fn();
    afterHeroIntro(run);
    html.setAttribute('data-intro-copy', '');
    await flush();
    expect(run).not.toHaveBeenCalled();

    html.removeAttribute('data-hero-intro');
    await flush();
    html.setAttribute('data-hero-intro', '');
    html.removeAttribute('data-hero-intro');
    await flush();
    expect(run).toHaveBeenCalledTimes(1);
    html.removeAttribute('data-intro-copy');
  });

  it('läuft spätestens nach der Obergrenze, wenn der Auftritt hängt', () => {
    vi.useFakeTimers();
    html.setAttribute('data-hero-intro', '');
    const run = vi.fn();
    afterHeroIntro(run, 15_000);
    vi.advanceTimersByTime(14_999);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('läuft nach Abbruch gar nicht mehr', async () => {
    html.setAttribute('data-hero-intro', '');
    const run = vi.fn();
    const cancel = afterHeroIntro(run, 15_000);
    cancel();
    html.removeAttribute('data-hero-intro');
    await flush();
    expect(run).not.toHaveBeenCalled();
  });
});
