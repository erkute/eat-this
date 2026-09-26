import { Fragment, type CSSProperties } from 'react';
import Image from '@/app/components/SiteImage';
import { Link } from '@/i18n/navigation';
import { PortableTextRenderer } from '@/lib/PortableTextRenderer';
import type { PortableTextBlock, StaticPageDoc } from '@/lib/types';
import RemyAskPanel from './RemyAskPanel';
import SiteFooter from './SiteFooter';
import styles from './AboutPage.module.css';

type Locale = 'de' | 'en';

type Block = PortableTextBlock & {
  style?: string;
  listItem?: string;
  children?: { text?: string }[];
};

type Objekt = {
  src: string;
  width: number;
  height: number;
  tilt: number;
};

type Figure = {
  src: string;
  width: number;
  height: number;
  /** A second object, laid over the first as an overlapping pair. The card
   *  section argues about two states of one thing — face-down and face-up —
   *  and a single card cannot show a pair. */
  partner?: Objekt;
  /** Rendered width in px. Not uniform on purpose — optical weight is not
   *  area. The card back is a solid field of yellow, black and red; at the
   *  plate's width it shouted down the section it belongs to. */
  renderWidth: number;
  tilt: number;
  /** Remy's panel follows this section — see COPY. */
  remyAfter?: true;
  caption: { de: string; en: string };
  alt: { de: string; en: string };
};

/* Editorial furniture, keyed by section order — the About copy lives in Sanity
   and its headings get rewritten, so matching on heading text would break the
   first time a word changes. Order is the stable part.

   Shorter than the section list on purpose: whatever follows the last figure
   ("Berlin ist der Anfang", "Schreib mir") is gathered into the coda instead
   of getting a picture each. A figure per paragraph turned the page into a
   contact sheet. */
const FIGURES: (Figure | null)[] = [
  {
    src: '/pics/home-phones/phone-map-ink-600.webp',
    width: 600,
    height: 1219,
    // 600x1219 is a tall object: anything wider than this and the phone runs
    // past the copy beside it.
    renderWidth: 225,
    tilt: -2,
    caption: { de: 'Alle Empfehlungen an einem Ort.', en: 'Every recommendation in one place.' },
    alt: {
      de: 'Die Eat-This-App zeigt Berliner Spots als gelbe Pins auf der Karte',
      en: 'The Eat This app showing Berlin spots as yellow pins on the map',
    },
  },
  {
    src: '/pics/home-dishes/bubar-galette-print.webp',
    width: 871,
    height: 856,
    renderWidth: 290,
    tilt: 1.5,
    caption: { de: 'Galette bei Bubar.', en: 'Galette at Bubar.' },
    alt: {
      de: 'Eine Buchweizen-Galette mit Eigelb auf einem Pappteller',
      en: 'A buckwheat galette with an egg yolk on a paper plate',
    },
  },
  {
    // The pair belongs here and nowhere else: this is the section that says
    // some cards lie open and some stay hidden. One card could only ever
    // illustrate half of that sentence.
    src: '/pics/card-back.webp',
    width: 760,
    height: 1044,
    partner: { src: '/pics/card-front.webp?v=3', width: 760, height: 1044, tilt: 7 },
    // The pair spans the rail; each card lands near 62% of it. Two overlapping
    // cards carry more weight than one plate, hence narrower than the 290 the
    // galette gets.
    renderWidth: 260,
    tilt: -8,
    remyAfter: true,
    caption: {
      de: 'Manche liegen offen, manche verdeckt.',
      en: 'Some lie face up, some face down.',
    },
    alt: {
      de: 'Zwei Eat-This-Sammelkarten nebeneinander, eine mit der Rückseite nach oben, eine aufgedeckt',
      en: 'Two Eat This trading cards side by side, one face down and one face up',
    },
  },
];

/* Remy follows the card chapter, because the last paragraph of that section
   is already about him — "frag einfach Remy". He used to get a title "Frag
   Remy" and a link "Remy fragen" under it: the same two words twice, and a
   door that led off the page to the home hub. Now the chat starts right here.
   The first chip is the question the page itself opens with.
   The Sanity copy speaks in the first person; these lines describe the app,
   not the person, so they stay out of the "ich". */
