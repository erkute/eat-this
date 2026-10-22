import PackPreview from '@/app/components/PackPreview';
import { PackOwnershipProvider } from '@/app/components/PackOwnership';
import type { Metadata } from 'next';
import Image from '@/app/components/SiteImage';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CATALOG } from '@/lib/stripe-catalog';
import { categoryArt } from '@/lib/categoryArt';
import { packUrlSlug } from '@/lib/pack/packDetail';
import { getPackContents } from '@/lib/sanity.server';
import { hreflangAlternates } from '@/lib/seo/metadata';
import AllBerlinBoard from '@/app/components/AllBerlinBoard';
import styles from './PacksOverview.module.css';

interface PageProps {
  params: Promise<{ locale: string }>;
}

// Public card previews use Firebase's runtime identity, unavailable in CI.
// Match the home and Must-Eats routes: hydrate public content at request time.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const de = locale !== 'en';
  return {
    title: de ? 'Booster Packs kaufen' : 'Buy Booster Packs',
    description: de
      ? 'Entdecke deine nächsten Must Eats in Berlin. Wähle dein Lieblings-Pack oder schalte mit All Berlin alle Empfehlungen frei.'
      : 'Discover your next Must Eats in Berlin. Pick your favourite pack or unlock every recommendation with All Berlin.',
    robots: { index: false, follow: true },
    alternates: hreflangAlternates('/packs', de ? 'de' : 'en'),
  };
}

const categoryPacks = Object.values(CATALOG).filter((p) => p.type === 'category');

const copy = {
  de: {
    kicker: 'Einzeln',
    categoryTitle: 'Kategorie-Packs',
    categoryLead: 'Kaffee, Dinner oder Drinks – finde das Pack, auf das du Lust hast.',
    view: 'Ansehen',
    soon: 'Kommt bald',
  },
  en: {
    kicker: 'One by one',
    categoryTitle: 'Category Packs',
    categoryLead: 'Coffee, dinner or drinks – find the pack you’re in the mood for.',
    view: 'View',
    soon: 'Coming soon',
  },
} as const;

export default async function PacksOverviewPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc: 'de' | 'en' = locale === 'en' ? 'en' : 'de';
  const t = copy[loc];
  const packContents = await getPackContents();

  return (
    <PackOwnershipProvider>
      <main className={styles.page}>
        <div className={styles.wrap}>
          <AllBerlinBoard
            contents={packContents}
            locale={loc}
            variant="hero"
            headingLevel="h1"
            priority
          />

          <section className={styles.catalog} aria-labelledby="packs-catalog-title">
            <div className={styles.catalogHead}>
              <p className={styles.kicker}>{t.kicker}</p>
              <h2 id="packs-catalog-title" className={styles.sectionTitle}>
                {t.categoryTitle}
              </h2>
              <p className={styles.sectionLead}>{t.categoryLead}</p>
            </div>

            <ul className={styles.grid} role="list">
              {categoryPacks.map((pack) => {
                const art = pack.slug ? categoryArt(pack.slug) : null;
                const href = `/pack/${packUrlSlug(pack)}`;
                /* Ein Pack ohne Karte ist kein Produkt, sondern eine leere
                 Schachtel — Fine Dining stand am 06.09.2026 auf null. Es bleibt
                 sichtbar (die Kategorie kommt ja), aber es ist nicht käuflich.
                 Wie viele Karten drin sind, steht nirgends: das Produkt nennt
                 seine Zahlen nicht. Umso mehr haengt der Fehlkauf an diesem
                 Riegel — er ist das Einzige, was ihn noch verhindert. */
                const empty =
                  (pack.slug ? (packContents.byCategory[pack.slug]?.mustEats ?? 0) : 1) === 0;

                return (
                  <li key={pack.packId} className={styles.tile}>
                    {/* Eine Zeile pro Pack: gross links, rechts Name, Zeile und
                        „Ansehen“ auf einer Achse. Das Pack ist für die Maus
                        mitverlinkt; Tastatur und Vorleser nehmen den Namen. */}
                    <Link href={href} className={styles.packLink} tabIndex={-1} aria-hidden="true">
                      {art && (
                        <Image
                          src={art}
                          alt=""
                          width={550}
                          height={813}
                          sizes="(max-width: 559px) 120px, 170px"
                          className={styles.art}
                        />
                      )}
                    </Link>
                    <div className={styles.info}>
                      <Link href={href} className={styles.tileName}>{pack.displayName}</Link>
                      <p className={styles.spectrum}>{pack.spectrum[loc]}</p>

                      {/* Gekauft wird auf der Detailseite, nach dem Blick hinein
                          (Ansage 22.10.2026) — hier nur der Weg dorthin; der
                          Preis steht erst dort. */}
                      {empty ? (
                        <span className={styles.soon}>{t.soon}</span>
                      ) : (
                        <Link
                          href={href}
                          className={styles.view}
                          aria-label={`${pack.displayName} ${t.view.toLowerCase()}`}
                        >
                          {t.view}
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <PackPreview locale={loc} />
        </div>
      </main>
    </PackOwnershipProvider>
  );
}
