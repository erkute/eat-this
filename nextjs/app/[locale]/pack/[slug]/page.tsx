import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { CATALOG } from '@/lib/stripe-catalog';
import { getRestaurantsByCategory, getCategoryBySlug, getPackContents } from '@/lib/sanity.server';
import { localizedCategoryName } from '@/lib/categories';
import { categoryArt } from '@/lib/categoryArt';
import { hreflangAlternates } from '@/lib/seo/metadata';
import { buildBrandedTitle } from '@/lib/seo/metadata-text';
import { routing } from '@/i18n/routing';
import {
  resolvePackByUrlSlug,
  packUrlSlug,
  formatPackPrice,
  buildPackTeaser,
} from '@/lib/pack/packDetail';
import PackBuyButton from './PackBuyButton';
import AllBerlinBoard from '@/app/components/AllBerlinBoard';
import { PaymentMarks, PAYMENT_MARK_NAMES } from '@/app/components/PaymentMarks';
import styles from './PackDetail.module.css';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// 24 Stunden. Die Frist ist nicht der Weg, auf dem Inhalte live gehen — das ist
// der Sanity-Webhook auf /api/revalidate. Hintergrund und Bedingung an dieser
// Zahl: SANITY_REVALIDATE_SECONDS in lib/constants.ts. Next verlangt hier einen
// statisch lesbaren Wert, deshalb die Zahl statt der Konstante.
export const revalidate = 86400;

// Nur die Kategorie-Packs haben eine Seite. All Berlin ist die Tafel auf
// /packs plus die „Was drin ist"-Sheet — /pack/all-berlin gibt es nicht mehr.
const categoryPacks = Object.values(CATALOG).filter((p) => p.type === 'category');

export async function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    categoryPacks.map((p) => ({ locale, slug: packUrlSlug(p) }))
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const pack = resolvePackByUrlSlug(slug);
  if (!pack || pack.type !== 'category' || !pack.slug) return {};
  const de = locale === 'de';
  const category = await getCategoryBySlug(pack.slug);
  const packTitleName = category
    ? localizedCategoryName(category, de ? 'de' : 'en')
    : pack.displayName;
  return {
    title: { absolute: buildBrandedTitle(`${packTitleName} Booster Pack`) },
    description: pack.description[de ? 'de' : 'en'],
    // Conversion page reached from the app — keep it out of the index so it
    // doesn't cannibalise the /kategorie SEO pages, but let links be followed.
    robots: { index: false, follow: true },
    // Packs are always bilingual (CATALOG ships de+en copy), so emit the full
    // de/en/x-default set like every other route instead of a bare canonical.
    alternates: hreflangAlternates(`/pack/${slug}`, de ? 'de' : 'en'),
  };
}

const copy = {
  de: {
    kicker: 'Booster Pack',
    pack: 'Pack',
    cta: 'Jetzt freischalten',
    pending: 'Weiter zu Stripe …',
    owned: 'Zur Map',
    error: 'Da ging was schief. Versuch es nochmal.',
    payment: 'Zahlungsarten',
    inside: 'Drin im Pack',
    insideLead:
      'Drei Spots zeigen wir. Der Rest bleibt verdeckt, bis der Pack auf deiner Map liegt.',
    covered: 'Verdeckt',
    more: 'Weitere Spots',
    moreWhere: 'Auf der Live-Map',
    map: '/map',
  },
  en: {
    kicker: 'Booster Pack',
    pack: 'Pack',
    cta: 'Unlock now',
    pending: 'Going to Stripe …',
    owned: 'Open map',
    error: 'Something went wrong. Please try again.',
    payment: 'Payment methods',
    inside: 'Inside the pack',
    insideLead: 'We show three spots. The rest stays covered until the pack is on your map.',
    covered: 'Covered',
    more: 'More spots',
    moreWhere: 'On the live map',
    map: '/en/map',
  },
} as const;

