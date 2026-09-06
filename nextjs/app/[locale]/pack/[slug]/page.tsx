import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { CATALOG } from '@/lib/stripe-catalog';
import { getMustEatsByCategory, getCategoryBySlug } from '@/lib/sanity.server';
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
    inside: 'Drin im Pack',
    insideLead:
      'Wo die Karten liegen, sagen wir. Was auf ihnen steht, steht auf ihnen — bis sie in deinem Album liegen.',
    empty: 'An dieser Kategorie hängt noch keine Karte. Sie kommen.',
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
    inside: 'Inside the pack',
    insideLead:
      'We tell you where the cards are. What is on them stays on them — until they are in your album.',
    empty: 'No card on this category yet. They are coming.',
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
  const [category, cards] = await Promise.all([
    getCategoryBySlug(categorySlug),
    getMustEatsByCategory(categorySlug),
  ]);

  /* Ein Pack ohne Karte ist eine leere Schachtel — Fine Dining stand am
     06.09.2026 auf null. Die Seite bleibt (die Kategorie kommt ja), der
     Kaufknopf nicht. Wie viele Karten drin sind, sagt die Seite nicht: das
     Produkt nennt seine Zahlen nicht. */
  const empty = cards.length === 0;
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

        <section className={styles.section} aria-labelledby="pack-inside-title">
          <div className={styles.sectionHead}>
            <h2 id="pack-inside-title" className={styles.sectionTitle}>
              <span className={styles.mk} aria-hidden="true" />
              {t.inside}
            </h2>
            <p className={styles.sectionLead}>{cards.length > 0 ? t.insideLead : t.empty}</p>
          </div>

          {/* Jede Zeile ist eine KARTE, nicht ein Spot: die Spots liegen seit
              dem 06.09.2026 ohnehin frei auf der Map. Die Nummer links ist die
              gedruckte Kartennummer (`mustEat.order`) — der Schluessel, nach
              dem ein Sammler seinen Stapel sortiert. Der Ort steht dabei, das
              Gericht nicht: das ist das Produkt. */}
          {cards.length > 0 && (
            <ol className={styles.list}>
              {cards.map((card, i) => (
                <li key={card._id} className={styles.row}>
                  <span className={styles.num}>{String(card.order ?? i + 1).padStart(3, '0')}</span>
                  <span className={styles.rn}>{card.name}</span>
                  {card.district && <span className={styles.mn}>{card.district}</span>}
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className={styles.upsell}>
          <AllBerlinBoard locale={loc} variant="upsell" headingLevel="h2" />
        </div>
      </div>
    </main>
  );
}
