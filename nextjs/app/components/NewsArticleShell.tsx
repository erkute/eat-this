import { articleContent } from '@/lib/article-content';
import Image from '@/app/components/SiteImage';
import { PortableTextRenderer, extractHeadings } from '@/lib/PortableTextRenderer';
import { Link } from '@/i18n/navigation';
import type {
  NewsArticle,
  MustEatCardBlock,
  SpotCardBlock,
  ArticleImageBlock,
  ArticleCardBlock,
  PortableTextBlock,
} from '@/lib/types';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { articleCardText } from '@/lib/articleCard';
import { categoryArt } from '@/lib/categoryArt';
import { normalizeName } from '@/lib/normalizeName';
import SiteFooter from './SiteFooter';
import NewsArticleShare from './NewsArticleShare';
import ArticleMotion from './ArticleMotion';
import MagazineCover from './MagazineCover';
import MagazineLink from './MagazineLink';
import { articleHubLink, articleHubLabel } from '@/lib/seo/articleHubLinks';
import { chapterShortLabel } from '@/lib/headingDeck';
import { sanityImageSize, coverImageScale, sanitySrcSet } from '@/lib/sanity-image-presets';
import { scaleSizes } from '@/lib/magazineCover';
import styles from './NewsArticleShell.module.css';
import ArticleMustEatArtwork from './ArticleMustEatArtwork';

const SPOT_PHOTO_WIDTHS = [600, 900, 1200, 1600, 2080];

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

/** Zeichen im längsten Wort der Schlagzeile. Am Telefon wird sie nur so weit
 *  verkleinert, dass dieses Wort in die Spalte passt (`--title-longest` im
 *  CSS). Nach einem Bindestrich darf die Zeile ohnehin umbrechen, deshalb
 *  zählt „Bistro-Abende" als zwei Wörter. */
function longestTitleWord(title: string): number {
  return Math.max(1, ...title.split(/\s+/).flatMap((w) => w.split(/(?<=-)/)).map((w) => w.length));
}

/** How much of one opening sentence must run through the other, how far into
 *  the lede the article's opening sentence may reach, and how much of the first
 *  words must match when neither has a sentence to judge. */
const SENTENCE_OVERLAP = 0.7;
const OPENING_REACH = 1.5;
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
  const openingSentence = normalizeForCompare(firstSentence(openingText)).split(' ');
  // Under four words it is a fragment — "Kein Ranking." lines up with anything.
  if (ledeSentence.length >= 4) {
    if (orderedOverlap(ledeSentence, openingSentence) >= SENTENCE_OVERLAP) return true;
  }
  // The same question from the article's side. Pizza opens on a short sentence
  // and its lede welds that sentence to the next one — "Berlin hat kein
  // Pizza-Problem. Berlin hat inzwischen eher das gegenteilige Problem …"
  // became "Berlin hat kein Pizza-Problem, sondern das gegenteilige …". Measured
  // from the lede's long sentence the overlap is small; measured from the
  // article's short one it is complete. Only the lede's start is searched, at
  // most half again as long as the sentence looked for: Fine Dining's lede
  // *closes* on the article's opening sentence after a colon of its own, and
  // that lede opens on its own words.
  if (openingSentence.length >= 4) {
    const ledeStart = ledeSentence.slice(0, Math.ceil(openingSentence.length * OPENING_REACH));
    if (orderedOverlap(openingSentence, ledeStart) >= SENTENCE_OVERLAP) return true;
  }

  // Fallback for a lede that opens on a fragment but copies on from there.
  return (
    orderedOverlap(
      lede.split(' ').slice(0, LEDE_WINDOW),
      opening.split(' ').slice(0, LEDE_WINDOW)
    ) >= LEDE_OVERLAP
  );
}

