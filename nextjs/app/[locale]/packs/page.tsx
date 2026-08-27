import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CATALOG, type PackDef } from '@/lib/stripe-catalog';
import { categoryArt } from '@/lib/categoryArt';
import { formatPackPrice, packUrlSlug, formatBundleSavings } from '@/lib/pack/packDetail';
import { getPackContents } from '@/lib/sanity.server';
import { hreflangAlternates } from '@/lib/seo/metadata';
import { routing } from '@/i18n/routing';
import PackBuyButton from '../pack/[slug]/PackBuyButton';
import { PaymentMarks, PAYMENT_MARK_NAMES } from '@/app/components/PaymentMarks';
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
const allBerlin = CATALOG['all-berlin'];
const heroArt = categoryPacks
  .map((pack) => (pack.slug ? categoryArt(pack.slug) : null))
  .filter((src): src is string => Boolean(src));

const copy = {
  de: {
    allTitle: ['All', 'Berlin'],
    allLead:
      'Einmal kaufen, alles freischalten: alle Kategorien, alle kuratierten Berliner Spots und alle kommenden Updates direkt auf deiner Map.',
    allIncludes: (spots: number, mustEats: number) => [
      `Alle ${spots} Spots in ${categoryPacks.length} Kategorien`,
      `Alle ${mustEats} Must Eats`,
      'Alle neuen Berlin-Updates',
    ],
    allCta: 'All Berlin freischalten',
    pending: 'Weiter zu Stripe ...',
    owned: 'Auf die Map',
    error: 'Da ging was schief. Versuch es nochmal.',
    trust: 'Sicher bezahlen via Stripe',
    categoryTitle: 'Kategorie-Packs',
    categoryLead:
      'Such dir gezielt aus, worauf du Hunger hast. Jeder Pack legt neue Spots plus passende Must Eats auf deine Map.',
    buy: 'Kaufen',
    details: 'Details',
    map: '/map',
  },
  en: {
    allTitle: ['All', 'Berlin'],
    allLead:
      'Buy once, unlock everything: every category, every curated Berlin spot and every future update straight onto your map.',
    allIncludes: (spots: number, mustEats: number) => [
      `All ${spots} spots across ${categoryPacks.length} categories`,
      `All ${mustEats} Must Eats`,
      'Every new Berlin update',
    ],
    allCta: 'Unlock All Berlin',
    pending: 'Going to Stripe ...',
    owned: 'Open map',
    error: 'Something went wrong. Please try again.',
    trust: 'Secure checkout via Stripe',
    categoryTitle: 'Category Packs',
    categoryLead:
      'Pick exactly what you are hungry for. Each pack adds new spots plus matching Must Eats to your map.',
    buy: 'Buy',
    details: 'Details',
    map: '/map',
  },
} as const;

export default async function PacksOverviewPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc: 'de' | 'en' = locale === 'en' ? 'en' : 'de';
  const de = loc === 'de';
  const t = copy[loc];
  const mapHref = de ? t.map : `/en${t.map}`;
  const packContents = await getPackContents();
  const allIncludes = t.allIncludes(packContents.allBerlin.spots, packContents.allBerlin.mustEats);

  const buyLabels = (pack: PackDef, primary = false) => ({
    label: `${primary ? t.allCta : t.buy} · ${formatPackPrice(pack.amountCents)}`,
    pendingLabel: t.pending,
    ownedLabel: t.owned,
    ownedHref: mapHref,
    errorLabel: t.error,
  });

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1 className={styles.heroTitle}>
            {t.allTitle[0]}
            <br />
            {t.allTitle[1]}
          </h1>
          <p className={styles.heroLead}>{t.allLead}</p>

          <ul
            className={styles.includeList}
            aria-label={de ? 'All Berlin enthaelt' : 'All Berlin includes'}
          >
            {allIncludes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className={styles.heroActions}>
            <Link href="/pack/all-berlin" className={styles.heroDetailLink}>
              {t.details}
            </Link>
            <PackBuyButton
              packId={allBerlin.packId}
              packName={allBerlin.displayName}
              amountCents={allBerlin.amountCents}
              locale={loc}
              className={`${styles.buyButton} ${styles.heroBuyButton}`}
              errorClassName={styles.buyError}
              {...buyLabels(allBerlin, true)}
            />
            <p className={styles.savings}>{formatBundleSavings(loc)}</p>
            <PaymentMarks
              height={24}
              label={`${t.trust}: ${PAYMENT_MARK_NAMES.join(', ')}`}
              className={styles.payTrust}
            />
          </div>
        </div>

        <div className={styles.heroStage} aria-hidden="true">
          {heroArt.map((src, index) => (
            <Image
              key={src}
              src={src}
              alt=""
              width={420}
              height={560}
              sizes="(max-width: 760px) 34vw, 190px"
              priority={index === 0}
              className={`${styles.heroPack} ${styles[`heroPack${index + 1}`]}`}
            />
          ))}
        </div>
      </section>

      <section className={styles.catalog} aria-labelledby="packs-catalog-title">
        <div className={styles.catalogHead}>
          <h2 id="packs-catalog-title">{t.categoryTitle}</h2>
          <p>{t.categoryLead}</p>
        </div>

        <div className={styles.packGrid}>
          {categoryPacks.map((pack) => {
            const art = pack.slug ? categoryArt(pack.slug) : null;
            const href = `/pack/${packUrlSlug(pack)}`;

            return (
              <article key={pack.packId} className={styles.packTile}>
                <Link
                  href={href}
                  className={styles.packArtLink}
                  aria-label={`${pack.displayName} ${t.details}`}
                >
                  {art && (
                    <Image
                      src={art}
                      alt=""
                      width={420}
                      height={560}
                      // Capped at 210px (PacksOverview.module.css:341) and
                      // 178px below 560px (:494).
                      sizes="(max-width: 560px) 178px, 210px"
                      className={styles.packArt}
                    />
                  )}
                </Link>

                <div className={styles.packInfo}>
                  <h3 className={styles.packName}>{pack.displayName}</h3>
                  <p className={styles.spectrum}>{pack.spectrum[loc]}</p>
                  <p className={styles.desc}>{pack.description[loc]}</p>
                </div>

                <div className={styles.packActions}>
                  <Link href={href} className={styles.detailLink}>
                    {t.details}
                  </Link>
                  <PackBuyButton
                    packId={pack.packId}
                    packName={pack.displayName}
                    amountCents={pack.amountCents}
                    locale={loc}
                    className={styles.buyButton}
                    errorClassName={styles.buyError}
                    {...buyLabels(pack)}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
