import Image from '@/app/components/SiteImage';
import { CATALOG } from '@/lib/stripe-catalog';
import { categoryArt } from '@/lib/categoryArt';
import { type PackContentsIndex, formatPackPrice, bundleSavings } from '@/lib/pack/packDetail';
import { PaymentMarks, PAYMENT_MARK_NAMES } from './PaymentMarks';
import AllBerlinSheet from './AllBerlinSheet';
import styles from './AllBerlinBoard.module.css';

/* Shared offer: a visual hero on /packs and a compact upgrade on detail pages.
   The contents sheet opens only on request. */

// Reihenfolge des 3×3-Fächers: die Farben verteilen sich so, dass keine zwei
// gleichfarbigen Packs nebeneinander liegen.
const FAN: string[] = [
  'breakfast',
  'fine-dining',
  'pizza',
  'coffee',
  'drinks',
  'lunch',
  'dinner',
  'sweets',
  'fast-food',
];

interface Props {
  locale: 'de' | 'en';
  contents: PackContentsIndex;
  /** `hero` shows the pack fan and payment marks; `upsell` stays compact. */
  variant: 'hero' | 'upsell';
  headingLevel: 'h1' | 'h2';
  /** Erste Ansicht der Seite: alle neun Packs laden ohne Lazy-Loading. */
  priority?: boolean;
}

const copy = {
  de: {
    kickerUpsell: 'Lieber alles auf einmal',
    trust: 'Sicher bezahlen via Stripe',
  },
  en: {
    kickerUpsell: 'Want it all?',
    trust: 'Secure checkout via Stripe',
  },
} as const;

export default function AllBerlinBoard({
  locale,
  contents,
  variant,
  headingLevel,
  priority = false,
}: Props) {
  const t = copy[locale];
  const pack = CATALOG['all-berlin'];
  const Heading = headingLevel;
  const hero = variant === 'hero';
  const savings = bundleSavings(contents);

  return (
    <section
      className={`${styles.board} ${hero ? styles.boardHero : styles.boardUpsell}`}
      aria-labelledby="all-berlin-board-title"
    >
      <div className={styles.copy}>
        {!hero && <p className={styles.kicker}>{t.kickerUpsell}</p>}
        <Heading id="all-berlin-board-title" className={styles.title}>
          All{hero ? <br /> : ' '}Berlin
        </Heading>

        <p className={styles.lead}>
          {hero
            ? locale === 'de'
              ? 'Alle Must Eats für Berlin: was du wo bestellen solltest. Alle Kategorie-Packs und zukünftigen Karten inklusive.'
              : 'Every Must Eat in Berlin: what to order and where. All category packs and future cards included.'
            : locale === 'de'
              ? 'Alle Kategorie-Packs für Berlin. Neue Packs und Karten kommen ohne weiteren Kauf dazu.'
              : 'All category packs for Berlin. New packs and cards are included at no extra cost.'}
        </p>

        <div className={styles.actions}>
          <AllBerlinSheet
            locale={locale}
            contents={contents}
            triggerLabel={`${locale === 'de' ? 'All Berlin ansehen' : 'Explore All Berlin'} · ${formatPackPrice(pack.amountCents)}`}
          />
          <p className={styles.paymentNote}>
            {locale === 'de' ? 'Einmalzahlung, kein Abo' : 'One-time payment, no subscription'}
          </p>
          {hero && savings.savedCents > 0 && (
            <p className={styles.savings}>
              {locale === 'de'
                ? `${savings.percent} % günstiger als die verfügbaren Einzelpacks`
                : `${savings.percent}% less than the available packs bought separately`}
            </p>
          )}
          {hero && (
            <PaymentMarks
              height={24}
              label={`${t.trust}: ${PAYMENT_MARK_NAMES.join(', ')}`}
              className={styles.pay}
            />
          )}
        </div>
      </div>

      <div className={styles.stage} aria-hidden="true">
        <div className={styles.fan}>
          {(hero ? FAN : ['breakfast', 'pizza', 'sweets']).map((slug) => {
            const art = categoryArt(slug);
            return art ? (
              <Image
                key={slug}
                src={art}
                alt=""
                width={420}
                height={656}
                sizes="(max-width: 479px) 34vw, (max-width: 767.98px) 150px, 220px"
                priority={priority}
                className={styles.fanPack}
              />
            ) : null;
          })}
        </div>
      </div>
    </section>
  );
}
