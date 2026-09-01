import Image from 'next/image';
import { PortableTextRenderer, extractHeadings } from '@/lib/PortableTextRenderer';
import { Link } from '@/i18n/navigation';
import type {
  NewsArticle,
  MustEatCardBlock,
  SpotCardBlock,
  ArticleImageBlock,
  PortableTextBlock,
} from '@/lib/types';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { categoryArt } from '@/lib/categoryArt';
import { normalizeName } from '@/lib/normalizeName';
import SiteFooter from './SiteFooter';
import NewsArticleShare from './NewsArticleShare';
import ArticleRail from './ArticleRail';
import MapIntentLink from './MapIntentLink';
import { articleHubLink, articleHubLabel } from '@/lib/seo/articleHubLinks';
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

/** Share of `a` that also runs through `b`, in order — a longest-common-
 *  subsequence ratio. Unlike a prefix test it survives the word an editor swaps
 *  or the clause they drop when trimming a paragraph down to a teaser. */
function orderedOverlap(a: string[], b: string[]): number {
  if (!a.length) return 0;
  const row = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let prevDiagonal = 0;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prevDiagonal + 1 : Math.max(row[j], row[j - 1]);
      prevDiagonal = above;
    }
  }
  return row[b.length] / a.length;
}

/** Everything up to the first full stop. A dash or a colon does not end a
 *  sentence — plenty of our openings run "Berlin ohne X ist undenkbar – die
 *  Stadt hat ...", and that whole clause is one thought. */
function firstSentence(text: string): string {
  return (text.match(/^[^.!?]+/) ?? [text])[0];
}

/** How much of the lede's opening sentence must run through the article's, and
 *  how much of the first words must match when neither has a sentence to judge. */
const SENTENCE_OVERLAP = 0.7;
const LEDE_WINDOW = 10;
const LEDE_OVERLAP = 0.8;

/** The excerpt is authored as the article's opening line, so on most pieces it
 *  is word-for-word the first paragraph — printed as a bold lede and then again
 *  right below with a drop cap. When they overlap, the lede loses.
 *
 *  On the Ich-Kolumnen the excerpt is usually that opening *rewritten*: a word
 *  swapped, a sentence dropped, the paragraph after it stitched on. It reads
 *  just as doubled, so past the exact match we ask the question a reader would:
 *  does the lede open on the sentence the article opens on? Only the openings
 *  are compared — further down, a teaser may quote the body and keep its lede. */
