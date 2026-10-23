import styles from './FoldedPaperBackdrop.module.css';

/** The parent provides position:relative and isolation:isolate. Colour layers
 * sit above this paper; mirrored edges keep the creases continuous at any height. */
export default function FoldedPaperBackdrop({ id }: { id: string }) {
  return (
    <svg className={styles.paper} aria-hidden="true" focusable="false" data-folded-paper="">
      <defs>
        <pattern id={id} width="100%" height="300vw" patternUnits="userSpaceOnUse">
          <image href="/pics/paper/folded-white.webp" width="100%" height="150vw" preserveAspectRatio="none" />
          <image href="/pics/paper/folded-white.webp" y="-300vw" width="100%" height="150vw" transform="scale(1 -1)" preserveAspectRatio="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