export default async function PackDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const loc: 'de' | 'en' = locale === 'de' ? 'de' : 'en';
  const t = copy[loc];

  const pack = resolvePackByUrlSlug(slug);
  if (!pack || pack.type !== 'category' || !pack.slug) notFound();
  const categorySlug = pack.slug;
  const [category, restaurants, packContents] = await Promise.all([
    getCategoryBySlug(categorySlug),
    getRestaurantsByCategory(categorySlug),
    getPackContents(),
  ]);
  const teaser = buildPackTeaser(restaurants);
  const contents = packContents.byCategory[categorySlug];
  // Rows the teaser names or covers; everything past them is the "more" row.
  // It deliberately never says how many — see formatPackContents.
  const teased = teaser.revealed.length + teaser.locked.length;
  const more = contents ? contents.spots - teased : 0;
  const art = categoryArt(categorySlug);
  const heroName = category ? localizedCategoryName(category, loc) : pack.displayName;

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <section className={styles.hero}>
          <div className={styles.copy}>
            <p className={styles.kicker}>{t.kicker}</p>
            <h1 className={styles.name}>
              {heroName}
              <br />
              {t.pack}
            </h1>
            <p className={styles.spectrum}>{pack.spectrum[loc]}</p>
            <p className={styles.sub}>{pack.description[loc]}</p>

            <div className={styles.actions}>
              <PackBuyButton
                packId={pack.packId}
                packName={pack.displayName}
                amountCents={pack.amountCents}
                locale={loc}
                className={styles.cta}
                errorClassName={styles.ctaError}
                label={`${t.cta} · ${formatPackPrice(pack.amountCents)}`}
                pendingLabel={t.pending}
                ownedLabel={t.owned}
                ownedHref={t.map}
                errorLabel={t.error}
              />
              <PaymentMarks
                height={24}
                label={`${t.payment}: ${PAYMENT_MARK_NAMES.join(', ')}`}
                className={styles.paymentLogos}
              />
            </div>
          </div>

          {art && (
            <div className={styles.stage}>
              <Image
                src={art}
                alt={`${heroName} ${t.pack}`}
                width={420}
                height={656}
                sizes="(max-width: 759px) 66vw, 400px"
                priority
                className={styles.packArt}
              />
            </div>
          )}
        </section>

        {teaser.revealed.length > 0 && (
          <section className={styles.section} aria-labelledby="pack-inside-title">
            <div className={styles.sectionHead}>
              <h2 id="pack-inside-title" className={styles.sectionTitle}>
                <span className={styles.mk} aria-hidden="true" />
                {t.inside}
              </h2>
              <p className={styles.sectionLead}>{t.insideLead}</p>
            </div>

            <ol className={styles.list}>
              {teaser.revealed.map((r, i) => (
                <li key={`r${i}`} className={styles.row}>
                  <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.rn}>{r.name}</span>
                  {r.district && <span className={styles.mn}>{r.district}</span>}
                </li>
              ))}
              {teaser.locked.map((l, i) => (
                <li key={`l${i}`} className={`${styles.row} ${styles.rowLocked}`}>
                  <span className={styles.num}>
                    {String(teaser.revealed.length + i + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.rn}>
                    <span className={`${styles.covered} ${i % 2 ? styles.coveredLong : ''}`}>
                      {t.covered}
                    </span>
                  </span>
                  {l.district && <span className={styles.mn}>{l.district}</span>}
                </li>
              ))}
              {more > 0 && (
                <li className={`${styles.row} ${styles.rowLocked}`}>
                  <span className={styles.num}>+</span>
                  <span className={`${styles.rn} ${styles.rnMore}`}>{t.more}</span>
                  <span className={styles.mn}>{t.moreWhere}</span>
                </li>
              )}
            </ol>
          </section>
        )}

        <div className={styles.upsell}>
          <AllBerlinBoard
            locale={loc}
            contents={packContents.allBerlin}
            variant="upsell"
            headingLevel="h2"
          />
        </div>
      </div>
    </main>
  );
}
