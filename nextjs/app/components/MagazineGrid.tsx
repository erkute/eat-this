import type { CSSProperties } from 'react';
import { Link } from '@/i18n/navigation';
import type { HubArticle } from '@/lib/home/getHomeData';
import { deckKeyframes } from '@/lib/home/magazineDeck';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import sanityImageLoader from '@/lib/sanityImageLoader';
import MagazineDeckDots from './MagazineDeckDots';
import styles from './MagazineGrid.module.css';

interface Props {
  articles: HubArticle[];
  locale: 'de' | 'en';
}

const CARD_COUNT = 6;
const DECK_ID = 'hub-magazine-deck';
const MASTHEAD = '/pics/eat-this-logo.webp';
/** Three cover styles in turn, so the stack reads as different issues:
 *  full-bleed, yellow frame, paper head. */
const LOOKS = [styles.lookBleed, styles.lookFrame, styles.lookPaper];

/** The issue's month on the cover, like a magazine: „September 2026". */
function formatMonth(iso: string | null | undefined, locale: 'de' | 'en'): string {
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

/**
 * „Auf dem Teller" als Stapel aus Magazinen (01.10.2026, nach „Card stack"
 * aus den GSAP-Demos). Jeder Artikel ist die Titelseite einer Ausgabe, gebaut
 * wie ein Heft: ganz oben klein „Issue 27 · September 2026" (gezählt ab dem
 * ältesten Artikel, siehe getHomeData), darunter das Eat-This-Logo als
 * Masthead, unten die Rubrik als Etikett über der ganzen Schlagzeile (nie
 * gekürzt, die Grösse richtet sich nach der Länge), ein Strichcode am Rand,
 * Glanz und Rücken — in drei wechselnden Stilen. Jedes Heft hat einen
 * Seitenblock aus Papierlagen rechts und unten und ist leicht in den Raum
 * gedreht, damit es dick wirkt (Ansage 01.10.: „wie ein Magazin, ein bisschen
 * dicker"). Sie liegen
 * als Stapel wie auf dem Tisch, die hinteren leicht verdreht und darüber
 * hinausragend. Quer wischen nimmt das oberste vom Stapel — es fliegt gedreht
 * nach links aus dem Bild —, die übrigen rücken eine Lage vor; zurückwischen
 * legt es wieder obenauf.
 *
 * Das Wischen ist nativ (Scroll-Snap, ein Einrastpunkt pro Cover), nicht
 * per Pointer-Handler: so fühlt es sich an wie Instagram, auch bei schrägem
 * Wisch (siehe wischen-nativ-statt-js). Alle Cover liegen in der ersten
 * Spalte des Querscrollers; dessen Scroll-Timeline (`--deck`) trägt sie um
 * genau den gescrollten Weg zurück und legt sie in den Stapel — die
 * Schlüsselbilder kommen aus `deckKeyframes`. Kein `sticky`: iOS 27 färbt
 * sonst die URL-Leiste. Ohne Scroll-Timelines ist es ein gewöhnlicher
 * Querstreifen mit Einrasten.
 */
export default function MagazineGrid({ articles, locale }: Props) {
  if (!articles.length) return null;
  const list = articles.slice(0, CARD_COUNT);
  const count = list.length;
  const labels = {
    all: locale === 'en' ? 'All stories' : 'Alle Stories',
    kicker: locale === 'en' ? 'Magazine' : 'Magazin',
    title: locale === 'en' ? 'On the plate' : 'Auf dem Teller',
    dot: (n: number) => (locale === 'en' ? `Story ${n} of ${count}` : `Story ${n} von ${count}`),
  };

  return (
    <section
      className={`homeV2 hv-section hv-wrap ${styles.section}`}
      aria-label={labels.kicker}
      data-hub-magazine=""
    >
      {/* Keyframes per cover and dot, for exactly this many covers. */}
      <style>{deckKeyframes(count)}</style>
      <div className={styles.layout}>
        <div>
          <div className={`hv-head ${styles.head}`}>
            <span className={`hv-kicker ${styles.eyebrow}`}>{labels.kicker}</span>
            <h2 className="hv-title">
              <span className="hv-mk" aria-hidden="true" />
              {labels.title}
            </h2>
          </div>
          <Link href="/news" className={`${styles.allLink} ${styles.allTop}`}>
            {labels.all}
          </Link>
        </div>

        <div className={styles.stage} style={{ '--count': count } as CSSProperties}>
          <div id={DECK_ID} className={styles.deck}>
            <ol className={styles.track} role="list" aria-label={labels.kicker}>
              {list.map((a, i) => {
                const month = formatMonth(a.date, locale);
                return (
                  <li
                    key={a.slug}
                    className={styles.card}
                    style={
                      {
                        '--i': i,
                        zIndex: count - i,
                        animationName: `mag-deck-${count}-${i}`,
                      } as CSSProperties
                    }
                  >
                    <Link href={`/news/${a.slug}`} className={styles.mag}>
                      <span className={`${styles.cover} ${LOOKS[i % LOOKS.length]}`}>
                        {a.image && (
                          // Sanity serves the responsive variants itself; the App
                          // Hosting image proxy would re-optimise them.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className={styles.photo}
                            src={sanityImageLoader({ src: a.image, width: 800, quality: 80 })}
                            srcSet={sanitySrcSet(a.image, [480, 800, 1200])}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            sizes="(max-width: 767.98px) 80vw, 420px"
                          />
                        )}
                        <span className={styles.scrim} aria-hidden="true" />
                        <span className={styles.folio} aria-hidden="true">
                          Issue {a.issue}
                          {month && ` · ${month}`}
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className={styles.masthead}
                          src={MASTHEAD}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          decoding="async"
                        />
                        <span className={styles.lines}>
                          {a.kicker && <span className={styles.flash}>{a.kicker}</span>}
                          <span
                            className={styles.headline}
                            style={{ '--headline': `${headlineSize(a.title)}cqw` } as CSSProperties}
                          >
                            {a.title}
                          </span>
                        </span>
                        <span className={styles.barcode} aria-hidden="true" />
                        <span className={styles.sheen} aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                );
              })}
              {/* One snap point per cover: the swipe distance between two. */}
              {list.map((a, i) => (
                <li
                  key={`snap-${a.slug}`}
                  className={styles.snap}
                  style={{ gridColumn: i + 1 }}
                  aria-hidden="true"
                />
              ))}
            </ol>
          </div>
          {count > 1 && (
            <MagazineDeckDots deckId={DECK_ID} labels={list.map((_, i) => labels.dot(i + 1))} />
          )}
        </div>

        <div className={styles.foot}>
          <Link href="/news" className={styles.allLink}>
            {labels.all}
          </Link>
        </div>
      </div>
    </section>
  );
}
