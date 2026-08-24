import { PortableTextRenderer, extractHeadings } from '@/lib/PortableTextRenderer';
import type { PortableTextBlock, StaticPageDoc } from '@/lib/types';
import SiteFooter from './SiteFooter';
import styles from './LegalPage.module.css';

type Locale = 'de' | 'en';

const KICKER: Record<string, { de: string; en: string }> = {
  impressum: { de: 'Rechtliches', en: 'Legal' },
  datenschutz: { de: 'Rechtliches', en: 'Legal' },
  agb: { de: 'Rechtliches', en: 'Legal' },
  contact: { de: 'Sag Hallo', en: 'Say hello' },
};

/** A standalone "Stand: 17. April 2026" paragraph belongs in the header, not
 *  buried in the first chapter. Matched tightly (whole paragraph, short, known
 *  prefix) so ordinary prose starting with "Stand der Technik…" is left alone. */
const DATE_LINE = /^(?:Stand|Stand vom|Letzte Aktualisierung|Last updated|Version)\s*:\s*(.+)$/i;

type Block = PortableTextBlock & {
  style?: string;
  listItem?: string;
  children?: { text?: string }[];
};

function blockText(block: Block): string {
  return (block.children ?? []).map((c) => c.text ?? '').join('');
}

function liftDateLine(blocks: PortableTextBlock[]): {
  updated: string | null;
  body: PortableTextBlock[];
} {
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i] as Block;
    if (block._type !== 'block' || block.listItem || (block.style ?? 'normal') !== 'normal')
      continue;
    const text = blockText(block).trim();
    if (text.length > 80) continue;
    const match = DATE_LINE.exec(text);
    if (!match) continue;
    return { updated: text, body: [...blocks.slice(0, i), ...blocks.slice(i + 1)] };
  }
  return { updated: null, body: blocks };
}

export default function LegalPage({ doc, locale }: { doc: StaticPageDoc; locale: Locale }) {
  const de = locale === 'de';
  const id = `staticPage${doc.slug.charAt(0).toUpperCase()}${doc.slug.slice(1)}`;
  const { updated, body } = liftDateLine(doc.body ?? []);
  const chapters = extractHeadings(body);
  // A jump list earns its space on a long filing (the German privacy policy
  // runs 20+ chapters); on a four-heading imprint it is just noise.
  const showToc = chapters.length >= 5;
  const kicker = KICKER[doc.slug] ?? { de: 'Rechtliches', en: 'Legal' };

  return (
    <main className={styles.page} data-page={doc.slug} id={id}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.kicker}>
            <span className={styles.mark} aria-hidden="true" />
            {de ? kicker.de : kicker.en}
          </p>
          <h1 className={styles.title} id={`${id}-title`}>
            {doc.title || ''}
          </h1>
          {updated && <p className={styles.updated}>{updated}</p>}
        </header>

        <div className={showToc ? styles.layout : undefined}>
          {showToc && (
            <nav className={styles.toc} aria-labelledby={`${id}-toc`}>
              <p className={styles.tocLabel} id={`${id}-toc`}>
                {de ? 'Inhalt' : 'Contents'}
              </p>
              <ol className={styles.tocList}>
                {chapters.map((chapter, index) => (
                  <li key={chapter.id}>
                    <a href={`#${chapter.id}`} className={styles.tocLink}>
                      <span className={styles.tocNum}>{String(index + 1).padStart(2, '0')}</span>
                      <span>{chapter.text}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className={styles.body} id={`${id}-body`}>
            <PortableTextRenderer blocks={body} />
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
