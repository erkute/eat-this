import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BuddyAvatarFallback, type BuddyMood } from './BuddyAvatar';

const MOODS: BuddyMood[] = ['idle', 'talking', 'thinking', 'happy', 'greeting'];
// `src` only: React also emits a preload <link> for each image.
const fullFrames = (html: string) =>
  [...html.matchAll(/src="(\/buddy\/buddy(?:-(?!mouths)[a-z]+)?\.webp)/g)].map((m) => m[1]);

describe('BuddyAvatarFallback', () => {
  it('marks the mood on the wrapper', () => {
    const html = renderToStaticMarkup(<BuddyAvatarFallback mood="talking" />);
    expect(html).toMatch(/data-mood="talking"/);
  });
  it('swaps the base frame per mood', () => {
    const thinking = renderToStaticMarkup(<BuddyAvatarFallback mood="thinking" />);
    expect(thinking).toMatch(/buddy-think\.webp/);
    const greeting = renderToStaticMarkup(<BuddyAvatarFallback mood="greeting" />);
    expect(greeting).toMatch(/buddy-smile\.webp/);
    const idle = renderToStaticMarkup(<BuddyAvatarFallback mood="idle" />);
    expect(idle).toMatch(/buddy\.webp/);
  });
  // Talking used to lay a second, differently framed body over the base,
  // which showed Remy's shoulders twice. Every mood draws one body; talking
  // and laughing only change the mouth.
  it('draws exactly one body per mood, plus the mouth sprite', () => {
    for (const mood of MOODS) {
      const html = renderToStaticMarkup(<BuddyAvatarFallback mood={mood} />);
      expect(fullFrames(html), mood).toHaveLength(1);
      expect(html, mood).toMatch(/buddy-mouths\.webp/);
    }
    for (const mood of ['talking', 'happy'] as const) {
      expect(fullFrames(renderToStaticMarkup(<BuddyAvatarFallback mood={mood} />))).toEqual([
        '/buddy/buddy.webp',
      ]);
    }
  });
  it('can hold the head still while the mouth keeps moving', () => {
    const html = renderToStaticMarkup(<BuddyAvatarFallback mood="talking" breathe={false} />);
    expect(html).toMatch(/data-breathe="off"/);
    expect(renderToStaticMarkup(<BuddyAvatarFallback mood="talking" />)).not.toMatch(/data-breathe/);
  });
});
