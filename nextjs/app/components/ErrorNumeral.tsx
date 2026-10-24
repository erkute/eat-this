import styles from '../not-found.module.css';

/** Live type in both layouts; the mobile view fits all three glyphs to the viewport. */
export default function ErrorNumeral({ value }: { value: '404' | '500' }) {
  return (
    <>
      <p className={styles.numeral} aria-hidden="true">{value}</p>
      <svg
        className={styles.mobileNumeral}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <text x="500" y="1000" textAnchor="middle" textLength="1000" lengthAdjust="spacingAndGlyphs">
          {value}
        </text>
      </svg>
    </>
  );
}
