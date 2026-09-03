import { Link } from '@/i18n/navigation';
import type { HubArticle } from '@/lib/home/getHomeData';
import styles from './MagazineGrid.module.css';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import sanityImageLoader from '@/lib/sanityImageLoader';

interface Props {
  articles: HubArticle[];
  locale: 'de' | 'en';
}

// Three stories, not six. Stacked full-width on mobile the old six-card grid
// ran 3218px — 41% of the entire home page — for the section readers reach
// last. Three cards in a swipeable rail carry the same "we know this city"
// signal at a fifth of the height.
const CARD_COUNT = 3;

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

export default function MagazineGrid({ articles, locale }: Props) {
  if (!articles.length) return null;
  const list = articles.slice(0, CARD_COUNT);
  const labels = {
    all: locale === 'en' ? 'All stories' : 'Alle Stories',
    kicker: locale === 'en' ? 'Magazine' : 'Magazin',
  };
  return (
    <section
      className={`homeV2 hv-section hv-wrap ${styles.section}`}
      aria-label={locale === 'en' ? 'Magazine' : 'Magazin'}
    >
      {/* Derselbe Kopf wie jeder Abschnitt auf Weiß: gelbes Marken-Quadrat, roter
          Titel. Die gelbe „Magazin"-Pille war die einzige gefüllte Gelbfläche
          in einem Kicker. */}
      <div className={`hv-head ${styles.head}`}>
        <span className={`hv-kicker ${styles.eyebrow}`}>{labels.kicker}</span>
        <h2 className="hv-title">
          <span className="hv-mk" aria-hidden="true" />
          {locale === 'en' ? 'On the plate' : 'Auf dem Teller'}
        </h2>
      </div>

      <ul className={styles.grid} role="list">
        {list.map((a) => (
          <li key={a.slug}>
            <Link href={`/news/${a.slug}`} className={styles.card}>
              <span className={`hv-photo ${styles.photo}`}>
                {a.image && (
                  // Same detour as HubNearby had: `a.image` is already a Sanity
                  // URL, so /_next/image re-optimised an optimised file on
                  // Cloud Run. Sanity serves the responsive variants itself.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className={styles.photoImg}
                    src={sanityImageLoader({ src: a.image, width: 800, quality: 80 })}
                    srcSet={sanitySrcSet(a.image, [480, 800, 1200])}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width:760px) 92vw, 33vw"
                  />
                )}
              </span>
              <span className={styles.text}>
                {a.kicker && <span className={styles.kicker}>{a.kicker}</span>}
                <span className={styles.title}>{a.title}</span>
                {formatDate(a.date, locale) && (
                  <time className={styles.date} dateTime={a.date ?? undefined}>
                    {formatDate(a.date, locale)}
                  </time>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Unter den Kacheln wie „Alle Spots ansehen" und „Alle Must-Eats" —
          im Kopf war es der einzige Ausgang der Seite, der vor seinem Inhalt
          stand („der Button muss doch eher runter"). */}
      <div className={styles.foot}>
        <Link href="/news" className={styles.allLink}>
          {labels.all}
        </Link>
      </div>
    </section>
  );
}