const COPY = {
  de: {
    remyTitle: ['Keine Idee?', 'Frag Remy.'] as [string, string],
    remyLead: 'Remy kennt jeden Spot auf der Map. Sag ihm, worauf du Lust hast.',
    remyChips: [
      'Wo gehen wir heute essen?',
      'Ein Hidden Place in Neukölln?',
      'Schönes Dinner für zwei',
    ],
    remyPlaceholder: 'Worauf hast du Lust?',
    ctaTitle: 'Hungrig geworden?',
    /* Closes the loop the sticker opened: the page ends on the wish it
       started from, quoted as the wish it was, then what the map does with it.
       „Über 400" rather than the exact count (464 live on 25.09.2026): a
       floor stays true while the map grows, a number would be stale by the
       next import. */
    ctaQuote: '„Geh hierhin, das ist gut, und es ist um die Ecke.“',
    ctaText: 'Genau das sagt dir jetzt die Map – für über\u00a0400 handverlesene Spots in Berlin.',
    ctaMap: 'Zur Map',
  },
  en: {
    remyTitle: ['No idea?', 'Ask Remy.'] as [string, string],
    remyLead: "Remy knows every spot on the map. Tell him what you're in the mood for.",
    remyChips: [
      'Where should we eat today?',
      'A hidden place in Neukölln?',
      'A nice dinner for two',
    ],
    remyPlaceholder: 'What are you in the mood for?',
    ctaTitle: 'Hungry yet?',
    ctaQuote: '“Go here, it’s good, and it’s around the corner.”',
    ctaText: 'That’s what the map tells you now – for over\u00a0400 hand-picked spots in Berlin.',
    ctaMap: 'Open map',
  },
};

function blockText(block: Block): string {
  return (block.children ?? []).map((c) => c.text ?? '').join('');
}

function isHeading(block: PortableTextBlock): boolean {
  const b = block as Block;
  return b._type === 'block' && !b.listItem && (b.style === 'h2' || b.style === 'h3');
}

function isPlainParagraph(block: PortableTextBlock | undefined): boolean {
  if (!block) return false;
  const b = block as Block;
  return b._type === 'block' && !b.listItem && (b.style ?? 'normal') === 'normal';
}

/* The opening paragraphs that belong to the hero, beside the person. Two, by
   order like the figures: the first says why the page exists, the second who
   is speaking — and the second used to fall under the hero rule as small body
   copy, a line away from the picture it describes. */
const LEDE_PARAGRAPHS = 2;

/* A short plain paragraph in the intro is a line, not a paragraph — "Das
   Problem ist, den Überblick zu behalten." Set as body copy it drowned under
   the long paragraph before it; set in the brand face it carries the story's
   turn. Length is the only signal the copy gives: Sanity has no style for
   it, and the lines move when the text does. */
const ONE_LINER_MAX = 60;

function isOneLiner(block: PortableTextBlock): boolean {
  return isPlainParagraph(block) && blockText(block as Block).length <= ONE_LINER_MAX;
}

type BridgePart = { line: string } | { blocks: PortableTextBlock[] };

/** Runs of body paragraphs stay together for the renderer; each one-liner
 *  breaks out on its own. */
function splitBridge(blocks: PortableTextBlock[]): BridgePart[] {
  const parts: BridgePart[] = [];
  for (const block of blocks) {
    if (isOneLiner(block)) {
      parts.push({ line: blockText(block as Block) });
      continue;
    }
    const last = parts.at(-1);
    if (last && 'blocks' in last) last.blocks.push(block);
    else parts.push({ blocks: [block] });
  }
  return parts;
}

/** Everything before the first heading is the intro; each heading opens a
 *  section that runs until the next one. */
function splitSections(blocks: PortableTextBlock[]) {
  const intro: PortableTextBlock[] = [];
  const sections: { title: string; blocks: PortableTextBlock[] }[] = [];
  for (const block of blocks) {
    if (isHeading(block)) {
      sections.push({ title: blockText(block as Block), blocks: [] });
      continue;
    }
    if (sections.length) sections[sections.length - 1].blocks.push(block);
    else intro.push(block);
  }
  return { intro, sections };
}

