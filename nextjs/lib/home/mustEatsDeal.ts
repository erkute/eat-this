import gsap from 'gsap';
import { CLEAR_DEAL, dealFromPile, onFirstView, stackOnPile, visible } from './dealIn';

/** Must Eats: die Karten liegen verdeckt auf einem Stapel und werden
 *  ausgeteilt; unterwegs drehen sich die offenen um (wie live). */
export function armMustEatsDeal(section: HTMLElement): () => void {
  const deck = section.querySelector<HTMLElement>('ul');
  if (!deck) return () => {};
  const slides = () => visible(deck.querySelectorAll<HTMLElement>(':scope > li'));
  const captions = () => Array.from(deck.querySelectorAll<HTMLElement>('[data-stack-caption]'));
  const pileOf = (list: HTMLElement[]) => {
    const box = deck.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + list[0].offsetHeight / 2 };
  };
  const resetBacks = () => {
    section.style.removeProperty('--deal-back-display');
    gsap.set(deck.querySelectorAll('[data-deal-back]'), { clearProps: 'visibility' });
  };
  let timeline: gsap.core.Timeline | null = null;
  const stop = onFirstView(
    section,
    () => {
      const list = slides();
      if (!list.length) return;
      section.style.setProperty('--deal-back-display', 'block');
      stackOnPile(list, pileOf(list), 40, 0.9);
      gsap.set(captions(), { autoAlpha: 0 });
    },
    () => {
      const list = slides();
      gsap.set(list, { clearProps: CLEAR_DEAL });
      if (!list.length) return;
      const stagger = 0.09;
      timeline = dealFromPile(list, pileOf(list), {
        lift: 40,
        scale: 0.9,
        duration: 0.85,
        stagger,
      });
      list.forEach((slide, index) => {
        const photo = slide.querySelector<HTMLElement>('[data-stack-photo="open"]');
        const back = photo?.querySelector<HTMLElement>('[data-deal-back]');
        if (!photo || !back) return;
        const turn = index * stagger + 0.3;
        timeline!
          .to(photo, { scaleX: 0, duration: 0.16, ease: 'power1.in' }, turn)
          .set(back, { visibility: 'hidden' }, turn + 0.16)
          .to(
            photo,
            { scaleX: 1, duration: 0.22, ease: 'power2.out', clearProps: 'transform' },
            turn + 0.16
          );
      });
      timeline
        .to(
          captions(),
          { autoAlpha: 1, duration: 0.3, stagger: 0.05, clearProps: 'opacity,visibility' },
          0.75
        )
        .call(resetBacks);
    }
  );
  return () => {
    stop();
    timeline?.kill();
    resetBacks();
    gsap.set(deck.querySelectorAll(':scope > li'), { clearProps: CLEAR_DEAL });
    gsap.set(deck.querySelectorAll('[data-stack-photo]'), { clearProps: 'transform' });
    gsap.set(captions(), { clearProps: 'opacity,visibility' });
  };
}
