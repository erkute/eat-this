import type { InitialMustEatsData } from '@/lib/map/initial-surface-data';
import MustEatsGallery from './MustEatsGallery';
import MustEatsOnboarding from './MustEatsOnboarding';
import SiteFooter from './SiteFooter';
import styles from './MustEatsSection.module.css';

interface Props {
  initialMapData: InitialMustEatsData;
  locale: 'de' | 'en';
}

// Server-rendered copy uses locale-keyed strings (a server component can't call
// the client useTranslation). The band headings carry live counts, and the
// shared t() cannot format ICU placeholders — it answers an unformatted one
// with the key path (see MustEatsOnboarding) — so the counts are composed here
// and handed to the client island as finished strings.
const COPY = {
  de: {
    kicker: 'In Berlin',
    title: ['Must', 'Eats'],
    sub: 'Unsere klare Empfehlung: die Gerichte, die du in Berlin bestellen musst. Ein Teil liegt offen. Den Rest deckst du vor Ort auf.',
    statCards: 'Karten',
    statOpen: 'liegen offen',
    statCovered: 'vor Ort',
    openKicker: 'Must Eat?',
    openTitle: 'Nicht nur wissen, wo du essen sollst. Sondern was.',
    openBody:
      'Must Eats sind die Gerichte, die du nicht verpassen solltest. Geh hin, deck sie auf und sammle sie.',
    coveredKicker: 'Noch verdeckt',
    coveredTitle: (n: number) => `${n} warten vor Ort.`,
    coveredBody: 'Diese Karten deckst du am Spot auf. Dann gehören sie dir.',
    coveredSpotsLabel: 'Diese Spots halten sie',
    closeKicker: 'Und jetzt',
    closeTitle: 'Hol sie dir.',
    closeBody:
      'Alle Spots und ihre Must Eats liegen auf der Map. Mit einem Booster Pack schaltest du weitere frei. Und es kommen immer wieder neue dazu.',
    closeCta: 'Zur Map',
    closeSecondary: 'Booster Packs ansehen',
    headCta: 'Zur Map',
  },
  en: {
    kicker: 'In Berlin',
    title: ['Must', 'Eats'],
    sub: 'Our clear picks: the dishes you have to order in Berlin. Some are face-up. You flip the rest on site.',
    statCards: 'cards',
    statOpen: 'face-up',
    statCovered: 'on site',
    openKicker: 'Must Eat?',
    openTitle: 'Not just where you eat. What.',
    openBody: 'Must Eats are the dishes you should not miss. Go there, flip them and collect them.',
    coveredKicker: 'Still face-down',
    coveredTitle: (n: number) => `${n} are waiting on site.`,
    coveredBody: 'You flip these cards at the spot. Then they are yours.',
    coveredSpotsLabel: 'The spots holding them',
    closeKicker: 'Now go',
    closeTitle: 'Come and get them.',
    closeBody:
      'Every spot and its Must Eats live on the map. A Booster Pack unlocks more. And new ones keep coming.',
    closeCta: 'To the map',
    closeSecondary: 'See Booster Packs',
    headCta: 'To the map',
  },
} as const;

const CARD_BACK = '/pics/card-back.webp?v=7';
// One bag, not the full nine-pack fan. The page advertises the Must Eats; a
// wall of pack art at the end made the last impression "shop" instead of
// "these dishes", and the same offer is already on slide 3 of the onboarding
// and in the burger menu. The bag is the star of the closing ink board, on the
// phone above the copy — it used to be hidden there and sat alone at the far
// right on desktop.
const PACK_ART = '/pics/booster/booster.webp';

export default function MustEatsSection({ initialMapData, locale }: Props) {
  const c = COPY[locale];
  const mapHref = locale === 'en' ? '/en/map' : '/map';
  const packsHref = locale === 'en' ? '/en/packs' : '/packs';

  const faceUp = new Set(initialMapData.revealedMustEatIds);
  const total = initialMapData.mustEats.length;
  const openCount = initialMapData.mustEats.filter((m) => faceUp.has(m._id)).length;
  const coveredCount = total - openCount;

  // The catalog is ordered face-up first, so the lead cards are dish art.
  const heroCards = initialMapData.mustEats.slice(0, 3);

  const stats: Array<[string, string]> = [
    [String(total), c.statCards],
    [String(openCount), c.statOpen],
    [String(coveredCount), c.statCovered],
  ];

  return (
    <main className={`page ${styles.page}`} data-page="must-eats" data-must-eats="">
      <div className={styles.head}>
        <div className={styles.headCopy}>
          <p className={styles.kicker}>{c.kicker}</p>
          <h1 className={styles.title}>
            {c.title[0]}
            <br />
            {c.title[1]}
          </h1>
          <p className={styles.sub}>{c.sub}</p>

          {/* The numbers are the ad. A visitor who sees "24 / 10 / 14" knows
              the shape of the thing before reading a word of body copy. */}
          <dl className={styles.stats}>
            {stats.map(([value, label]) => (
              <div key={label} className={styles.stat}>
                <dt className={styles.statLabel}>{label}</dt>
                <dd className={styles.statValue}>{value}</dd>
              </div>
            ))}
          </dl>

          {/* Gelb ist der Weg zur Map, der Ring erklärt das Spiel. Beide auf
              einer Linie, wie Knopf und „Was drin ist" auf der All-Berlin-Tafel. */}
          <div className={styles.headActions}>
            <a href={mapHref} className={styles.headCta}>
              {c.headCta}
            </a>
            <MustEatsOnboarding initialMapData={initialMapData} tone="ink" />
          </div>
        </div>

        <div className={styles.heroDeck} aria-hidden="true">
          {heroCards.map((m, index) => (
            <div key={m._id} className={`${styles.heroCard} ${styles[`heroCard${index + 1}`]}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.image ?? CARD_BACK} alt="" loading={index === 0 ? 'eager' : 'lazy'} />
            </div>
          ))}
        </div>
      </div>

      <MustEatsGallery
        initialMapData={initialMapData}
        copy={{
          openKicker: c.openKicker,
          openTitle: c.openTitle,
          openBody: c.openBody,
          coveredKicker: c.coveredKicker,
          coveredTitle: c.coveredTitle(coveredCount),
          coveredBody: c.coveredBody,
          coveredSpotsLabel: c.coveredSpotsLabel,
        }}
      />

      <div className={styles.close}>
        <div className={styles.closeCopy}>
          <div className={styles.closeK}>{c.closeKicker}</div>
          <h2 className={styles.closeTitle}>{c.closeTitle}</h2>
          <p className={styles.closeBody}>{c.closeBody}</p>
          <div className={styles.closeActions}>
            <a href={mapHref} className={styles.closeCta}>
              {c.closeCta}
            </a>
            <a href={packsHref} className={styles.closeSecondary}>
              {c.closeSecondary}
            </a>
          </div>
        </div>

        <div className={styles.packShot} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PACK_ART} alt="" loading="lazy" />
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
