import Image from '@/app/components/SiteImage';
import { categoryArt } from '@/lib/categoryArt';
import { formatPackPrice } from '@/lib/pack/packDetail';
import { CATALOG } from '@/lib/stripe-catalog';
import PackBuyButton from '@/app/[locale]/pack/[slug]/PackBuyButton';
import { PaymentMarks, PAYMENT_MARK_NAMES } from './PaymentMarks';
import styles from './AllBerlinBoard.module.css';

/* Shared offer: a visual hero on /packs and a compact upgrade on detail pages.
   Details and checkout stay on the page. */

// Shared color order for the wide fan and its two-row mobile version.
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
  variant,
  headingLevel,
  priority = false,
}: Props) {
  const t = copy[locale];
  const Heading = headingLevel;
  const hero = variant === 'hero';
  const pack = CATALOG['all-berlin'];
  const benefits = locale === 'de' ? [
    ['Alle Packs', 'Alle Kategorie-Packs für Berlin – von Frühstück bis Fine Dining.'],
    ['Sofort offen', 'Alle Must Eats sind direkt auf deiner Map aufgedeckt.'],
    ['Wächst mit', 'Neue Packs und Must Eats kommen ohne weiteren Kauf dazu.'],
  ] : [
    ['Every pack', 'Every category pack for Berlin, from breakfast to fine dining.'],
    ['Already revealed', 'Every Must Eat is revealed on your map right away.'],
    ['Keeps growing', 'New packs and Must Eats are added at no extra cost.'],
  ];

  return (
    <section
      className={hero ? styles.board : `${styles.board} ${styles.boardUpsell}`}
      aria-labelledby="all-berlin-board-title"
    >
      <div className={styles.copy}>
        {!hero && <p className={`et-label ${styles.kicker}`}>{t.kickerUpsell}</p>}
        <Heading id="all-berlin-board-title" className={styles.title}>
          All Berlin
        </Heading>

        <p className={styles.lead}>
          {locale === 'de'
            ? 'Was du wo bestellen solltest. In ganz Berlin.'
            : 'What to order and where. Across Berlin.'}
        </p>


      </div>

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
                sizes="(max-width: 479px) 34vw, (max-width: 767.98px) 150px, 220px"
                priority={priority}
                className={styles.fanPack}
              />
            ) : null;
          })}
        </div>
      </div>
      <div className={styles.benefits}>
        {benefits.map(([title, body]) => <div key={title}>
          <h3>{title}</h3><p>{body}</p>
        </div>)}
      </div>
      <div className={styles.actions}>
          <PackBuyButton
            className={styles.buyButton}
            packId={pack.packId}
            packName={pack.displayName}
            amountCents={pack.amountCents}
            locale={locale}
            label={`${locale === 'de' ? 'All Berlin freischalten' : 'Unlock All Berlin'} · ${formatPackPrice(pack.amountCents)}`}
            pendingLabel={locale === 'de' ? 'Weiter zu Stripe …' : 'Going to Stripe …'}
            ownedLabel={locale === 'de' ? 'Zur Map' : 'Open map'}
            ownedHref="/map"
            errorLabel={locale === 'de' ? 'Da ging was schief. Versuch es nochmal.' : 'Something went wrong. Please try again.'}
            errorClassName={styles.error}
          />
          <p className={styles.paymentNote}>
            {locale === 'de' ? 'Einmalzahlung, kein Abo' : 'One-time payment, no subscription'}
          </p>
          <PaymentMarks
              height={24}
              label={`${t.trust}: ${PAYMENT_MARK_NAMES.join(', ')}`}
              className={styles.pay}
            />
        </div>
    </section>
  );
}
