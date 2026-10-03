import type { CSSProperties } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import Image from '@/app/components/SiteImage';
import { setRequestLocale } from 'next-intl/server';
import {
  getRestaurantPageData,
  getAllRestaurantSlugs,
  getAllRestaurantsLite,
} from '@/lib/sanity.server';
import { resolveLegacyRestaurantSlug } from '@/lib/seo/legacyRedirects';
import { DELISTED_RESTAURANT_REDIRECTS } from '@/lib/seo/delistedSpots';
import { buildRestaurantJsonLd } from '@/lib/json-ld';
import {
  buildCuratedRestaurantTitle,
  buildRestaurantTitle,
  truncateAtSentence,
} from '@/lib/seo/restaurantMeta';
import { SITE_URL } from '@/lib/constants';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { categoryArt } from '@/lib/categoryArt';
import { normalizeName } from '@/lib/normalizeName';
import { buildHreflangAlternates, restaurantRobots, toOgLocale } from '@/lib/seo/metadata';
import { metadataSource } from '@/lib/seo/metadataSource';
import { routing } from '@/i18n/routing';
import { pickLocale, hasEnContent } from '@/lib/i18n/pickLocale';
import { formatPriceLabel, classifyWebsite } from '@/app/components/map/restaurantDetail.helpers';
import { localizeOpeningDays, localizeOpeningHours } from '@/lib/map/openingHours';
import { buildSpotFlow } from '@/lib/spotFlow';
import { sanityImageSize, sanitySrcSet } from '@/lib/sanity-image-presets';
import HeartButton from '@/app/components/HeartButton';
import MustEatTeaserSection from '@/app/components/MustEatTeaserSection';
import RestaurantArticlesSection from '@/app/components/RestaurantArticlesSection';
import MapIntentLink from '@/app/components/MapIntentLink';
import { safeHttpUrl } from '@/lib/safeHttpUrl';
import { Link as IntlLink } from '@/i18n/navigation';
import styles from './RestaurantPage.module.css';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

function imageAssetKey(url: string | undefined): string {
  return url?.split('?')[0] ?? '';
}

/**
 * Obergrenze für den Titelgrad aus dem längsten Wort des Namens, in `cqi` der
 * Kopfspalte. Versalien in Providence laufen rund 0,62em breit; ein Wort mit n
 * Zeichen passt also bis 100cqi / (0,62·n) in eine Zeile.
 */
function titleFitStyle(name: string): CSSProperties {
  const longest = Math.max(...name.split(/\s+/).map((w) => w.length), 1);
  return { '--word-fit': `${(100 / (0.62 * longest)).toFixed(2)}cqi` } as CSSProperties;
}

/** Foto-Nachweis unter einem Bild — als Link, wenn die Quelle eine sichere URL hat. */
function Credit({
  text,
  href,
  className,
}: {
  text: string;
  href: string | null;
  className: string;
}) {
  return (
    <figcaption className={className}>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      ) : (
        text
      )}
    </figcaption>
  );
}

