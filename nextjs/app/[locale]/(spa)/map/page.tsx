import 'maplibre-gl/dist/maplibre-gl.css';

import type { Metadata, Viewport } from 'next';
import { Saira_Condensed } from 'next/font/google';
import { setRequestLocale } from 'next-intl/server';
import { OG_CARD_VERSION, SITE_URL } from '@/lib/constants';
import { INDEXABLE_ROBOTS, buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';
import { getInitialAnonMapData } from '@/lib/map/server-initial-map-data';
import { getMapSeoCopy } from '@/lib/map/mapSeoCopy';
import { byMustEatsThenName } from '@/lib/map/listOrder';
import { buildMapJsonLd } from '@/lib/json-ld';
import { INITIAL_LIST_ROWS } from '@/lib/map/listWindow';

const sairaCondensed = Saira_Condensed({
  weight: ['700', '800', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-saira-condensed',
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Der Title trägt "Berlin Food Map" vorn: das ist die Suchintention, für die
// diese Seite die Landingpage sein soll, und "Karte" allein war für Google ein
// Wort ohne Ort. Das (spa)-Layout hängt über sein `template` " | EAT THIS" an —
// die Marke gehört deshalb NICHT in diesen String.
const TITLE = {
  de: 'Berlin Food Map – Restaurants, Cafés & Bars',
  // EN trägt denselben Head-Term ganz vorn, sagt danach aber etwas anderes:
  // wortgleiche Titles auf zwei hreflang-Varianten melden sich in der Search
  // Console als Duplikat, und Englisch ist bei Berlin-Suchen die Nische mit
  // weniger Konkurrenz — die Zeile darf dort ruhig eigenständig sein.
  en: 'Berlin Food Map – Curated Restaurants, Cafés & Bars',
};
const DESCRIPTION = {
  de: 'Entdecke handverlesene Restaurants, Cafés und Bars auf der Eat This Berlin Food Map. Filtere nach Bezirk, Kategorie, Preis und was gerade geöffnet hat.',
  en: 'Hand-picked restaurants, cafés and bars on the Eat This Berlin food map. Filter by district, category, price and what is open right now.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const en = locale === 'en';
  const loc = en ? 'en' : 'de';
  const title = TITLE[loc];
  const description = DESCRIPTION[loc];
  const alternates = buildHreflangAlternates('/map', loc);
  const ogImage = `${SITE_URL}/pics/og-card.png?v=${OG_CARD_VERSION}`;

  return {
    title,
    description,
    // Bis zum 01.09.2026 stand hier `noindex,follow` — die Karte war für Google
    // nicht existent, obwohl sie das Produkt ist. Die Konstante statt eines
    // handgeschriebenen 'index,follow': die trägt auch max-image-preview und
    // max-snippet, siehe lib/seo/metadata.ts.
    robots: INDEXABLE_ROBOTS,
    // Der Canonical zeigt immer auf `/map` ohne Query. Die Deep-Links der
    // Katalogseiten (`?r=`, `?bezirk=`, `?cat=`) öffnen dieselbe Seite in einem
    // anderen Zustand, nicht eine andere Seite.
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      type: 'website',
      // Next ersetzt `openGraph` als Ganzes, es merged nicht in das Objekt des
      // Layouts hinein — ohne diese Zeile fiele `og:site_name` auf der
      // Kartenseite ersatzlos weg.
      siteName: 'EAT THIS',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: 'EAT THIS - We tell you what to eat',
        },
      ],
      locale: toOgLocale(loc),
    },
    // Das (spa)-Layout setzt die Twitter-Karte auf die Marken-Texte. Ohne diese
    // Überschreibung würde die Kartenseite dort weiter "Restaurants &
    // Geheimtipps in Berlin" teilen, während og: und <title> längst etwas
    // anderes sagen.
    twitter: { title, description, images: [ogImage] },
  };
}

export async function generateViewport({ params }: PageProps): Promise<Viewport> {
  await params;
  return {
    /* Override the root ink theme on the map. Its phone list/detail deliberately
       scrolls beneath Safari's translucent browser chrome, so a fixed theme
       color would replace those live page pixels after a full reload. */
    themeColor: null,
  };
}

export default async function MapPage({ params, searchParams }: PageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const [{ default: MapSection }, initialMapData] = await Promise.all([
    import('@/app/components/MapSection'),
    getInitialAnonMapData(),
  ]);
  const requestedRestaurantSlug = Array.isArray(query.r) ? query.r[0] : query.r;
  const initialRestaurantSlug = requestedRestaurantSlug
    ? (initialMapData.restaurants.find((restaurant) => restaurant.slug === requestedRestaurantSlug)
        ?.slug ??
      initialMapData.lockedRestaurants.find(
        (restaurant) => restaurant.slug === requestedRestaurantSlug
      )?.slug ??
      null)
    : null;

  const loc = locale === 'en' ? 'en' : 'de';
  const copy = getMapSeoCopy(loc);
  // Genau die Zeilen, die im ausgelieferten HTML stehen: dieselbe Menge und
  // dieselbe Reihenfolge, aus der `useMapFilters` ohne Standort und ohne Filter
  // startet, auf `INITIAL_LIST_ROWS` geschnitten wie RestaurantList selbst.
  const listedRestaurants = [...initialMapData.restaurants, ...initialMapData.lockedRestaurants]
    .sort(byMustEatsThenName)
    .slice(0, INITIAL_LIST_ROWS);
  const jsonLd = buildMapJsonLd({
    locale: loc,
    faqs: copy.faqs,
    listName:
      loc === 'de' ? 'Restaurants auf der Berlin Food Map' : 'Restaurants on the Berlin food map',
    restaurants: listedRestaurants,
  });

  return (
    <>
      <script
        id={`schema-map-${loc}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <MapSection
        isActive
        initialMapData={initialMapData}
        initialRestaurantSlug={initialRestaurantSlug}
        fontClassName={sairaCondensed.variable}
      />
    </>
  );
}
