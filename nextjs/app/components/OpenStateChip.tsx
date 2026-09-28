'use client';

// Gemeinsamer Zustands-Chip fuer Restaurant-Seite und Map-Detail: „Geöffnet · bis 18:30"
// (grüner Punkt) oder „Geschlossen · öffnet 12:00" (roter Punkt).
//
// Client-Komponente, weil die Seite statisch vorgerendert wird (revalidate:
// 24 h) — ein serverseitig gerendertes „Geöffnet" wäre je nach Build-Zeitpunkt
// tagelang falsch. Der Chip erscheint deshalb erst nach dem Mount.

import { useEffect, useState } from 'react';
import { formatOpenStateChip } from '@/lib/map/openingHours';
import type { OpeningHourSlot } from '@/lib/types';
import styles from './OpenStateChip.module.css';

interface Props {
  openingHours: OpeningHourSlot[];
  locale: 'de' | 'en';
  /** `isClosed` in Sanity: der Laden pausiert. Dann gilt keine Uhrzeit, und der
      Chip steht schon im Server-HTML — er hängt nicht an der Uhr. */
  temporarilyClosed?: boolean;
}

export default function OpenStateChip({ openingHours, locale, temporarilyClosed }: Props) {
  const de = locale === 'de';
  const [status, setStatus] = useState<{ text: string; isOpen: boolean } | null>(null);

  useEffect(() => {
    if (temporarilyClosed || openingHours.length === 0) return;
    const s = formatOpenStateChip(openingHours, de ? 'de' : 'en');
    if (s) setStatus(s);
  }, [openingHours, de, temporarilyClosed]);

  if (temporarilyClosed) {
    return (
      <span className={`${styles.chip} ${styles.closed}`}>
        {de ? 'Vorübergehend geschlossen' : 'Temporarily closed'}
      </span>
    );
  }
  if (!status) return null;

  return (
    <span className={`${styles.chip} ${status.isOpen ? styles.open : styles.closed}`}>
      {status.text}
    </span>
  );
}
