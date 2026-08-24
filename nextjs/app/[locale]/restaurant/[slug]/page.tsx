import { Fragment } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import {
  getRestaurantBySlug,
  getAllRestaurantSlugs,
  getAllRestaurantsLite,
  getMustEatsByRestaurant,
  getRestaurantSiblingCandidates,
} from '@/lib/sanity.server';
import { resolveLegacyRestaurantSlug } from '@/lib/seo/legacyRedirects';
import { buildRestaurantJsonLd } from '@/lib/json-ld';
import {
  buildCuratedRestaurantTitle,
  buildRestaurantTitle,
  buildOrderPromiseDescription,
  truncateAtSentence,
} from '@/lib/seo/restaurantMeta';
import { SITE_URL } from '@/lib/constants';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { normalizeName } from '@/lib/normalizeName';
import { shouldSkipDropCap } from '@/lib/dropCap';
import { INDEXABLE_ROBOTS, buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';
import { routing } from '@/i18n/routing';
import { pickLocale, hasEnContent } from '@/lib/i18n/pickLocale';
import { formatPriceLabel, classifyWebsite } from '@/app/components/map/restaurantDetail.helpers';
import { splitDescriptionForMagazine, summarizeHours } from '@/lib/restaurant-prose';
import { localizeOpeningDays, localizeOpeningHours } from '@/lib/map/openingHours';
import HeartButton from '@/app/components/HeartButton';
import MustEatTeaserSection from '@/app/components/MustEatTeaserSection';
import MapPromoCTA from '@/app/components/MapPromoCTA';
import ShareButton from '@/app/components/ShareButton';
import Breadcrumbs, { type BreadcrumbItem } from '@/app/components/Breadcrumbs';
import { Link as IntlLink } from '@/i18n/navigation';
import {
  RouteIcon,
  ReserveIcon,
  PhoneIcon,
  WebsiteIcon,
  MenuCardIcon,
  ShareIcon,
} from '@/app/components/actionIcons';
import type { RestaurantCard } from '@/lib/types';
import styles from './RestaurantDetail.module.css';

/**
 * Eine Empfehlungszeile am Seitenfuß: anklickbare Überschrift plus vier Karten.
 *
 * Die Überschrift war schon immer ein Link auf den Bezirks-Hub, sah aber wie
 * eine gewöhnliche Zeilenüberschrift aus. Der Pfeil macht daraus sichtbar den
 * Weg zur vollständigen Liste — dieselbe Geste wie „Alle Spots ansehen →" auf
 * dem Bezirks-Index.
 *
 * Ein `showDistrict` stand hier, solange daneben eine Kategorie-Zeile lief:
 * deren Spots lagen über die ganze Stadt verteilt, und der Bezirk entschied,
 * ob die Empfehlung etwas taugt. In der Bezirks-Zeile stünde unter jeder Karte
 * derselbe Bezirk, den die Überschrift schon nennt.
 */
function SiblingRow({
  heading,
  href,
  restaurants,
  locale,
}: {
  heading: string;
  href: string;
  restaurants: RestaurantCard[];
  locale: 'de' | 'en';
}) {
  return (
    <div className={styles.sibRow}>
      <h2 className={styles.sibRowHead}>
        <IntlLink href={href} className={styles.sibRowHeadLink}>
          {heading}
          <span className={styles.sibRowHeadArrow} aria-hidden="true">
            →
          </span>
        </IntlLink>
      </h2>
      <div className={styles.sibCards}>
        {restaurants.map((s) => {
          const meta = [
            s.cuisineType ? localizedCuisine(s.cuisineType, locale) : null,
            formatPriceLabel(s),
          ].filter(Boolean);
          return (
            <IntlLink key={s._id} href={`/restaurant/${s.slug}`} className={styles.sibCard}>
              {s.photo && (
                <div className={styles.sibPhoto}>
                  <Image src={s.photo} alt={s.name} fill sizes="(max-width: 700px) 46vw, 232px" />
                </div>
              )}
              <span className={styles.sibOverlay}>
                <span className={styles.sibName}>{normalizeName(s.name)}</span>
                {meta.length > 0 && (
                  <span className={styles.sibMeta}>
                    {meta.map((part, i) => (
                      <Fragment key={part}>
                        {i > 0 && <span aria-hidden="true"> · </span>}
                        <span className={styles.sibMetaPart}>{part}</span>
                      </Fragment>
                    ))}
                  </span>
                )}
              </span>
            </IntlLink>
          );
        })}
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

function safeCreditUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function imageAssetKey(url: string | undefined): string {
  return url?.split('?')[0] ?? '';
}

export async function generateStaticParams() {
  const slugs = await getAllRestaurantSlugs();
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r) return {};
  const loc = locale === 'de' ? 'de' : 'en';

  const districtName = r.bezirk?.name ?? r.district ?? null;

  // Antwort-Versprechen aus den whatToOrder-Empfehlungen: schlägt die
  // beschreibenden Fallbacks, kuratierte seo.metaDescription gewinnt weiter.
  const orderDishes = (r.whatToOrder ?? []).map((i) => i.dish);
  const orderPriceLabel = formatPriceLabel(r);
  const orderPromiseDe = buildOrderPromiseDescription({
    name: r.name,
    dishes: orderDishes,
    priceLabel: orderPriceLabel,
    locale: 'de',
  });
  const orderPromiseEn = buildOrderPromiseDescription({
    name: r.name,
    dishes: orderDishes,
    priceLabel: orderPriceLabel,
    locale: 'en',
  });

  const description = truncateAtSentence(
    pickLocale(
      r.seo?.metaDescription ||
        orderPromiseDe ||
        r.shortDescription ||
        r.tip ||
        r.description ||
        `${r.name} in Berlin${districtName ? `, ${districtName}` : ''}.`,
      r.seo?.metaDescriptionEn ||
        orderPromiseEn ||
        r.shortDescriptionEn ||
        r.tipEn ||
        r.descriptionEn ||
        undefined,
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
    robots: r.seo?.noIndex ? 'noindex,nofollow' : INDEXABLE_ROBOTS,
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

export default async function RestaurantPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const r = await getRestaurantBySlug(slug);
  if (!r) {
    // Post-rebuild slug migration: try to 301 an old/404 slug to its current
    // page before giving up. See lib/seo/legacyRedirects.ts.
    const dest = resolveLegacyRestaurantSlug(slug, await getAllRestaurantsLite());
    if (dest && dest !== slug) {
      permanentRedirect(locale === 'de' ? `/restaurant/${dest}` : `/${locale}/restaurant/${dest}`);
    }
    notFound();
  }
  // Vier, nicht drei: das Raster ist auf Mobil zweispaltig und auf Desktop
  // vierspaltig — eine Dreiergruppe lässt in beiden Fällen eine Karte allein
  // in der letzten Zeile stehen. Gleiche Regel wie im Bezirks-Regal.
  const SIBLING_LIMIT = 4;
  const [mustEats, siblingCandidates] = await Promise.all([
    getMustEatsByRestaurant(r._id),
    getRestaurantSiblingCandidates({
      selfSlug: slug,
      selfName: r.name,
      bezirkSlug: r.bezirk?.slug,
      bezirkLimit: SIBLING_LIMIT,
    }),
  ]);

  const siblingsBezirk = siblingCandidates.bezirk;

  const loc = locale === 'de' ? 'de' : 'en';
  const de = loc === 'de';

  const description = pickLocale(r.description, r.descriptionEn, loc) || '';
  const shortDescription = pickLocale(r.shortDescription, r.shortDescriptionEn, loc);
  const tipText = pickLocale(r.tip, r.tipEn, loc);
  const displayName = normalizeName(r.name);
  const magazine = splitDescriptionForMagazine(description);
  const lede = magazine?.lede || description;
  const orderItems = (r.whatToOrder ?? []).filter((i) => i?.dish?.trim());
  const heroAssetKey = imageAssetKey(r.photo);
  // The hero photo is NOT a gallery item. It used to be prepended here, which
  // showed the same picture twice on every spot that has no extra gallery
  // images (Bari et al.) — header photo, then the identical "gallery".
  const galleryImages = (r.gallery ?? [])
    .filter((img) => img?.thumb && img?.full)
    .filter((img) => imageAssetKey(img.full) !== heroAssetKey);
  const heroCreditHref = safeCreditUrl(r.photoCreditUrl);

  const priceLabel = formatPriceLabel(r);
  const websiteInfo = classifyWebsite(r.website);
  const websiteUrl = websiteInfo?.url ?? null;
  const address = r.address;
  const mapHref = `/map?r=${slug}`;
  // Same derivation as the map sheet: a name+address search always resolves to
  // a result, whereas the curated mapsUrl can be stale. This page had neither —
  // its only Google-Maps links were photo credits.
  const mapsHref = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name}, ${address}`)}`
    : (r.mapsUrl ?? null);
  const telHref = r.phone ? `tel:${r.phone.replace(/\s+/g, '')}` : null;
  // Einzeiler statt der vier Zeilen aus dem Fakten-Block: der Streifen unter
  // dem Hero soll die Frage beantworten, nicht die Tabelle vorwegnehmen.
  const hoursSummary = summarizeHours(r.openingHours, loc);

  // Rendered inside the hero photo (or next to the name when there is none).
  const heroTags = [
    r.bezirk?.name ? (
      <span key="district" className={styles.chip}>
        {r.bezirk.name}
      </span>
    ) : null,
    r.cuisineType ? (
      <span key="cuisine" className={styles.chipAlt}>
        {localizedCuisine(r.cuisineType, loc)}
      </span>
    ) : null,
  ].filter(Boolean);

  const homeLabel = de ? 'Start' : 'Home';
  const districtsLabel = de ? 'Bezirke' : 'Districts';
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: homeLabel, href: '/', logo: 'eat-this' },
    ...(r.bezirk?.slug && r.bezirk?.name
      ? [
          { name: districtsLabel, href: '/bezirk' },
          { name: r.bezirk.name, href: `/bezirk/${r.bezirk.slug}` },
        ]
      : []),
    { name: r.name },
  ];

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
        <div className={styles.breadcrumbWrap}>
          <Breadcrumbs
            items={breadcrumbItems}
            ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'}
          />
        </div>

        <header className={r.photo ? styles.hero : styles.heroNoPhoto}>
          {r.photo ? (
            <figure className={styles.heroPhoto}>
              <Image
                src={r.photo}
                alt={r.name}
                fill
                priority
                sizes="(max-width: 760px) 100vw, 1180px"
                className={styles.heroImg}
              />
              <div className={styles.heroGradient} />
              {/* Heart toggle with the public count next to it (≥ 1 only) */}
              <HeartButton
                restaurantId={r._id}
                name={r.name}
                slug={slug}
                photo={r.photo ?? undefined}
                district={r.bezirk?.name ?? undefined}
                locale={loc}
              />
              {/* District and cuisine ride on the photo instead of sitting in a
                  stray white strip underneath it. The credit is part of this
                  flow, not absolutely positioned: a two-line name fills the
                  width and used to run straight under it. */}
              <figcaption className={styles.heroCaption}>
                {heroTags.length > 0 && <div className={styles.heroTags}>{heroTags}</div>}
                <h1 className={styles.heroName}>{displayName}</h1>
                {r.photoCredit && (
                  <span className={styles.heroCredit}>
                    {heroCreditHref ? (
                      <a href={heroCreditHref} target="_blank" rel="noopener noreferrer">
                        {r.photoCredit}
                      </a>
                    ) : (
                      r.photoCredit
                    )}
                  </span>
                )}
              </figcaption>
            </figure>
          ) : (
            <div className={styles.heroOverlay}>
              <h1 className={styles.name}>{displayName}</h1>
              {heroTags.length > 0 && <div className={styles.heroTags}>{heroTags}</div>}
            </div>
          )}

          <div className={styles.heroMapLine}>
            <MapPromoCTA
              kind="restaurant"
              name={displayName}
              mapHref={mapHref}
              locale={loc}
              variant="band"
            />
          </div>
        </header>

        {/* Wo und wann — direkt unter dem Titelbild. Der ausführliche
            Fakten-Block weiter unten bleibt, wo er ist; er stand aber auf dem
            Telefon erst bei 2035px, also nach 2,4 Bildschirmhöhen, und das ist
            die Frage, mit der die meisten auf eine Restaurantseite kommen.
            Bewusst eine stille Zeile und keine zweite Tabelle: die Seite
            eröffnet weiter mit Bild und Text, nicht mit Daten. */}
        {(address || hoursSummary) && (
          <div className={styles.quickFacts}>
            {address &&
              (mapsHref ? (
                <a
                  className={styles.quickAddress}
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {address}
                </a>
              ) : (
                <span className={styles.quickAddress}>{address}</span>
              ))}
            {hoursSummary && <span className={styles.quickHours}>{hoursSummary}</span>}
          </div>
        )}

        {description && (
          <article className={styles.story}>
            <p className={`${styles.lede} ${shouldSkipDropCap(lede) ? styles.ledePlain : ''}`}>
              {lede}
            </p>
            {magazine?.paragraphsBefore.map((p, i) => (
              <p key={`bf-${i}`}>{p}</p>
            ))}
            {magazine?.midQuote && (
              <blockquote className={styles.pullQuote}>{magazine.midQuote}</blockquote>
            )}
            {magazine?.paragraphsAfter.map((p, i) => (
              <p key={`af-${i}`}>{p}</p>
            ))}
          </article>
        )}

        {galleryImages.length > 0 && (
          <section className={styles.gallery} aria-label={de ? 'Galerie' : 'Gallery'}>
            {galleryImages.map((img, i) => {
              const creditHref = safeCreditUrl(img.creditUrl);
              return (
                <figure key={img._key} className={styles.galleryItem}>
                  <Image
                    src={img.thumb ?? img.full ?? ''}
                    alt={img.alt || `${displayName} ${de ? 'Foto' : 'photo'} ${i + 1}`}
                    fill
                    sizes={
                      i === 0 ? '(max-width: 700px) 82vw, 560px' : '(max-width: 700px) 68vw, 280px'
                    }
                    className={styles.galleryImg}
                  />
                  {img.credit && (
                    <figcaption className={styles.galleryCredit}>
                      {creditHref ? (
                        <a href={creditHref} target="_blank" rel="noopener noreferrer">
                          {img.credit}
                        </a>
                      ) : (
                        img.credit
                      )}
                    </figcaption>
                  )}
                </figure>
              );
            })}
          </section>
        )}

        {(tipText || orderItems.length > 0) && (
          <div className={styles.editorialGrid}>
            {tipText && (
              <aside className={styles.tipp}>
                <div className={styles.tippLabel}>{de ? 'Insider Tipp' : 'Insider Tip'}</div>
                <p className={styles.tippText}>{tipText}</p>
              </aside>
            )}

            {orderItems.length > 0 && (
              <section
                className={styles.order}
                aria-label={de ? 'Was bestellen?' : 'What to order?'}
              >
                <h2 className={styles.orderHead}>{de ? 'Was bestellen?' : 'What to order?'}</h2>
                <ul className={styles.orderList}>
                  {orderItems.map((item) => {
                    const note = pickLocale(item.note, item.noteEn, loc);
                    return (
                      <li key={item.dish} className={styles.orderItem}>
                        <div className={styles.orderTop}>
                          <span className={styles.orderDish}>{item.dish}</span>
                          {item.price && <span className={styles.orderPrice}>{item.price}</span>}
                        </div>
                        {note && <p className={styles.orderNote}>{note}</p>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        )}

        <dl className={styles.facts}>
          {address && (
            <div className={styles.factsRow}>
              <dt className={styles.factsKey}>{de ? 'Adresse' : 'Address'}</dt>
              <dd className={styles.factsVal}>
                {(() => {
                  const idx = address.indexOf(',');
                  const lines =
                    idx === -1 ? (
                      address
                    ) : (
                      <>
                        {address.slice(0, idx).trim()}
                        <br />
                        {address.slice(idx + 1).trim()}
                      </>
                    );
                  if (!mapsHref) return lines;
                  return (
                    <a
                      className={styles.factsLink}
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {lines}
                    </a>
                  );
                })()}
              </dd>
            </div>
          )}
          {r.openingHours && r.openingHours.length > 0 && (
            <div className={styles.factsRow}>
              <dt className={styles.factsKey}>{de ? 'Öffnungs­zeiten' : 'Hours'}</dt>
              <dd className={`${styles.factsVal} ${styles.hours}`}>
                {r.openingHours.map((slot, i) => [
                  <span key={`d-${i}`} className={styles.hoursDay}>
                    {localizeOpeningDays(slot.days, loc)}
                  </span>,
                  <span key={`t-${i}`} className={styles.hoursTime}>
                    {localizeOpeningHours(slot.hours, loc)}
                  </span>,
                ])}
              </dd>
            </div>
          )}
          {priceLabel && (
            <div className={styles.factsRow}>
              <dt className={styles.factsKey}>{de ? 'Preis' : 'Price'}</dt>
              <dd className={styles.factsVal}>{priceLabel}</dd>
            </div>
          )}
        </dl>

        {/* One wrapping row where every item grows, so the last line fills the
            width instead of trailing off half-empty. Six identical black slabs
            read as a wall, so the row runs in three weights — go there (red),
            book a table (solid), everything else outlined — and each action
            carries its own glyph.
            "Open on the map" is deliberately not here — the map gets its own
            block below rather than a small button in the pile.
            Share sits third, not last: a lone button on a wrapped second row
            stretches to the full width, and that slot should not go to the
            least important action. */}
        <div className={styles.acts}>
          {mapsHref && (
            <a
              className={`${styles.act} ${styles.actPrimary}`}
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              <RouteIcon />
              <span>{de ? 'Route' : 'Directions'}</span>
            </a>
          )}
          {r.reservationUrl && (
            <a
              className={`${styles.act} ${styles.actStrong}`}
              href={r.reservationUrl}
              target="_blank"
              rel="noopener nofollow noreferrer"
            >
              <ReserveIcon />
              <span>{de ? 'Reservieren' : 'Reserve'}</span>
            </a>
          )}
          <ShareButton
            title={r.name}
            slug={slug}
            contentType="restaurant"
            className={styles.act}
            label={de ? 'Teilen' : 'Share'}
            copiedLabel={de ? 'Kopiert' : 'Copied'}
            icon={<ShareIcon />}
          />
          {telHref && (
            <a className={styles.act} href={telHref}>
              <PhoneIcon />
              <span>{de ? 'Anrufen' : 'Call'}</span>
            </a>
          )}
          {websiteUrl && (
            <a
              className={styles.act}
              href={websiteUrl}
              target="_blank"
              rel="noopener nofollow noreferrer"
            >
              <WebsiteIcon />
              <span>Website</span>
            </a>
          )}
          {r.menuUrl && (
            <a
              className={styles.act}
              href={r.menuUrl}
              target="_blank"
              rel="noopener nofollow noreferrer"
            >
              <MenuCardIcon />
              <span>{de ? 'Speisekarte' : 'Menu'}</span>
            </a>
          )}
        </div>

        {mustEats.length > 0 && (
          <div className={styles.rail}>
            <MustEatTeaserSection mustEats={mustEats} locale={loc} />
          </div>
        )}

        {/* Nur noch die Bezirks-Zeile. Die Kategorie-Zeile darunter schickte von
            einer Kreuzberg-Seite nach Schöneberg, Prenzlauer Berg,
            Charlottenburg und Mitte — vier Karten, deren gemeinsamer Nenner
            „auch Lunch" war, für rund 500px am Seitenende. Wer schon liest, was
            es in Kreuzberg gibt, ist mit vier weiteren Spots aus Kreuzberg
            besser bedient. Die Kategorie-Hubs bleiben über die Startseite und
            ihren eigenen Index verlinkt. */}
        {siblingsBezirk.length > 0 && r.bezirk?.name && r.bezirk.slug && (
          <section
            className={styles.siblings}
            aria-label={de ? 'Weitere Empfehlungen' : 'More recommendations'}
          >
            <SiblingRow
              heading={de ? `Weitere in ${r.bezirk.name}` : `More in ${r.bezirk.name}`}
              href={`/bezirk/${r.bezirk.slug}`}
              restaurants={siblingsBezirk}
              locale={loc}
            />
          </section>
        )}
      </main>
    </>
  );
}
