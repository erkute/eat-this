import { Fragment, type CSSProperties } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { PortableTextRenderer } from '@/lib/PortableTextRenderer';
import type { PortableTextBlock, StaticPageDoc } from '@/lib/types';
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
  /** Objects that arrive with their own cast shadow opt out of the CSS one —
   *  two shadows on one picture reads as a printing error. */
  shadow?: false;
  /** `rail` hangs the object in the right column beside the copy. `band`
   *  takes the section out of the white page entirely — full-bleed ink, one
   *  dark chapter in the middle of the read. */
  layout: 'rail' | 'band';
  caption: { de: string; en: string };
  alt: { de: string; en: string };
};

/* Editorial furniture, keyed by section order — the About copy lives in Sanity
   and its headings get rewritten, so matching on heading text would break the
   first time a word changes. Order is the stable part.

   Still shorter than the section list: the closing "write to us" section
   carries no picture. A figure per paragraph turned the page into a contact
   sheet. */
const FIGURES: (Figure | null)[] = [
  {
    src: '/pics/home-phones/phone-map-600.webp',
    width: 600,
    height: 1219,
    // 600x1219 is a tall object: anything wider than this and the phone runs
    // past the copy beside it.
    renderWidth: 225,
    tilt: -2,
    layout: 'rail',
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
    layout: 'rail',
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
    // The pair spans the rail; each card lands near 62% of it. On the dark
    // ground the cards are the brightest thing on the page, and brightness
    // reads as size — hence narrower than the plate on white.
    renderWidth: 260,
    tilt: -8,
    layout: 'band',
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

/* Remy follows the dark chapter, because the last paragraph of that section is
   already about him — "frag einfach Remy". He was named once
   in passing and never reachable; now the sentence has a door next to it.
   The page speaks as Eat This, not as one person, so this does too. */
const COPY = {
  de: {
    remyTitle: 'Frag Remy',
    remyText: 'Remy kennt jeden Spot auf der Map. Sag ihm, worauf du Lust hast.',
    remyCta: 'Remy fragen',
    ctaTitle: 'Hungrig geworden?',
    ctaText: 'Die Map kennt über hundert Spots in Berlin. Such dir einen aus.',
    ctaMap: 'Zur Berlin Food Map',
  },
  en: {
    remyTitle: 'Ask Remy',
    remyText: "Remy knows every spot on the map. Tell him what you're in the mood for.",
    remyCta: 'Ask Remy',
    ctaTitle: 'Hungry yet?',
    ctaText: 'The map holds a hundred-plus spots in Berlin. Go pick one.',
    ctaMap: 'Open the Berlin food map',
  },
} as const;

function blockText(block: Block): string {
  return (block.children ?? []).map((c) => c.text ?? '').join('');
}

function isHeading(block: PortableTextBlock): boolean {
  const b = block as Block;
  return b._type === 'block' && !b.listItem && (b.style === 'h2' || b.style === 'h3');
}

/** Everything before the first heading is the lede; each heading opens a
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
  const [lede, ...restIntro] = intro;
  const ledeText = lede && (lede as Block).style !== 'blockquote' ? blockText(lede as Block) : '';
  const introRest = ledeText ? restIntro : intro;

  return (
    <main className={styles.page} data-page="about" id="staticPageAbout">
      <div className={styles.inner}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1 className={styles.title} id="staticPageAbout-title">
              {doc.title || ''}
            </h1>
            {ledeText && <p className={styles.lede}>{ledeText}</p>}
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
              sizes="(min-width: 900px) 320px, 62vw"
              priority
              className={styles.heroFigure}
            />
          </div>
        </header>

        {introRest.length > 0 && (
          <div className={`${styles.body} ${styles.intro}`}>
            <PortableTextRenderer blocks={introRest} />
          </div>
        )}

        {sections.map((section, index) => {
          const figure = FIGURES[index] ?? null;
          /* Sides alternate down the page: masthead right, then left, right,
             left, and the closer left again. Five figures all hanging in the
             same rail was even and, by the third one, wallpaper.

             Only sections that actually carry a figure flip — moving the text
             column of a picture-less section would be a jolt with nothing to
             show for it. The swap happens in the grid, never in the markup:
             the copy stays first in the DOM so the single-column stack and
             the reading order never zigzag. */
          const flipped = Boolean(figure) && index % 2 === 0;
          const body = (
            <>
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
                      style={
                        {
                          '--tilt': `${figure.tilt}deg`,
                          ...(figure.shadow === false ? { '--fig-shadow': 'none' } : null),
                        } as CSSProperties
                      }
                    />
                  )}
                  <figcaption className={styles.caption}>
                    {de ? figure.caption.de : figure.caption.en}
                  </figcaption>
                </figure>
              )}
            </>
          );

          if (figure?.layout === 'band') {
            return (
              /* The dark chapter holds the card argument and nothing else.
                 Remy used to be tacked under it, inside the ink; a door out
                 of the page does not belong at the bottom of a closed room.
                 It follows immediately after, back on paper. */
              <Fragment key={section.title || index}>
                <section className={styles.band}>
                  <div className={styles.bandInner}>
                    <div className={`${styles.bandGrid}${flipped ? ` ${styles.flip}` : ''}`}>
                      {body}
                    </div>
                  </div>
                </section>

                <section className={styles.remySection}>
                  <div className={styles.remyCopy}>
                    <h2 className={styles.remyTitle}>{copy.remyTitle}</h2>
                    <p className={styles.remyText}>{copy.remyText}</p>
                    <Link href="/#hub-fragremy" className={styles.remyCta}>
                      {copy.remyCta}
                    </Link>
                  </div>

                  {/* Remy on his own. He shared this column with a phone for
                      one revision and lost: at any size that let the screen be
                      read, he ended up standing on top of the very spot he is
                      supposed to be handing you. The phone closes the page
                      instead, where it has room. */}
                  <Image
                    src="/buddy/buddy-smile.webp"
                    alt=""
                    width={791}
                    height={876}
                    sizes="170px"
                    loading="lazy"
                    className={styles.remyArt}
                  />
                </section>
              </Fragment>
            );
          }

          return (
            <section
              key={section.title || index}
              className={`${styles.section}${flipped ? ` ${styles.flip}` : ''}`}
            >
              {body}
            </section>
          );
        })}

        {/* The one object on this page that hangs left. Everything above it
            sits in the right rail, which is even and, five figures in, dull;
            the text column cannot move without breaking the spine, so the
            closer moves instead.

            A booster pack was tried here once and pulled the eye away — it is
            something you buy, sitting next to a button that leads to a free
            map. A spot's own screen is not a competing offer. It is the offer,
            with a picture. */}
        <aside className={styles.cta}>
          <Image
            src="/pics/home-phones/phone-restaurant-600.webp"
            alt={
              de
                ? 'Die Eat-This-App zeigt die Detailseite eines Berliner Spots'
                : "The Eat This app showing a Berlin spot's detail page"
            }
            width={600}
            height={1219}
            sizes="(min-width: 760px) 210px, 170px"
            loading="lazy"
            className={styles.ctaPhone}
          />
          <div className={styles.ctaCopy}>
            <h2 className={styles.ctaTitle}>{copy.ctaTitle}</h2>
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
