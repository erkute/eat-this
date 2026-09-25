import { Link } from '@/i18n/navigation';
import type { GuideTeaser } from '@/lib/sanity.server';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import styles from './GuideCrossLinks.module.css';

interface Props {
  /** Die Guides zu diesem Hub, in kuratierter Reihenfolge. */
  guides: (GuideTeaser | null)[];
  locale: 'de' | 'en';
}

/** „1. September 2026" — dasselbe Format wie der Magazin-Index. Fest auf
 *  Berlin: ein Datum ohne Uhrzeit ist UTC-Mitternacht. */
function formatDate(iso: string | undefined, locale: 'de' | 'en'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  });
}

/**
 * Der Verweis vom Hub auf die Magazin-Guides, die dieselbe Frage beantworten.
 *
 * Steht am Fuß einer Bezirks- oder Kategorieseite, bewusst NACH den Listen:
 * der Hub beantwortet „welche gibt es", der Guide „welche und warum".
 *
 * Warum es den Block gibt: Hub und Guide tragen praktisch denselben Titel
 * („Kaffee in Berlin: Die besten Cafés" gegen „Die besten Cafés in Berlin"),
 * und ohne eine Verbindung standen für Google zwei konkurrierende Antworten
 * nebeneinander statt Übersicht und Vertiefung. Der Titel des Guides ist der
 * Ankertext — der beschreibendste, den diese Seite zu vergeben hat.
 *
 * Seit 25.09.2026 eine Artikel-Vorschau wie auf der Startseite (Foto, Rubrik
 * und Datum über der Headline, Anriss) statt unterstrichener Textlinks —
 * „muss besser aussehen, wie Artikel-Vorschauen halt".
 *
 * `noIndex` fliegt raus, damit der Hub nicht auf etwas zeigt, das gar nicht im
 * Index stehen soll.
 */
export default function GuideCrossLinks({ guides, locale }: Props) {
  const shown = guides.filter((g): g is GuideTeaser => Boolean(g) && !g!.noIndex);
  if (shown.length === 0) return null;

  const de = locale === 'de';
  return (
    <section className={styles.wrap} aria-labelledby="guides-title">
      <h2 id="guides-title" className={styles.heading}>
        {de ? 'Ausführlich im Magazin' : 'In depth in the magazine'}
      </h2>
      <div className={styles.cards} data-count={shown.length}>
        {shown.map((guide) => {
          const date = formatDate(guide.date, locale);
          return (
            <Link key={guide.slug} href={`/news/${guide.slug}`} className={styles.card}>
              <div className={styles.photo}>
                {guide.imageUrl && (
                  // Schon eine Sanity-URL — Sanity liefert die Größen selbst,
                  // /_next/image würde ein optimiertes Bild noch einmal rechnen.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={guide.imageUrl}
                    srcSet={sanitySrcSet(guide.imageUrl, [480, 800, 1200])}
                    sizes="(max-width: 699px) 100vw, (max-width: 1099px) 50vw, 420px"
                    // Leer: die Headline benennt den Link, ein Alt-Text davor
                    // ließe Vorleser erst das Foto beschreiben.
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>
              <div className={styles.text}>
                {(guide.kicker || date) && (
                  <p className={styles.meta}>
                    {guide.kicker && <span className={styles.kicker}>{guide.kicker}</span>}
                    {date && <time dateTime={guide.date}>{date}</time>}
                  </p>
                )}
                <h3 className={styles.title}>{guide.title}</h3>
                {guide.excerpt && <p className={styles.excerpt}>{guide.excerpt}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