export async function generateStaticParams() {
  const slugs = await getAllRestaurantSlugs();
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

// 24 Stunden. Die Frist ist nicht der Weg, auf dem Inhalte live gehen — das ist
// der Sanity-Webhook auf /api/revalidate. Hintergrund und Bedingung an dieser
// Zahl: SANITY_REVALIDATE_SECONDS in lib/constants.ts. Next verlangt hier einen
// statisch lesbaren Wert, deshalb die Zahl statt der Konstante.
export const revalidate = 86400;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  // Dieselbe Query wie im Seitenrumpf, damit Next die beiden Aufrufe zu EINER
  // Anfrage dedupliziert. Weicht eine der beiden Stellen ab, kostet die Seite
  // sofort zwei Anfragen statt einer.
  const page = await metadataSource(() => getRestaurantPageData(slug));
  if (!page) return {};
  const r = page.restaurant;
  const loc = locale === 'de' ? 'de' : 'en';

  const districtName = r.bezirk?.name ?? r.district ?? null;

  const description = truncateAtSentence(
    pickLocale(
      r.seo?.metaDescription ||
        r.shortDescription ||
        r.tip ||
        r.description ||
        `${r.name} in Berlin${districtName ? `, ${districtName}` : ''}.`,
      r.seo?.metaDescriptionEn || r.shortDescriptionEn || r.tipEn || r.descriptionEn || undefined,
      loc
    ) ?? ''
  );
  // Sanity bleibt die redaktionelle Quelle. Die Ausgabeschicht ergänzt nur
  // fehlende Filialqualifizierer und hält den finalen Titel im SERP-Budget.
  const curatedTitle = pickLocale(
    r.seo?.metaTitle || undefined,
    r.seo?.metaTitleEn || undefined,
    loc
  );
  const builtTitle = buildRestaurantTitle({
    name: r.name,
    cuisineType: r.cuisineType,
    district: districtName,
    locale: loc,
  });
  const title = curatedTitle ? buildCuratedRestaurantTitle(curatedTitle, r.name) : builtTitle;

  // Branded share card — the dynamic OG route overlays name + cuisine + district
  // on the restaurant photo (and falls back to a brand card when there is none),
  // which previews far stronger on social than the bare photo did.
  const ogImage = `${SITE_URL}/api/og/restaurant?slug=${slug}&locale=${loc}`;

  const alternates = buildHreflangAlternates(`/restaurant/${slug}`, loc, {
    hasEnContent: hasEnContent(r),
  });

  return {
    title: { absolute: title },
    description,
    robots: restaurantRobots(r),
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      images: [{ url: ogImage, width: 1200, height: 630, alt: r.name }],
      type: 'website',
      locale: toOgLocale(loc),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

/** Ein Foto der Strecke: spaltenbreit und ungeschnitten in seinem eigenen
 *  Format; die Masse kommen aus dem Dateinamen, damit nichts springt. */
function SpotPhoto({
  src,
  alt,
  priority = false,
  children,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  children?: React.ReactNode;
}) {
  const size = sanityImageSize(src);
  return (
    <div className={styles.photo}>
      {/* Sanity liefert die Grössen selbst (srcSet); ein zweites Umrechnen
          über den Bild-Proxy brächte nichts. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        srcSet={sanitySrcSet(src, [640, 960, 1280, 1600], priority ? 80 : 85)}
        sizes="(max-width: 767px) 100vw, 768px"
        width={size?.width}
        height={size?.height}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
      />
      {children}
    </div>
  );
}

/** Eine quadratische Kachel aus einem Sanity-Foto, für das Raster am Ende. */
function squareSrc(url: string, width: number): string {
  return `${url.split('?')[0]}?w=${width}&h=${width}&fit=crop&auto=format&q=80`;
}

/**
 * Die Spot-Seite im Heftlook nach 032c (Wahl 03.10.2026, Entwurf A6): eine
 * Spalte von 768px, der Name riesig, darunter nur der Bezirk, dann der
 * Vorspann gross und fett. Die Fotos stehen spaltenbreit und ungeschnitten
 * zwischen dem Text — nie zwei direkt hintereinander (lib/spotFlow.ts).
 * Insider-Tipp und Must Eats sind eigene Abschnitte. Was man zum Hingehen
 * braucht — Adresse, Zeiten, Küche, Preis und die Knöpfe —, steht am Ende,
 * überschrieben mit dem Namen des Spots. Ganz unten der Bezirk als Raster über
 * die ganze Breite.
 *
 * Weggefallen gegenüber der Ink-Fassung vom 25.09.2026: der Öffnungsstatus im
 * Kopf, Küche und Preis über dem Namen, Remy (Abschnitt und Knopf) und die
 * Map-Tafel am Ende — alles auf Ansage 03.10.2026.
 */
export default async function RestaurantPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const page = await getRestaurantPageData(slug);
  if (!page) {
    // Post-rebuild slug migration: try to 301 an old/404 slug to its current
    // page before giving up. See lib/seo/legacyRedirects.ts.
    const dest = resolveLegacyRestaurantSlug(slug, await getAllRestaurantsLite());
    if (dest && dest !== slug) {
      permanentRedirect(locale === 'de' ? `/restaurant/${dest}` : `/${locale}/restaurant/${dest}`);
    }
    // Spots taken off the map keep their search traffic on the nearest hub.
    const hub = DELISTED_RESTAURANT_REDIRECTS[slug];
    if (hub) permanentRedirect(locale === 'de' ? hub : `/${locale}${hub}`);
    notFound();
  }
  const { restaurant: r, mustEats, articles, siblings } = page;

  const loc = locale === 'de' ? 'de' : 'en';
  const de = loc === 'de';

  const description = pickLocale(r.description, r.descriptionEn, loc) || '';
  const shortDescription = pickLocale(r.shortDescription, r.shortDescriptionEn, loc);
  const tipText = pickLocale(r.tip, r.tipEn, loc);
  const displayName = normalizeName(r.name);
  const heroAssetKey = imageAssetKey(r.photo);
  // The hero photo is NOT a gallery item. It used to be prepended here, which
  // showed the same picture twice on every spot that has no extra gallery
  // images (Bari et al.) — header photo, then the identical "gallery".
  const galleryImages = (r.gallery ?? [])
    .filter((img): img is typeof img & { thumb: string; full: string } =>
      Boolean(img?.thumb && img?.full)
    )
    .filter((img) => imageAssetKey(img.full) !== heroAssetKey);
  const heroCreditHref = safeHttpUrl(r.photoCreditUrl);

  const priceLabel = formatPriceLabel(r, loc);
  const websiteInfo = classifyWebsite(r.website);
  const websiteUrl = websiteInfo?.url ?? null;
  const address = r.address;
  const cuisineLabel = r.cuisineType ? localizedCuisine(r.cuisineType, loc) : null;
  const districtName = r.bezirk?.name ?? r.district ?? null;
  const bezirkSlug = r.bezirk?.slug;
  const hasHours = (r.openingHours?.length ?? 0) > 0;
  // Beschreibender Alt-Text statt des bloßen Namens — „SOFI" sagt einem
  // Screenreader (und der Bilder-SERP) nichts über das Bild.
  const heroAlt = cuisineLabel
    ? `${displayName} – ${cuisineLabel} in ${districtName ? `Berlin-${districtName}` : 'Berlin'}`
    : displayName;
  // Kategorien sind Discovery-Hubs (Frühstück, Süßes …): der Weg zu ihnen als
  // Eigenschaft des Spots, mit dem Pack als Bild.
  const categoryLinks = (r.categories ?? []).filter(
    (c): c is typeof c & { slug: string; name: string } => Boolean(c?.slug && c?.name)
  );
  // Zur Map führt auf UNSERE Map (Nutzer-Entscheidung 28.08.), nie zu Google.
  const mapHref = `/map?r=${slug}`;
  // Vorübergehend geschlossen: die Map lässt den Spot weg, `?r=` liefe dort
  // ins Leere — also kein Map-Knopf, dafür der Hinweis bei den Angaben.
  const onMap = r.isClosed !== true;
  const telHref = r.phone ? `tel:${r.phone.replace(/\s+/g, '')}` : null;

  const flow = buildSpotFlow({
    paragraphs: description.split(/\n\s*\n/),
    hasTip: Boolean(tipText),
    hasMustEats: mustEats.length > 0,
    imageCount: galleryImages.length,
  });
  const galleryAlt = (i: number) =>
    galleryImages[i].alt || `${displayName} ${de ? 'Foto' : 'photo'} ${i + 2}`;
  // Ein Nachweis steht nur, wenn er sich vom zuletzt gezeigten unterscheidet —
  // „Foto: AVIV 030" unter jedem der fünf Bilder war Rauschen.
  const shownCredits = new Set(r.photoCredit ? [r.photoCredit] : []);
  const galleryCredit = (i: number) => {
    const img = galleryImages[i];
    if (!img.credit || shownCredits.has(img.credit)) return null;
    shownCredits.add(img.credit);
    return <Credit text={img.credit} href={safeHttpUrl(img.creditUrl)} className={styles.credit} />;
  };

  const districtsLabel = de ? 'Bezirke' : 'Districts';
  const jsonLd = buildRestaurantJsonLd({
    restaurant: r,
    locale,
    slug,
    description: shortDescription || description || tipText,
    districtsLabel,
  });

  return (
    <>
      <script
        id={`schema-restaurant-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className={styles.page}>
        {/* Unter dem Namen nur der Bezirk — keine Küche, kein Preis, kein
            Status, keine Knöpfe (Ansage 03.10.2026). */}
        <header className={styles.head}>
          <h1 className={styles.title} style={titleFitStyle(displayName)}>
            {displayName}
          </h1>
          {districtName &&
            (bezirkSlug ? (
              <IntlLink href={`/bezirk/${bezirkSlug}`} className={styles.district}>
                {districtName}
              </IntlLink>
            ) : (
              <p className={styles.district}>{districtName}</p>
            ))}
        </header>

        <div className={styles.column}>
          {shortDescription && <p className={styles.lede}>{shortDescription}</p>}

          {r.photo && (
            <figure className={styles.figure}>
              <SpotPhoto src={r.photo} alt={heroAlt} priority>
                <HeartButton
                  restaurantId={r._id}
                  name={r.name}
                  slug={slug}
                  photo={r.photo ?? undefined}
                  district={r.bezirk?.name ?? undefined}
                  locale={loc}
                />
              </SpotPhoto>
              {r.photoCredit && (
                <Credit text={r.photoCredit} href={heroCreditHref} className={styles.credit} />
              )}
            </figure>
          )}

          {flow.blocks.map((block, i) => {
            switch (block.kind) {
              case 'text':
                return (
                  <p key={i} className={block.short ? styles.short : styles.text}>
                    {block.text}
                  </p>
                );
              case 'tip':
                return (
                  <section key={i} className={styles.section} aria-labelledby="spot-tip">
                    <h2 id="spot-tip" className={styles.sub}>
                      {de ? 'Insider-Tipp' : 'Insider tip'}
                    </h2>
                    <p className={styles.tip}>„{tipText}“</p>
                  </section>
                );
              case 'mustEats':
                return (
                  <MustEatTeaserSection
                    key={i}
                    mustEats={mustEats}
                    name={displayName}
                    locale={loc}
                    classNames={{
                      section: styles.section,
                      heading: styles.sub,
                      button: styles.btn,
                    }}
                  />
                );
              case 'image':
                return (
                  <figure key={i} className={styles.figure}>
                    <SpotPhoto
                      src={galleryImages[block.index].full}
                      alt={galleryAlt(block.index)}
                    />
                    {galleryCredit(block.index)}
                  </figure>
                );
            }
          })}

          {/* Mehr Fotos als Text: die übrigen als Reihe, nicht gestapelt. */}
          {flow.rest.length > 0 && (
            <ul className={styles.sheet} aria-label={de ? 'Weitere Fotos' : 'More photos'}>
              {flow.rest.map((index) => (
                <li key={galleryImages[index]._key}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={galleryImages[index].full}
                    srcSet={sanitySrcSet(galleryImages[index].full, [400, 640, 800])}
                    sizes="(max-width: 767px) 33vw, 250px"
                    alt={galleryAlt(index)}
                    loading="lazy"
                    decoding="async"
                  />
                </li>
              ))}
            </ul>
          )}

          {/* Was man zum Hingehen braucht, überschrieben mit dem Namen — kein
              „Adresse und Zeiten" (Ansage 03.10.2026). */}
          <section className={styles.section} aria-labelledby="spot-facts">
            <h2 id="spot-facts" className={styles.sub}>
              {displayName}
            </h2>
            {r.isClosed && (
              <p className={styles.closed}>
                {de ? 'Vorübergehend geschlossen' : 'Temporarily closed'}
              </p>
            )}
            <dl className={styles.facts}>
              <div className={styles.factGroup}>
                {address && (
                  <div>
                    <dt className={styles.label}>{de ? 'Adresse' : 'Address'}</dt>
                    <dd>
                      {address.split(',').map((part, i) => (
                        <span key={i} className={styles.line}>
                          {part.trim()}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {cuisineLabel && (
                  <div>
                    <dt className={styles.label}>{de ? 'Küche' : 'Cuisine'}</dt>
                    <dd>{cuisineLabel}</dd>
                  </div>
                )}
                {priceLabel && (
                  <div>
                    <dt className={styles.label}>{de ? 'Preis' : 'Price'}</dt>
                    <dd>{priceLabel}</dd>
                  </div>
                )}
              </div>
              {hasHours && (
                <div className={styles.factGroup}>
                  <div>
                    <dt className={styles.label}>{de ? 'Öffnungszeiten' : 'Hours'}</dt>
                    <dd className={styles.hours}>
                      {r.openingHours!.map((slot, i) => [
                        <span key={`d-${i}`} className={styles.hoursDay}>
                          {localizeOpeningDays(slot.days, loc)}
                        </span>,
                        <span key={`t-${i}`}>{localizeOpeningHours(slot.hours, loc)}</span>,
                      ])}
                    </dd>
                  </div>
                </div>
              )}
            </dl>
            <div className={styles.buttons}>
              {/* nofollow: `mapHref` trägt eine Query, jede Variante würde
                  sonst einzeln gecrawlt. */}
              {onMap && (
                <MapIntentLink href={mapHref} rel="nofollow" className={styles.btn}>
                  {de ? 'Zur Map' : 'On the map'}
                </MapIntentLink>
              )}
              {r.reservationUrl && (
                <a
                  className={`${styles.btn} ${styles.btnInk}`}
                  href={r.reservationUrl}
                  target="_blank"
                  rel="noopener nofollow noreferrer"
                >
                  {de ? 'Reservieren' : 'Reserve'}
                </a>
              )}
              {telHref && (
                <a className={`${styles.btn} ${styles.btnInk}`} href={telHref}>
                  {de ? 'Anrufen' : 'Call'}
                </a>
              )}
              {websiteUrl && (
                <a
                  className={`${styles.btn} ${styles.btnInk}`}
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener nofollow noreferrer"
                >
                  Website
                </a>
              )}
              {r.menuUrl && (
                <a
                  className={`${styles.btn} ${styles.btnInk}`}
                  href={r.menuUrl}
                  target="_blank"
                  rel="noopener nofollow noreferrer"
                >
                  {de ? 'Speisekarte' : 'Menu'}
                </a>
              )}
            </div>
          </section>

          <RestaurantArticlesSection
            articles={articles}
            locale={loc}
            classNames={{ section: styles.section, heading: styles.sub }}
          />

          {/* „Kategorien" statt „Mehr davon" (Wahl 03.10.2026): der Klick
              führt auf die Kategorieseite, das Pack ist ihr Bild. */}
          {categoryLinks.length > 0 && (
            <section className={styles.section} aria-labelledby="spot-categories">
              <h2 id="spot-categories" className={styles.sub}>
                {de ? 'Kategorien' : 'Categories'}
              </h2>
              <ul className={styles.packs}>
                {categoryLinks.map((c) => {
                  const art = categoryArt(c.slug);
                  return (
                    <li key={c.slug}>
                      <IntlLink href={`/kategorie/${c.slug}`} className={styles.pack}>
                        {art && (
                          <Image
                            src={art}
                            alt=""
                            width={96}
                            height={144}
                            className={styles.packArt}
                          />
                        )}
                        <span className={styles.packName}>
                          {de ? c.name : (c.nameEn ?? c.name)}
                        </span>
                      </IntlLink>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        {/* Der Bezirk als Raster über die ganze Breite, wie am Ende bei 032c. */}
        {siblings.length > 0 && bezirkSlug && r.bezirk?.name && (
          <section className={styles.more} aria-labelledby="spot-siblings">
            <h2 id="spot-siblings" className={`${styles.sub} ${styles.moreHead}`}>
              {de ? `Mehr in ${r.bezirk.name}` : `More in ${r.bezirk.name}`}
            </h2>
            <ul className={styles.grid}>
              {siblings.map((s) => {
                const meta = [
                  s.cuisineType && localizedCuisine(s.cuisineType, loc),
                  formatPriceLabel(s, loc),
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li key={s._id}>
                    <IntlLink href={`/restaurant/${s.slug}`} className={styles.tile}>
                      <span className={styles.tilePhoto}>
                        {s.photo && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={squareSrc(s.photo, 600)}
                            srcSet={`${squareSrc(s.photo, 400)} 400w, ${squareSrc(s.photo, 600)} 600w, ${squareSrc(s.photo, 800)} 800w`}
                            sizes="(max-width: 767px) 50vw, 25vw"
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </span>
                      <span className={styles.tileName}>{normalizeName(s.name)}</span>
                      {meta && <span className={styles.tileMeta}>{meta}</span>}
                    </IntlLink>
                  </li>
                );
              })}
            </ul>
            <div className={styles.moreAll}>
              <IntlLink href={`/bezirk/${bezirkSlug}`} className={`${styles.btn} ${styles.btnInk}`}>
                {de ? `Alle Spots in ${r.bezirk.name}` : `All spots in ${r.bezirk.name}`}
              </IntlLink>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
