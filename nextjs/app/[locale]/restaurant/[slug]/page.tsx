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
import { splitDescriptionForMagazine } from '@/lib/restaurant-prose';
import { localizeOpeningDays, localizeOpeningHours } from '@/lib/map/openingHours';
import HeartButton from '@/app/components/HeartButton';
import OpenStateChip from '@/app/components/OpenStateChip';
import MustEatTeaserSection from '@/app/components/MustEatTeaserSection';
import RestaurantArticlesSection from '@/app/components/RestaurantArticlesSection';
import MapPromoCTA from '@/app/components/MapPromoCTA';
import MapIntentLink from '@/app/components/MapIntentLink';
import RestaurantRemySection from '@/app/components/RestaurantRemySection';
import RemyDock from '@/app/components/buddy/RemyDock';
import ShareButton from '@/app/components/ShareButton';
import SpotGallery from '@/app/components/SpotGallery';
import { safeHttpUrl } from '@/lib/safeHttpUrl';
import { HubSpotShelf } from '@/app/components/HubSpots';
import hubStyles from '@/app/components/HubPage.module.css';
import { Link as IntlLink } from '@/i18n/navigation';
import {
  RouteIcon,
  ReserveIcon,
  PhoneIcon,
  WebsiteIcon,
  MenuCardIcon,
  ShareIcon,
} from '@/app/components/actionIcons';
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

