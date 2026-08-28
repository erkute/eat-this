import { Fragment } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import {
  getRestaurantPageData,
  getAllRestaurantSlugs,
  getAllRestaurantsLite,
} from '@/lib/sanity.server';
import { resolveLegacyRestaurantSlug } from '@/lib/seo/legacyRedirects';
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
import { shouldSkipDropCap } from '@/lib/dropCap';
import { INDEXABLE_ROBOTS, buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';
import { routing } from '@/i18n/routing';
import { pickLocale, hasEnContent } from '@/lib/i18n/pickLocale';
import { formatPriceLabel, classifyWebsite } from '@/app/components/map/restaurantDetail.helpers';
import { splitDescriptionForMagazine } from '@/lib/restaurant-prose';
import { localizeOpeningDays, localizeOpeningHours } from '@/lib/map/openingHours';
import HeartButton from '@/app/components/HeartButton';
import OpenStateChip from '@/app/components/OpenStateChip';
import MustEatTeaserSection from '@/app/components/MustEatTeaserSection';
import RestaurantArticlesSection from '@/app/components/RestaurantArticlesSection';
import MapPromoCTA from '@/app/components/MapPromoCTA';
import RestaurantRemySection from '@/app/components/RestaurantRemySection';
import RemyDock from '@/app/components/buddy/RemyDock';
import ShareButton from '@/app/components/ShareButton';
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
 * Die Überschrift ist ein Link auf den Bezirks-Hub — der Weg zur vollständigen
 * Liste, dieselbe Geste wie „Alle Spots ansehen" auf dem Bezirks-Index.
 * (Die Pfeile, die diese Geste mal markierten, sind site-weit raus.)
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
        </IntlLink>
      </h2>
      <div className={styles.sibCards}>
        {restaurants.map((s) => {
          const meta = [
            s.cuisineType ? localizedCuisine(s.cuisineType, locale) : null,
            formatPriceLabel(s, locale),
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
  const page = await getRestaurantPageData(slug);
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
  const page = await getRestaurantPageData(slug);
  if (!page) {
    // Post-rebuild slug migration: try to 301 an old/404 slug to its current
    // page before giving up. See lib/seo/legacyRedirects.ts.
    const dest = resolveLegacyRestaurantSlug(slug, await getAllRestaurantsLite());
    if (dest && dest !== slug) {
      permanentRedirect(locale === 'de' ? `/restaurant/${dest}` : `/${locale}/restaurant/${dest}`);
    }
    notFound();
  }
  const { restaurant: r, mustEats, articles, siblings: siblingsBezirk } = page;

  const loc = locale === 'de' ? 'de' : 'en';
  const de = loc === 'de';

  const description = pickLocale(r.description, r.descriptionEn, loc) || '';
  const shortDescription = pickLocale(r.shortDescription, r.shortDescriptionEn, loc);
  const tipText = pickLocale(r.tip, r.tipEn, loc);
  const displayName = normalizeName(r.name);
  const magazine = splitDescriptionForMagazine(description);
  const lede = magazine?.lede || description;
  const heroAssetKey = imageAssetKey(r.photo);
  // The hero photo is NOT a gallery item. It used to be prepended here, which
  // showed the same picture twice on every spot that has no extra gallery
  // images (Bari et al.) — header photo, then the identical "gallery".
  const galleryImages = (r.gallery ?? [])
    .filter((img) => img?.thumb && img?.full)
    .filter((img) => imageAssetKey(img.full) !== heroAssetKey);
  const heroCreditHref = safeCreditUrl(r.photoCreditUrl);

  const priceLabel = formatPriceLabel(r, loc);
  const websiteInfo = classifyWebsite(r.website);
  const websiteUrl = websiteInfo?.url ?? null;
  const address = r.address;
  const cuisineLabel = r.cuisineType ? localizedCuisine(r.cuisineType, loc) : null;
  const districtName = r.bezirk?.name ?? r.district ?? null;
  // Beschreibender Alt-Text statt des bloßen Namens — „SOFI" sagt einem
  // Screenreader (und der Bilder-SERP) nichts über das Bild. Mehr weiß die
  // Ausgabeschicht ohne kuratierten Alt nicht; das Muster entspricht dem
  // Title-Builder.
  const heroAlt = cuisineLabel
    ? `${displayName} – ${cuisineLabel} in ${districtName ? `Berlin-${districtName}` : 'Berlin'}`
    : displayName;
  // Kategorien sind Discovery-Hubs (Frühstück, Süßes …). Seit die
  // Kategorie-Karten-Zeile am Seitenende weg ist (874c330, dort als Kosten
  // offen protokolliert), war das der einzige Seitentyp ohne Weg zu seinen
  // Hubs — die „Mehr davon"-Zeile auf der Tafel stellt den Link wieder her,
  // als Eigenschaft des Spots statt als Karten-Stapel.
  const categoryLinks = (r.categories ?? []).filter(
    (c): c is typeof c & { slug: string; name: string } => Boolean(c?.slug && c?.name)
  );
  // Adresse, Route-Knopf und Pille zeigen alle hierhin. Google Maps ist von
  // dieser Seite bewusst verschwunden (Nutzer-Entscheidung 28.08.); wer es
  // zurückholt, nimmt wie das Map-Sheet eine name+address-Suche statt der
  // gepflegten `mapsUrl` — die kann veraltet sein, die Suche trifft immer.
  const mapHref = `/map?r=${slug}`;
  const telHref = r.phone ? `tel:${r.phone.replace(/\s+/g, '')}` : null;

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
    // Live-Zustand als dritter Chip — grün/rot wie auf dem Map-Sheet. Kommt
    // clientseitig nach dem Mount (die Seite ist statisch, ein gebautes
    // „Geöffnet" wäre tagelang falsch) und beantwortet die größte gemessene
    // Brand-Intention („uhrzeit") direkt im Bild.
    (r.openingHours?.length ?? 0) > 0 ? (
      <OpenStateChip key="state" openingHours={r.openingHours ?? []} locale={loc} />
    ) : null,
  ].filter(Boolean);

  // Trägt nur noch das JSON-LD: die sichtbare Brotkrume ist weg, die
  // BreadcrumbList im Graph bleibt.
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
        <header className={r.photo ? styles.hero : styles.heroNoPhoto}>
          {r.photo ? (
            <figure className={styles.heroPhoto}>
              <Image
                src={r.photo}
                alt={heroAlt}
                fill
                priority
                // 900px, nicht 1180: .heroPhoto ist auf min(100%, 900px)
                // gedeckelt — die 1180 stammten vom Seitenrahmen und luden
                // auf Desktop eine Stufe zu groß.
                sizes="(max-width: 760px) 100vw, 900px"
                /* 80 statt der Voreinstellung 75. Gemessen an einem
                   1600px-Foto: q=80 kostet 26% mehr Bytes und bringt 1,1 dB,
                   q=85 kostet 55% fuer 2,0 dB. Der Hero ist das LCP-Element
                   dieser Seite, deshalb der guenstigere Punkt der Kurve —
                   die Galerie unten darf teurer sein. */
                quality={80}
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

          {/* Die Map-Pill steht frei unterm Bild — der Zustand wohnt jetzt
              als Chip im Aufmacher, Preis und Adresse nur noch auf der
              Tafel unten. Keine Linie, keine Zeile: erst das Bild samt
              Antwort, dann das Produkt. */}
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

        {/* Die Strecke unterm Aufmacher läuft als EIN Blatt: Text, Bildstrecke,
            die rote Randnotiz der Redaktion, dann das Fakten-Register — alles
            auf derselben linken Achse, ohne Kästen. Laut sind nur zwei
            Typo-Momente: der Tipp in der Handschrift und die Registerwerte in
            Kreidetafel-Größe. */}
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
                    /* `thumb` ist der 400x300-Streifen des Map-Sheets. Hier
                       steht dasselbe Bild bis zu 900px breit — auf einem
                       Retina-Schirm 1800 Geraetepixel aus einer 400px-Quelle,
                       und genau so sah es auch aus. `full` (1200px) kommt in
                       derselben Projektion mit und kostet keine Abfrage. */
                    src={img.full ?? img.thumb ?? ''}
                    alt={img.alt || `${displayName} ${de ? 'Foto' : 'photo'} ${i + 1}`}
                    fill
                    /* Drei Layouts, drei Groessen: unter 700px ein Scroller
                       (78% der Breite, allein 92vw), darunter zwei Spalten mit
                       breitem Aufmacher, ab 900px das 1,35fr/1fr-Raster in der
                       900px-Spalte. Das alte `560px` galt fuer keines davon —
                       ein einzelnes Bild rendert 900px breit. */
                    sizes={
                      galleryImages.length === 1
                        ? '(max-width: 900px) 92vw, 900px'
                        : i === 0
                          ? '(max-width: 700px) 78vw, (max-width: 900px) 92vw, 520px'
                          : '(max-width: 700px) 78vw, (max-width: 900px) 46vw, 380px'
                    }
                    /* Laedt lazy und steht unter dem Falz — hier zaehlt das
                       Bild mehr als die Ladezeit, also der obere Punkt der
                       Kurve (siehe Hero). */
                    quality={85}
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

        {/* Der Insider-Tipp als Randnotiz statt roter Kasten: kleines
            Mono-Label, darunter der Satz in der Handschrift der Marke, rot,
            groß — als hätte die Redaktion ihn quer über das Blatt geschrieben. */}
        {tipText && (
          <aside className={styles.tipp}>
            <div className={styles.tippLabel}>{de ? 'Insider Tipp' : 'Insider Tip'}</div>
            <p className={styles.tippText}>{tipText}</p>
          </aside>
        )}

        {/* Die Tafel: alles Praktische auf einer Ink-Fläche — dieselbe
            dunkle Flächensprache wie Magazin-Karten, Nav und Footer, und
            zugleich SOFIs Kreidetafel als Interface. Gelbe Labels, weiße
            Werte in der Handschrift, die Aktionen direkt darauf. Die H2
            darüber bleibt der Local-Anker der Seiten-Outline. */}
        <div className={styles.board}>
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
                    // Die Adresse führt auf UNSERE Map, nicht zu Google
                    // (Nutzer-Entscheidung 28.08.): der Spot öffnet dort
                    // direkt, statt den Besucher aus dem Produkt zu schicken.
                    return (
                      <IntlLink className={styles.factsLink} href={mapHref}>
                        {lines}
                      </IntlLink>
                    );
                  })()}
                </dd>
              </div>
            )}
            {r.openingHours && r.openingHours.length > 0 && (
              <div className={styles.factsRow}>
                <dt className={styles.factsKey}>{de ? 'Öffnungszeiten' : 'Hours'}</dt>
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
            {categoryLinks.length > 0 && (
              <div className={styles.factsRow}>
                {/* Weder „Gut für" (Ratgeber-Floskel) noch „Läuft unter"
                  (Archiv-Ton) — beide vom Nutzer verworfen. „Mehr davon" sagt,
                  was der Klick bringt: weitere Spots dieser Art. */}
                <dt className={styles.factsKey}>{de ? 'Mehr davon' : 'More like this'}</dt>
                <dd className={styles.factsVal}>
                  {/* Die Booster-Packs der Kategorien statt einer Textliste —
                      dieselbe Art wie auf /packs und in Remys Teaser. Der Name
                      steht unter dem Bild, damit eine Kategorie ohne Art
                      (unbekannter Slug) dieselbe Zeile ergibt, nur ohne
                      Karte. */}
                  <span className={styles.packRow}>
                    {categoryLinks.map((c) => {
                      const art = categoryArt(c.slug);
                      return (
                        <IntlLink
                          key={c.slug}
                          href={`/kategorie/${c.slug}`}
                          className={styles.packLink}
                        >
                          {art && (
                            <Image
                              src={art}
                              alt=""
                              width={96}
                              height={134}
                              className={styles.packArt}
                            />
                          )}
                          <span className={styles.packName}>
                            {loc === 'de' ? c.name : (c.nameEn ?? c.name)}
                          </span>
                        </IntlLink>
                      );
                    })}
                  </span>
                </dd>
              </div>
            )}
          </dl>

          {/* Drei Gewichte wie gehabt: hingehen (rot), Tisch buchen (schwarz),
            Rest umrandet. Teilen sitzt an dritter Stelle, nicht zuletzt: der
            letzte Slot einer umgebrochenen Zeile streckt sich auf volle
            Breite. */}
          <div className={styles.acts}>
            {/* Führt auf die Eat-This-Map statt zu Google Maps: die Route
                nach draußen war der einzige Knopf, der aus dem Produkt
                hinausführte, und den Weg gibt die Map selbst her. */}
            <IntlLink className={`${styles.act} ${styles.actPrimary}`} href={mapHref}>
              <RouteIcon />
              <span>{de ? 'Zur Map' : 'On the map'}</span>
            </IntlLink>
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
        </div>

        {/* Must Eats vor Remy: beide beantworten „und jetzt?", aber die Karten
            sind der konkretere, produkteigene nächste Klick — n kuratierte
            Antworten mit Deeplink auf genau diese Karte. Remy folgt als
            offener Kanal für alles, was Seite und Karten nicht beantworten. */}
        {mustEats.length > 0 && (
          <div className={styles.rail}>
            <MustEatTeaserSection mustEats={mustEats} locale={loc} />
          </div>
        )}

        {/* Remy: wer bis hier gelesen hat, kennt den Laden — die offene Frage
            ist jetzt „und was heißt das für mich?". Die Chips sind auf genau
            diesen Spot gebunden (der Slug geht mit, der Server löst den Namen
            auf); das Chat-Widget lädt erst mit der ersten Frage. */}
        <RestaurantRemySection locale={loc} name={displayName} bezirk={r.bezirk?.name} />

        {/* Vor der Bezirks-Zeile: ein Text über genau diesen Laden ist
            spezifischer als vier weitere Spots aus demselben Bezirk. */}
        <RestaurantArticlesSection articles={articles} locale={loc} />

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

        {/* Der zweite, erklärende Map-Ausgang — Bezirk und Kategorie haben ihn
            längst, ausgerechnet die Restaurant-Seiten nicht, obwohl sie den
            Suchtraffic tragen. Die Pille unter dem Hero fängt die Ungeduldigen;
            wer bis hierhin gelesen hat, ist der beste Map-Kandidat und bekam
            bisher am Seitenende gar kein Angebot. Der Block sagt anders als die
            Pille auch, WAS auf der Map steht. */}
        <div className={styles.detailMapCta}>
          <MapPromoCTA kind="restaurant" name={displayName} mapHref={mapHref} locale={loc} />
        </div>

        <RemyDock pageSlug={slug} />
      </main>
    </>
  );
}