function ledeDuplicatesOpening(excerpt: string, blocks: PortableTextBlock[]): boolean {
  if (!excerpt.trim()) return false;
  const first = (blocks as TextBlock[]).find(
    (b) => b._type === 'block' && (b.style ?? 'normal') === 'normal' && blockText(b).trim()
  );
  if (!first) return false;
  const openingText = blockText(first);
  const opening = normalizeForCompare(openingText);
  const lede = normalizeForCompare(excerpt);
  if (!opening || !lede) return false;
  if (opening.startsWith(lede) || lede.startsWith(opening)) return true;

  const ledeSentence = normalizeForCompare(firstSentence(excerpt)).split(' ');
  // Under four words it is a fragment — "Kein Ranking." lines up with anything.
  if (ledeSentence.length >= 4) {
    const openingSentence = normalizeForCompare(firstSentence(openingText)).split(' ');
    if (orderedOverlap(ledeSentence, openingSentence) >= SENTENCE_OVERLAP) return true;
  }

  // Fallback for a lede that opens on a fragment but copies on from there.
  return (
    orderedOverlap(
      lede.split(' ').slice(0, LEDE_WINDOW),
      opening.split(' ').slice(0, LEDE_WINDOW)
    ) >= LEDE_OVERLAP
  );
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
  const hubLink = articleHubLink(article.slug);
  // Nur Kategorie-Hubs haben ein Booster-Pack; Bezirke nicht.
  const hubPack = hubLink?.href.startsWith('/kategorie/')
    ? categoryArt(hubLink.href.replace('/kategorie/', ''))
    : null;
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
    const restName = block.restaurantName ? normalizeName(block.restaurantName) : '';
    const heading = restName || (de ? 'Das Must Eat' : 'The Must Eat');
    // Dieselbe Ansage wie auf der Spot-Seite („… hat es auf unsere Karten
    // geschafft"), damit der Block wiedererkennbar ist. Bezirk und Küche
    // standen hier vorher als Meta-Zeile — sie wiederholten, was der Artikel
    // ringsum ohnehin erzählt, und machten aus dem Teaser eine Datenzeile.
    const description = restName
      ? de
        ? `Ein Gericht hat es bei ${restName} auf unsere Karten geschafft.`
        : `One dish here made it onto our cards.`
      : de
        ? 'Ein Gericht hat es auf unsere Karten geschafft.'
        : 'One dish made it onto our cards.';
    const inner = (
      <>
        <div className={styles.mustEatPh}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pics/card-back.webp?v=7" alt="" />
        </div>
        <div className={styles.mustEatBody}>
          <span className={styles.mustEatTag}>Must Eat</span>
          <h3 className={styles.mustEatName}>{heading}</h3>
          <p className={styles.mustEatDesc}>{description}</p>
        </div>
      </>
    );
    // Ziel ist die Spot-Seite, nicht mehr der Map-Deeplink. Auf die Map führt
    // im selben Artikel schon die Spot-Karte (?r=<slug>) — beide Blöcke landeten
    // also am selben Ort. Über die Spot-Seite kommt man weiterhin zur Karte:
    // ihr Must-Eat-Teaser deeplinkt auf genau dieses Gericht. Ohne bekannten
    // Slug bleibt die Must-Eat-Übersicht.
    const href = block.restaurantSlug ? `/restaurant/${block.restaurantSlug}` : '/must-eats';
    return (
      <Link
        href={href}
        className={styles.mustEat}
        aria-label={
          de
            ? `Must Eat${restName ? ` bei ${restName}` : ''} ansehen`
            : `See the Must Eat${restName ? ` at ${restName}` : ''}`
        }
      >
        {inner}
      </Link>
    );
  };

  // Die Spot-Karte trägt zwei Ziele, weil sie zwei Aufgaben hat. Der Name ist
  // ein **gefolgter** Link auf die Spot-Seite: die Guides sammeln die
  // thematische Relevanz für „beste X in Berlin" ein, und ohne diesen Link
  // gaben sie nichts davon an die Restaurantseiten weiter — Google rankte
  // deshalb den Guide für Marken-Queries einzelner Spots („taktil bakery",
  // „hokey pokey mauerpark") statt der Seite, die dem Laden gehört. Sein
  // ::after spannt sich über die ganze Karte, damit die Fläche tapbar bleibt;
  // `overflow: hidden` auf .inlineSpot beschneidet den Überstand.
  // Der Map-Deeplink bleibt als Knopf darüber (z-index) erhalten — weiter
  // nofollow, weil er eine Query trägt (`?r=`) und die Search Console sonst
  // jede Variante einzeln aufzählt. Die Map selbst ist seit dem 01.09.2026
  // indexierbar; das blanke /map darf gefolgt werden (siehe isMapLink).
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
      <span
        className={styles.inlineSpot}
        style={
          block.restaurantPhoto ? { backgroundImage: `url(${block.restaurantPhoto})` } : undefined
        }
      >
        <span className={styles.inlineSpotFoot}>
          {meta && <span className={styles.inlineSpotMeta}>{meta}</span>}
          <span className={styles.inlineSpotName}>
            <Link
              href={`/restaurant/${block.restaurantSlug}`}
              className={styles.inlineSpotNameLink}
            >
              {restName}
            </Link>
          </span>
          <MapIntentLink
            href={`/map?r=${block.restaurantSlug}`}
            rel="nofollow"
            className={styles.inlineSpotCta}
            aria-label={de ? `${restName} auf der Map öffnen` : `Open ${restName} on the map`}
          >
            <span>{cta}</span>
          </MapIntentLink>
        </span>
      </span>
    );
  };

  // Inline editorial photo. The projection only resolves URL + dimensions for
  // blocks that actually carry an asset, so a half-filled Studio block drops
  // out here instead of rendering an empty frame.
  const renderImage = (block: ArticleImageBlock) => {
    if (!block.imageUrl) return null;
    return (
      <figure className={styles.inlineImage}>
        <Image
          src={block.imageUrl}
          alt={block.alt || ''}
          width={block.imageWidth || 1440}
          height={block.imageHeight || 1080}
          sizes="(max-width: 760px) 100vw, 720px"
        />
        {block.caption && <figcaption>{block.caption}</figcaption>}
      </figure>
    );
  };

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
            {/* Keine Brotkrume: der Artikeltitel ist zu lang für eine Zeile und
                brach als dritte Krume um. Sie trug ohnehin keinen eigenen Link
                — „/" und „/news" stehen im Burger, der auf jeder Seite
                gerendert wird. Das BreadcrumbList-JSON-LD in
                `news/[slug]/page.tsx` bleibt davon unberührt, die SERP-Krume
                also auch. Eater und Mit Vergnügen führen ihre Guides ebenfalls
                ohne. */}
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
                  renderImage={renderImage}
                />
              </div>

              {/* Teilen steht direkt unter dem Text, der Katalog-Ausgang
                  darunter: Teilen bezieht sich auf den gelesenen Artikel und
                  gehört an dessen Ende; der Hub führt aus ihm hinaus und ist
                  damit der letzte Schritt der Seite. */}
              <div className={styles.shareRow}>
                <NewsArticleShare
                  title={title}
                  excerpt={excerpt}
                  label={shareLabel}
                  copiedLabel={copiedLabel}
                  className={styles.shareBtn}
                />
              </div>

              {hubLink && (
                <Link href={hubLink.href} className={styles.hubLink}>
                  {/* Zeigt der Hub auf eine Kategorie, steht ihr Booster-Pack
                      davor — dieselbe Art wie auf /packs und in der
                      „Mehr davon"-Zeile der Spot-Seiten. Bezirks-Hubs haben
                      keine Art; dort trägt die Zeile allein. Der Pfeil, der
                      hier stand, ist weg: die Fläche ist der Knopf. */}
                  {hubPack && (
                    <Image
                      src={hubPack}
                      alt=""
                      width={72}
                      height={101}
                      className={styles.hubLinkPack}
                    />
                  )}
                  <span className={styles.hubLinkKicker}>
                    {de ? 'Der ganze Katalog' : 'The full catalogue'}
                  </span>
                  <span className={styles.hubLinkLabel}>
                    {articleHubLabel(hubLink, de ? 'de' : 'en')}
                  </span>
                </Link>
              )}
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
