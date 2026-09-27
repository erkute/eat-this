import styles from './Tour.module.css';

export const CARD_TAP_CUE_MS = 650;

/** Shared finger gesture for both card-reveal tours. */
export default function CardTapCue() {
  return (
    <span className={styles.tapCue} aria-hidden="true" data-testid="tour-tap-cue">
      <span className={styles.tapRing} />
      <svg viewBox="0 0 48 56" fill="none">
        <path
          d="M17 29V8a5 5 0 0 1 10 0v15l3-1c2-1 5 0 6 2 4-1 7 1 7 5v10c0 8-5 13-13 13h-3c-5 0-9-3-12-7L5 32c-3-5 3-9 6-6l6 6"
          fill="currentColor"
          stroke="#15120e"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
