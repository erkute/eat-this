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
  /** Rendered width in px. Not uniform on purpose — optical weight is not
   *  area. The card back is a solid field of yellow, black and red; at the
   *  plate's width it shouted down the section it belongs to. */
  renderWidth: number;
  tilt: number;
  caption: { de: string; en: string };
  alt: { de: string; en: string };
};

/* Editorial furniture, keyed by section order — the About copy lives in Sanity
   and its headings get rewritten, so matching on heading text would break the
   first time a word changes. Order is the stable part.

   Deliberately shorter than the section list: the last sections carry no
   picture. A figure per paragraph turned the page into a contact sheet. */
const FIGURES: (Figure | null)[] = [
  {
    src: '/pics/home-phones/phone-map-600.webp',
    width: 600,
    height: 1219,
    renderWidth: 290,
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
    src: '/pics/card-back.webp',
    width: 760,
    height: 1076,
    renderWidth: 205,
    tilt: -3,
    caption: { de: 'Jedes Must Eat ist eine Karte.', en: 'Every Must Eat is a card.' },
    alt: {
      de: 'Die Rückseite einer Eat-This-Sammelkarte',
      en: 'The back of an Eat This trading card',
    },
  },
];

const COPY = {
  de: {
    ctaTitle: 'Hungrig geworden?',
    ctaText: 'Die Map kennt über hundert Spots in Berlin. Such dir einen aus.',
    ctaMap: 'Zur Map',
    ctaInstagram: 'Instagram',
  },
  en: {
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
            <section key={section.title || index} className={styles.section}>
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

        {/* No object in here. A booster pack is something you buy, next to a
            button that sends you to a free map — two offers in one band, and
            the eye went to the packaging instead of the button. */}
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
        </aside>
      </div>
      <SiteFooter />
    </main>
  );
}
