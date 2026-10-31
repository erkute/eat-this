import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react';
import { categoryArt } from '@/lib/categoryArt';
import styles from './PackPoster.module.css';

/* The stage, back to front. `fan` is the slot from the middle, `lift` how far
   an item stands above the stage's floor. */
type StageItem = { src: string; fan: number; lift: number; pack?: boolean };

const CARD_BACK = '/pics/card-back.webp?v=20261028';
const STARTER_STAGE: StageItem[] = [
  { src: CARD_BACK, fan: -1, lift: 30 },
  { src: CARD_BACK, fan: 1, lift: 30 },
  { src: '/pics/home/starter-pack-front.webp?v=20261030', fan: 0, lift: 0, pack: true },
];
const boosterArt = (slug: string) => categoryArt(slug) ?? '';
const BOOSTER_STAGE: StageItem[] = [
  { src: boosterArt('breakfast'), fan: -2, lift: 18 },
  { src: boosterArt('drinks'), fan: 2, lift: 18 },
  { src: boosterArt('coffee'), fan: -1, lift: 6 },
  { src: boosterArt('sweets'), fan: 1, lift: 6 },
  { src: boosterArt('pizza'), fan: 0, lift: 0, pack: true },
];

type Props = Omit<ComponentPropsWithoutRef<'section'>, 'title'> & {
  /** Guests see the Starter Pack, accounts the Booster Packs. */
  offer: 'starter' | 'booster';
  kicker?: string;
  headline: string;
  /** The level the headline takes in the page around it. */
  heading?: 'h2' | 'h3';
  body: string;
  /** The poster's buttons: `et-btn`, a second answer with `et-btn-alt`. */
  actions: ReactNode;
};

/**
 * The pack offer as a poster: full width, the packs stand on its top edge and
 * break out above it, then title, pitch and the buttons. As it scrolls in the
 * packs fan open from a closed stack (scroll timeline, no JS). The Starter
 * Pack comes with covered cards behind it on red paper, the Booster Packs on
 * ink the way /packs lays them out (Ersan, 31.10.2026). Used at the end of
 * the spot detail and of /must-eats.
 */
export default function PackPoster({
  offer,
  kicker,
  headline,
  heading: Heading = 'h3',
  body,
  actions,
  className,
  ...rest
}: Props) {
  return (
    <section
      {...rest}
      className={className ? `${styles.poster} ${className}` : styles.poster}
      data-offer={offer}
      data-pack-poster=""
    >
      <div className={styles.inner}>
        <div className={styles.stage} aria-hidden="true">
          {(offer === 'starter' ? STARTER_STAGE : BOOSTER_STAGE).map((item, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={item.src}
              alt=""
              loading="lazy"
              className={styles.item}
              data-pack={item.pack ? '' : undefined}
              style={{ '--fan': item.fan, '--lift': `${item.lift}px` } as CSSProperties}
            />
          ))}
        </div>
        <div className={styles.copy}>
          {kicker && <p className={`et-label ${styles.kicker}`}>{kicker}</p>}
          <Heading className={styles.title}>{headline}</Heading>
          <p className={styles.body}>{body}</p>
          <div className={styles.actions}>{actions}</div>
        </div>
      </div>
    </section>
  );
}
