import Image from 'next/image';
import { PortableTextRenderer, extractHeadings } from '@/lib/PortableTextRenderer';
import { Link } from '@/i18n/navigation';
import type { NewsArticle, MustEatCardBlock, SpotCardBlock, PortableTextBlock } from '@/lib/types';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { normalizeName } from '@/lib/normalizeName';
import SiteFooter from './SiteFooter';
import NewsArticleShare from './NewsArticleShare';
import ArticleRail from './ArticleRail';
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs';
import MapIntentLink from './MapIntentLink';
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

type TextBlock = PortableTextBlock & { style?: string; children?: { text?: string }[] };

function blockText(block: TextBlock): string {
  return (block.children ?? []).map((c) => c.text ?? '').join('');
}

/** Plain prose of the article, for the reading estimate. */
function countWords(blocks: PortableTextBlock[]): number {
  let words = 0;
  for (const raw of blocks as TextBlock[]) {
    if (raw._type !== 'block') continue;
    const text = blockText(raw).trim();
    if (text) words += text.split(/\s+/).length;
  }
  return words;
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’‚“”„]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** The excerpt is authored as the article's opening line, so on most pieces it
 *  is word-for-word the first paragraph — printed as a bold lede and then again
 *  right below with a drop cap. When they overlap, the lede loses. */
function ledeDuplicatesOpening(excerpt: string, blocks: PortableTextBlock[]): boolean {
  if (!excerpt.trim()) return false;
  const first = (blocks as TextBlock[]).find(
    (b) => b._type === 'block' && (b.style ?? 'normal') === 'normal' && blockText(b).trim()
  );
  if (!first) return false;
  const opening = normalizeForCompare(blockText(first));
  const lede = normalizeForCompare(excerpt);
  if (!opening || !lede) return false;
  return opening.startsWith(lede) || lede.startsWith(opening);
}

