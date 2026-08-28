'use client';

// Zustands-Chip im Aufmacher der Restaurant-Seite: „Geöffnet · bis 18:30"
// (grün) oder „Geschlossen · öffnet 12:00" (rot) — dieselbe Farbcodierung wie
// die rdTagOpen/rdTagClosed-Chips auf dem Map-Sheet, damit der Zustand überall
// gleich aussieht.
//
// Client-Komponente, weil die Seite statisch vorgerendert wird (revalidate:
// 24 h) — ein serverseitig gerendertes „Geöffnet" wäre je nach Build-Zeitpunkt
// tagelang falsch. Der Chip erscheint deshalb erst nach dem Mount neben den
// statischen Bezirk/Küche-Chips.

import { useEffect, useState } from 'react';
import { formatOpenStateChip } from '@/lib/map/openingHours';
import type { OpeningHourSlot } from '@/lib/types';
import styles from './OpenStateChip.module.css';

interface Props {
  openingHours: OpeningHourSlot[];
  locale: 'de' | 'en';
}

export default function OpenStateChip({ openingHours, locale }: Props) {
  const de = locale === 'de';
  const [status, setStatus] = useState<{ text: string; isOpen: boolean } | null>(null);

  useEffect(() => {
    if (openingHours.length === 0) return;
    const s = formatOpenStateChip(openingHours, de ? 'de' : 'en');
    if (s) setStatus(s);
  }, [openingHours, de]);

  if (!status) return null;

  return (
    <span className={`${styles.chip} ${status.isOpen ? styles.open : styles.closed}`}>
      {status.text}
    </span>
  );
}