/**
 * Die Spot-Seite, neu gesetzt am 25.09.2026 in der Sprache der Hub-Seiten
 * (HubPage.module.css): Ink-Grund, Providence für alles Gesetzte, Gelb als
 * einziger Akzent, Bedienelemente als Fläche.
 *
 * Die eine Regel, an der die alte Fassung gescheitert ist: **kein Text auf
 * Fotos.** Name, Chips, Empfehlungen und Magazin-Titel lagen unter Verläufen
 * auf dem Bild — auf hellen Fotos kaum lesbar, und bei „Weitere in …" schnitt
 * die Zeilenbegrenzung die Namen obendrein an. Jetzt steht jeder Text unter
 * oder neben seinem Bild; auf dem Foto bleibt nur das Herz.
 *
 * Aufbau:
 * - Kopf: Foto und Steckbrief (Einordnung, Name, ein Satz, Zustand, Knöpfe) —
 *   ab Desktop nebeneinander, auf dem Telefon das Foto randlos darüber.
 * - Rumpf: der Text links, rechts eine klebende Info-Karte mit Adresse,
 *   Zeiten, Preis und den Kontakt-Knöpfen.
 * - Bildstrecke, dann die Module: Must Eats, Remy, Magazin, Weitere im Bezirk,
 *   Mehr davon, Map.
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
    notFound();
  }
  const { restaurant: r, mustEats, articles, siblings } = page;

  const loc = locale === 'de' ? 'de' : 'en';
  const de = loc === 'de';

  const description = pickLocale(r.description, r.descriptionEn, loc) || '';
  const shortDescription = pickLocale(r.shortDescription, r.shortDescriptionEn, loc);
  const tipText = pickLocale(r.tip, r.tipEn, loc);
  const displayName = normalizeName(r.name);
  const magazine = splitDescriptionForMagazine(description);
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
  const hasMain = Boolean(description || tipText || galleryImages.length > 0);

  const priceLabel = formatPriceLabel(r, loc);
  const websiteInfo = classifyWebsite(r.website);
  const websiteUrl = websiteInfo?.url ?? null;
  const address = r.address;
  const cuisineLabel = r.cuisineType ? localizedCuisine(r.cuisineType, loc) : null;
  const districtName = r.bezirk?.name ?? r.district ?? null;
  const hasHours = (r.openingHours?.length ?? 0) > 0;
  // Beschreibender Alt-Text statt des bloßen Namens — „SOFI" sagt einem
  // Screenreader (und der Bilder-SERP) nichts über das Bild. Mehr weiß die
  // Ausgabeschicht ohne kuratierten Alt nicht; das Muster entspricht dem
  // Title-Builder.
  const heroAlt = cuisineLabel
    ? `${displayName} – ${cuisineLabel} in ${districtName ? `Berlin-${districtName}` : 'Berlin'}`
    : displayName;
  // Kategorien sind Discovery-Hubs (Frühstück, Süßes …). Seit die
  // Kategorie-Karten-Zeile am Seitenende weg ist (874c330), wäre das der
  // einzige Seitentyp ohne Weg zu seinen Hubs — „Mehr davon" stellt den Link
  // wieder her, als Eigenschaft des Spots statt als Karten-Stapel.
  const categoryLinks = (r.categories ?? []).filter(
    (c): c is typeof c & { slug: string; name: string } => Boolean(c?.slug && c?.name)
  );
  // Adresse, Map-Knopf und Map-Block zeigen alle hierhin. Google Maps ist von
  // dieser Seite bewusst verschwunden (Nutzer-Entscheidung 28.08.); wer es
  // zurückholt, nimmt wie das Map-Sheet eine name+address-Suche statt der
  // gepflegten `mapsUrl` — die kann veraltet sein, die Suche trifft immer.
  const mapHref = `/map?r=${slug}`;
  const telHref = r.phone ? `tel:${r.phone.replace(/\s+/g, '')}` : null;
  const hasContact = Boolean(telHref || websiteUrl || r.menuUrl);
  const hasInfo = Boolean(address || hasHours || priceLabel || hasContact);
  const bezirkSlug = r.bezirk?.slug;
  const siblingHeading = r.bezirk?.name
    ? de
      ? `Weitere in ${r.bezirk.name}`
      : `More in ${r.bezirk.name}`
    : null;

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
        <header className={`${styles.hero} ${r.photo ? '' : styles.heroNoPhoto}`}>
          {r.photo && (
            <figure className={styles.heroMedia}>
              <div className={styles.heroFrame}>
                <Image
                  src={r.photo}
                  alt={heroAlt}
                  fill
                  priority
                  // Ab 900px steht das Foto in der rechten von zwei Spalten
                  // (höchstens rund 700px), darunter randlos über die Breite.
                  sizes="(max-width: 899px) 100vw, 700px"
                  /* 80 statt der Voreinstellung 75. Gemessen an einem
                     1600px-Foto: q=80 kostet 26% mehr Bytes und bringt 1,1 dB,
                     q=85 kostet 55% fuer 2,0 dB. Der Hero ist das LCP-Element
                     dieser Seite, deshalb der guenstigere Punkt der Kurve —
                     die Galerie unten darf teurer sein. */
                  quality={80}
                  className={styles.cover}
                />
                <HeartButton
                  restaurantId={r._id}
                  name={r.name}
                  slug={slug}
                  photo={r.photo ?? undefined}
                  district={r.bezirk?.name ?? undefined}
                  locale={loc}
                />
              </div>
              {r.photoCredit && (
                <Credit text={r.photoCredit} href={heroCreditHref} className={styles.credit} />
              )}
            </figure>
          )}

          <div className={styles.heroCopy}>
            {/* Einordnung wie auf den Hub-Karten: Küche gelb, dann Bezirk und
                Preis. Der Bezirk führt auf seinen Hub — der Weg zu allen
                anderen Spots dort, wo früher die Brotkrume stand. */}
            {(cuisineLabel || districtName || priceLabel) && (
              <p className={styles.kicker}>
                {cuisineLabel && <span className={styles.kickerCuisine}>{cuisineLabel}</span>}
                {districtName &&
                  (bezirkSlug ? (
                    <span>
                      <IntlLink href={`/bezirk/${bezirkSlug}`} className={styles.kickerLink}>
                        {districtName}
                      </IntlLink>
                    </span>
                  ) : (
                    <span>{districtName}</span>
                  ))}
                {priceLabel && <span>{priceLabel}</span>}
              </p>
            )}
            <h1 className={styles.title} style={titleFitStyle(displayName)}>
              {displayName}
            </h1>
            {shortDescription && <p className={styles.lede}>{shortDescription}</p>}
            {/* Der Live-Zustand kommt clientseitig nach dem Mount (die Seite ist
                statisch, ein gebautes „Geöffnet" wäre tagelang falsch) und
                beantwortet die größte gemessene Brand-Intention („uhrzeit")
                direkt im Kopf. */}
            {hasHours && (
              <div className={styles.status}>
                <OpenStateChip openingHours={r.openingHours ?? []} locale={loc} />
              </div>
            )}
            <div className={styles.heroActions}>
              {/* Führt auf die Eat-This-Map statt zu Google Maps: den Weg gibt
                  die Map selbst her. nofollow wie am Map-Block — `mapHref`
                  trägt eine Query, und jede Variante würde sonst einzeln
                  gecrawlt. */}
              <MapIntentLink
                href={mapHref}
                rel="nofollow"
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                <RouteIcon />
                <span>{de ? 'Zur Map' : 'On the map'}</span>
              </MapIntentLink>
              {r.reservationUrl && (
                <a
                  className={styles.btn}
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
                className={styles.btn}
                label={de ? 'Teilen' : 'Share'}
                copiedLabel={de ? 'Kopiert' : 'Copied'}
                icon={<ShareIcon />}
              />
            </div>
          </div>
        </header>

        {(hasMain || hasInfo) && (
          <div className={styles.body}>
            {hasMain && (
              <div className={styles.main}>
                {description && (
                  <article className={styles.story}>
                    <p className={styles.storyLede}>{magazine?.lede || description}</p>
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

                {/* Die Bilder gehören zur Beschreibung und stehen direkt unter
                    ihr, in derselben Spalte — nicht als eigenes Modul über die
                    volle Seitenbreite (Nutzer, 25.09.2026). */}
                {galleryImages.length > 0 && (
                  <SpotGallery
                    images={galleryImages}
                    name={displayName}
                    locale={loc}
                    creditClassName={styles.credit}
                  />
                )}

                {/* Der Tipp der Redaktion: gelbe Kante, gelbes Label, der Satz
                    in der Markenschrift — der eine laute Moment im Text. */}
                {tipText && (
                  <aside className={styles.tip}>
                    <p className={styles.label}>{de ? 'Insider-Tipp' : 'Insider tip'}</p>
                    <p className={styles.tipText}>{tipText}</p>
                  </aside>
                )}
              </div>
            )}

            {/* Alles Praktische auf einer Karte. Ab Desktop klebt sie neben dem
                Text, damit Adresse und Zeiten beim Lesen sichtbar bleiben. */}
            {hasInfo && (
              <aside className={styles.info} aria-labelledby="spot-info">
                <h2 id="spot-info" className={hubStyles.srOnly}>
                  {de ? 'Adresse und Öffnungszeiten' : 'Address and hours'}
                </h2>
                <dl className={styles.facts}>
                  {address && (
                    <div className={styles.fact}>
                      <dt className={styles.label}>{de ? 'Adresse' : 'Address'}</dt>
                      <dd>
                        {/* Die Adresse führt auf UNSERE Map, nicht zu Google
                            (Nutzer-Entscheidung 28.08.): der Spot öffnet dort
                            direkt, statt den Besucher aus dem Produkt zu
                            schicken. */}
                        <MapIntentLink href={mapHref} rel="nofollow" className={styles.address}>
                          {address.split(',').map((part, i) => (
                            <span key={i}>{part.trim()}</span>
                          ))}
                        </MapIntentLink>
                      </dd>
                    </div>
                  )}
                  {hasHours && (
                    <div className={styles.fact}>
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
                  )}
                  {priceLabel && (
                    <div className={styles.fact}>
                      <dt className={styles.label}>{de ? 'Preis' : 'Price'}</dt>
                      <dd>{priceLabel}</dd>
                    </div>
                  )}
                </dl>

                {hasContact && (
                  <div className={styles.contact}>
                    {telHref && (
                      <a className={styles.btn} href={telHref}>
                        <PhoneIcon />
                        <span>{de ? 'Anrufen' : 'Call'}</span>
                      </a>
                    )}
                    {websiteUrl && (
                      <a
                        className={styles.btn}
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
                        className={styles.btn}
                        href={r.menuUrl}
                        target="_blank"
                        rel="noopener nofollow noreferrer"
                      >
                        <MenuCardIcon />
                        <span>{de ? 'Speisekarte' : 'Menu'}</span>
                      </a>
                    )}
                  </div>
                )}
              </aside>
            )}
          </div>
        )}

        {/* Must Eats vor Remy: beide beantworten „und jetzt?", aber die Karten
            sind der konkretere, produkteigene nächste Klick. Remy folgt als
            offener Kanal für alles, was Seite und Karten nicht beantworten. */}
        {mustEats.length > 0 && <MustEatTeaserSection mustEats={mustEats} locale={loc} />}

        {/* Die Chips sind auf genau diesen Spot gebunden (der Slug geht mit,
            der Server löst den Namen auf); das Chat-Widget lädt erst mit der
            ersten Frage. */}
        <RestaurantRemySection locale={loc} name={displayName} bezirk={r.bezirk?.name} />

        {/* Vor der Bezirks-Zeile: ein Text über genau diesen Laden ist
            spezifischer als vier weitere Spots aus demselben Bezirk. */}
        <RestaurantArticlesSection articles={articles} locale={loc} />

        {/* Das Regal der Bezirks-Index-Seite, Name und Metazeile UNTER dem
            Foto. Hier standen sie früher auf dem Bild unter einem Verlauf, und
            die Zeilenbegrenzung schnitt die Namen oben an.

            Nur die Bezirks-Zeile: eine Kategorie-Zeile schickte von einer
            Kreuzberg-Seite nach Schöneberg, Prenzlauer Berg und Mitte — vier
            Karten, deren gemeinsamer Nenner „auch Lunch" war. Deshalb steht
            unter den Karten auch kein Bezirk (das Regal zeigt ihn ohne
            `showDistrict` nicht): die Überschrift nennt ihn schon. */}
        {siblings.length > 0 && siblingHeading && bezirkSlug && (
          <section className={styles.module} aria-labelledby="spot-siblings">
            <div className={hubStyles.shelfHead}>
              <h2 id="spot-siblings" className={hubStyles.shelfTitle}>
                <IntlLink href={`/bezirk/${bezirkSlug}`}>{siblingHeading}</IntlLink>
              </h2>
              <IntlLink
                href={`/bezirk/${bezirkSlug}`}
                className={hubStyles.shelfAll}
                aria-label={
                  de ? `Alle Spots in ${r.bezirk!.name}` : `All spots in ${r.bezirk!.name}`
                }
              >
                {de ? 'Alle' : 'All'}
              </IntlLink>
            </div>
            <HubSpotShelf restaurants={siblings} locale={loc} label={siblingHeading} />
          </section>
        )}

        {/* Die Booster-Packs der Kategorien — dieselbe Art wie auf /packs. Der
            Name steht unter dem Bild, damit eine Kategorie ohne Art
            (unbekannter Slug) dieselbe Zeile ergibt, nur ohne Karte. „Mehr
            davon" sagt, was der Klick bringt: weitere Spots dieser Art. Weder
            „Gut für" (Ratgeber-Floskel) noch „Läuft unter" (Archiv-Ton) —
            beide vom Nutzer verworfen. */}
        {categoryLinks.length > 0 && (
          <section className={styles.module} aria-labelledby="spot-more">
            <h2 id="spot-more" className={hubStyles.sectionTitle}>
              {de ? 'Mehr davon' : 'More like this'}
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
                      <span className={styles.packName}>{de ? c.name : (c.nameEn ?? c.name)}</span>
                    </IntlLink>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Der erklärende Map-Ausgang am Seitenende — wer bis hierhin gelesen
            hat, ist der beste Map-Kandidat. Der Block sagt anders als der
            Knopf im Kopf auch, WAS auf der Map steht. */}
        <div className={styles.promo}>
          <MapPromoCTA kind="restaurant" name={displayName} mapHref={mapHref} locale={loc} />
        </div>

        <RemyDock pageSlug={slug} />
      </main>
    </>
  );
}
