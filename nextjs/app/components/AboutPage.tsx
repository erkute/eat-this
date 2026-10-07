import { Fragment, type CSSProperties } from 'react';
import Image from '@/app/components/SiteImage';
import { PortableTextRenderer } from '@/lib/PortableTextRenderer';
import type { PortableTextBlock, StaticPageDoc } from '@/lib/types';
import HubFragRemy from './HubFragRemy';
import AboutMotion from './AboutMotion';
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
  /** The homepage Remy stage follows this section. */
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
    src: '/pics/home-phones/phone-map-red-600.webp',
    width: 600,
    height: 1219,
    // 600x1219 is a tall object: anything wider than this and the phone runs
    // past the copy beside it.
    renderWidth: 225,
    tilt: -2,
    caption: { de: 'Alle Empfehlungen an einem Ort.', en: 'Every recommendation in one place.' },
    alt: {
      de: 'Die Eat-This-App zeigt Berliner Spots auf der roten Karte',
      en: 'The Eat This app showing Berlin spots on the red map',
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
    partner: { src: '/pics/card-front.webp?v=4', width: 760, height: 1044, tilt: 7 },
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

/** Keep the contact copy in Sanity, but give its address a dedicated link.
 * Slicing spans preserves the surrounding copy's marks and annotations. */
function CodaContent({ blocks }: { blocks: PortableTextBlock[] }) {
  const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const index = blocks.findIndex(
    (block) => isPlainParagraph(block) && emailPattern.test(blockText(block as Block))
  );
  if (index < 0) {
    return (
      <div className={styles.body}>
        <PortableTextRenderer blocks={blocks} />
      </div>
    );
  }

  const block = blocks[index] as Block;
  const text = blockText(block);
  const match = text.match(emailPattern)!;
  const start = match.index!;
  const end = start + match[0].length;
  // A sentence-ending dot belongs to the inline address, not the next paragraph.
  const afterStart = end + (text.slice(end).match(/^\.\s*/)?.[0].length ?? 0);
  const slice = (from: number, to: number, suffix: string): PortableTextBlock[] => {
    let offset = 0;
    const children = (block.children ?? []).flatMap((span) => {
      const value = span.text ?? '';
      const part = value.slice(Math.max(0, from - offset), Math.max(0, to - offset));
      offset += value.length;
      return part ? [{ ...span, text: part }] : [];
    });
    return children.some((span) => span.text.trim())
      ? [{ ...block, _key: `${block._key ?? index}-${suffix}`, children }]
      : [];
  };
  const before = [...blocks.slice(0, index), ...slice(0, start, 'before-email')];
  const after = [...slice(afterStart, text.length, 'after-email'), ...blocks.slice(index + 1)];

  return (
    <>
      {before.length > 0 && (
        <div className={styles.body}>
          <PortableTextRenderer blocks={before} />
        </div>
      )}
      <a className={styles.email} href={`mailto:${match[0]}`}>
        {match[0]}
      </a>
      {after.length > 0 && (
        <div className={styles.body}>
          <PortableTextRenderer blocks={after} />
        </div>
      )}
    </>
  );
}

export default function AboutPage({ doc, locale }: { doc: StaticPageDoc; locale: Locale }) {
  const de = locale === 'de';
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
      <AboutMotion />
      <div className={styles.inner}>
        <header className={styles.hero} data-about-hero="">
          <div className={styles.heroCopy} data-about-enter="">
            <h1 className={styles.title} id="staticPageAbout-title">
              {doc.title || ''}
            </h1>
            {ledes.map((text, index) =>
              index === 0 ? (
                <p key={index} className={styles.lede}>
                  {text}
                </p>
              ) : (
                <blockquote key={index} className={styles.ledeQuote}>
                  {de ? '„' : '“'}
                  {text}
                  {de ? '“' : '”'}
                </blockquote>
              )
            )}
          </div>
          <div className={styles.heroArt} data-about-portrait="">
            <Image
              src="/pics/founder-cafe.webp"
              alt={
                de
                  ? 'Der Gründer von Eat This an einem Cafétisch, mit Kaffee und zwei Eat-This-Karten in der Hand'
                  : 'The founder of Eat This at a café table with a coffee and two Eat This cards'
              }
              width={760}
              height={1327}
              sizes="(min-width: 900px) 320px, 200px"
              priority
              className={styles.heroFigure}
            />
          </div>
        </header>

        {bridge.length > 0 && (
          <div className={styles.bridge}>
            {bridge.map((part, index) =>
              'line' in part ? (
                <p key={index} className={styles.oneLiner} data-about-enter="">
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
          const flipped = Boolean(figure) && index % 2 === 0;
          return (
            <Fragment key={section.title || index}>
              <section
                className={`${styles.section}${flipped ? ` ${styles.flip}` : ''}`}
                data-about-chapter={index}
              >
                <div className={styles.sectionCopy} data-about-enter="">
                  <span className={styles.sectionNumber} aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h2 className={styles.sectionTitle}>{section.title}</h2>
                  <div className={styles.body}>
                    <PortableTextRenderer blocks={section.blocks} />
                  </div>
                </div>

                {figure && (
                  <figure
                    className={styles.figure}
                    data-about-figure=""
                    style={{ '--fig-w': `${figure.renderWidth}px` } as CSSProperties}
                  >
                    <div data-about-object="">
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
                            data-about-card="back"
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
                            data-about-card="front"
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
                    </div>
                    <figcaption className={styles.caption}>
                      {de ? figure.caption.de : figure.caption.en}
                    </figcaption>
                  </figure>
                )}
              </section>
              {figure?.remyAfter && (
                <div className={styles.remy}>
                  <HubFragRemy embedded />
                </div>
              )}
            </Fragment>
          );
        })}
        {coda.length > 0 && (
          <div className={styles.coda}>
            {coda.map((section, index) => (
              <section
                key={section.title || index}
                className={styles.codaSection}
                data-about-enter=""
              >
                <h2 className={styles.sectionTitle}>{section.title}</h2>
                <CodaContent blocks={section.blocks} />
              </section>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
