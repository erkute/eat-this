import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getAllCategoriesWithStats } from '@/lib/sanity.server';
import { localizedCategoryBlurb, localizedCategoryName } from '@/lib/categories';
import { categoryArt } from '@/lib/categoryArt';
import { pickShelf } from '@/lib/curated-ranking';
import { serializeJsonLd } from '@/lib/json-ld';
import { localeUrl } from '@/lib/locale-url';
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';

import { OG_CARD_VERSION, SITE_URL } from '@/lib/constants';
import styles from '@/app/components/HubIssue.module.css';
import { IssueDirectory, IssueMagazine } from '@/app/components/HubIssue';
import { latestIssues } from '@/lib/home/getHomeData';

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
  const [allCategories, magazine] = await Promise.all([
    getAllCategoriesWithStats(),
    latestIssues(3, loc),
  ]);
  const categories = allCategories.filter((c) => (c.restaurantCount ?? 0) > 0);

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
        {/* Der Kopf war bis 24.08.2026 drei Booster-Pack-Tüten — Produktfotos,
            keine Kategoriebilder. Hier trägt die Type. */}
        <header className={styles.head}>
          <p className={styles.kicker}>{de ? 'Kategorien' : 'Categories'}</p>
          <h1 className={styles.title}>
            <span className={styles.indexTitle}>{title}</span>
          </h1>
        </header>
        <p className={styles.lede}>
          {de
            ? 'Frühstück, Pizza oder Drinks – such dir aus, worauf du Lust hast.'
            : 'Breakfast, pizza or drinks – pick what you’re in the mood for.'}
        </p>

        {/* Keine Zwischenüberschrift „Kategorie wählen": die H1 fragt schon,
            das Register darunter ist die Antwort. */}
        <IssueDirectory
          label={de ? 'Alle Kategorien' : 'All categories'}
          entries={categories.map((c) => {
            const label = localizedCategoryName(c, loc);
            // Kuratierte Spots führen die Bildleiste an, aufgefüllt wird mit
            // der alphabetischen Auswahl.
            const curated = (c.topSpotCards ?? []).filter((r) => r.photo);
            return {
              slug: c.slug,
              href: `/kategorie/${c.slug}`,
              name: label,
              blurb: localizedCategoryBlurb(c, loc),
              spots: pickShelf(curated, c.exampleRestaurants, 4),
              cta: de ? 'Alle' : 'All',
              ctaLabel: de ? `Alle Spots: ${label}` : `All spots: ${label}`,
              // Das Pack der Kategorie als Marke neben dem Namen — nur Bild,
              // kein Link (27.08.2026): die Packs liegen unter /packs, ein
              // zweites Ziel in derselben Zeile machte zwei Versprechen.
              art: categoryArt(c.slug),
            };
          })}
        />

        {/* Der Schluss: wer unten ankommt, liest weiter. */}
        <IssueMagazine
          issues={magazine}
          locale={loc}
          heading={de ? 'Aus dem Magazin' : 'From the magazine'}
        />
      </main>
    </>
  );
}
