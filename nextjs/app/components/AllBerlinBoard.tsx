import Image from '@/app/components/SiteImage';
import { CATALOG } from '@/lib/stripe-catalog';
import { categoryArt } from '@/lib/categoryArt';
import {
  type PackContentsIndex,
  formatPackPrice,
  formatBundleSavings,
} from '@/lib/pack/packDetail';
import PackBuyButton from '@/app/[locale]/pack/[slug]/PackBuyButton';
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
    kickerHero: 'Alle Packs',
    kickerUpsell: 'Lieber alles auf einmal',
    cta: 'Freischalten',
    pending: 'Weiter zu Stripe …',
    owned: 'Zur Map',
    error: 'Da ging was schief. Versuch es nochmal.',
    trust: 'Sicher bezahlen via Stripe',
    map: '/map',
  },
  en: {
    kickerHero: 'Every pack',
    kickerUpsell: 'Want it all?',
    cta: 'Unlock',
    pending: 'Going to Stripe …',
    owned: 'Open map',
    error: 'Something went wrong. Please try again.',
    trust: 'Secure checkout via Stripe',
    map: '/map',
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

  return (
    <section
      className={`${styles.board} ${hero ? styles.boardHero : styles.boardUpsell}`}
      aria-labelledby="all-berlin-board-title"
    >
      <div className={styles.copy}>
        <p className={styles.kicker}>{hero ? t.kickerHero : t.kickerUpsell}</p>
        <Heading id="all-berlin-board-title" className={styles.title}>
          All{hero ? <br /> : ' '}Berlin
        </Heading>

        {hero && (
          <p className={styles.benefitTitle}>
            {locale === 'de' ? 'Was bestellen? Und wo?' : 'What to order? And where?'}
          </p>
        )}
        <p className={styles.lead}>
          {hero ? (
            locale === 'de' ? (
              <>
                Schalte <strong>alle Must-Eat-Karten</strong> für Berlin frei: konkrete Gerichte,
                die passenden Restaurants und ihre Standorte auf deiner Map.{' '}
                <strong>Alle Kategorie-Packs</strong> sind enthalten. Neue Karten bekommst du{' '}
                <strong>ohne weiteren Kauf</strong> dazu.
              </>
            ) : (
              <>
                Unlock <strong>every Must Eat card</strong> for Berlin: specific dishes, the
                restaurants serving them and their locations on your map.{' '}
                <strong>Every category pack</strong> is included. New cards are added{' '}
                <strong>without another purchase</strong>.
              </>
            )
          ) : locale === 'de' ? (
            'Alle Kategorie-Packs. Neue Must-Eat-Karten ohne weiteren Kauf.'
          ) : (
            'Every category pack. New Must Eat cards without another purchase.'
          )}
        </p>

        <div className={styles.actions}>
          <PackBuyButton
            packId={pack.packId}
            packName={pack.displayName}
            amountCents={pack.amountCents}
            locale={locale}
            className={styles.cta}
            errorClassName={styles.ctaError}
            label={`${t.cta} · ${formatPackPrice(pack.amountCents)}`}
            pendingLabel={t.pending}
            ownedLabel={t.owned}
            ownedHref={t.map}
            errorLabel={t.error}
          />
          <p className={styles.paymentNote}>
            {locale === 'de' ? 'Einmalzahlung, kein Abo' : 'One-time payment, no subscription'}
          </p>
          {hero && formatBundleSavings(locale, contents) && (
            <p className={styles.savings}>{formatBundleSavings(locale, contents)}</p>
          )}
          <AllBerlinSheet locale={locale} contents={contents} />
          {hero && (
            <PaymentMarks
              height={24}
              label={`${t.trust}: ${PAYMENT_MARK_NAMES.join(', ')}`}
              className={styles.pay}
            />
          )}
        </div>
      </div>

      {hero && (
        <div className={styles.stage} aria-hidden="true">
          <div className={styles.fan}>
            {FAN.map((slug) => {
              const art = categoryArt(slug);
              return art ? (
                <Image
                  key={slug}
                  src={art}
                  alt=""
                  width={420}
                  height={656}
                  sizes="(max-width: 767.98px) 80px, 200px"
                  priority={priority}
                  className={styles.fanPack}
                />
              ) : null;
            })}
          </div>
        </div>
      )}
    </section>
  );
}
