import { Link } from '@/i18n/navigation';
import type { HubArticle } from '@/lib/home/getHomeData';
import styles from './MagazineGrid.module.css';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import sanityImageLoader from '@/lib/sanityImageLoader';

interface Props {
  articles: HubArticle[];
  locale: 'de' | 'en';
}

// Sechs Stories als Band, das beim Scrollen durchs Bild läuft (seit
// 28.09.2026): nebeneinander kostet jede weitere Story keine Seitenhöhe, und
// je mehr darin liegen, desto deutlicher liest sich die Reihe als News.
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
      {/* Eine Ink-Tafel wie Starter Pack und Must Eats: der Abschnitt war
          zwischen zwei Tafeln der einzige lose Block auf Weiß und las sich
          nicht als eigenes Ding. Die Kacheln tragen darin keine eigene Fläche
          mehr — Foto mit Schatten, Text direkt auf der Tafel. */}
      <div className={styles.board}>
        <div className={`hv-head ${styles.head}`}>
          <span className={`hv-kicker ${styles.eyebrow}`}>{labels.kicker}</span>
          <h2 className="hv-title">
            <span className="hv-mk" aria-hidden="true" />
            {locale === 'en' ? 'On the plate' : 'Auf dem Teller'}
          </h2>
        </div>

        <ul className={`hv-rail ${styles.band}`} role="list" data-scroll-band="">
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
                      srcSet={sanitySrcSet(a.image, [480, 800, 1200, 1600])}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      // Karten wie im CSS: min(72vw, 270px), ab 768px bis 340px.
                      sizes="(max-width:767.98px) 72vw, 340px"
                    />
                  )}
                </span>
                {/* Rubrik und Datum stehen als eine Meta-Zeile ÜBER der
                    Headline — darunter las sich das Datum wie ein Nachsatz zum
                    Titel statt wie seine Einordnung (Ansage 03.09.2026). */}
                <span className={styles.text}>
                  {(a.kicker || formatDate(a.date, locale)) && (
                    <span className={styles.meta}>
                      {a.kicker && <span className={styles.kicker}>{a.kicker}</span>}
                      {formatDate(a.date, locale) && (
                        <time className={styles.date} dateTime={a.date ?? undefined}>
                          {formatDate(a.date, locale)}
                        </time>
                      )}
                    </span>
                  )}
                  <span className={styles.title}>{a.title}</span>
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
      </div>
    </section>
  );
}
