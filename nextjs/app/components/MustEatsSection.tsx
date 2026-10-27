import { Link } from '@/i18n/navigation';
import type { InitialMustEatsData } from '@/lib/map/initial-surface-data';
import { sortByCardNumber } from '@/lib/map/cardOrder';
import MustEatsGallery from './MustEatsGallery';
import MustEatsOnboarding from './MustEatsOnboarding';
import SiteFooter from './SiteFooter';
import styles from './MustEatsSection.module.css';
import { mustEatCardSrc, mustEatCardSrcSet } from '@/lib/must-eat/cardImage';

interface Props {
  initialMapData: InitialMustEatsData;
  locale: 'de' | 'en';
}

// Server-rendered copy uses locale-keyed strings (a server component can't call
// the client useTranslation). The set heading carries a live count, and the
// shared t() cannot format ICU placeholders — it answers an unformatted one
// with the key path (see MustEatsOnboarding) — so the counts are composed here
// and handed to the client island as finished strings.
const COPY = {
  de: {
    kicker: 'In Berlin',
    title: ['Must', 'Eats'],
    sub: 'Unsere Auswahl der Gerichte, die du in Berlin bestellen solltest. Einige sind bereits aufgedeckt, die anderen entdeckst du direkt am Spot.',
    statCards: 'Karten',
    statOpen: 'liegen offen',
    statCovered: 'vor Ort',
    numberLabel: 'Nr.',
    openKicker: 'Must Eat?',
    // Wörtlich aus /about (Betreiber, 15.10.2026), EN ebenso.
    openTitle: 'Weil Entdecken mehr Spaß macht als Suchen.',
    openBody:
      'Must Eats sind die Gerichte, für die sich der Weg durch Berlin lohnt. Am Spot bestellst du das Gericht und deckst seine Karte auf. So wächst deine Sammlung mit jedem Teller.',
    setKicker: 'Das Set',
    coveredTitle: (n: number) => `${n} warten vor Ort.`,
    coveredBody: 'Hinter jeder Karte steckt unsere Empfehlung — ein Gericht, das du probieren musst. Bist du am Spot, drehst du sie mit einem Tap um. Dann liegt sie in deinem Deck.',
    coveredLabel: 'Verdeckt',
    spotAria: 'Spot-Seite öffnen',
    mapAria: 'auf der Map zeigen',
    setMore: 'Alle Karten zeigen',
    closeKicker: 'Und jetzt',
    closeTitle: 'Hol sie dir.',
    closeBody:
      'Jedes Must Eat gehört zu einem Spot auf der Map. Einige sind schon aufgedeckt, die anderen entdeckst du vor Ort — oder du schaltest sie mit einem Booster Pack frei. Und es kommen laufend neue dazu.',
    closeCta: 'Zur Map',
    closeSecondary: 'Booster Packs ansehen',
    headCta: 'Zur Map',
  },
  en: {
    kicker: 'In Berlin',
    title: ['Must', 'Eats'],
    sub: 'Our pick of the dishes you should order in Berlin. Some are already face-up, the rest you discover right at the spot.',
    statCards: 'cards',
    statOpen: 'face-up',
    statCovered: 'on site',
    numberLabel: 'No.',
    openKicker: 'Must Eat?',
    openTitle: 'Because discovering is more fun than searching.',
    openBody:
      'Must Eats are the dishes worth crossing Berlin for. At the spot you order the dish and flip its card. Your collection grows with every plate.',
    setKicker: 'The set',
    coveredTitle: (n: number) => `${n} are waiting on site.`,
    coveredBody: 'Behind every card is our recommendation — a dish you have to try. Once you are at the spot, one tap flips it. Then it is in your deck.',
    coveredLabel: 'Face-down',
    spotAria: 'open the spot page',
    mapAria: 'show on the map',
    setMore: 'Show all cards',
    closeKicker: 'Now go',
    closeTitle: 'Come and get them.',
    closeBody:
      'Every Must Eat belongs to a spot on the map. Some are already face-up, the rest you discover at the spot — or unlock them with a Booster Pack. And new ones keep coming.',
    closeCta: 'To the map',
    closeSecondary: 'See Booster Packs',
    headCta: 'To the map',
  },
} as const;

