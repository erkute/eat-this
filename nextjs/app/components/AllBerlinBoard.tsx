import Image from 'next/image';
import { CATALOG } from '@/lib/stripe-catalog';
import { categoryArt } from '@/lib/categoryArt';
import { formatPackPrice, formatBundleSavings } from '@/lib/pack/packDetail';
import PackBuyButton from '@/app/[locale]/pack/[slug]/PackBuyButton';
import { PaymentMarks, PAYMENT_MARK_NAMES } from './PaymentMarks';
import AllBerlinSheet from './AllBerlinSheet';
import styles from './AllBerlinBoard.module.css';

/* Die All-Berlin-Tafel: EIN Objekt für das eine Angebot, das überall gleich
   aussieht — Aufmacher auf /packs und Upsell unter jedem Kategorie-Pack.
   „Was drin ist" öffnet die AllBerlinSheet mit den neun Packs; eine eigene
   Seite hat All Berlin nicht mehr. Dieselbe Ink-Tafel wie Fakten-Tafel und Must-Eat-Sheet:
   Ink-Fläche, gelbe Providence-Labels in Versalien, weiße Werte, ein gelber
   Knopf. Vorher hatte jede der drei Stellen ihre eigene Fassung. */

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
  /** `hero` trägt Lead, Inhaltsliste und Zahlungsarten; `upsell` ist die kurze Fassung. */
  variant: 'hero' | 'upsell';
  headingLevel: 'h1' | 'h2';
  /** Erste Ansicht der Seite: alle neun Packs laden ohne Lazy-Loading. */
  priority?: boolean;
}

const copy = {
  de: {
    kickerHero: 'Alles auf einmal · alle Packs',
    kickerUpsell: 'Lieber alles auf einmal',
    includes: [
      'Jede Must-Eat-Karte, die es gibt',
      'Und jede, die noch dazukommt',
      'Ohne einen Schritt vor die Tür',
    ],
    includesLabel: 'All Berlin enthält',
    cta: 'All Berlin freischalten',
    pending: 'Weiter zu Stripe …',
    owned: 'Zur Map',
    error: 'Da ging was schief. Versuch es nochmal.',
    trust: 'Sicher bezahlen via Stripe',
    map: '/map',
  },
  en: {
    kickerHero: 'Everything at once · every pack',
    kickerUpsell: 'Rather everything at once',
    includes: [
      'Every Must-Eat card there is',
      'And every one still to come',
      'Without a step out the door',
    ],
    includesLabel: 'All Berlin includes',
    cta: 'Unlock All Berlin',
    pending: 'Going to Stripe …',
    owned: 'Open map',
    error: 'Something went wrong. Please try again.',
    trust: 'Secure checkout via Stripe',
    map: '/en/map',
  },
} as const;

export default function AllBerlinBoard({ locale, variant, headingLevel, priority = false }: Props) {
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
          All
          <br />
          Berlin
        </Heading>

        {hero ? (
          <>
            <p className={styles.lead}>{pack.description[locale]}</p>
            <ul className={styles.facts} aria-label={t.includesLabel}>
              {t.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className={styles.lead}>{pack.spectrum[locale]}</p>
        )}

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
          <p className={styles.savings}>{formatBundleSavings(locale)}</p>
          <AllBerlinSheet locale={locale} />
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
          {FAN.map((slug) => {
            const art = categoryArt(slug);
            return art ? (
              <Image
                key={slug}
                src={art}
                alt=""
                width={420}
                height={656}
                sizes="(max-width: 759px) 34vw, 200px"
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
