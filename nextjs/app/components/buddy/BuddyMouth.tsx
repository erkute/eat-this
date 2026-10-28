import styles from './BuddyMouth.module.css';

// Mouth shapes cut from the open/laugh/think drawings and registered onto
// the base face (`/buddy/buddy.webp`). Laying those drawings over the base
// whole showed Remy's shoulders twice: they are framed ~9 % larger.
// 'talk' runs the speech rhythm; so does any ancestor carrying
// `data-buddy-speaking`, which lets GSAP timelines start and stop it.
export type BuddyMouthShape = 'closed' | 'open' | 'wide' | 'talk';

/** Sits inside a positioned square that shows the base face edge to edge. */
export default function BuddyMouth({ shape }: { shape: BuddyMouthShape }) {
  return (
    <span className={styles.mouth} data-mouth={shape}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.shapes} src="/buddy/buddy-mouths.webp?v=1" alt="" loading="lazy" decoding="async" />
    </span>
  );
}