// One bag, not the full nine-pack fan. The page advertises the Must Eats; a
// wall of pack art at the end made the last impression "shop" instead of
// "these dishes", and the same offer is already on slide 3 of the onboarding
// and in the burger menu.
const PACK_ART = '/pics/home/starter-pack-front.webp';

export default function MustEatsSection({ initialMapData, locale }: Props) {
  const c = COPY[locale];
  const mapHref = '/map';
  const packsHref = '/packs';

  const faceUp = new Set(initialMapData.revealedMustEatIds);
  const total = initialMapData.mustEats.length;
  const openCount = initialMapData.mustEats.filter((m) => faceUp.has(m._id)).length;
  const coveredCount = total - openCount;

  // Das Titelbild ist die offene Karte mit der kleinsten Nummer — die Seite
  // zählt von dort an, wie das Set weiter unten.
  const cover = sortByCardNumber(initialMapData.mustEats.filter((m) => faceUp.has(m._id) && m.image))[0];

  const stats: Array<[string, string]> = [
    [String(total), c.statCards],
    [String(openCount), c.statOpen],
    [String(coveredCount), c.statCovered],
  ];

  return (
    <main className={`page ${styles.page}`} data-page="must-eats" data-must-eats="">
      <nav className={`${styles.wrap} ${styles.flowNav}`} aria-label={locale === 'de' ? 'Must Eats und Packs' : 'Must Eats and packs'}>
        <Link href="/must-eats" aria-current="page">Must Eats</Link>
        <Link href="/packs">Booster Packs</Link>
      </nav>
      <header className={`${styles.wrap} ${styles.head}`} data-cover={cover ? '' : undefined}>
        <p className={`et-label ${styles.kicker}`}>{c.kicker}</p>
        <h1 className={styles.title}>
          {c.title.join(' ')}
        </h1>

        {cover && (
          <figure className={styles.cover} aria-hidden="true">
            {/* Daumennagel statt Original: die Titelkarte ist am Telefon ~130 px,
                am Desktop höchstens 400 px breit. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              sizes="(max-width: 767px) 38vw, 400px"
              srcSet={mustEatCardSrcSet(cover.image)}
              src={mustEatCardSrc(cover.image, 440)}
              alt=""
              width={760}
              height={1044}
              fetchPriority="high"
            />
          </figure>
        )}

        <p className={styles.sub}>{c.sub}</p>

        {/* The numbers are the ad. A visitor who sees "39 / 8 / 31" knows the
            shape of the thing before reading a word of body copy. */}
        {total > 0 && (
          <dl className={styles.stats}>
            {stats.map(([value, label]) => (
              <div key={label} className={styles.stat}>
                <dt className={styles.statLabel}>{label}</dt>
                <dd className={styles.statValue}>{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className={styles.actions}>
          <Link href={mapHref} className="et-btn">
            {c.headCta}
          </Link>
          <MustEatsOnboarding initialMapData={initialMapData} tone="ink" />
        </div>
      </header>

      <MustEatsGallery
        initialMapData={initialMapData}
        copy={{
          numberLabel: c.numberLabel,
          openKicker: c.openKicker,
          openTitle: c.openTitle,
          openBody: c.openBody,
          setKicker: c.setKicker,
          coveredTitle: c.coveredTitle(coveredCount),
          coveredBody: c.coveredBody,
          coveredLabel: c.coveredLabel,
          spotAria: c.spotAria,
          mapAria: c.mapAria,
          setMore: c.setMore,
        }}
      />

      <section className={`${styles.wrap} ${styles.close}`}>
        <div className={styles.closeCopy}>
          <p className={`et-label ${styles.kicker}`}>{c.closeKicker}</p>
          <h2 className={styles.closeTitle}>{c.closeTitle}</h2>
          <p className={styles.closeBody}>{c.closeBody}</p>
          <div className={styles.actions}>
            <Link href={mapHref} className="et-btn">
              {c.closeCta}
            </Link>
            <Link href={packsHref} className="et-btn">
              {c.closeSecondary}
            </Link>
          </div>
        </div>

        <div className={styles.packShot} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PACK_ART} alt="" loading="lazy" width={945} height={1491} />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
