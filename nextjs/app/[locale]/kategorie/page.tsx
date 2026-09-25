import type { Metadata } from 'next';
import Image from '@/app/components/SiteImage';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getAllCategoriesWithStats } from '@/lib/sanity.server';
import { localizedCategoryBlurb, localizedCategoryName } from '@/lib/categories';
import { categoryArt } from '@/lib/categoryArt';
import { pickShelf } from '@/lib/curated-ranking';
import { serializeJsonLd } from '@/lib/json-ld';
import { localeUrl } from '@/lib/locale-url';
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';

import { OG_CARD_VERSION, SITE_URL } from '@/lib/constants';
import styles from '@/app/components/HubPage.module.css';
import { HubSpotShelf, hubTitleStyle } from '@/app/components/HubSpots';

interface PageProps {
  params: Promise<{ locale: string }>;
}

// 24 Stunden. Die Frist ist nicht der Weg, auf dem Inhalte live gehen — das ist
// der Sanity-Webhook auf /api/revalidate. Hintergrund und Bedingung an dieser
// Zahl: SANITY_REVALIDATE_SECONDS in lib/constants.ts. Next verlangt hier einen
// statisch lesbaren Wert, deshalb die Zahl statt der Konstante.
export const revalidate = 86400;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const de = locale === 'de';
  const title = de ? 'Restaurants nach Kategorie' : 'Restaurants by category';
  const description = de
    ? 'Berliner Restaurants nach Anlass — Frühstück, Lunch, Dinner, Café, Süßes und Pizza.'
    : 'Berlin restaurants by occasion — breakfast, lunch, dinner, coffee, sweets, and pizza.';
  const alternates = buildHreflangAlternates('/kategorie', de ? 'de' : 'en');
  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      type: 'website',
      locale: toOgLocale(de ? 'de' : 'en'),
      images: [
        {
          url: `${SITE_URL}/pics/og-card.png?v=${OG_CARD_VERSION}`,
          width: 1200,
          height: 630,
          alt: 'EAT THIS – We tell you what to eat',
        },
      ],
    },
  };
}

export default async function KategorieIndexPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const de = locale === 'de';
  const loc = de ? 'de' : 'en';
  const title = de ? 'Wonach ist dir?' : 'What are you craving?';
  // Leere Kategorien fliegen raus — dieselbe Regel wie auf dem Bezirks-Index:
  // eine Zeile ohne Spots ist eine Sackgasse für Leser und dünner Inhalt für
  // Google.
  const categories = (await getAllCategoriesWithStats()).filter(
    (c) => (c.restaurantCount ?? 0) > 0
  );

  const jsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Eat This Berlin',
            item: localeUrl(locale, '/'),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: de ? 'Kategorien' : 'Categories',
            item: localeUrl(locale, '/kategorie'),
          },
        ],
      },
      {
        '@type': 'ItemList',
        itemListElement: categories.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: localizedCategoryName(c, loc),
          url: localeUrl(locale, `/kategorie/${c.slug}`),
        })),
      },
    ],
  });

  return (
    <>
      <script
        id="schema-kategorie-index"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className={styles.page}>
        {/* Der Hero war bis 24.08.2026 drei Booster-Pack-Tüten — Produktfotos,
            keine Kategoriebilder. Hier trägt die Type. */}
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1 className={styles.title} style={hubTitleStyle(title)}>
              {title}
            </h1>
            {/* Die Zahl kommt aus der Liste, nicht aus der Copy: sobald im Studio
                eine Kategorie dazukommt oder leerläuft, stand hier sonst eine
                falsche Behauptung. */}
            <p className={styles.lede}>
              {de
                ? `${categories.length} Richtungen, ein Prinzip: nur Adressen, für die wir geradestehen. Such dir eine aus.`
                : `${categories.length} directions, one rule: only addresses we vouch for. Take your pick.`}
            </p>
          </div>
        </header>

        {/* Keine Zwischenüberschrift „Kategorie wählen": die H1 fragt schon,
            die Regale darunter sind die Antwort. */}
        <div aria-label={de ? 'Alle Kategorien' : 'All categories'} role="region">
          {categories.map((c) => {
            // Kuratierte Spots führen das Regal an, aufgefüllt wird mit der
            // alphabetischen Auswahl.
            const curated = (c.topSpotCards ?? []).filter((r) => r.photo);
            const spots = pickShelf(curated, c.exampleRestaurants, 4);
            const label = localizedCategoryName(c, loc);
            const blurb = localizedCategoryBlurb(c, loc);
            /* Das Pack der Kategorie als Marke neben dem Namen — nur Bild, kein
               Link (User, 2026-08-27): die Packs liegen unter /packs, ein
               zweites Ziel in derselben Zeile machte zwei Versprechen. */
            const pack = categoryArt(c.slug);

            return (
              <section
                key={c._id ?? c.slug}
                className={styles.shelfSection}
                aria-labelledby={`kategorie-${c.slug}-title`}
              >
                <div className={styles.shelfHead}>
                  {pack && (
                    <Image
                      className={styles.shelfPack}
                      src={pack}
                      alt=""
                      width={96}
                      height={145}
                      aria-hidden="true"
                    />
                  )}
                  <h2 id={`kategorie-${c.slug}-title`} className={styles.shelfTitle}>
                    <Link href={`/kategorie/${c.slug}`}>{label}</Link>
                  </h2>
                  {/* Ohne Zahl: neun Knöpfe von „Alle 9" bis „Alle 224" lesen
                      sich als Rangliste, obwohl die Zahl nur sagt, wie breit
                      Berlin dort isst. */}
                  <Link
                    href={`/kategorie/${c.slug}`}
                    className={styles.shelfAll}
                    aria-label={de ? `Alle Spots: ${label}` : `All spots: ${label}`}
                  >
                    {de ? 'Alle' : 'All'}
                  </Link>
                </div>
                {blurb && <p className={styles.shelfBlurb}>{blurb}</p>}
                <HubSpotShelf
                  restaurants={spots}
                  locale={loc}
                  label={de ? `Spots für ${label}` : `${label} spots`}
                />
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
