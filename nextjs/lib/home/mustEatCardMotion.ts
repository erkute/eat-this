import gsap from 'gsap';

/** Deal from the clicked pile to the existing responsive grid. Only transforms
 * move; the layout supplies the final positions, including the two-column phone view. */
export function dealMustEatCards(
  deck: HTMLUListElement,
  origin: { left: number; top: number; width: number; height: number },
  onComplete: () => void,
): () => void {
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const links = Array.from(deck.querySelectorAll<HTMLElement>('[data-stack-photo]'))
      .map((photo) => photo.parentElement!);
    const captions = deck.querySelectorAll('[data-stack-caption]');
    // Read every destination before writing any transforms.
    const destinations = links.map((link) => link.getBoundingClientRect());
    const timeline = gsap.timeline({ onComplete });
    gsap.set(captions, { autoAlpha: 0 });
    links.forEach((link, index) => {
      const box = destinations[index];
      const back = link.querySelector('[data-deal-back]');
      const front = link.querySelector('[data-stack-photo] > img');
      // Never blend the cream back through the transparent front-card edges.
      if (back && front) gsap.set(front, { visibility: 'hidden' });
      timeline.fromTo(link, {
        x: origin.left + origin.width / 2 - box.left - box.width / 2,
        y: origin.top + origin.height / 2 - box.top - box.height / 2,
        scale: origin.width / box.width,
        rotation: (index - (links.length - 1) / 2) * 2,
      }, {
        x: 0, y: 0, scale: 1, rotation: 0,
        duration: 0.75, ease: 'power3.inOut',
        clearProps: 'transform',
      }, index * 0.075);
      if (back && front) {
        timeline.set(back, { visibility: 'hidden' }, 0.52 + index * 0.075);
        timeline.set(front, { clearProps: 'visibility' }, 0.52 + index * 0.075);
      }
    });
    timeline.to(captions, { autoAlpha: 1, duration: 0.2, stagger: 0.035, clearProps: 'opacity,visibility' }, 0.65);
    const finish = () => timeline.progress(1);
    // A resize changes grid destinations; finish in the current responsive layout.
    window.addEventListener('resize', finish, { once: true });
    return () => window.removeEventListener('resize', finish);
  });
  media.add('(prefers-reduced-motion: reduce)', onComplete);
  return () => media.revert();
}
