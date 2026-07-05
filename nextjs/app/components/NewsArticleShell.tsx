import Image from 'next/image';
import { PortableTextRenderer } from '@/lib/PortableTextRenderer';
import { Link } from '@/i18n/navigation';
import type { NewsArticle, MustEatCardBlock, SpotCardBlock } from '@/lib/types';
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
// must-eat cards are driven by mustEatCard reference blocks in the body.
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

  // Inline "Must Eat" banner — dark poster block in the article column, same
  // sticker language as MapPromoCTA. The image is the full collectible trading
  // card, floating freigestellt with a tilt. The whole banner links to the
  // Must-Eat detail on the map (?me=<id>), mirroring an in-app tap.
  const renderMustEatCard = (block: MustEatCardBlock) => {
    if (!block.dish && !block.dishImage) return null;
    // "Must Eat" lives in the kicker only — the CTA uses the canonical map
    // wording so the label doesn't repeat itself.
    const ctaLabel = de ? 'Auf die Map' : 'To the map';
    const restName = block.restaurantName ? normalizeName(block.restaurantName) : '';
    const description =
      (de ? block.dishDescription : block.dishDescriptionEn || block.dishDescription) || '';
    // Natural sentence instead of "@ Name · Bezirk" metadata soup.
    const whereLine = restName
      ? de
        ? `Gibt's bei ${restName}${block.district ? ` in ${block.district}` : ''}`
        : `Get it at ${restName}${block.district ? ` in ${block.district}` : ''}`
      : block.district || '';
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
          {description && <p className={styles.mustEatDesc}>{description}</p>}
          {whereLine && <span className={styles.mustEatRest}>{whereLine}</span>}
          <span className={styles.mustEatCta}>
            <span>{ctaLabel}</span>
          </span>
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

  const renderSpotCard = (block: SpotCardBlock) => {
    if (!block.restaurantName || !block.restaurantSlug) return null;
    const restName = normalizeName(block.restaurantName);
    const meta = [block.district, block.cuisineType].filter(Boolean).join(' · ');
    const cta = de ? 'Auf der Map öffnen' : 'Open on the map';

    return (
      <Link
        href={`/map?r=${block.restaurantSlug}`}
        rel="nofollow"
        className={styles.inlineSpot}
        style={block.restaurantPhoto ? { backgroundImage: `url(${block.restaurantPhoto})` } : undefined}
        aria-label={`${restName} ${cta}`}
      >
        <span className={styles.inlineSpotFoot}>
          {meta && <span className={styles.inlineSpotMeta}>{meta}</span>}
          <span className={styles.inlineSpotName}>{restName}</span>
          <span className={styles.inlineSpotCta}>
            <span>{cta}</span>
          </span>
        </span>
      </Link>
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
  const readLabel = de ? 'Lesen' : 'Read';

  return (
    <div
      className={`app-page news-article-page${isActive ? ' active' : ''} ${styles.page}`}
      data-page="news-article"
      id="newsModal"
    >
      <article className={styles.article}>
        <header className={styles.header}>
          <div className={styles.breadcrumbWrap}>
            <Breadcrumbs
              items={breadcrumbItems}
              ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'}
            />
          </div>

          <div className={article.imageUrl ? styles.heroGrid : styles.heroGridPlain}>
            <div className={styles.introCopy}>
              <div className={styles.byline}>
                <span>{categoryLabel || 'Berlin · Die Kolumne'}</span>
                {dateFormatted && <time dateTime={article.date}>{dateFormatted}</time>}
              </div>
              <h1 className={styles.heroTitle}>{title}</h1>
              {excerpt && <p className={styles.lede}>{excerpt}</p>}
            </div>

            {article.imageUrl && (
              // Hero = LCP element. fill + the Sanity loader serve a width-matched
              // srcset (mobile no longer downloads the w=1200 desktop file).
              <figure className={styles.heroWrap}>
                <Image
                  src={article.imageUrl}
                  alt={title}
                  fill
                  priority
                  sizes="(max-width: 760px) 100vw, 54vw"
                  className={styles.hero}
                />
              </figure>
            )}
          </div>
        </header>

        <div className={styles.content}>
          <PortableTextRenderer blocks={content} renderMustEatCard={renderMustEatCard} renderSpotCard={renderSpotCard} />
        </div>

        <div className={styles.shareRow}>
          <NewsArticleShare
            title={title}
            excerpt={excerpt}
            label={de ? 'Teilen' : 'Share'}
            copiedLabel={de ? 'Kopiert' : 'Copied'}
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
                        <span className={styles.relatedRead}>{readLabel}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </article>

      <SiteFooter />
    </div>
  );
}
