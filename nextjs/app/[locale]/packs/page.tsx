import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CATALOG } from '@/lib/stripe-catalog';
import { categoryArt } from '@/lib/categoryArt';
import { formatPackPrice, packUrlSlug } from '@/lib/pack/packDetail';
import { getPackContents } from '@/lib/sanity.server';
import { hreflangAlternates } from '@/lib/seo/metadata';
import { routing } from '@/i18n/routing';
import PackBuyButton from '../pack/[slug]/PackBuyButton';
import AllBerlinBoard from '@/app/components/AllBerlinBoard';
import styles from './PacksOverview.module.css';

interface PageProps {
  params: Promise<{ locale: string }>;
}

// 24 Stunden. Die Frist ist nicht der Weg, auf dem Inhalte live gehen — das ist
// der Sanity-Webhook auf /api/revalidate. Hintergrund und Bedingung an dieser
// Zahl: SANITY_REVALIDATE_SECONDS in lib/constants.ts. Next verlangt hier einen
// statisch lesbaren Wert, deshalb die Zahl statt der Konstante.
export const revalidate = 86400;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const de = locale !== 'en';
  return {
    title: de ? 'Booster Packs kaufen' : 'Buy Booster Packs',
    description: de
      ? 'Alle Eat This Booster Packs auf einen Blick: All Berlin vorne, danach Kategorie-Packs fuer deine Map.'
      : 'All Eat This Booster Packs in one place: All Berlin first, then category packs for your map.',
    robots: { index: false, follow: true },
    alternates: hreflangAlternates('/packs', de ? 'de' : 'en'),
  };
}

const categoryPacks = Object.values(CATALOG).filter((p) => p.type === 'category');

const copy = {
  de: {
    categoryTitle: 'Kategorie-Packs',
    categoryLead: 'Such dir gezielt aus, worauf du Hunger hast.',
    buy: 'Kaufen',
    pending: 'Weiter zu Stripe …',
    owned: 'Zur Map',
    error: 'Da ging was schief. Versuch es nochmal.',
    map: '/map',
  },
  en: {
    categoryTitle: 'Category Packs',
    categoryLead: 'Pick exactly what you are hungry for.',
    buy: 'Buy',
    pending: 'Going to Stripe …',
    owned: 'Open map',
    error: 'Something went wrong. Please try again.',
    map: '/en/map',
  },
} as const;

export default async function PacksOverviewPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc: 'de' | 'en' = locale === 'en' ? 'en' : 'de';
  const t = copy[loc];
  const packContents = await getPackContents();

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <AllBerlinBoard
          locale={loc}
          contents={packContents.allBerlin}
          variant="hero"
          headingLevel="h1"
          priority
        />

        <section className={styles.catalog} aria-labelledby="packs-catalog-title">
          <div className={styles.catalogHead}>
            <h2 id="packs-catalog-title" className={styles.sectionTitle}>
              <span className={styles.mk} aria-hidden="true" />
              {t.categoryTitle}
            </h2>
            <p className={styles.sectionLead}>{t.categoryLead}</p>
          </div>

          <ul className={styles.grid} role="list">
            {categoryPacks.map((pack) => {
              const art = pack.slug ? categoryArt(pack.slug) : null;
              const href = `/pack/${packUrlSlug(pack)}`;

              return (
                <li key={pack.packId} className={styles.tile}>
                  <Link href={href} className={styles.tileLink}>
                    {art && (
                      <Image
                        src={art}
                        alt=""
                        width={420}
                        height={656}
                        // Deckel 220px (PacksOverview.module.css .art), auf
                        // dem Telefon 150px.
                        sizes="(max-width: 559px) 150px, 220px"
                        className={styles.art}
                      />
                    )}
                    <span className={styles.tileName}>{pack.displayName}</span>
                    <span className={styles.spectrum}>{pack.spectrum[loc]}</span>
                  </Link>

                  <PackBuyButton
                    packId={pack.packId}
                    packName={pack.displayName}
                    amountCents={pack.amountCents}
                    locale={loc}
                    className={styles.buy}
                    errorClassName={styles.buyError}
                    label={`${t.buy} · ${formatPackPrice(pack.amountCents)}`}
                    pendingLabel={t.pending}
                    ownedLabel={t.owned}
                    ownedHref={t.map}
                    errorLabel={t.error}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
