import { Fragment, type CSSProperties } from 'react';
import { BRAND_WORDMARK } from '@/lib/constants';
import Image from '@/app/components/SiteImage';
import { PortableTextRenderer } from '@/lib/PortableTextRenderer';
import type { PortableTextBlock, StaticPageDoc } from '@/lib/types';
import HubFragRemy from './HubFragRemy';
import SiteFooter from './SiteFooter';
import AboutStoryMotion from './AboutStoryMotion';
import FoldedPaperBackdrop from './FoldedPaperBackdrop';
import styles from './AboutPage.module.css';
import MapPhoneArtwork from './MapPhoneArtwork';

type Locale = 'de' | 'en';

type Block = PortableTextBlock & {
  style?: string;
  listItem?: string;
  children?: { text?: string }[];
};

type Figure = {
  src: string;
  width: number;
  height: number;
  cards?: string[];
  /** Rendered width in px. Not uniform on purpose — optical weight is not
   *  area. The card back is a solid field of yellow, black and red; at the
   *  plate's width it shouted down the section it belongs to. */
  renderWidth: number;
  tilt: number;
  /** The homepage Remy stage follows this section. */
  remyAfter?: true;
  caption?: { de: string; en: string };
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
    src: '/pics/home-map/phone-1.webp',
    width: 534,
    height: 1044,
    // A tall object: anything wider than this and the phone runs
    // past the copy beside it.
    renderWidth: 225,
    tilt: -2,
    caption: { de: 'Alle Empfehlungen an einem Ort.', en: 'Every recommendation in one place.' },
    alt: {
      de: 'Die Eat-This-Map mit Berliner Spots und Avatar',
      en: 'The Eat This map showing Berlin spots and an avatar',
    },
  },
  {
    src: '/pics/card-front-sabich.webp?v=6',
    width: 760,
    height: 1044,
    renderWidth: 300,
    tilt: 5,
    caption: { de: 'Sabich bei Kitten Deli in Neukölln.', en: 'Sabich at Kitten Deli in Neukölln.' },
    alt: {
      de: 'Eine aufgedeckte Eat-This-Sammelkarte mit dem Sabich',
      en: 'A revealed Eat This trading card featuring sabich',
    },
  },
  {
    // Original card artwork, including the back, opens into a five-card fan.
    src: '/pics/card-back.webp',
    width: 760,
    height: 1044,
    cards: ['/pics/card-back.webp', '/pics/home/hero-must-eat.webp', '/pics/home/must-eat-008.webp', '/pics/home/must-eat-012.webp', '/pics/home/must-eat-011.webp'],
    renderWidth: 1000,
    tilt: 0,
    remyAfter: true,
    caption: { de: 'Berliner Must Eats für deine Sammlung.', en: 'Berlin Must Eats for your collection.' },
    alt: {
      de: 'Fünf Eat-This-Sammelkarten als Fächer: eine Rückseite, Hamachi Head, Rinderschaufel, Cappuccino und ODB Sandwich',
      en: 'Five Eat This trading cards in a fan: a card back, Hamachi Head, Rinderschaufel, Cappuccino and ODB Sandwich',
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

/* The first opening paragraph introduces the story above the portrait;
   the second becomes the founder's quote below it. Both remain in Sanity. */
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
      <FoldedPaperBackdrop id={`about-paper-${locale}`} />
      <AboutStoryMotion className={styles.inner}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1 className={styles.title} id="staticPageAbout-title">
              <Image
                {...BRAND_WORDMARK}
                alt="eat this."
                sizes="(min-width: 1248px) 1200px, calc(100vw - 48px)"
                priority
                className={styles.wordmark}
              />
            </h1>
            {ledes[0] && <p className={styles.lede}>{ledes[0]}</p>}
          </div>
          <figure className={styles.heroArt}>
            <Image
              src="/pics/founder-table-cartoon-final.webp"
              alt={
                de
                  ? 'Ersan als Cartoon im grauen Anzug bei Bar Basta: Gin Fizz in der Hand, ODB Sandwich auf dem Tisch'
                  : 'A cartoon of Ersan in a grey suit at Bar Basta, holding a Gin Fizz with an ODB Sandwich on the table'
              }
              width={1145}
              height={1374}
              sizes="(min-width: 768px) 680px, calc(100vw - 48px)"
              priority
              className={styles.heroFigure}
            />
          </figure>
          {ledes[1] && (
            <blockquote className={styles.ledeQuote}>
              {de ? '„' : '“'}{ledes[1]}{de ? '“' : '”'}
            </blockquote>
          )}
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
          const flipped = Boolean(figure) && index % 2 === 0;
          return (
            <Fragment key={section.title || index}>
              <section className={`${styles.section}${flipped ? ` ${styles.flip}` : ''}${index === 1 ? ` ${styles.selection}` : ''}${figure?.cards ? ` ${styles.cardChapter}` : ''}`} data-about-chapter="">
                <div className={styles.sectionCopy}>
                  <h2 className={styles.sectionTitle}>{section.title}</h2>
                  <div className={styles.body}>
                    <PortableTextRenderer blocks={section.blocks} />
                  </div>
                </div>

                {figure && (
                  <figure
                    className={`${styles.figure}${figure.cards ? ` ${styles.fanFigure}` : ''}`}
                    style={{ '--fig-w': `${figure.renderWidth}px` } as CSSProperties}
                  >
                    <div>
                      {figure.cards ? (
                        <div className={styles.fan} data-about-fan="" role="img" aria-label={de ? figure.alt.de : figure.alt.en}>
                          {figure.cards.map((src, cardIndex) => {
                            const offset = cardIndex - (figure.cards!.length - 1) / 2;
                            return (
                              <Image
                                key={src}
                                src={src}
                                alt=""
                                width={760}
                                height={1044}
                                sizes="(min-width: 768px) 320px, 120px"
                                loading="lazy"
                                className={styles.fanCard}
                                data-about-card=""
                                data-fan-angle={offset * 12}
                                data-fan-x={offset * 14}
                                style={{ '--fan-angle': `${offset * 12}deg`, '--fan-x': `${offset * 14}%` } as CSSProperties}
                              />
                            );
                          })}
                        </div>
                      ) : figure.src === '/pics/home-map/phone-1.webp' ? (
                        <div className={styles.figureImg}><MapPhoneArtwork alt={de ? figure.alt.de : figure.alt.en} /></div>
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
                    {figure.caption && (
                      <figcaption className={styles.caption}>
                        {de ? figure.caption.de : figure.caption.en}
                      </figcaption>
                    )}
                  </figure>
                )}
              </section>
              {figure?.remyAfter && (
                <div className={styles.remy}>
                  <HubFragRemy compact />
                </div>
              )}
            </Fragment>
          );
        })}
        {coda.length > 0 && (
          <div className={styles.coda}>
            {coda.map((section, index) => (
              <section key={section.title || index} className={styles.codaSection}>
                <h2 className={styles.sectionTitle}>{section.title}</h2>
                <CodaContent blocks={section.blocks} />
              </section>
            ))}
          </div>
        )}
      </AboutStoryMotion>
      <SiteFooter />
    </main>
  );
}
