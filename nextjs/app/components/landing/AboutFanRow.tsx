import About from './About';
import FanCards from './FanCards';
import styles from './landing.module.css';

// Stacks About over FanCards on mobile; on desktop (≥1024px) lays them
// out as a 2-column row with text on the left and the fan flip on the right.
export default function AboutFanRow() {
  return (
    <div className={styles.aboutFanRow}>
      <About />
      <FanCards />
    </div>
  );
}
