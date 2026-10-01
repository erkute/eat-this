import type { CSSProperties } from 'react';
import { Link } from '@/i18n/navigation';
import type { HubArticle } from '@/lib/home/getHomeData';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import sanityImageLoader from '@/lib/sanityImageLoader';
import styles from './MagazineGrid.module.css';

interface Props {
  articles: HubArticle[];
  locale: 'de' | 'en';
}

const CARD_COUNT = 6;

// Dasselbe Format wie der Magazin-Index (NewsSection): „1. September 2026".
function formatDate(iso: string | null | undefined, locale: 'de' | 'en'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * „Auf dem Teller" als Stapel aus Titelseiten (30.09.2026). Jeder Artikel ist
 * ein Cover: Foto vollflächig, der Titel auf einem Ink-Band, damit er auch
 * auf hellen Fotos lesbar bleibt.
 * Beim Scrollen klebt ein Cover oben fest und das nächste schiebt sich
 * darüber; das untere kippt dabei nach hinten und wird kleiner.
 *
 * Das Stapeln ist `position: sticky`, die Bewegung eine Scroll-Timeline: jedes
 * Cover gibt seine Timeline (`--cover-<i>`) an das darunterliegende weiter,
 * `timeline-scope` am Stapel macht die Namen dafür sichtbar. Ohne Timelines
 * stapeln die Cover trotzdem, nur ohne Kippen.
 */
export default function MagazineGrid({ articles, locale }: Props) {
  if (!articles.length) return null;
  const list = articles.slice(0, CARD_COUNT);
  const labels = {
    all: locale === 'en' ? 'All stories' : 'Alle Stories',
    kicker: locale === 'en' ? 'Magazine' : 'Magazin',
    title: locale === 'en' ? 'On the plate' : 'Auf dem Teller',
  };
  const names = list.map((_, i) => `--cover-${i}`);

  return (
    <section
      className={`homeV2 hv-section hv-wrap ${styles.section}`}
      aria-label={labels.kicker}
      data-hub-magazine=""
    >
      <div className={styles.layout}>
        <div className={styles.aside}>
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

        <ol
          className={styles.stack}
          role="list"
          aria-label={labels.kicker}
          style={{ timelineScope: names.join(', ') } as CSSProperties}
        >
          {list.map((a, i) => {
            const date = formatDate(a.date, locale);
            return (
              <li
                key={a.slug}
                className={styles.item}
                style={
                  {
                    '--i': i,
                    viewTimelineName: names[i],
                    // The cover underneath tilts back as this one arrives.
                    '--covered-by': names[i + 1] ?? 'none',
                  } as CSSProperties
                }
              >
                <Link href={`/news/${a.slug}`} className={styles.cover}>
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
                      sizes="(max-width: 767.98px) 92vw, 460px"
                    />
                  )}
                  <span className={styles.band}>
                    {(a.kicker || date) && (
                      <span className={styles.meta}>
                        {a.kicker && <span className={styles.kicker}>{a.kicker}</span>}
                        {date && (
                          <time className={styles.date} dateTime={a.date ?? undefined}>
                            {date}
                          </time>
                        )}
                      </span>
                    )}
                    <span className={styles.title}>{a.title}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <div className={styles.foot}>
          <Link href="/news" className={styles.allLink}>
            {labels.all}
          </Link>
        </div>
      </div>
    </section>
  );
}
