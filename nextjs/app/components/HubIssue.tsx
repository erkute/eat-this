import type { CSSProperties } from 'react';
import { Link } from '@/i18n/navigation';
import type { GuideTeaser } from '@/lib/sanity.server';
import type { RestaurantCard } from '@/lib/types';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { normalizeName } from '@/lib/normalizeName';
import { pickLocale } from '@/lib/i18n/pickLocale';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import { formatArticleDate } from '@/lib/articleDate';
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers';
import { HubFilterCard, HubFilterGroup } from './HubFilter';
import MagazineCover from './MagazineCover';
import MagazineLink from './MagazineLink';
import MapIntentLink from './MapIntentLink';
import Image from './SiteImage';
import styles from './HubIssue.module.css';

/**
 * Die Hub-Seiten im Heftlook (Entwurf A „Die Ausgabe", Wahl 03.10.2026 für
 * die Bezirke, am selben Tag auf Kategorien und die beiden Übersichten
 * ausgedehnt): die Seite liest sich wie ein Artikel aus dem Magazin — alles
 * mittig, die Bestenliste als Kapitel mit rotem Namen, Foto, Text und Tipp,
 * der Rest als Register hinten im Heft. Dieselbe Sprache wie
 * NewsArticleShell: weisser Grund, Providence für alles Gesetzte, Inter für
 * den Lesetext, Rot für Überschriften, Gelb als Akzent.
 *
 * Die Teile hier sind Server-Markup; gefiltert wird über HubFilterCard und
 * HubFilterGroup.
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
function metaLine(r: Spot, locale: Locale, showDistrict = false): string {
  return [
    r.cuisineType && localizedCuisine(r.cuisineType, locale),
    showDistrict && (r.district || r.bezirk?.name),
    formatPriceLabel(r, locale),
  ]
    .filter(Boolean)
    .join(' · ');
}

function Photo({
  r,
  sizes,
  widths,
  eager = false,
}: {
  r: Spot;
  sizes: string;
  widths: number[];
  eager?: boolean;
}) {
  if (!r.photo) {
    return (
      <span className={styles.initial} aria-hidden="true">
        {normalizeName(r.name).charAt(0)}
      </span>
    );
  }
  return (
    /* Sanity liefert die Grössen selbst; der App-Hosting-Proxy rechnete sie
       nur noch einmal. */
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={r.photo}
      srcSet={sanitySrcSet(r.photo, widths)}
      sizes={sizes}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}

/**
 * Der Inhalt des Hefts: die Kapitel als Bildleiste, ein Tipp springt hin.
 * Steht dort, wo andere Seiten ihr Aufmacherfoto haben — keiner der Bezirke
 * hat in Sanity ein eigenes (Stand 03.10.2026).
 */
