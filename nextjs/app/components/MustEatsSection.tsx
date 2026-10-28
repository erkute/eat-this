import { Link } from '@/i18n/navigation';
import type { InitialMustEatsData } from '@/lib/map/initial-surface-data';
import { sortByCardNumber } from '@/lib/map/cardOrder';
import MustEatsGallery from './MustEatsGallery';
import MustEatsOnboarding from './MustEatsOnboarding';
import MustEatsStarterButton from './MustEatsStarterButton';
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
// Seitentext wörtlich von Ersan (28.10.2026), EN sinngemäß danach.
const COPY = {
  de: {
    kicker: 'Berlin',
    title: ['Must', 'Eats'],
    sub: 'Berlin hat viel auf der Karte. Wir sagen dir, was du bestellen solltest. Entdecke unsere Must Eats und sammle die Empfehlungen als Karten in deinem eigenen Deck.',
    howItWorks: 'So funktioniert’s',
    numberLabel: 'Nr.',
    openKicker: 'Schon aufgedeckt',
    openTitle: 'Das solltest du bestellen.',
    openBody:
      'Hier bekommst du einen ersten Vorgeschmack. Jede Karte zeigt dir, was wir empfehlen und wo du es findest.',
    setKicker: 'Vor Ort entdecken',
    coveredTitle: (n: number) => `${n} gute Gründe, loszugehen.`,
    coveredBody: (n: number) =>
      `Weitere ${n} Karten sind noch verdeckt. Such dir auf der Map einen Spot aus und schau vorbei. Vor Ort deckst du die Karte mit einem Tap auf und erfährst, was du dort bestellen solltest. Danach gehört sie zu deinem Deck.`,
    spotAria: 'Spot-Seite öffnen',
    mapAria: 'auf der Map zeigen',
    setMore: 'Alle Karten anzeigen',
    // Gast: das Konto ist der nächste Schritt, nicht die Map.
    closeGuestKicker: 'Dein Starter Pack',
    closeGuestTitle: 'Deine Sammlung beginnt hier.',
    closeGuestBody:
      'Erstelle dein Konto und starte mit 20 Must Eats. Alle 20 Karten liegen sofort offen in deinem Deck. Und weil Berlin noch einiges auf der Karte hat, kommen laufend neue Empfehlungen dazu.',
    closeGuestCta: 'Konto erstellen',
    // Mit Konto ist die Sammlung längst angefangen: Map und Booster Packs.
    closeKicker: 'Und jetzt',
    closeTitle: 'Hol sie dir.',
    closeBody:
      'Jedes Must Eat gehört zu einem Spot auf der Map. Wer nicht bis zum nächsten Besuch warten will, deckt Karten mit einem Booster Pack auf. Und es kommen laufend neue dazu.',
    closeCta: 'Zur Map',
    closeSecondary: 'Booster Packs ansehen',
    headCta: 'Zur Map',
  },
  en: {
    kicker: 'Berlin',
    title: ['Must', 'Eats'],
    sub: 'Berlin has a lot on the menu. We tell you what to order. Discover our Must Eats and collect the recommendations as cards in your own deck.',
    howItWorks: 'How it works',
    numberLabel: 'No.',
    openKicker: 'Already face-up',
    openTitle: 'This is what you should order.',
    openBody:
      'Here is a first taste. Every card shows you what we recommend and where to find it.',
    setKicker: 'Discover on site',
    coveredTitle: (n: number) => `${n} good reasons to head out.`,
    coveredBody: (n: number) =>
      `Another ${n} cards are still face-down. Pick a spot on the map and drop by. On site, one tap turns the card over and tells you what to order there. After that, it belongs to your deck.`,
    spotAria: 'open the spot page',
    mapAria: 'show on the map',
    setMore: 'Show all cards',
    closeGuestKicker: 'Your Starter Pack',
    closeGuestTitle: 'Your collection starts here.',
    closeGuestBody:
      'Create your account and start with 20 Must Eats. All 20 cards go straight into your deck face up. And because Berlin still has plenty on the menu, new recommendations keep coming.',
    closeGuestCta: 'Create account',
    closeKicker: 'Now go',
    closeTitle: 'Come and get them.',
    closeBody:
      'Every Must Eat belongs to a spot on the map. If you would rather not wait for your next visit, a Booster Pack flips cards for you. And new ones keep coming.',
    closeCta: 'To the map',
    closeSecondary: 'See Booster Packs',
    headCta: 'To the map',
  },
} as const;

