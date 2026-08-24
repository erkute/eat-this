import type { CSSProperties } from 'react';
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

type Figure = {
  src: string;
  width: number;
  height: number;
  /** Rendered width in px. Set per image, not per breakpoint: a 600x1219
   *  phone shot and an 867x861 plate need very different boxes to read as
   *  the same weight on the page. */
  renderWidth: number;
  /** `card` sits in a tinted frame (photos with their own background);
   *  `cutout` floats freigestellt on the paper, the way the home rails do. */
  shape: 'card' | 'cutout';
  tilt: number;
  caption: { de: string; en: string };
  alt: { de: string; en: string };
};

/* Editorial furniture, keyed by section order — the About copy lives in Sanity
   and its headings get rewritten, so matching on heading text would break the
   first time a word changes. Order is the stable part. Extra entries are
   simply unused if a section is dropped; a new section just gets no figure. */
const FIGURES: (Figure | null)[] = [
  {
    src: '/pics/home-phones/phone-map-600.webp',
    width: 600,
    height: 1219,
    renderWidth: 230,
    shape: 'cutout',
    tilt: -2,
    caption: { de: 'Alle Empfehlungen an einem Ort.', en: 'Every recommendation in one place.' },
    alt: {
      de: 'Die Eat-This-App zeigt Berliner Spots als gelbe Pins auf der Karte',
      en: 'The Eat This app showing Berlin spots as yellow pins on the map',
    },
  },
  {
    src: '/pics/home-dishes/sofi-morning-bun.webp',
    width: 928,
    height: 1152,
    renderWidth: 285,
    shape: 'card',
    tilt: 1.5,
    caption: {
      de: 'Morning Bun bei Sofi. Ein Spot von vielen.',
      en: 'Morning bun at Sofi. One spot of many.',
    },
    alt: {
      de: 'Ein gezuckerter Morning Bun auf einem weißen Teller',
      en: 'A sugared morning bun on a white plate',
    },
  },
  {
    src: '/pics/card-back.webp',
    width: 760,
    height: 1076,
    renderWidth: 240,
    shape: 'cutout',
    tilt: -3,
    caption: { de: 'Jedes Must Eat ist eine Karte.', en: 'Every Must Eat is a card.' },
    alt: {
      de: 'Die Rückseite einer Eat-This-Sammelkarte',
      en: 'The back of an Eat This trading card',
    },
  },
  {
    src: '/pics/home-dishes/uludag-doener-print.webp',
    width: 928,
    height: 1152,
    renderWidth: 300,
    shape: 'cutout',
    tilt: 2,
    caption: { de: 'Berlin, Bezirk für Bezirk.', en: 'Berlin, district by district.' },
    alt: {
      de: 'Ein Döner auf Uludag-Papier, von oben fotografiert',
      en: 'A döner on Uludag paper, shot from above',
    },
  },
  {
    src: '/pics/home-dishes/jules-cappuccino.webp',
    width: 1856,
    height: 2304,
    renderWidth: 260,
    shape: 'card',
    tilt: -1.5,
    caption: { de: 'Auf einen Kaffee. Oder einen Tipp.', en: 'Come for a coffee. Or a tip.' },
    alt: {
      de: 'Ein Cappuccino mit Latte Art auf einer weißen Untertasse',
      en: 'A cappuccino with latte art on a white saucer',
    },
  },
];

const COPY = {
  de: {
    kicker: 'Über uns',
    ctaTitle: 'Hungrig geworden?',
    ctaText: 'Die Map kennt über hundert Spots in Berlin. Such dir einen aus.',
    ctaMap: 'Zur Map',
    ctaInstagram: 'Instagram',
  },
  en: {
    kicker: 'About us',
    ctaTitle: 'Hungry yet?',
    ctaText: 'The map holds a hundred-plus spots in Berlin. Go pick one.',
    ctaMap: 'Open the map',
    ctaInstagram: 'Instagram',
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
            <p className={styles.kicker}>
              <span className={styles.mark} aria-hidden="true" />
              {copy.kicker}
            </p>
            <h1 className={styles.title} id="staticPageAbout-title">
              {doc.title || ''}
            </h1>
            {ledeText && <p className={styles.lede}>{ledeText}</p>}
          </div>

          {/* Freigestellte Objekte auf Papier — the same white-ground stack the
              home rails use, tilted rather than faded in. Both sides of the
              collectible are here on purpose: one card face-down, one face-up,
              which is the whole Must-Eat mechanic in a single picture. */}
          <div className={styles.heroArt} aria-hidden="true">
            <Image
              src="/pics/home-phones/phone-restaurant-600.webp"
              alt=""
              width={600}
              height={1219}
              sizes="(min-width: 900px) 260px, 55vw"
              priority
              className={styles.heroPhone}
            />
            <Image
              src="/pics/card-back.webp"
              alt=""
              width={760}
              height={1076}
              sizes="(min-width: 900px) 150px, 32vw"
              className={styles.heroCard}
            />
            <Image
              src="/pics/card-front.webp"
              alt=""
              width={760}
              height={1045}
              sizes="(min-width: 900px) 150px, 32vw"
              className={styles.heroCardFront}
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
          return (
            <section
              key={section.title || index}
              className={styles.section}
              data-figure={figure ? (index % 2 === 0 ? 'right' : 'left') : undefined}
            >
              <div className={styles.sectionCopy}>
                <h2 className={styles.sectionTitle}>{section.title}</h2>
                <div className={styles.body}>
                  <PortableTextRenderer blocks={section.blocks} />
                </div>
              </div>

              {figure && (
                <figure
                  className={styles.figure}
                  data-shape={figure.shape}
                  style={{ '--fig-w': `${figure.renderWidth}px` } as CSSProperties}
                >
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
                  <figcaption className={styles.caption}>
                    {de ? figure.caption.de : figure.caption.en}
                  </figcaption>
                </figure>
              )}
            </section>
          );
        })}

        <aside className={styles.cta}>
          <div className={styles.ctaCopy}>
            <h2 className={styles.ctaTitle}>{copy.ctaTitle}</h2>
            <p className={styles.ctaText}>{copy.ctaText}</p>
            <div className={styles.ctaRow}>
              <Link href="/map" className={styles.ctaPrimary}>
                {copy.ctaMap}
              </Link>
              <a
                href="https://www.instagram.com/eatthisdotcom/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ctaSecondary}
              >
                {copy.ctaInstagram}
              </a>
            </div>
          </div>
          <Image
            src="/pics/booster/booster.webp"
            alt=""
            width={1008}
            height={1560}
            sizes="(min-width: 760px) 168px, 132px"
            loading="lazy"
            className={styles.ctaPack}
          />
        </aside>
      </div>
      <SiteFooter />
    </main>
  );
}