export default function AboutPage({ doc, locale }: { doc: StaticPageDoc; locale: Locale }) {
  const de = locale === 'de';
  const copy = de ? COPY.de : COPY.en;
  const { intro, sections } = splitSections(doc.body ?? []);
  let ledeCount = 0;
  while (ledeCount < LEDE_PARAGRAPHS && isPlainParagraph(intro[ledeCount])) ledeCount += 1;
  const ledes = intro.slice(0, ledeCount).map((block) => blockText(block as Block));
  // The rest of the intro bridges into the first chapter.
  const bridge = splitBridge(intro.slice(ledeCount));
  const story = sections.slice(0, FIGURES.length);
  const coda = sections.slice(FIGURES.length);

  return (
    <main className={styles.page} data-page="about" id="staticPageAbout">
      <div className={styles.inner}>
        <header className={styles.hero}>
          {/* Klassenlos mit Absicht: der Kasten fasst Titel und Lede zu EINER
              Rasterzelle zusammen, damit die Figur die zweite bekommt. Er
              traegt keinen eigenen Stil — `styles.heroCopy` stand hier
              jahrelang, ohne dass es die Klasse je gab. */}
          <div>
            <h1 className={styles.title} id="staticPageAbout-title">
              {doc.title || ''}
            </h1>
            {ledes.map((text, index) => (
              <p key={index} className={index === 0 ? styles.lede : styles.ledeAside}>
                {text}
              </p>
            ))}
          </div>

          {/* The page speaks in the first person; this is that person as an
              object. It replaced a stack of phone-plus-cards that repeated what
              the rails below already show one at a time — the person is the
              only picture on this page that appears exactly once.

              Deliberately no quote from the lede here. It used to carry one,
              and the lede is `staticPage` content in Sanity: it moved, the
              quote stayed, and the next person rewrote the comment around a
              sentence that was already gone too. What justifies the image is
              the first-person voice, not any particular wording of it.

              Not decorative, so not aria-hidden: it is the subject of the page.
              It also arrives with its own drawn floor and cast shadow, which is
              why it neither tilts nor takes the CSS drop-shadow. */}
          <div className={styles.heroArt}>
            <Image
              src="/pics/founder-cafe.webp"
              alt={
                de
                  ? 'Der Gründer von Eat This an einem Cafétisch, mit Kaffee und zwei Eat-This-Karten in der Hand'
                  : 'The founder of Eat This at a café table with a coffee and two Eat This cards'
              }
              width={760}
              height={1327}
              sizes="(min-width: 900px) 290px, 62vw"
              priority
              className={styles.heroFigure}
            />
          </div>
        </header>

        {bridge.length > 0 && (
          <div className={styles.bridge}>
            {bridge.map((part, index) =>
              'line' in part ? (
                <p key={index} className={styles.oneLiner}>
                  {part.line}
                </p>
              ) : (
                <div key={index} className={styles.body}>
                  <PortableTextRenderer blocks={part.blocks} />
                </div>
              )
            )}
          </div>
        )}

        {story.map((section, index) => {
          const figure = FIGURES[index] ?? null;
          /* Sides alternate down the page: masthead right, then left, right,
             left, Remy right, the closer left. Every figure hanging in the
             same rail was even and, by the third one, wallpaper.

             Only sections that actually carry a figure flip — moving the text
             column of a picture-less section would be a jolt with nothing to
             show for it. The swap happens in the grid, never in the markup:
             the copy stays first in the DOM so the single-column stack and
             the reading order never zigzag. */
          const flipped = Boolean(figure) && index % 2 === 0;
          return (
            <Fragment key={section.title || index}>
              <section className={`${styles.section}${flipped ? ` ${styles.flip}` : ''}`}>
                <div className={styles.sectionCopy}>
                  <h2 className={styles.sectionTitle}>{section.title}</h2>
                  <div className={styles.body}>
                    <PortableTextRenderer blocks={section.blocks} />
                  </div>
                </div>

                {figure && (
                  <figure
                    className={styles.figure}
                    style={{ '--fig-w': `${figure.renderWidth}px` } as CSSProperties}
                  >
                    {figure.partner ? (
                      /* Two objects, one measure. They overlap on purpose: a
                         pair set side by side with a gap reads as two products
                         in a catalogue, not as one deck you are holding. */
                      <div className={styles.pair}>
                        <Image
                          src={figure.src}
                          alt={de ? figure.alt.de : figure.alt.en}
                          width={figure.width}
                          height={figure.height}
                          sizes={`${figure.renderWidth}px`}
                          loading="lazy"
                          className={styles.pairBack}
                          style={{ '--tilt': `${figure.tilt}deg` } as CSSProperties}
                        />
                        <Image
                          src={figure.partner.src}
                          alt=""
                          width={figure.partner.width}
                          height={figure.partner.height}
                          sizes={`${figure.renderWidth}px`}
                          loading="lazy"
                          className={styles.pairFront}
                          style={{ '--tilt': `${figure.partner.tilt}deg` } as CSSProperties}
                        />
                      </div>
                    ) : (
                      <Image
                        src={figure.src}
                        alt={de ? figure.alt.de : figure.alt.en}
                        width={figure.width}
                        height={figure.height}
                        sizes={`${figure.renderWidth}px`}
                        loading="lazy"
                        className={styles.figureImg}
                        style={{ '--tilt': `${figure.tilt}deg` } as CSSProperties}
                      />
                    )}
                    <figcaption className={styles.caption}>
                      {de ? figure.caption.de : figure.caption.en}
                    </figcaption>
                  </figure>
                )}
              </section>

              {/* Remy used to be tacked under the card argument, inside the
                  same section; a door out of the page does not belong at the
                  bottom of a closed room. It follows immediately after, as
                  its own panel. */}
              {figure?.remyAfter && (
                <RemyAskPanel
                  locale={locale}
                  className={styles.remy}
                  titleLines={copy.remyTitle}
                  lead={copy.remyLead}
                  chips={copy.remyChips}
                  placeholder={copy.remyPlaceholder}
                />
              )}
            </Fragment>
          );
        })}

        {/* The coda: the short, picture-less sections after the last figure.
            Stacked one under the other they ran as a wall of text straight
            into the closer, and the page lost its pace right at the end. Side
            by side they read as what they are — two short notes, not two more
            chapters. The copy still decides how many there are. */}
        {coda.length > 0 && (
          <div className={styles.coda}>
            {coda.map((section, index) => (
              <section key={section.title || index} className={styles.codaSection}>
                <h2 className={styles.sectionTitle}>{section.title}</h2>
                <div className={styles.body}>
                  <PortableTextRenderer blocks={section.blocks} />
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Object left, copy right — the last beat of the alternation, after
            Remy's panel hung right.

            A booster pack was tried here once and pulled the eye away — it is
            something you buy, sitting next to a button that leads to a free
            map. A spot's own screen is not a competing offer. It is the offer,
            with a picture. */}
        <aside className={styles.cta}>
          <Image
            src="/pics/home-phones/phone-restaurant-ink-600.webp"
            alt={
              de
                ? 'Die Eat-This-App zeigt die Detailseite eines Berliner Spots'
                : "The Eat This app showing a Berlin spot's detail page"
            }
            width={600}
            height={1219}
            sizes="(min-width: 768px) 210px, 170px"
            loading="lazy"
            className={styles.ctaPhone}
          />
          {/* Wie im Hero: nur die zweite Rasterzelle neben dem Telefon,
              ohne eigenen Stil. */}
          <div>
            <h2 className={styles.ctaTitle}>{copy.ctaTitle}</h2>
            <blockquote className={styles.ctaQuote}>{copy.ctaQuote}</blockquote>
            <p className={styles.ctaText}>{copy.ctaText}</p>
            <div className={styles.ctaRow}>
              <Link href="/map" className={styles.ctaPrimary}>
                {copy.ctaMap}
              </Link>
            </div>
          </div>
        </aside>
      </div>
      <SiteFooter />
    </main>
  );
}
