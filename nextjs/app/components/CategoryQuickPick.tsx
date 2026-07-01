'use client';
import { useState } from 'react';
import MapIntentLink from './MapIntentLink';
import styles from './CategoryQuickPick.module.css';

interface Props {
  categoryNames: Record<string, string>;
  placeholder: string;
}

export default function CategoryQuickPick({ categoryNames, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(categoryNames);
  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{placeholder}</span>
        <span className="hv-btn hv-btn--accent" aria-hidden="true">
          Map
        </span>
      </button>
      <div className={styles.grid} data-open={open || undefined}>
        {entries.map(([slug, name]) => (
          <MapIntentLink key={slug} href={`/map?cat=${slug}`} rel="nofollow" className="hv-chip">
            {name}
          </MapIntentLink>
        ))}
      </div>
    </div>
  );
}
