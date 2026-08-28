import { Link } from '@/i18n/navigation';
import type { GuideTeaser } from '@/lib/sanity.server';
import styles from './GuideCrossLinks.module.css';

interface Props {
  /** Die Guides zu diesem Hub, in kuratierter Reihenfolge. */
  guides: (GuideTeaser | null)[];
  locale: 'de' | 'en';
}

/**
 * Der Verweis vom Hub auf die Magazin-Guides, die dieselbe Frage beantworten.
 *
 * Steht am Fuß einer Bezirks- oder Kategorieseite, bewusst NACH den Listen:
 * der Hub beantwortet „welche gibt es", der Guide „welche und warum" — die
 * Reihenfolge auf der Seite bildet das ab.
 *
 * Warum es den Block gibt: Hub und Guide tragen praktisch denselben Titel
 * („Kaffee in Berlin: Die besten Cafés" gegen „Die besten Cafés in Berlin"),
 * und ohne eine Verbindung standen für Google zwei konkurrierende Antworten
 * nebeneinander statt Übersicht und Vertiefung. Ein Redirect wäre falsch — die
 * Seiten sind nicht dasselbe. Der Titel trägt den Link statt eines
 * „mehr"-Buttons: die Überschrift des Guides ist der beschreibendste
 * Ankertext, den diese Seite zu vergeben hat, und genau darum geht es hier.
 *
 * `noIndex` fliegt raus, damit der Hub nicht auf etwas zeigt, das gar nicht im
 * Index stehen soll.
 */
export default function GuideCrossLinks({ guides, locale }: Props) {
  const shown = guides.filter((g): g is GuideTeaser => Boolean(g) && !g!.noIndex);
  if (shown.length === 0) return null;

  const de = locale === 'de';
  return (
    <aside className={styles.wrap}>
      <p className={styles.kicker}>{de ? 'Ausführlich im Magazin' : 'In depth in the magazine'}</p>
      {shown.map((guide) => (
        <div key={guide.slug} className={styles.item}>
          <h2 className={styles.title}>
            <Link href={`/news/${guide.slug}`}>{guide.title}</Link>
          </h2>
          {guide.excerpt && <p className={styles.excerpt}>{guide.excerpt}</p>}
        </div>
      ))}
    </aside>
  );
}
