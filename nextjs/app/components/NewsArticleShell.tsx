import { PortableTextRenderer, extractHeadings, extractArticleSpots } from '@/lib/PortableTextRenderer';
import { Link } from '@/i18n/navigation';
import type { NewsArticle, MustEatCardBlock } from '@/lib/types';
import { normalizeName } from '@/lib/normalizeName';
import SiteFooter from './SiteFooter';
import NewsArticleShare from './NewsArticleShare';
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs';
import styles from './NewsArticleShell.module.css';

interface Props {
  article?: NewsArticle | null;
  relatedArticles?: NewsArticle[];
  locale?: string;
  isActive?: boolean;
}

function formatDate(iso: string | undefined, locale: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Article detail — Chewy magazine feature (mockup-chewy screen 8). Inline
// must-eat cards, the "Spots im Artikel" grid and the sticky spotrail are driven
// by mustEatCard reference blocks in the body; TOC + drop-cap come from the body.
export default function NewsArticleShell({
  article,
  relatedArticles = [],
  locale = 'de',
  isActive = false,
}: Props) {
  if (!article) return null;

  const de = locale === 'de';
  const title =
    (de ? article.titleDe : article.title) || article.title || article.titleDe || '';
  const excerpt =
    (de ? article.excerptDe : article.excerpt) || article.excerpt || '';
  const categoryLabel =
    (de ? article.categoryLabelDe : article.categoryLabel) || article.categoryLabel || '';
  const content =
    (de ? article.contentDe : article.content) || article.content || [];
  const dateFormatted = formatDate(article.date, locale);

  const headings = extractHeadings(content);
  const showToc = headings.length >= 2;
  const tocLabel = de ? 'In diesem Artikel' : 'In this article';

  const spots = extractArticleSpots(content);
  const spotsLabel = de ? 'Spots im Artikel' : 'Spots in this story';
  const toMapLabel = de ? 'Auf die Map →' : 'To the map →';

  // Inline "Must Eat" card (mockup-chewy screen 8) — the image is the full
  // collectible trading card. The whole card links to the Must-Eat detail on
  // the map (?me=<id>), mirroring an in-app tap.
  const renderMustEatCard = (block: MustEatCardBlock) => {
    if (!block.dish && !block.dishImage) return null;
    const ctaLabel = de ? 'Zum Must Eat →' : 'See the Must Eat →';
    const restName = block.restaurantName ? normalizeName(block.restaurantName) : '';
    const inner = (
      <>
        {block.dishImage && (
          <div className={styles.mustEatPh}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={block.dishImage} alt={block.dish || ''} />
          </div>
        )}
        <div className={styles.mustEatBody}>
          <span className={styles.mustEatKicker}>Must Eat</span>
          {block.dish && <h3 className={styles.mustEatName}>{block.dish}</h3>}
          {restName && <span className={styles.mustEatRest}>@ {restName}</span>}
          <span className={styles.mustEatCta}>{ctaLabel}</span>
        </div>
      </>
    );
    return block.mustEatId ? (
      <Link
        href={`/map?me=${block.mustEatId}`}
        rel="nofollow"
        className={styles.mustEat}
        aria-label={`${block.dish || 'Must Eat'}${restName ? ` — ${restName}` : ''}`}
      >
        {inner}
      </Link>
    ) : (
      <div className={styles.mustEat}>{inner}</div>
    );
  };

  const homeLabel = de ? 'Start' : 'Home';
  const newsLabel = de ? 'Auf dem Teller' : 'On the Menu';
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: homeLabel, href: '/' },
    { name: newsLabel, href: '/news' },
    { name: title },
  ];

  const recommendations = relatedArticles
    .filter((a) => a.slug !== article.slug)
    .slice(0, 3);
  const moreLabel = de ? 'Weiter auf dem Teller' : 'More on the menu';

  return (
    <div
      className={`app-page news-article-page${isActive ? ' active' : ''} ${styles.page}`}
      data-page="news-article"
      id="newsModal"
    >
      <article className={`${styles.article}${spots.length > 0 ? ` ${styles.hasSpotrail}` : ''}`}>
        {article.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={article.imageUrl} alt={title} className={styles.hero} />
        )}

        <div className={styles.byline}>
          <span>{categoryLabel || 'Berlin · Die Kolumne'}</span>
          {dateFormatted && <time dateTime={article.date}>{dateFormatted}</time>}
        </div>

        <h1 className={styles.title}>{title}</h1>

        {excerpt && <p className={styles.lede}>{excerpt}</p>}

        <div className={styles.breadcrumbWrap}>
          <Breadcrumbs
            items={breadcrumbItems}
            ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'}
          />
        </div>

        {showToc && (
          <nav className={styles.toc} aria-label={tocLabel}>
            <p className={styles.tocLabel}>{tocLabel}</p>
            <ol className={styles.tocList}>
              {headings.map((h) => (
                <li key={h.id} className={styles.tocItem}>
                  <a href={`#${h.id}`} className={styles.tocLink}>{h.text}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className={styles.content}>
          <PortableTextRenderer blocks={content} renderMustEatCard={renderMustEatCard} />
        </div>

        {spots.length > 0 && (
          <section className={styles.spots} aria-label={spotsLabel}>
            <h2 className={styles.spotsHeading}>{spotsLabel}</h2>
            <div className={styles.spotsRow}>
              {spots.map((s) => {
                const name = normalizeName(s.name);
                const meta = [s.district, s.cuisineType].filter(Boolean).join(' · ');
                const inner = (
                  <span className={styles.spotCardFoot}>
                    {meta && <span className={styles.spotMeta}>{meta}</span>}
                    <span className={styles.spotName}>{name}</span>
                  </span>
                );
                const bg = s.photo ? { backgroundImage: `url(${s.photo})` } : undefined;
                return s.slug ? (
                  <Link
                    key={s.slug}
                    href={`/map?r=${s.slug}`}
                    rel="nofollow"
                    className={styles.spotCard}
                    style={bg}
                    aria-label={name}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={s.name} className={styles.spotCard} style={bg}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className={styles.shareRow}>
          <NewsArticleShare
            title={title}
            excerpt={excerpt}
            label={de ? 'Teilen' : 'Share'}
            className={styles.shareBtn}
          />
        </div>

        {recommendations.length > 0 && (
          <section className={styles.related}>
            <h2 className={styles.relatedHeading}>{moreLabel}</h2>
            <ul className={styles.relatedGrid} role="list">
              {recommendations.map((rec) => {
                const recTitle = (de ? rec.titleDe : rec.title) || rec.title || '';
                const recCategory =
                  (de ? rec.categoryLabelDe : rec.categoryLabel) || rec.categoryLabel || '';
                return (
                  <li key={rec.slug}>
                    <Link href={`/news/${rec.slug}`} className={styles.relatedCard}>
                      <div
                        className={styles.relatedImage}
                        style={rec.imageUrl ? { backgroundImage: `url(${rec.imageUrl})` } : undefined}
                        role="img"
                        aria-label={recTitle}
                      />
                      <div className={styles.relatedBody}>
                        {recCategory && <span className={styles.relatedCategory}>{recCategory}</span>}
                        <h3 className={styles.relatedHeadline}>{recTitle}</h3>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </article>

      {spots.length > 0 && (
        <aside className={styles.spotrail} aria-label={spotsLabel}>
          <div className={styles.spotrailPics}>
            {spots.slice(0, 3).map((s) => (
              <span
                key={s.slug ?? s.name}
                className={styles.spotrailPic}
                style={s.photo ? { backgroundImage: `url(${s.photo})` } : undefined}
                aria-hidden="true"
              />
            ))}
          </div>
          <div className={styles.spotrailMeta}>
            <span className={styles.spotrailKicker}>{spotsLabel}</span>
            <span className={styles.spotrailNames}>
              {spots.map((s) => normalizeName(s.name)).join(' · ')}
            </span>
          </div>
          <Link href="/map" rel="nofollow" className={styles.spotrailCta}>
            {toMapLabel}
          </Link>
        </aside>
      )}

      <SiteFooter />
    </div>
  );
}
