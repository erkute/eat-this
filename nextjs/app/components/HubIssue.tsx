import { Fragment, type ReactNode } from 'react';
import Image from './SiteImage';
import { categoryArt } from '@/lib/categoryArt';
import { Link } from '@/i18n/navigation';
import type { GuideTeaser } from '@/lib/sanity.server';
import type { HubArticle } from '@/lib/home/getHomeData';
import type { RestaurantCard } from '@/lib/types';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { normalizeName } from '@/lib/normalizeName';
import { pickLocale } from '@/lib/i18n/pickLocale';
import { sanitySrcSet, coverImageScale } from '@/lib/sanity-image-presets';
import { scaleSizes } from '@/lib/magazineCover';
import { formatArticleDate } from '@/lib/articleDate';
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers';
import { HubFilterCard, HubFilterGroup } from './HubFilter';
import CategoryPackLink from './CategoryPackLink';
import MagazineCover from './MagazineCover';
import MagazineLink from './MagazineLink';
import SpotLink from './SpotLink';
import styles from './HubIssue.module.css';

/** Server-rendered editorial cards and the complete alphabetical directory.
 * Filtering is progressive enhancement through HubFilterCard/HubFilterGroup.
 */

type Locale = 'de' | 'en';
type Spot = RestaurantCard;

/** „Oktober 2026" — der Monat, in dem zuletzt ein Spot der Seite gepflegt
 *  wurde. Leer, wenn keiner ein Datum trägt. */
export function latestMonth(restaurants: RestaurantCard[], locale: 'de' | 'en'): string {
  const latest = restaurants.reduce(
    (max, r) => (r._updatedAt && r._updatedAt > max ? r._updatedAt : max),
    ''
  );
  if (!latest) return '';
  return new Date(latest).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  });
}

/** Sprungziel eines Kapitels — die Bildleiste oben zeigt darauf. */
export const spotAnchor = (slug: string) => `spot-${slug}`;

/** Küche, Bezirk (nur wo er nicht schon die Seite ist) und Preis. */
function metaLine(r: Spot, locale: Locale, showDistrict = false): ReactNode {
  const parts = [
    r.cuisineType && localizedCuisine(r.cuisineType, locale),
    showDistrict && (r.district || r.bezirk?.name),
    formatPriceLabel(r, locale),
  ].filter((part): part is string => Boolean(part));
  if (!parts.length) return null;
  // Jeder Teil bleibt beisammen — umbrochen wird nur am „·", nie mitten in
  // „Prenzlauer Berg" oder „20–30 €" (21.10.2026).
  return parts.map((part, index) => (
    <Fragment key={part}>
      {index > 0 && ' · '}
      <span className={styles.metaPart}>{part}</span>
    </Fragment>
  ));
}

