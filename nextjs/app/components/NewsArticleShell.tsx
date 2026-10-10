import Image from '@/app/components/SiteImage';
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
import ArticleMotion from './ArticleMotion';
import ArticleThemeToggle from './ArticleThemeToggle';
import MagazineCover from './MagazineCover';
import MagazineLink from './MagazineLink';
import MapIntentLink from './MapIntentLink';
import { articleHubLink, articleHubLabel } from '@/lib/seo/articleHubLinks';
import { chapterShortLabel } from '@/lib/headingDeck';
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
  const excerpt = (de ? article.excerptDe : article.excerpt) || article.excerpt || '';
  const categoryLabel =
    (de ? article.categoryLabelDe : article.categoryLabel) || article.categoryLabel || '';
  const content = (de ? article.contentDe : article.content) || article.content || [];
  const dateFormatted = formatDate(article.date, locale);
  // Die Spots eines Guides für die Zeile unter dem Kopf: seine Kapitel, ohne
  // das Fazit — das ist kein Spot.
  const chapters = extractHeadings(
    content.filter((block) => !('style' in block && block.style === 'conclusion'))
  );
  // Die Kapitel-Zeile nur in Guides, die Spots aufzählen (Ansage 02.10.2026:
  // „nur wenn Spots gelistet sind") — nicht in einem Essay mit
  // Zwischenüberschriften, der höchstens einen Laden zeigt.
  const listsSpots = content.filter((block) => block._type === 'spotCard').length > 1;
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
  const coverLocale = de ? 'de' : 'en';
  // `relatedArticles` is every article, newest first — the issue counts from
  // the oldest, as on the home page (getHomeData). The preview of an
  // unpublished draft is not in the list and carries no number.
  const issueOf = (slug: string) => {
    const at = relatedArticles.findIndex((a) => a.slug === slug);
    return at < 0 ? null : relatedArticles.length - at;
  };
  const issue = issueOf(article.slug);

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
        data-motion="slide"
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
    // Wie auf der Restaurantseite und überall sonst in der App — „Auf die
    // Map" klang doof (Ansage 02.10.2026).
    const cta = de ? 'Zur Map' : 'On the map';

    // Wie im Heft: oben das Foto ohne Schrift darauf, darunter die
    // Bildunterschrift mit Bezirk, Name und dem Weg auf die Map.
    return (
      <span className={styles.inlineSpot} data-motion="spot">
        {block.restaurantPhoto && (
          <span
            className={styles.inlineSpotPhoto}
            data-motion="print"
            style={{ backgroundImage: `url(${block.restaurantPhoto})` }}
            aria-hidden="true"
          />
        )}
        <span className={styles.inlineSpotFoot}>
          {/* Die Meta-Zeile trägt den gefolgten Link auf die Spot-Seite. Die
              Karte selbst führt auf die Map — ohne diesen Link gäben die
              Guides ihre Relevanz an keine einzige Restaurantseite weiter.
              Kein Ausfallrisiko: alle 177 in Artikeln referenzierten Spots
              haben einen Bezirk, `meta` ist also nie leer. */}
          {meta && (
            <span className={styles.inlineSpotMeta}>
              <Link
                href={`/restaurant/${block.restaurantSlug}`}
                className={styles.inlineSpotMetaLink}
                aria-label={
                  de ? `${restName}: Spot-Seite öffnen` : `Open the spot page for ${restName}`
                }
              >
                {meta}
              </Link>
            </span>
          )}
          <span className={styles.inlineSpotName}>
            <MapIntentLink
              href={`/map?r=${block.restaurantSlug}`}
              rel="nofollow"
              className={styles.inlineSpotNameLink}
            >
              {restName}
            </MapIntentLink>
          </span>
          <MapIntentLink
            href={`/map?r=${block.restaurantSlug}`}
            rel="nofollow"
            className={styles.inlineSpotCta}
            data-motion="pop"
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
    const width = block.imageWidth || 1440;
    const height = block.imageHeight || 1080;
    return (
      <figure
        className={styles.inlineImage}
        data-motion="print"
        style={{ '--img-ratio': width / height } as React.CSSProperties}
      >
        <Image
          src={block.imageUrl}
          alt={block.alt || ''}
          width={width}
          height={height}
          sizes="(max-width: 767.98px) 100vw, 660px"
        />
        {block.caption && <figcaption>{block.caption}</figcaption>}
      </figure>
    );
  };

  const recommendations = relatedArticles.filter((a) => a.slug !== article.slug).slice(0, 3);
  // Darunter liegen Hefte, also „Weitere Ausgaben" (Ansage 02.10.2026).
  const moreLabel = de ? 'Weitere Ausgaben' : 'More issues';
  // Nicht „Kapitel" (Ansage 02.10.2026): die Zeile zählt die Spots auf.
  const chaptersLabel = de ? 'Die Spots' : 'The spots';

  // Die Credits unter der Schlagzeile, klein in Versalien wie bei Kaleidoscope:
  // die Ausgabe, die man eben aufgeschlagen hat, Datum und Lesezeit.
  const byline = (
    <div className={styles.byline}>
      <span className={styles.bylineMeta}>
        {issue && <span>Issue {issue}</span>}
        {dateFormatted && <time dateTime={article.date}>{dateFormatted}</time>}
        <span>{readingTime}</span>
      </span>
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
      <div className={styles.progress} aria-hidden="true" />
      <ArticleMotion slug={article.slug} />
      <main className={styles.article}>
        <article>
          {/* Der Kopf wie bei Kaleidoscope (Ansage 02.10.2026, Vorbild
              manifesto.kaleidoscope.media): mittig Rubrik, die Schlagzeile
              gross in Providence, klein die Credits; darunter das Foto
              randlos mit schmalem Rahmen, dann der Vorspann als Auftakt. */}
          <header className={styles.header}>
            {/* Keine Brotkrume: der Artikeltitel ist zu lang für eine Zeile und
                brach als dritte Krume um. Sie trug ohnehin keinen eigenen Link
                — „/" und „/news" stehen im Burger, der auf jeder Seite
                gerendert wird. Das BreadcrumbList-JSON-LD in
                `news/[slug]/page.tsx` bleibt davon unberührt, die SERP-Krume
                also auch. Eater und Mit Vergnügen führen ihre Guides ebenfalls
                ohne. */}
            <div className={styles.introCopy}>
              <span className={styles.kicker}>{categoryLabel || (de ? 'Kolumne' : 'Column')}</span>
              <h1
                className={styles.heroTitle}
                style={{ '--title-longest': longestTitleWord(title) } as React.CSSProperties}
              >
                {title}
              </h1>
              {byline}
              <ArticleThemeToggle de={de} className={styles.themeToggle} />
            </div>
            {article.imageUrl && (
              <div className={styles.heroMedia}>
                <Image
                  src={article.imageUrl}
                  alt={article.alt || title}
                  fill
                  priority
                  sizes="100vw"
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
            {listsSpots && chapters.length > 1 && (
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
              data-article-content=""
              data-lede={showLede ? '' : undefined}
            >
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
              <Link href={hubLink.href} className={styles.hubLink} data-motion="toss">
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
                    data-motion-part="pack"
                  />
                )}
                <span className={styles.hubLinkKicker}>
                  {de ? 'Der ganze Katalog' : 'The full catalogue'}
                </span>
                <span className={styles.hubLinkLabel}>
                  {articleHubLabel(hubLink, de ? 'de' : 'en')}
                </span>
                {/* Die sichtbare Kante der Tafel: auf dem Telefon unter dem
                    Ziel, ab Desktop rechts (Betreiber, 07.09.2026: „sehr viel
                    Leerfläche"). Für Screenreader trägt der Link seinen
                    Namen schon in Kicker und Label. */}
                <span className={styles.hubLinkCta} aria-hidden="true">
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
