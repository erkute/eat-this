import { PortableTextRenderer, extractHeadings } from '@/lib/PortableTextRenderer';
import type { PortableTextBlock, StaticPageDoc } from '@/lib/types';
import { Link } from '@/i18n/navigation';
import SiteFooter from './SiteFooter';
import styles from './LegalPage.module.css';

type Locale = 'de' | 'en';

const PAGES = [
  { slug: 'impressum', de: 'Impressum', en: 'Imprint' },
  { slug: 'datenschutz', de: 'Datenschutz', en: 'Privacy' },
  { slug: 'agb', de: 'AGB', en: 'Terms' },
];

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
  const showToc = chapters.length > 1;
  const title = PAGES.find((page) => page.slug === doc.slug)?.[locale] ?? doc.title;
  const contents = de ? 'Inhalt' : 'Contents';
  const tocList = (
    <ol className={styles.tocList}>
      {chapters.map((chapter, index) => (
        <li key={chapter.id}>
          <a href={`#${chapter.id}`} className={styles.tocLink}>
            <span className={styles.tocNum} aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span>{chapter.text}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <main className={styles.page} data-page={doc.slug} id={id}>
      <div className={styles.inner}>
        <nav className={styles.pageNav} aria-label={de ? 'Rechtliche Seiten' : 'Legal pages'}>
          {PAGES.map((page) => (
            <Link
              key={page.slug}
              href={`/${page.slug}`}
              aria-current={page.slug === doc.slug ? 'page' : undefined}
            >
              {page[locale]}
            </Link>
          ))}
        </nav>
        <header className={styles.head}>
          <h1 className={styles.title} id={`${id}-title`}>
            {title}
          </h1>
          {doc.title && doc.title !== title && <p className={styles.subtitle}>{doc.title}</p>}
          {updated && <p className={styles.updated}>{updated}</p>}
        </header>

        <div className={showToc ? styles.layout : undefined}>
          {showToc && (
            <>
              <nav className={styles.toc} aria-label={contents}>
                <p className={styles.tocLabel}>{contents}</p>
                {tocList}
              </nav>
              <details className={styles.mobileToc}>
                <summary>
                  {contents}
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="m5 7 5 5 5-5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </summary>
                <nav aria-label={contents}>{tocList}</nav>
              </details>
            </>
          )}

          <div className={styles.body} id={`${id}-body`}>
            <PortableTextRenderer blocks={body} />
          </div>
        </div>
        <a className={styles.backTop} href={`#${id}-title`}>
          {de ? 'Zurück nach oben' : 'Back to top'}
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 16V4m-5 5 5-5 5 5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </a>
      </div>
      <SiteFooter />
    </main>
  );
}