// Sanity guides mark each spot with h2 → spotCard → description. In the
// reading column the description comes first, then the photo and map label.
// Keep narrative cards and other editorial blocks in their authored positions.
function articleReadingOrder(blocks: PortableTextBlock[]): PortableTextBlock[] {
  const ordered: PortableTextBlock[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    ordered.push(block);
    if (!('style' in block) || block.style !== 'h2' || blocks[i + 1]?._type !== 'spotCard') {
      continue;
    }
    const card = blocks[++i];
    const companions: PortableTextBlock[] = [];
    while (blocks[i + 1]?._type === 'mustEatCard'
      && blocks[i + 1]._key?.startsWith('auto-must-eat-')) {
      companions.push(blocks[++i]);
    }
    while (i + 1 < blocks.length) {
      const next = blocks[i + 1];
      if (next._type !== 'block' || (next.style && next.style !== 'normal' && next.style !== 'blockquote')) {
        break;
      }
      ordered.push(next);
      i++;
    }
    ordered.push(card, ...companions);
  }
  return ordered;
}

// Article detail — magazine feature, the inside of the issue: a tap on a cover
// opens the magazine and lands here (MagazineLink), so the cover itself does
// not appear again. On desktop the header splits like Highsnobiety's: title,
// byline and lede on the left, the lead photo on the right; below, the piece
// runs as a reading column with a sticky chapter rail beside it. Nothing in
// the reading column moves. Inline must-eat and spot cards are driven by
// mustEatCard / spotCard reference blocks in the body.
export default function NewsArticleShell({
  article,
  relatedArticles = [],
  locale = 'de',
  isActive = false,
}: Props) {
  if (!article) return null;

  const de = locale === 'de';
  const title = (de ? article.titleDe : article.title) || article.title || article.titleDe || '';
  const excerpt = (de ? article.excerptDe : article.excerpt) || article.excerpt || article.excerptDe || '';
  const content = articleContent(article, locale);
  const dateFormatted = formatDate(article.date, locale);
  // Die Spots eines Guides für die Zeile unter dem Kopf: nur Überschriften, die
  // einen Spot eröffnen — direkt darunter steht seine Spot-Karte. Erzählende
  // Texte gliedern nach Themen („Als Berlin chinesisch essen lernte“), deren
  // Überschriften sind keine Spots (Ansage 11.10.2026); ebenso wenig das Fazit
  // oder ein Essay mit Zwischenüberschriften (Ansage 02.10.2026: „nur wenn
  // Spots gelistet sind“).
  const chapters = extractHeadings(
    content.filter(
      (block, i) =>
        'style' in block && block.style === 'h2' && content[i + 1]?._type === 'spotCard'
    )
  );
  const hubLink = articleHubLink(article.slug);
  // Nur Kategorie-Hubs haben ein Booster-Pack; Bezirke nicht.
  const hubPack = hubLink?.href.startsWith('/kategorie/')
    ? categoryArt(hubLink.href.replace('/kategorie/', ''))
    : null;
  const showLede = Boolean(excerpt) && !ledeDuplicatesOpening(excerpt, content);
  const shareLabel = de ? 'Teilen' : 'Share';
  const copiedLabel = de ? 'Kopiert' : 'Copied';
  const coverLocale = de ? 'de' : 'en';
  // `relatedArticles` is every article, newest first — the issue counts from
  // the oldest, as on the home page (getHomeData). The preview of an
  // unpublished draft is not in the list and carries no number.
  const issueOf = (slug: string) => {
    const at = relatedArticles.findIndex((a) => a.slug === slug);
    return at < 0 ? null : relatedArticles.length - at;
  };

  // Die Karte zeigt die Freigabe des Betrachters; der Teaser führt zu ihrem
  // Must-Eat-Detail auf der Map, ohne bekannte Karte zum Spot.
  const renderMustEatCard = (block: MustEatCardBlock) => {
    if (!block.mustEatId && !block.restaurantName) return null;
    const restName = block.restaurantName ? normalizeName(block.restaurantName) : '';
    const heading = restName || (de ? 'Das Must Eat' : 'The Must Eat');
    const description = block.mustEatId
      ? de ? 'Zum Must Eat' : 'See the Must Eat'
      : block.restaurantSlug
        ? de ? 'Zum Spot' : 'See the spot'
        : de ? 'Must Eats ansehen' : 'View Must Eats';
    const inner = (
      <>
        <ArticleMustEatArtwork id={block.mustEatId} />
        <div className={styles.mustEatBody}>
          <span className="et-label">Must Eat</span>
          <h3 className={styles.mustEatName}>{heading}</h3>
          <span className={`et-btn et-btn-tape et-btn-sm ${styles.mustEatDesc}`}>{description}</span>
        </div>
      </>
    );
    // Ohne Karte und Spot führt der Teaser zur Must-Eat-Übersicht.
    const href = block.mustEatId
      ? `/map?me=${encodeURIComponent(block.mustEatId)}`
      : block.restaurantSlug
        ? `/map?r=${block.restaurantSlug}`
        : '/must-eats';
    return (
      <Link
        href={href}
        rel={href === '/must-eats' ? undefined : 'nofollow'}
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

  // Foto, Name und Metadaten öffnen die ausführliche Spot-Seite.
  const renderSpotCard = (block: SpotCardBlock) => {
    if (!block.restaurantName || !block.restaurantSlug) return null;
    const restName = normalizeName(block.restaurantName);
    const meta = [
      block.district,
      block.cuisineType ? localizedCuisine(block.cuisineType, de ? 'de' : 'en') : null,
    ]
      .filter(Boolean)
      .join(' · ');

    // Foto und gerade Etiketten bilden eine gemeinsame Spot-Karte.
    return (
      <span className={styles.inlineSpot}>
        {block.restaurantPhoto && (
          <span className={styles.inlineSpotPhoto} aria-hidden="true">
            {/* Ein echtes Bild statt CSS-Hintergrund: der lud fest 800px, am
                Retina-Desktop braucht das breite Foto über 2000. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={block.restaurantPhoto}
              srcSet={sanitySrcSet(block.restaurantPhoto, SPOT_PHOTO_WIDTHS)}
              sizes={`(max-width: 700px) ${scaleSizes('100vw', coverImageScale(block.restaurantPhoto, 16 / 11.6))}, ${scaleSizes('(max-width: 1023.98px) 740px, 768px', coverImageScale(block.restaurantPhoto, 3 / 2))}`}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </span>
        )}
        <Link
          href={`/restaurant/${block.restaurantSlug}`}
          className={styles.inlineSpotHit}
          tabIndex={-1}
          aria-hidden="true"
        />
        <span className={styles.inlineSpotBody}>
          <span className={styles.inlineSpotText}>
            <span className={styles.inlineSpotName}>
              <Link
                href={`/restaurant/${block.restaurantSlug}`}
                className={`et-label-title ${styles.inlineSpotNameLink}`}
              >
                {restName}
              </Link>
            </span>
            {meta && (
              <span>
                <Link
                  href={`/restaurant/${block.restaurantSlug}`}
                  className={`et-label et-label-paper ${styles.inlineSpotMetaLink}`}
                  aria-label={
                    de ? `${restName}: Spot-Seite öffnen` : `Open the spot page for ${restName}`
                  }
                >
                  {meta}
                </Link>
              </span>
            )}
          </span>
        </span>
      </span>
    );
  };

  // Inline editorial photo. The projection only resolves URL + dimensions for
  // blocks that actually carry an asset, so a half-filled Studio block drops
  // out here instead of rendering an empty frame.
  const renderImage = (block: ArticleImageBlock) => {
    if (!block.imageUrl) return null;
    const dimensions = sanityImageSize(block.imageUrl);
    const width = dimensions?.width || block.imageWidth || 1440;
    const height = dimensions?.height || block.imageHeight || 1080;
    return (
      <figure className={styles.inlineImage}>
        <Image
          src={block.imageUrl}
          alt={block.alt || ''}
          width={width}
          height={height}
          sizes="(max-width: 767.98px) 100vw, 768px"
        />
        {block.caption && <figcaption>{block.caption}</figcaption>}
      </figure>
    );
  };

  const renderImageGroup = (blocks: ArticleImageBlock[]) => {
    const images = blocks.filter((block) => block.imageUrl);
    if (images.length < 2) return images[0] ? renderImage(images[0]) : null;
    const rows: React.ReactNode[] = [];
    // Four images form two pairs; larger runs form rows of two or three.
    for (let index = 0; index < images.length;) {
      const remaining = images.length - index;
      const count = remaining === 4 ? 2 : Math.min(3, remaining);
      const row = images.slice(index, index + count);
      rows.push(
        <div className={styles.imageRow} data-article-image-row="" key={row[0]._key ?? index}>
          {row.map((block, imageIndex) => {
            const dimensions = sanityImageSize(block.imageUrl);
            const width = dimensions?.width || block.imageWidth || 1440;
            const height = dimensions?.height || block.imageHeight || 1080;
            return (
            <figure key={block._key ?? imageIndex}
              style={{ '--img-ratio': width / height } as React.CSSProperties}>
              <Image src={block.imageUrl!} alt={block.alt || ''}
                width={width} height={height}
                sizes="(max-width: 767.98px) 100vw, (max-width: 1023.98px) 50vw, 70vw" />
              {block.caption && <figcaption>{block.caption}</figcaption>}
            </figure>
          ); })}
        </div>
      );
      index += count;
    }
    return <div className={styles.imageSpread}>{rows}</div>;
  };

  // Verweis auf einen anderen Artikel: das Heft wie unter „Weitere Ausgaben“,
  // daneben Rubrik · Datum und Titel wie „Im Magazin“ auf der Spot-Seite.
  // Titel, Bild und Cover kommen aus `relatedArticles` – so stimmt der Titel
  // auch dann, wenn der andere Artikel umbenannt wird. Ein Verweis auf einen
  // unveröffentlichten oder gelöschten Artikel fällt weg.
  const renderArticleCard = (block: ArticleCardBlock) => {
    if (!block.articleSlug || block.articleSlug === article.slug) return null;
    const target = relatedArticles.find((a) => a.slug === block.articleSlug);
    if (!target) return null;
    const { title: targetTitle, kicker, date } = articleCardText(target, coverLocale);
    return (
      <MagazineLink
        href={`/news/${target.slug}`}
        className={styles.inlineIssue}
        data-motion="issue"
      >
        <span className={styles.inlineIssueCover} data-motion-part="cover">
          <MagazineCover
            title={targetTitle}
            image={target.imageUrl}
            issue={issueOf(target.slug)}
            date={target.date}
            locale={coverLocale}
            cover={target.cover}
            sizes="(max-width: 767.98px) 130px, 180px"
            widths={[320, 480]}
          />
        </span>
        <span className={styles.inlineIssueText}>
          <span className={styles.inlineIssueMeta}>
            {[kicker, date].filter(Boolean).join(' · ')}
          </span>
          <span className={styles.inlineIssueTitle}>{targetTitle}</span>
        </span>
      </MagazineLink>
    );
  };

  const recommendations = relatedArticles.filter((a) => a.slug !== article.slug).slice(0, 3);
  // Darunter liegen Hefte, also „Weitere Ausgaben" (Ansage 02.10.2026).
  const moreLabel = de ? 'Weitere Ausgaben' : 'More issues';
  // Nicht „Kapitel" (Ansage 02.10.2026): die Zeile zählt die Spots auf.
  const chaptersLabel = de ? 'Die Spots' : 'The spots';

  // Das Datum; Hell/Dunkel stellt man im Menü um.
  const byline = (
    <div className={styles.byline}>
      {dateFormatted && (
        <time className={styles.bylineMeta} dateTime={article.date}>{dateFormatted}</time>
      )}
    </div>
  );

  return (
    <div
      className={`app-page news-article-page${isActive ? ' active' : ''} ${styles.page}`}
      data-page="news-article"
      data-article-slug={article.slug}
      id="newsModal"
    >
      {/* Der Lesefortschritt: ein gelber Strich unter der Kopfleiste, der mit
          dem Scrollen wächst — reines CSS, nur ab Tablet. */}
      <ArticleMotion slug={article.slug} />
      <main className={styles.article}>
        <article>
          {/* Der Kopf wie bei Kaleidoscope (Ansage 02.10.2026, Vorbild
              manifesto.kaleidoscope.media): mittig Rubrik, die Schlagzeile
              gross, klein die Credits; darunter das Foto
              randlos mit schmalem Rahmen, dann der Vorspann als Auftakt. */}
          <header className={styles.header} data-insight-header="">
            {/* Keine Brotkrume: der Artikeltitel ist zu lang für eine Zeile und
                brach als dritte Krume um. Sie trug ohnehin keinen eigenen Link
                — „/" und „/news" stehen im Burger, der auf jeder Seite
                gerendert wird. Das BreadcrumbList-JSON-LD in
                `news/[slug]/page.tsx` bleibt davon unberührt, die SERP-Krume
                also auch. Eater und Mit Vergnügen führen ihre Guides ebenfalls
                ohne. */}
            <div className={styles.introCopy}>
              <h1
                className={styles.heroTitle}
                style={{ '--title-longest': longestTitleWord(title) } as React.CSSProperties}
              >
                {title}
              </h1>
              {byline}
            </div>
            {article.imageUrl && (
              <div className={styles.heroMedia}>
                <Image
                  src={article.imageUrl}
                  alt={article.alt || title}
                  fill
                  priority
                  sizes={`(max-width: 700px) ${scaleSizes('100vw', coverImageScale(article.imageUrl, 4 / 5))}, ${scaleSizes('100vw', coverImageScale(article.imageUrl, 3 / 2))}`}
                  className={styles.hero}
                />
              </div>
            )}
            {showLede && <p className={styles.lede}>{excerpt}</p>}
            {/* Die Spots als eine Zeile unter dem Kopf, wie die Namenslisten
                bei Kaleidoscope — sie ersetzt die Kapitel-Leiste links, die
                als einziges Element aus der Mitte fiel (Ansage 02.10.2026),
                und gibt es jetzt auch am Telefon. Nur der Name, nicht die
                ganze Überschrift; ein Tipp springt zum Spot. */}
            {chapters.length > 1 && (
              <nav className={styles.chapters} aria-label={chaptersLabel}>
                <span className={styles.chaptersLabel}>{chaptersLabel}</span>
                <ol className={styles.chapterList}>
                  {chapters.map((chapter) => (
                    <li key={chapter.id}>
                      <a href={`#${chapter.id}`} title={chapter.text}>
                        {chapterShortLabel(chapter.text)}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </header>

          <div className={styles.column}>
            <div
              className={styles.content}
              data-reading-content
              data-article-content=""
              data-insight-content=""
              data-lede={showLede ? '' : undefined}
            >
              <PortableTextRenderer
                blocks={articleReadingOrder(content)}
                renderMustEatCard={renderMustEatCard}
                renderSpotCard={renderSpotCard}
                renderImage={renderImage}
                renderImageGroup={renderImageGroup}
                renderArticleCard={renderArticleCard}
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
                className={`et-btn et-btn-tape et-btn-sm ${styles.shareBtn}`}
              />
            </div>

            {hubLink && (
              <Link href={hubLink.href} className={`et-paper-link ${styles.hubLink}`} data-motion="toss">
                {hubPack && (
                  <Image
                    src={hubPack}
                    alt=""
                    width={72}
                    height={101}
                    className={styles.hubLinkPack}
                    data-motion-part="pack"
                  />
                )}
                <span className={styles.hubLinkKicker}>
                  {de ? 'Der ganze Katalog' : 'The full catalogue'}
                </span>
                <span className={styles.hubLinkLabel}>
                  {articleHubLabel(hubLink, de ? 'de' : 'en')}
                </span>
                <span className={`et-btn ${styles.hubLinkCta}`} aria-hidden="true">
                  {de ? 'Ansehen' : 'View'}
                </span>
              </Link>
            )}
          </div>

          {recommendations.length > 0 && (
            <section className={styles.related}>
              <div className={styles.relatedHead}>
                <h2 className={styles.relatedHeading}>{moreLabel}</h2>
              </div>
              <ul className={styles.relatedGrid} role="list" data-motion="deal">
                {recommendations.map((rec) => {
                  const recTitle = (de ? rec.titleDe : rec.title) || rec.title || '';
                  return (
                    <li key={rec.slug}>
                      <MagazineLink href={`/news/${rec.slug}`} className={styles.relatedCard}>
                        <MagazineCover
                          title={recTitle}
                          image={rec.imageUrl}
                          issue={issueOf(rec.slug)}
                          date={rec.date}
                          locale={coverLocale}
                          cover={rec.cover}
                          sizes="(max-width: 767.98px) 62vw, 300px"
                          widths={[320, 480, 800]}
                        />
                      </MagazineLink>
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
