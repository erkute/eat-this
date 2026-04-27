'use client';

import { useState } from 'react';
import styles from './landing.module.css';

const TABS = ['In deiner Nähe', 'Bezirke', 'Must-Eat-Karten'];

export default function MapTeaser() {
  const [active, setActive] = useState(0);
  return (
    <section className={styles.mapTeaser}>
      <div className={styles.mapTeaserHead}>
        <span className={styles.secLabel}>Erkunde Berlin</span>
        <h2>Die interaktive Karte</h2>
        <p>
          Finde Restaurants in deiner Nähe, filter nach Bezirk und entdecke einzelne
          Must-Eat-Karten direkt auf der Karte.
        </p>
      </div>
      <div className={styles.mapVideo}>Video-Vorschau</div>
      <div className={styles.mapTabs}>
        {TABS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`${styles.mapTab} ${active === i ? styles.active : ''}`}
            onClick={() => setActive(i)}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