// One bag, not the full nine-pack fan. The page advertises the Must Eats; a
// wall of pack art at the end made the last impression "shop" instead of
// "these dishes", and the same offer is already on slide 3 of the onboarding
// and in the burger menu. Which bag follows the closing copy: the Starter
// Pack for guests, a Booster Pack once there is an account.
const STARTER_ART = '/pics/home/starter-pack-front.webp';
const BOOSTER_ART = '/pics/booster/booster.webp';

export default function MustEatsSection({ initialMapData, locale }: Props) {
  const c = COPY[locale];
  const mapHref = '/map';
  const packsHref = '/packs';

  const faceUp = new Set(initialMapData.revealedMustEatIds);
  const total = initialMapData.mustEats.length;
  const openCount = initialMapData.mustEats.filter((m) => faceUp.has(m._id)).length;
  const coveredCount = total - openCount;

  // Das Titelbild ist ein Fächer aus den offenen Karten mit den kleinsten
  // Nummern (Betreiber, 27.10.2026: „zeig hier nicht nur eins“). Vorn liegt
  // die kleinste — die Seite zählt von dort an.
  const covers = sortByCardNumber(initialMapData.mustEats.filter((m) => faceUp.has(m._id) && m.image)).slice(0, 3);
  const cover = covers[0];

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
          <figure className={styles.cover} aria-hidden="true" data-count={covers.length}>
            {/* Daumennägel statt Originale: eine Fächerkarte ist am Telefon
                ~100 px, am Desktop höchstens ~220 px breit. Die vorderste
                Karte kommt zuletzt, damit sie oben liegt. */}
            {[...covers].reverse().map((m, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={m._id}
                sizes="(max-width: 767px) 30vw, 240px"
                srcSet={mustEatCardSrcSet(m.image)}
                src={mustEatCardSrc(m.image, 440)}
                alt=""
                width={760}
                height={1044}
                fetchPriority={i === covers.length - 1 ? 'high' : undefined}
              />
            ))}
          </figure>
        )}

        <p className={styles.sub}>{c.sub}</p>


        <div className={styles.actions}>
          <Link href={mapHref} className="et-btn">
            {c.headCta}
          </Link>
          <MustEatsOnboarding initialMapData={initialMapData} tone="ink" triggerLabel={c.howItWorks} />
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
          coveredBody: c.coveredBody(coveredCount),
          spotAria: c.spotAria,
          mapAria: c.mapAria,
          setMore: c.setMore,
        }}
      />

      <section className={`${styles.wrap} ${styles.close}`}>
        <div className={styles.closeCopy}>
          {/* Beide Fassungen kommen vom Server; welche steht, entscheidet das
              Auth-Flag vor dem ersten Paint (globals.css) — kein Flackern. */}
          <div data-guest-only="">
            <p className={`et-label ${styles.kicker}`}>{c.closeGuestKicker}</p>
            <h2 className={styles.closeTitle}>{c.closeGuestTitle}</h2>
            <p className={styles.closeBody}>{c.closeGuestBody}</p>
            <div className={styles.actions}>
              <MustEatsStarterButton label={c.closeGuestCta} />
              <Link href={mapHref} className="et-btn">
                {c.closeCta}
              </Link>
            </div>
          </div>
          <div data-auth-only="">
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
        </div>

        <div className={styles.packShot} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={STARTER_ART} alt="" loading="lazy" width={945} height={1491} data-guest-only="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BOOSTER_ART} alt="" loading="lazy" width={1008} height={1560} data-auth-only="" />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
