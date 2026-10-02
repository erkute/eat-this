import type { CSSProperties } from 'react';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import sanityImageLoader from '@/lib/sanityImageLoader';
import styles from './MagazineCover.module.css';

const MASTHEAD = '/pics/eat-this-logo.webp';
/** Three cover styles in turn, so a row of covers reads as different issues:
 *  full-bleed, yellow frame, paper head. */
const LOOKS = [styles.lookBleed, styles.lookFrame, styles.lookPaper];

/** The issue's month on the cover, like a magazine: „September 2026". */
export function formatMonth(iso: string | null | undefined, locale: 'de' | 'en'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/** Headline size in cover widths (cqw), so every title fits whole on its
 *  cover — never cut (Ansage 01.10.2026: „alles vom Titel zu lesen"). */
export function headlineSize(title: string): number {
  return Math.round(Math.min(7.6, Math.max(5.4, 360 / Math.max(title.length, 1))) * 10) / 10;
}

interface Props {
  title: string;
  /** Sanity image URL; without one the cover keeps its ground colour. */
  image?: string | null;
  kicker?: string | null;
  /** Place in the run of all articles, the oldest is 1 (siehe getHomeData). */
  issue?: number | null;
  /** ISO date — the cover only prints its month. */
  date?: string | null;
  locale: 'de' | 'en';
  /** Which of the three looks; pass the position in a row. */
  look?: number;
  sizes: string;
  widths?: number[];
  /** The page's LCP image: load at once and ahead of the rest. */
  priority?: boolean;
  /** Small covers (archive shelf, related row): type keeps a legible floor
   *  in px, where pure `cqw` would shrink below reading size. */
  compact?: boolean;
}

/**
 * Eine Titelseite des Eat-This-Hefts: ganz oben klein „Issue 27 · September
 * 2026", darunter das Logo als Masthead, unten die Rubrik als Etikett über der
 * ganzen Schlagzeile (nie gekürzt, die Grösse richtet sich nach der Länge), ein
 * Strichcode am Rand, Glanz, Rücken und eine feine Papierkante — dünn wie ein
 * Magazin, nicht wie ein Buch. Alles in `cqw` der Titelseite, damit sie in jeder Grösse gleich
 * gesetzt ist. Dasselbe Objekt auf der Startseite („Auf dem Teller"), im
 * Magazin-Index und unter „Weitere Ausgaben". Ein Tipp darauf schlägt das
 * Heft auf und landet im Artikel (MagazineLink) — im Artikel selbst steht das
 * Heft deshalb nicht noch einmal.
 *
 * Die Bewegung gehört nicht hierher: Stapel, Neigung und Wurf legt die Seite
 * um die Titelseite herum.
 */
export default function MagazineCover({
  title,
  image,
  kicker,
  issue,
  date,
  locale,
  look = 0,
  sizes,
  widths = [480, 800, 1200],
  priority = false,
  compact = false,
}: Props) {
  const month = formatMonth(date, locale);
  const folio = [issue ? `Issue ${issue}` : '', month].filter(Boolean).join(' · ');
  const className = [styles.cover, LOOKS[look % LOOKS.length], compact ? styles.compact : '']
    .filter(Boolean)
    .join(' ');

  return (
    // `data-magazine-cover`: MagazineLink opens exactly this cover.
    <span className={className} data-magazine-cover="">
      {image && (
        // Sanity serves the responsive variants itself; the App Hosting image
        // proxy would re-optimise them.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.photo}
          src={sanityImageLoader({ src: image, width: 800, quality: 80 })}
          srcSet={sanitySrcSet(image, widths)}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          sizes={sizes}
        />
      )}
      <span className={styles.scrim} aria-hidden="true" />
      {folio && (
        <span className={styles.folio} aria-hidden="true" data-cover-folio="">
          {folio}
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.masthead}
        src={MASTHEAD}
        alt=""
        aria-hidden="true"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
      <span className={styles.lines}>
        {kicker && <span className={styles.flash}>{kicker}</span>}
        <span
          className={styles.headline}
          style={{ '--headline': `${headlineSize(title)}cqw` } as CSSProperties}
        >
          {title}
        </span>
      </span>
      <span className={styles.barcode} aria-hidden="true" />
      <span className={styles.sheen} aria-hidden="true" />
    </span>
  );
}