export function IssueContents({ restaurants, label }: { restaurants: Spot[]; label: string }) {
  if (restaurants.length < 2) return null;
  return (
    <nav className={styles.contents} aria-label={label}>
      <ol style={{ '--count': restaurants.length } as CSSProperties}>
        {restaurants.map((r) => (
          <li key={r._id}>
            <a href={`#${spotAnchor(r.slug)}`}>
              <span className={styles.contentsPhoto}>
                {/* Steht im ersten Bildschirm — nicht erst beim Scrollen laden. */}
                <Photo r={r} sizes="(max-width: 767px) 104px, 150px" widths={[240, 320]} eager />
              </span>
              <span className={styles.contentsName}>{normalizeName(r.name)}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Die Bestenliste als Kapitel: Name rot und gross, darunter Küche und Preis,
 * das Foto über die Lesespalte, Beschreibung und Tipp im Lesetext, dann die
 * zwei Wege — auf die Map und auf die Spot-Seite. Der Name ist der gefolgte
 * Link auf die Spot-Seite; die Map-Links tragen `nofollow` (Query-Varianten).
 */
export function IssueSpots({
  restaurants,
  locale,
  facetsOf,
  showDistrict = false,
}: {
  restaurants: Spot[];
  locale: Locale;
  facetsOf: (r: Spot) => string[];
  /** Bezirk in der Metazeile — auf den Kategorieseiten. */
  showDistrict?: boolean;
}) {
  const de = locale === 'de';
  return (
    <div className={styles.column}>
      {restaurants.map((r) => {
        const name = normalizeName(r.name);
        const meta = metaLine(r, locale, showDistrict);
        const desc = pickLocale(r.shortDescription, r.shortDescriptionEn, locale);
        const tip = pickLocale(r.tip, r.tipEn, locale);
        return (
          <HubFilterCard key={r._id} slugs={facetsOf(r)}>
            <article className={styles.spot} id={spotAnchor(r.slug)}>
              <h3 className={styles.spotName}>
                <Link href={`/restaurant/${r.slug}`}>{name}</Link>
              </h3>
              {meta && <p className={styles.deck}>{meta}</p>}
              <Link
                href={`/restaurant/${r.slug}`}
                className={styles.spotPhoto}
                tabIndex={-1}
                aria-hidden="true"
              >
                <Photo r={r} sizes="(max-width: 767px) 100vw, 660px" widths={[480, 800, 1320]} />
              </Link>
              {(desc || tip) && (
                <div className={styles.text}>
                  {desc && <p>{desc}</p>}
                  {tip && (
                    <p>
                      <span className={styles.tipLabel}>{de ? 'Tipp' : 'Tip'}</span> {tip}
                    </p>
                  )}
                </div>
              )}
              <div className={styles.links}>
                <MapIntentLink
                  href={`/map?r=${r.slug}`}
                  rel="nofollow"
                  className={styles.btn}
                  aria-label={de ? `${name} auf der Map öffnen` : `Open ${name} on the map`}
                >
                  {de ? 'Zur Map' : 'On the map'}
                </MapIntentLink>
                <Link
                  href={`/restaurant/${r.slug}`}
                  className={`${styles.btn} ${styles.btnQuiet}`}
                  aria-label={de ? `${name}: Spot-Seite öffnen` : `Open the spot page for ${name}`}
                >
                  {de ? 'Spot-Seite' : 'Spot page'}
                </Link>
              </div>
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
                  <Link href={`/restaurant/${r.slug}`} className={styles.entry}>
                    <span className={styles.entryName}>{normalizeName(r.name)}</span>
                    {meta && <span className={styles.entryMeta}>{meta}</span>}
                  </Link>
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
}: {
  guides: (GuideTeaser | null)[];
  locale: Locale;
  heading: string;
}) {
  const shown = guides.filter((g): g is GuideTeaser => Boolean(g) && !g!.noIndex);
  if (shown.length === 0) return null;
  return (
    <section aria-labelledby="guides-title">
      <h2 id="guides-title" className={styles.secTitle}>
        {heading}
      </h2>
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
                sizes="(max-width: 767px) 130px, 240px"
                widths={[320, 480]}
                compact
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
    </section>
  );
}

/** Die Fragen offen, wie Zwischentitel im Heft — nichts zum Aufklappen. */
export function IssueFaq({
  entries,
  heading,
}: {
  entries: { question: string; answer: string }[];
  heading: string;
}) {
  if (entries.length === 0) return null;
  return (
    <section aria-labelledby="faq-title">
      <h2 id="faq-title" className={styles.secTitle}>
        {heading}
      </h2>
      <div className={`${styles.column} ${styles.faq}`}>
        {entries.map((entry) => (
          <div key={entry.question}>
            <h3 className={styles.question}>{entry.question}</h3>
            <p className={styles.answer}>{entry.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Der Ausgang: die anderen Bezirke als eine Zeile, getrennt durch gelbe
 * Striche. Ohne Schlusszeichen nach dem letzten (Ansage 03.10.2026).
 */
export function IssueSiblings({
  items,
  base,
  heading,
  label,
}: {
  items: { slug: string; label: string }[];
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
        {items.map((item, i) => (
          <li key={item.slug}>
            {/* Umbrechen darf die Zeile nur nach dem Strich: er hängt am
                Namen davor (geschütztes Leerzeichen), ein Name selbst bricht
                nie. */}
            {i > 0 && (
              <>
                {'\u00a0'}
                <span className={styles.slash} aria-hidden="true">
                  /
                </span>{' '}
              </>
            )}
            <Link href={`${base}/${item.slug}`}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export interface DirectoryEntry {
  slug: string;
  href: string;
  name: string;
  /** Ein Satz, warum man hinein sollte — vier Namen allein sagen das nicht. */
  blurb?: string;
  /** Bis zu vier Spots als Bildleiste. */
  spots: Spot[];
  /** Kurz und ohne Zahl: „Alle", bei einem einzigen Spot „Zum Spot". */
  cta: string;
  ctaLabel: string;
  /** Das Booster-Pack der Kategorie als Marke neben dem Namen. */
  art?: string | null;
}

/**
 * Die Übersichten /bezirk und /kategorie als Register: je Eintrag der Name
 * gross in Rot, ein Satz dazu und vier Spots als Bildleiste — statt der
 * Foto-Regale, die bis 03.10.2026 dort standen. Ohne Spot-Zahl: eine Reihe
 * von „9" bis „224" las sich als Rangliste (Ansage 27.08.2026).
 */
export function IssueDirectory({ entries, label }: { entries: DirectoryEntry[]; label: string }) {
  return (
    <div className={styles.directory} role="region" aria-label={label}>
      {entries.map((e) => (
        <section key={e.slug} aria-labelledby={`dir-${e.slug}`}>
          <div className={styles.dirHead}>
            {e.art && (
              <Image
                className={styles.dirArt}
                src={e.art}
                alt=""
                width={96}
                height={145}
                aria-hidden="true"
              />
            )}
            <h2 id={`dir-${e.slug}`} className={styles.dirName}>
              <Link href={e.href}>{e.name}</Link>
            </h2>
            <Link href={e.href} className={styles.dirCta} aria-label={e.ctaLabel}>
              {e.cta}
            </Link>
          </div>
          {e.blurb && <p className={styles.dirBlurb}>{e.blurb}</p>}
          {e.spots.length > 0 && (
            <ol className={styles.dirStrip}>
              {e.spots.map((r) => (
                <li key={r._id}>
                  <Link href={`/restaurant/${r.slug}`}>
                    <span className={styles.contentsPhoto}>
                      <Photo r={r} sizes="(max-width: 899px) 24vw, 140px" widths={[240, 320]} />
                    </span>
                    <span className={styles.contentsName}>{normalizeName(r.name)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}
