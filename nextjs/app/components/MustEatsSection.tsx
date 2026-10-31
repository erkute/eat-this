import { Link } from '@/i18n/navigation';
import type { InitialMustEatsData } from '@/lib/map/initial-surface-data';
import { sortByCardNumber } from '@/lib/map/cardOrder';
import MustEatsGallery from './MustEatsGallery';
import { mustEatMapHref } from '@/lib/map/mustEatMapHref';
import MustEatsOnboarding from './MustEatsOnboarding';
import MustEatsStarterButton from './MustEatsStarterButton';
import PackPoster from './PackPoster';
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
    openTitle: 'Was wir bestellen.',
    openBody:
      'Hier bekommst du einen ersten Vorgeschmack. Jede Karte zeigt dir, was wir empfehlen und wo du es findest.',
    setKicker: 'Vor Ort entdecken',
    coveredTitle: (n: number) => `${n} gute Gründe, loszugehen.`,
    coveredBody: (n: number) =>
      `Weitere ${n} Karten sind noch verdeckt. Auf der Map findest du ihre Spots. Mit deinem Konto und freigegebenem Standort deckst du sie direkt vor Ort mit einem Tap auf und sammelst die Empfehlungen in deinem Deck.`,
    spotAria: 'Spot-Seite öffnen',
    mapAria: 'auf der Map zeigen',
    setMore: 'Alle Karten anzeigen',
    // Gast: das Konto ist der nächste Schritt, nicht die Map.
    closeGuestKicker: 'Dein Starter Pack',
    closeGuestTitle: 'Deine Sammlung beginnt hier.',
    closeGuestBody:
      'Erstelle dein Konto und starte mit 20 Must Eats. Nach und nach kommen neue Gerichte dazu, die du entdecken und als Karten sammeln kannst.',
    closeGuestCta: 'Konto erstellen',
    // Mit Konto ist die Sammlung längst angefangen: Map und Booster Packs.
    closeKicker: 'Und jetzt',
    closeTitle: 'Hol sie dir.',
    closeBody:
      'Jedes Must Eat gehört zu einem Spot auf der Map. Weitere Karten sammelst du vor Ort oder mit Booster Packs. Nach und nach kommen neue Gerichte dazu, die du entdecken und als Karten sammeln kannst.',
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
    openTitle: 'What we order.',
    openBody:
      'Here is a first taste. Every card shows you what we recommend and where to find it.',
    setKicker: 'Discover on site',
    coveredTitle: (n: number) => `${n} good reasons to head out.`,
    coveredBody: (n: number) =>
      `Another ${n} cards are still hidden. Find their spots on the map. With an account and location access enabled, you can reveal them on site with a tap and collect the recommendations in your deck.`,
    spotAria: 'open the spot page',
    mapAria: 'show on the map',
    setMore: 'Show all cards',
    closeGuestKicker: 'Your Starter Pack',
    closeGuestTitle: 'Your collection starts here.',
    closeGuestBody:
      'Create your account and start with 20 Must Eats. More dishes will be added over time for you to discover and collect as cards.',
    closeGuestCta: 'Create account',
    closeKicker: 'Now go',
    closeTitle: 'Come and get them.',
    closeBody:
      'Every Must Eat belongs to a spot on the map. Collect more cards on site or with Booster Packs. More dishes will be added over time for you to discover and collect as cards.',
    closeCta: 'To the map',
    closeSecondary: 'See Booster Packs',
    headCta: 'To the map',
  },
} as const;

export default function MustEatsSection({ initialMapData, locale }: Props) {
  const c = COPY[locale];
  const mapHref = '/map';
  const packsHref = '/packs';

  const faceUp = new Set(initialMapData.revealedMustEatIds);
  const total = initialMapData.mustEats.length;
  const openCount = initialMapData.mustEats.filter((m) => faceUp.has(m._id)).length;
  const coveredCount = total - openCount;

  // Die letzten zwei offenen Karten stehen im Fächer; die Galerie lässt sie
  // aus, damit jedes Motiv nur einmal auf der Seite vorkommt.
  const covers = sortByCardNumber(initialMapData.mustEats.filter((m) => faceUp.has(m._id) && m.image)).slice(-2);
  const cover = covers[0];

  return (
    <main className={`page ${styles.page}`} data-page="must-eats" data-must-eats="">
      <header className={`${styles.wrap} ${styles.head}`} data-cover={cover ? '' : undefined}>
        <p className={`et-label ${styles.kicker}`}>{c.kicker}</p>
        <h1 className={styles.title}>
          {c.title.join(' ')}
        </h1>

        {cover && (
          <figure className={styles.cover} data-count={covers.length}>
            {/* Daumennägel statt Originale: eine Fächerkarte ist am Telefon
                ~100 px, am Desktop höchstens ~220 px breit. Die vorderste
                Karte kommt zuletzt, damit sie oben liegt. */}
            {[...covers].reverse().map((m, i) => (
              <Link key={m._id} href={mustEatMapHref(m)} aria-label={`${m.dish ?? 'Must Eat'}, ${c.mapAria}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  sizes="(max-width: 767px) 30vw, 240px"
                  srcSet={mustEatCardSrcSet(m.image)}
                  src={mustEatCardSrc(m.image, 440)}
                  alt=""
                  width={760}
                  height={1044}
                  fetchPriority={i === covers.length - 1 ? 'high' : undefined}
                />
              </Link>
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
        coverIds={covers.map((m) => m._id)}
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

      {/* Beide Fassungen kommen vom Server; welche steht, entscheidet das
          Auth-Flag vor dem ersten Paint (globals.css) — kein Flackern. Gast:
          das Starter Pack, die Map als zweite Antwort. Konto: die Map vorn,
          Booster Packs dahinter. */}
      <PackPoster
        data-guest-only=""
        className={styles.close}
        offer="starter"
        kicker={c.closeGuestKicker}
        headline={c.closeGuestTitle}
        heading="h2"
        body={c.closeGuestBody}
        actions={
          <>
            <MustEatsStarterButton label={c.closeGuestCta} />
            <Link href={mapHref} className="et-btn et-btn-alt">
              {c.closeCta}
            </Link>
          </>
        }
      />
      <PackPoster
        data-auth-only=""
        className={styles.close}
        offer="booster"
        kicker={c.closeKicker}
        headline={c.closeTitle}
        heading="h2"
        body={c.closeBody}
        actions={
          <>
            <Link href={mapHref} className="et-btn">
              {c.closeCta}
            </Link>
            <Link href={packsHref} className="et-btn et-btn-alt">
              {c.closeSecondary}
            </Link>
          </>
        }
      />

      <SiteFooter />
    </main>
  );
}
