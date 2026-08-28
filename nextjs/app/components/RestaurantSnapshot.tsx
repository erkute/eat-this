'use client';

// Zustands-Zeile direkt unter dem Aufmacher der Restaurant-Seite:
// „Geöffnet · bis 18:30 · 10–20 € · Sophienstraße 21".
//
// Die GSC-Daten der Spot-Seiten sind eindeutig: nach der blanken Marke sind
// „<spot> uhrzeit" und „<spot> karte/menu" die größten Query-Cluster — und
// beide wurden bisher erst vom Faktenblock nach ~2 Bildschirmhöhen
// beantwortet. Diese Zeile beantwortet den Zustand in Sekunde eins. Sie ist
// bewusst KEINE Kopie des Faktenblocks (den 2026 entfernten Adress-Streifen
// gab es schon einmal, er fiel als Dopplung): hier steht der *berechnete*
// Offen-Zustand plus Kurzfassungen, unten stehen die vollen Rohdaten.
//
// Client-Komponente, weil die Seite statisch vorgerendert wird (revalidate:
// 24 h) — ein serverseitig gerendertes „Geöffnet" wäre je nach Build-Zeitpunkt
// tagelang falsch. Preis und Straße stehen deshalb schon im SSR-HTML, nur der
// Zustand kommt nach dem Mount dazu.

import { useEffect, useState } from 'react';
import { getOpenStatus } from '@/lib/map/openingHours';
import type { OpeningHourSlot } from '@/lib/types';
import styles from './RestaurantSnapshot.module.css';

interface Props {
  openingHours: OpeningHourSlot[];
  /** Formatiertes Preisband ("10–20 €") — null, wenn keins gepflegt ist. */
  priceLabel: string | null;
  /** Straße + Hausnummer; die volle Adresse bleibt dem Faktenblock. */
  street: string | null;
  mapsHref: string | null;
  locale: 'de' | 'en';
}

// Server und Besucher können in beliebigen Zeitzonen stehen; der Zustand eines
// Berliner Ladens folgt der Berliner Wanduhr. Gleiche Ableitung wie
// `berlinNow` in lib/buddy/retrieval.ts — dort serverseitig, hier im Client.
function berlinNow(): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return new Date(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
}

export default function RestaurantSnapshot({
  openingHours,
  priceLabel,
  street,
  mapsHref,
  locale,
}: Props) {
  const de = locale === 'de';
  const [status, setStatus] = useState<{ text: string; isOpen: boolean } | null>(null);

  useEffect(() => {
    if (openingHours.length === 0) return;
    const s = getOpenStatus(
      openingHours,
      berlinNow(),
      de
        ? { open: 'Geöffnet', closed: 'Geschlossen', opens: 'öffnet', closes: 'bis' }
        : { open: 'Open', closed: 'Closed', opens: 'opens', closes: 'till' }
    );
    if (s.label) setStatus({ text: s.label, isOpen: s.isOpen });
  }, [openingHours, de]);

  const segments = [
    status && (
      <span key="state" className={status.isOpen ? styles.open : styles.closed}>
        {status.text}
      </span>
    ),
    priceLabel && <span key="price">{priceLabel}</span>,
    street &&
      (mapsHref ? (
        <a
          key="street"
          className={styles.streetLink}
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          {street}
        </a>
      ) : (
        <span key="street">{street}</span>
      )),
  ].filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <p className={styles.line}>
      {segments.map((segment, i) => (
        <span key={i} className={styles.segment}>
          {i > 0 && (
            <span aria-hidden="true" className={styles.sep}>
              {' · '}
            </span>
          )}
          {segment}
        </span>
      ))}
    </p>
  );
}
