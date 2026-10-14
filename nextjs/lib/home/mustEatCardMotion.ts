import gsap from 'gsap';

/** Where one card of the pile lies on screen: centre, untransformed width, tilt. */
export type PileCard = { x: number; y: number; width: number; rotation: number };

/** Snapshot of the pile right before it unmounts, so the deal starts exactly
 * where the cards were lying. */
export type PileSnapshot = { cards: PileCard[]; collectionHeight: number };

const DEAL_SECONDS = 0.75;
const STAGGER_SECONDS = 0.085;
const FLIP_AT = 0.28;
const FLIP_HALF_SECONDS = 0.16;

function rotationOf(element: Element | null): number {
  if (!element) return 0;
  const transform = getComputedStyle(element).transform;
  if (!transform || transform === 'none') return 0;
  const matrix = new DOMMatrixReadOnly(transform);
  return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
}

export function readPileSnapshot(pile: HTMLElement, collection: HTMLElement): PileSnapshot {
  const cards = Array.from(pile.querySelectorAll('img')).map((img) => {
    // A rotated element's bounding box shares its centre.
    const box = img.getBoundingClientRect();
    return {
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
      width: img.offsetWidth,
      rotation: rotationOf(img),
    };
  });
  return { cards, collectionHeight: collection.offsetHeight };
}

/** Deal from the clicked pile to the existing responsive grid. Every card leaves
 * from the spot and tilt it had in the pile, top card first into the first slot,
 * and flips face-up on the way. Only transforms move; the layout supplies the
 * final positions, including the two-column phone view. */
export function dealMustEatCards(
  deck: HTMLUListElement,
  pile: PileSnapshot,
  onComplete: () => void,
): () => void {
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const collection = deck.parentElement!;
    const links = Array.from(deck.querySelectorAll<HTMLElement>('[data-stack-photo]'))
      .map((photo) => photo.parentElement!);
    const captions = [
      ...deck.querySelectorAll('[data-stack-caption]'),
      ...collection.querySelectorAll('[data-deal-hint]'),
    ];
    // Read every destination before writing any transforms.
    const destinations = links.map((link) => link.getBoundingClientRect());
    const restingTilts = links.map((link) => rotationOf(link.querySelector('[data-stack-photo] > img')));
    const height = collection.offsetHeight;
    const count = links.length;
    const timeline = gsap.timeline({ onComplete });
    gsap.set(captions, { autoAlpha: 0 });
    // The section grows with the deal instead of jumping to the grid's height.
    timeline.fromTo(collection, { height: pile.collectionHeight }, {
      height,
      duration: DEAL_SECONDS + STAGGER_SECONDS * (count - 1),
      ease: 'power2.inOut',
      clearProps: 'height',
    }, 0);
    links.forEach((link, index) => {
      const box = destinations[index];
      // The top card of the pile (last in DOM) goes to the first slot.
      const from = pile.cards[count - 1 - index] ?? pile.cards[pile.cards.length - 1];
      const start = index * STAGGER_SECONDS;
      gsap.set(link, { zIndex: count - index });
      timeline.fromTo(link, {
        x: from.x - box.left - box.width / 2,
        y: from.y - box.top - box.height / 2,
        scale: from.width / box.width,
        rotation: from.rotation - restingTilts[index],
      }, {
        x: 0, y: 0, scale: 1, rotation: 0,
        duration: DEAL_SECONDS, ease: 'sine.inOut',
        clearProps: 'transform,zIndex',
      }, start);

      const photo = link.querySelector('[data-stack-photo]');
      const back = link.querySelector('[data-deal-back]');
      const front = link.querySelector('[data-stack-photo] > img');
      if (!photo || !back || !front) return;
      // Never blend the cream back through the transparent front-card edges:
      // the faces swap while the card is edge-on.
      gsap.set(front, { visibility: 'hidden' });
      const turn = start + FLIP_AT;
      timeline
        .to(photo, { scaleX: 0, duration: FLIP_HALF_SECONDS, ease: 'power1.in' }, turn)
        .set(back, { visibility: 'hidden' }, turn + FLIP_HALF_SECONDS)
        .set(front, { clearProps: 'visibility' }, turn + FLIP_HALF_SECONDS)
        .to(photo, { scaleX: 1, duration: FLIP_HALF_SECONDS * 1.4, ease: 'power2.out', clearProps: 'transform' },
          turn + FLIP_HALF_SECONDS);
    });
    timeline.to(captions, {
      autoAlpha: 1, duration: 0.25, stagger: 0.04, clearProps: 'opacity,visibility',
    }, DEAL_SECONDS * 0.85);
    const finish = () => timeline.progress(1);
    // A resize changes grid destinations; finish in the current responsive layout.
    window.addEventListener('resize', finish, { once: true });
    return () => window.removeEventListener('resize', finish);
  });
  media.add('(prefers-reduced-motion: reduce)', onComplete);
  return () => media.revert();
}
