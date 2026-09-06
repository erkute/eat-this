import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { CATALOG } from '@/lib/stripe-catalog';
import { getCategoryBySlug, getPackContents } from '@/lib/sanity.server';
import { localizedCategoryName } from '@/lib/categories';
import { categoryArt } from '@/lib/categoryArt';
import { hreflangAlternates } from '@/lib/seo/metadata';
import { buildBrandedTitle } from '@/lib/seo/metadata-text';
import { routing } from '@/i18n/routing';
import { resolvePackByUrlSlug, packUrlSlug, formatPackPrice } from '@/lib/pack/packDetail';
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
    soon: 'Kommt bald',
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
    soon: 'Coming soon',
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
  const [category, packContents] = await Promise.all([
    getCategoryBySlug(categorySlug),
    getPackContents(),
  ]);

  /* Ein Pack ohne Karte ist eine leere Schachtel — Fine Dining stand am
     06.09.2026 auf null. Die Seite bleibt (die Kategorie kommt ja), der
     Kaufknopf nicht. Die Zahl selbst steht nirgends: das Produkt nennt seine
     Zahlen nicht, sie beantwortet hier nur diese eine Ja/Nein-Frage. */
  const empty = (packContents.byCategory[categorySlug]?.mustEats ?? 0) === 0;
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
              {empty ? (
                <p className={styles.soon}>{t.soon}</p>
              ) : (
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
              )}
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

        <div className={styles.upsell}>
          <AllBerlinBoard locale={loc} variant="upsell" headingLevel="h2" />
        </div>
      </div>
    </main>
  );
}