function Photo({
  src,
  name,
  sizes,
  widths,
  position,
  eager = false,
  aspectRatio = 4 / 5,
}: {
  src?: string | null;
  /** Gibt ohne Foto die Initiale her. */
  name: string;
  sizes: string;
  widths: number[];
  position?: string;
  eager?: boolean;
  aspectRatio?: number;
}) {
  if (!src) {
    return (
      <span className={styles.initial} aria-hidden="true">
        {normalizeName(name).charAt(0)}
      </span>
    );
  }
  const scale = coverImageScale(src, aspectRatio);
  return (
    /* Sanity liefert die Grössen selbst; der App-Hosting-Proxy rechnete sie
       nur noch einmal. */
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      srcSet={sanitySrcSet(src, widths.map(w => Math.round(w * scale)))}
      sizes={scaleSizes(sizes, scale)}
      style={position ? { objectPosition: position } : undefined}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}

/**
 * Kompakte Empfehlungen: Foto, Name, Beschreibung; der Tipp öffnet sich
 * bei Bedarf. Der Namenslink macht die ganze Karte anklickbar; das native
 * Tipp-Element bleibt unabhängig davon bedienbar.
 */
export function IssueSpots({
  restaurants,
  locale,
  facetsOf,
  showDistrict = false,
  layout = 'grid',
}: {
  restaurants: Spot[];
  locale: Locale;
  facetsOf: (r: Spot) => string[];
  /** Bezirk in der Metazeile — auf den Kategorieseiten. */
  showDistrict?: boolean;
  layout?: 'grid' | 'editorial' | 'compact' | 'district';
}) {
  const de = locale === 'de';
  return (
    <div className={`${styles.spots} ${layout === 'editorial' ? styles.editorialSpots : layout === 'compact' ? styles.compactSpots : layout === 'district' ? styles.districtSpots : ''}`} data-count={restaurants.length}>

      {restaurants.map((r, index) => {
        const name = normalizeName(r.name);
        const meta = metaLine(r, locale, showDistrict);
        const desc = pickLocale(r.shortDescription, r.shortDescriptionEn, locale);
        const tip = pickLocale(r.tip, r.tipEn, locale);
        return (
          <HubFilterCard key={r._id} slugs={facetsOf(r)}>
            <article className={styles.spot} id={spotAnchor(r.slug)} data-spot-card>
              <h3 className={styles.spotName}>
                <SpotLink href={`/restaurant/${r.slug}`}>{name}</SpotLink>
              </h3>
              {meta && <p className={styles.deck}>{meta}</p>}
              <span className={styles.spotPhoto}>
                <span className={styles.spotPhotoCrop} data-spot-photo>
                  <Photo
                    src={r.photo}
                    name={r.name}
                    sizes={layout === 'district' ? '(max-width: 767px) 92vw, (max-width: 1023px) 44vw, 380px' : layout === 'editorial' && index === 0
                      ? '(max-width: 767px) 92vw, 660px'
                      : layout !== 'grid' ? '(max-width: 767px) 96px, 144px'
                        : '(max-width: 767px) 92vw, (max-width: 1023px) 44vw, 370px'}
                    widths={layout !== 'grid' && layout !== 'district' && !(layout === 'editorial' && index === 0) ? [240, 400] : [400, 640, 960, 1320]}
                    eager={(layout === 'editorial' || layout === 'district') && index === 0}
                  />
                </span>
              </span>
              {desc && <div className={styles.text}>
                {desc && <p>{desc}</p>}
              </div>}
              {layout === 'grid' && tip && (
                <details className={styles.tip}>
                  <summary className={styles.tipLabel}>{de ? 'Unser Tipp' : 'Our tip'}</summary>
                  <p>{tip}</p>
                </details>
              )}
            </article>
          </HubFilterCard>
        );
      })}
    </div>
  );
}

/** Die Marke eines Namens: Grundbuchstabe ohne Akzent, Ziffern unter „#". */
function letterOf(name: string): string {
  const first = normalizeName(name).normalize('NFD').charAt(0).toUpperCase();
  return /\p{L}/u.test(first) ? first : '#';
}

/** Aufeinanderfolgende Spots mit derselben Marke — die Liste kommt schon
 *  alphabetisch (siehe directoryOrder in lib/curated-ranking.ts). */
function byLetter<T extends Pick<Spot, 'name'>>(
  restaurants: T[]
): { letter: string; items: T[] }[] {
  const groups: { letter: string; items: T[] }[] = [];
  for (const r of restaurants) {
    const letter = letterOf(r.name);
    const last = groups[groups.length - 1];
    if (last?.letter === letter) last.items.push(r);
    else groups.push({ letter, items: [r] });
  }
  return groups;
}

/**
 * Das Register hinten im Heft: alle übrigen Spots alphabetisch in drei
 * Spalten (Ansage 03.10.2026), Buchstaben rot, je Spot Name und Küche ·
 * Preis. Die Liste kommt schon sortiert (directoryOrder in
 * lib/curated-ranking.ts). Ein Buchstabe verschwindet mit dem Filter, wenn
 * keiner seiner Spots passt.
 */
export function IssueRegister({
  restaurants,
  locale,
  facetsOf,
  showDistrict = false,
}: {
  restaurants: Spot[];
  locale: Locale;
  facetsOf: (r: Spot) => string[];
  showDistrict?: boolean;
}) {
  return (
    <div className={styles.register}>
      {byLetter(restaurants).map(({ letter, items }) => (
        <HubFilterGroup key={letter} slugs={[...new Set(items.flatMap(facetsOf))]}>
          <div className={styles.letterGroup}>
            <p className={styles.letter} aria-hidden="true">
              {letter}
            </p>
            {items.map((r) => {
              const meta = metaLine(r, locale, showDistrict);
              return (
                <HubFilterCard key={r._id} slugs={facetsOf(r)}>
                  <SpotLink href={`/restaurant/${r.slug}`} className={styles.entry}>
                    <span className={styles.entryPhoto} data-spot-photo>
                      <Photo src={r.photo} name={r.name} sizes="80px" widths={[160, 240]} />
                    </span>
                    <span className={styles.entryCopy}>
                    <span className={styles.entryName}>{normalizeName(r.name)}</span>
                    {meta && <span className={styles.entryMeta}>{meta}</span>}
                    </span>
                  </SpotLink>
                </HubFilterCard>
              );
            })}
          </div>
        </HubFilterGroup>
      ))}
    </div>
  );
}

/**
 * Der Guide zum Bezirk als Heft, wie auf /news: ein Tipp schlägt es auf und
 * landet im Artikel (MagazineLink). Daneben Rubrik, Datum und Titel.
 */
export function IssueGuides({
  guides,
  locale,
  heading,
  interlude = false,
}: {
  guides: (GuideTeaser | null)[];
  locale: Locale;
  heading: string;
  interlude?: boolean;
}) {
  const shown = guides.filter((g): g is GuideTeaser => Boolean(g) && !g!.noIndex);
  if (shown.length === 0) return null;
  return (
    <section className={interlude ? styles.guideInterlude : undefined} aria-labelledby="guides-title">
      <h2 id="guides-title" className={styles.secTitle}>
        {heading}
      </h2>
      <div className={styles.guides}>
      {shown.map((g) => {
        const date = formatArticleDate(g.date, locale);
        return (
          <MagazineLink key={g.slug} href={`/news/${g.slug}`} className={styles.guide}>
            <span className={styles.guideCover}>
              <MagazineCover
                title={g.title}
                image={g.imageUrl}
                issue={g.issue}
                date={g.date}
                locale={locale}
                cover={g.cover}
                sizes="(max-width: 767px) 130px, 240px"
                widths={[320, 480]}
              />
            </span>
            <span className={styles.guideText}>
              {(g.kicker || date) && (
                <span className={styles.guideMeta}>
                  {[g.kicker, date].filter(Boolean).join(' · ')}
                </span>
              )}
              <span className={styles.guideTitle}>{g.title}</span>
            </span>
          </MagazineLink>
        );
      })}
      </div>
    </section>
  );
}

/**
 * Der Schluss der Übersichten: die neuesten Hefte aus dem Magazin, gelegt wie
 * „Weitere Ausgaben" unter einem Artikel, dazu der Weg zu allen. Bis 03.10.2026 endeten /bezirk und
 * /kategorie nach dem letzten Eintrag einfach — „da ist einfach Stille".
 */
export function IssueMagazine({
  issues,
  locale,
  heading,
  intro,
}: {
  issues: HubArticle[];
  locale: Locale;
  heading: string;
  intro?: string;
}) {
  if (issues.length === 0) return null;
  return (
    <section className={`${styles.magazine} ${intro ? styles.magazineIntro : ''}`} aria-labelledby="magazine-title">
      <h2 id="magazine-title" className={styles.secTitle}>
        {heading}
      </h2>
      {intro && <p className={styles.magazineDescription}>{intro}</p>}
      <ul className={styles.shelf}>
        {issues.map((a) => (
          <li key={a.slug}>
            <MagazineLink href={`/news/${a.slug}`} className={styles.shelfIssue}>
              <MagazineCover
                title={a.title}
                image={a.image}
                issue={a.issue}
                date={a.date}
                locale={locale}
                cover={a.cover}
                sizes="(max-width: 767px) 62vw, (max-width: 1199px) 22vw, 280px"
                widths={[320, 480, 800]}
              />
            </MagazineLink>
          </li>
        ))}
      </ul>
      <div className={styles.links}>
        <Link href="/news" className="et-btn">
          {/* „Ausgaben" wie die Hefte selbst („Issue 27") und „Weitere
              Ausgaben" unter dem Artikel — „Alle Stories" passte nicht
              (Ansage 03.10.2026). */}
          {locale === 'de' ? 'Alle Ausgaben' : 'All issues'}
        </Link>
      </div>
    </section>
  );
}

/**
 * Weitere Bezirke oder Kategorien als Foto-Karten. Echte Links bleiben auch
 * ohne Animation oder JavaScript zugänglich.
 */
export function IssueSiblings({
  items,
  base,
  heading,
  label,
}: {
  /** `photo`: das erste Foto aus dem Regal dieses Hubs (siehe pickShelf). */
  items: { slug: string; label: string; photo?: string | null; photoPosition?: string }[];
  /** Pfad-Präfix ohne Sprache: `/bezirk` oder `/kategorie`. */
  base: '/bezirk' | '/kategorie';
  heading: string;
  label: string;
}) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={label}>
      <h2 className={styles.secTitle}>{heading}</h2>
      <ul className={styles.siblings}>
        {items.map((item) => (
          <li key={item.slug}>
            <Link href={`${base}/${item.slug}`}>
              <span className={styles.contentsPhoto}>
                <Photo
                  src={item.photo}
                  name={item.label}
                  position={item.photoPosition}
                  sizes="(max-width: 767px) 44vw, (max-width: 1199px) 29vw, 280px"
                  widths={[240, 400, 640]}
                />
              </span>
              <span className={styles.contentsName}>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Four illustrated packs offer another category at the end of a visit. */
export function IssueCategories({ items, heading }: {
  items: { slug: string; label: string }[];
  heading: string;
}) {
  const order = ['pizza', 'coffee', 'drinks', 'sweets', 'breakfast', 'lunch', 'dinner', 'fast-food', 'fine-dining'];
  const picks = order.flatMap(slug => items.filter(item => item.slug === slug)).slice(0, 4);
  if (!picks.length) return null;
  return (
    <nav className={styles.categoryMenu} aria-label={heading}>
      <h2 className={styles.secTitle}>{heading}</h2>
      <ul>
        {picks.map((item) => (
          <li key={item.slug}>
            <CategoryPackLink slug={item.slug}>
              <Image src={categoryArt(item.slug)!} alt="" width={160} height={240} sizes="(max-width: 767px) 128px, 200px" className={styles.shelfPack} />
              <span>{item.label}</span>
            </CategoryPackLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