// Article detail — Chewy magazine feature. On desktop the piece runs as a
// reading column with a sticky chapter rail beside it; inline must-eat and spot
// cards break out wider than the prose. Inline cards are driven by mustEatCard
// / spotCard reference blocks in the body.
export default function NewsArticleShell({
  article,
  relatedArticles = [],
  locale = 'de',
  isActive = false,
}: Props) {
  if (!article) return null;

  const de = locale === 'de';
  const title = (de ? article.titleDe : article.title) || article.title || article.titleDe || '';
  const excerpt = (de ? article.excerptDe : article.excerpt) || article.excerpt || '';
  const categoryLabel =
    (de ? article.categoryLabelDe : article.categoryLabel) || article.categoryLabel || '';
  const content = (de ? article.contentDe : article.content) || article.content || [];
  const dateFormatted = formatDate(article.date, locale);
  const chapters = extractHeadings(content);
  const showLede = Boolean(excerpt) && !ledeDuplicatesOpening(excerpt, content);
  const minutes = Math.max(1, Math.round(countWords(content) / 200));
  const readingTime = de ? `${minutes} Min. Lesezeit` : `${minutes} min read`;
  const shareLabel = de ? 'Teilen' : 'Share';
  const copiedLabel = de ? 'Kopiert' : 'Copied';

  // Inline "Must Eat" band — a flat strip in the article column, not a poster.
  // The restaurant carries the headline so two must-eats in one guide can't
  // read as the same block twice; the reveal idea lives in the line below.
  // The image is the collectible card's back, floating freigestellt with a
  // tilt. The whole band links to the Must-Eat detail on the map (?me=<id>),
  // mirroring an in-app tap.
  const renderMustEatCard = (block: MustEatCardBlock) => {
    if (!block.mustEatId && !block.restaurantName) return null;
    // "Must Eat" lives in the kicker only — the CTA uses the canonical map
    // wording so the label doesn't repeat itself.
    const ctaLabel = de ? 'Auf die Map' : 'To the map';
    const restName = block.restaurantName ? normalizeName(block.restaurantName) : '';
    const heading = restName || (de ? 'Das Must Eat' : 'The Must Eat');
    const description = de
      ? 'Das Gericht bleibt verdeckt, bis du es auf der Map aufdeckst.'
      : 'The dish stays covered until you reveal it on the map.';
    const kickerMeta = [
      block.district,
      block.cuisineType ? localizedCuisine(block.cuisineType, de ? 'de' : 'en') : null,
    ]
      .filter(Boolean)
      .join(' · ');
    const inner = (
      <>
        <div className={styles.mustEatPh}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pics/card-back.webp?v=6" alt="" />
        </div>
        <div className={styles.mustEatBody}>
          <span className={styles.mustEatKicker}>
            <span className={styles.mustEatTag}>Must Eat</span>
            {kickerMeta && <span className={styles.mustEatMeta}>{kickerMeta}</span>}
          </span>
          <h3 className={styles.mustEatName}>{heading}</h3>
          <p className={styles.mustEatDesc}>{description}</p>
          <span className={styles.mustEatCta}>
            <span>{ctaLabel}</span>
          </span>
        </div>
      </>
    );
    return block.mustEatId ? (
      <MapIntentLink
        href={`/map?me=${block.mustEatId}`}
        rel="nofollow"
        className={styles.mustEat}
        aria-label={
          de
            ? `Must Eat${restName ? ` bei ${restName}` : ''} auf der Map aufdecken`
            : `Reveal the Must Eat${restName ? ` at ${restName}` : ''} on the map`
        }
      >
        {inner}
      </MapIntentLink>
    ) : (
      <div className={styles.mustEat}>{inner}</div>
    );
  };

  // The spot card is the in-article tap on a restaurant: it opens the spot on
  // the map (?r=<slug>), not the restaurant page — same intent as a tap in the
  // app. nofollow because the map is noindex (see isMapLink in the renderer).
  const renderSpotCard = (block: SpotCardBlock) => {
    if (!block.restaurantName || !block.restaurantSlug) return null;
    const restName = normalizeName(block.restaurantName);
    const meta = [
      block.district,
      block.cuisineType ? localizedCuisine(block.cuisineType, de ? 'de' : 'en') : null,
    ]
      .filter(Boolean)
      .join(' · ');
    const cta = de ? 'Auf die Map' : 'To the map';

    return (
      <MapIntentLink
        href={`/map?r=${block.restaurantSlug}`}
        rel="nofollow"
        className={styles.inlineSpot}
        style={
          block.restaurantPhoto ? { backgroundImage: `url(${block.restaurantPhoto})` } : undefined
        }
        aria-label={de ? `${restName} auf der Map öffnen` : `Open ${restName} on the map`}
      >
        <span className={styles.inlineSpotFoot}>
          {meta && <span className={styles.inlineSpotMeta}>{meta}</span>}
          <span className={styles.inlineSpotName}>{restName}</span>
          <span className={styles.inlineSpotCta}>
            <span>{cta}</span>
          </span>
        </span>
      </MapIntentLink>
    );
  };

  const homeLabel = de ? 'Start' : 'Home';
  const newsLabel = de ? 'Auf dem Teller' : 'On the Menu';
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: homeLabel, href: '/', logo: 'eat-this' },
    { name: newsLabel, href: '/news' },
    { name: title },
  ];

  const recommendations = relatedArticles.filter((a) => a.slug !== article.slug).slice(0, 3);
  const moreLabel = de ? 'Weiter auf dem Teller' : 'More on the menu';
  const chaptersLabel = de ? 'Kapitel' : 'Chapters';

  const byline = (
    <div className={styles.byline}>
      <span className={styles.category}>{categoryLabel || (de ? 'Kolumne' : 'Column')}</span>
      <span className={styles.bylineMeta}>
        {dateFormatted && <time dateTime={article.date}>{dateFormatted}</time>}
        <span className={styles.readingTime}>{readingTime}</span>
      </span>
    </div>
  );

  return (
    <div
      className={`app-page news-article-page${isActive ? ' active' : ''} ${styles.page}`}
      data-page="news-article"
      id="newsModal"
    >
      <main className={styles.article}>
        <article>
          <header className={styles.header}>
            <div className={styles.breadcrumbWrap}>
              <Breadcrumbs
                items={breadcrumbItems}
                ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'}
              />
            </div>

            {article.imageUrl ? (
              <figure className={styles.heroWrap}>
                <Image
                  src={article.imageUrl}
                  alt={article.alt || title}
                  fill
                  priority
                  sizes="(max-width: 760px) 100vw, 1180px"
                  className={styles.hero}
                />
                <figcaption className={styles.introCopy}>
                  <h1 className={styles.heroTitle}>{title}</h1>
                </figcaption>
              </figure>
            ) : (
              <div className={styles.heroGridPlain}>
                <div className={styles.introCopy}>
                  <h1 className={styles.heroTitle}>{title}</h1>
                </div>
              </div>
            )}
          </header>

          <div className={styles.body}>
            <ArticleRail
              chapters={chapters}
              label={chaptersLabel}
              shareLabel={shareLabel}
              shareCopiedLabel={copiedLabel}
              shareTitle={title}
              shareExcerpt={excerpt}
            />

            <div className={styles.column}>
              {byline}
              {showLede && <p className={styles.lede}>{excerpt}</p>}

              <div className={styles.content}>
                <PortableTextRenderer
                  blocks={content}
                  renderMustEatCard={renderMustEatCard}
                  renderSpotCard={renderSpotCard}
                />
              </div>

              <div className={styles.shareRow}>
                <NewsArticleShare
                  title={title}
                  excerpt={excerpt}
                  label={shareLabel}
                  copiedLabel={copiedLabel}
                  className={styles.shareBtn}
                />
              </div>
            </div>
          </div>

          {recommendations.length > 0 && (
            <section className={styles.related}>
              <div className={styles.relatedHead}>
                <span className={styles.relatedMark} aria-hidden="true" />
                <h2 className={styles.relatedHeading}>{moreLabel}</h2>
              </div>
              <ul className={styles.relatedGrid} role="list">
                {recommendations.map((rec) => {
                  const recTitle = (de ? rec.titleDe : rec.title) || rec.title || '';
                  const recCategory =
                    (de ? rec.categoryLabelDe : rec.categoryLabel) || rec.categoryLabel || '';
                  return (
                    <li key={rec.slug}>
                      <Link href={`/news/${rec.slug}`} className={styles.relatedCard}>
                        <span className={styles.relatedPhoto}>
                          {rec.imageUrl && (
                            <Image
                              src={rec.imageUrl}
                              alt=""
                              fill
                              sizes="(max-width: 760px) 76vw, 33vw"
                            />
                          )}
                        </span>
                        <span className={styles.relatedText}>
                          {recCategory && (
                            <span className={styles.relatedCategory}>{recCategory}</span>
                          )}
                          <span className={styles.relatedHeadline}>{recTitle}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
