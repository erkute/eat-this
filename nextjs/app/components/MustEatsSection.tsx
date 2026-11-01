import type { CSSProperties } from 'react';
import { Link } from '@/i18n/navigation';
import type { InitialMustEatsData } from '@/lib/map/initial-surface-data';
import { sortByCardNumber } from '@/lib/map/cardOrder';
import MustEatsGallery from './MustEatsGallery';
import { MustEatCardZoomProvider, MustEatZoomCard } from './MustEatCardZoom';
import MustEatsOnboarding from './MustEatsOnboarding';
import MustEatsStarterButton from './MustEatsStarterButton';
import SiteFooter from './SiteFooter';
import PackPoster from './PackPoster';
import styles from './MustEatsSection.module.css';
import { mustEatCardSrc, mustEatCardSrcSet } from '@/lib/must-eat/cardImage';

interface Props {
  initialMapData: InitialMustEatsData;
  locale: 'de' | 'en';
}

// Seitentexte werden mit dem vollständigen Sanity-Katalog serverseitig gerendert.
const COPY = {
  de: {
    title: ['Must', 'Eats'],
    statement: ['Gerichte entdecken.', 'Karten sammeln.'],
    sub: 'Gerichte, die man kennen sollte. Probier neue Gerichte vor Ort und sammle deine Favoriten als Karten.',
    countLabel: 'Must Eats in Berlin.',
    accountNote: 'Dein Start: 30 Must Eats. Zehn sind schon aufgedeckt, 20 weitere bekommst du mit deinem Konto im Starter Pack. Den Rest entdeckst du vor Ort.',
    headGuestCta: 'Sammlung starten',
    howItWorks: 'So funktioniert’s',
    numberLabel: 'Nr.',
    openKicker: 'Eine erste Auswahl',
    openTitle: 'Was probierst du als Nächstes?',
    setKicker: 'Vor Ort entdecken',
    coveredTitle: 'Der Rest bleibt erstmal verdeckt.',
    coveredBody: 'Viele Must Eats zeigen wir dir erst, wenn du am richtigen Spot stehst. Auf der Map siehst du, wo es etwas zu entdecken gibt. Vor Ort deckst du die Karte auf und fügst sie deiner Sammlung hinzu.',
    spotAria: 'Spot-Seite öffnen',
    zoomAria: 'Karte vergrößern',
    setMore: 'Alle Karten anzeigen',
    // Gast: das Konto ist der nächste Schritt, nicht die Map.
    closeGuestKicker: 'Dein Starter Pack',
    closeGuestTitle: '20 Karten. Der Anfang deiner Sammlung.',
    closeGuestBody:
      'Erstelle dein Konto und hol dir 20 weitere Must Eats im Starter Pack. Neue Empfehlungen kommen regelmäßig dazu. Was du noch nicht kennst, findest du auf der Map – und in Berlin.',
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
    title: ['Must', 'Eats'],
    statement: ['Discover dishes.', 'Collect cards.'],
    sub: 'Dishes worth knowing. Try new dishes at the spots and collect your favourites as cards.',
    countLabel: 'Must Eats in Berlin.',
    accountNote: 'Start with 30 Must Eats. Ten are already face up, and your account adds 20 more in your Starter Pack. Discover the rest at the spots themselves.',
    headGuestCta: 'Start collecting',
    howItWorks: 'How it works',
    numberLabel: 'No.',
    openKicker: 'A first selection',
    openTitle: 'What will you try next?',
    setKicker: 'Discover on site',
    coveredTitle: 'The rest stays hidden for now.',
    coveredBody: 'Many Must Eats stay hidden until you’re at the right spot. The map shows you where to explore. Once you’re there, reveal the card and add it to your collection.',
    spotAria: 'open the spot page',
    zoomAria: 'enlarge card',
    setMore: 'Show all cards',
    closeGuestKicker: 'Your Starter Pack',
    closeGuestTitle: '20 cards. The start of your collection.',
    closeGuestBody:
      'Create your account and get 20 more Must Eats in your Starter Pack. New recommendations are added regularly. Find your next discovery on the map – and in Berlin.',
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

  // Die letzten fünf offenen Karten bilden den Fächer. Die Galerie zeigt
  // die übrigen Motive, damit keine Karte doppelt vorkommt.
  const covers = sortByCardNumber(initialMapData.mustEats.filter((m) => faceUp.has(m._id) && m.image)).slice(-5);
  const cover = covers[0];

  return (
    <MustEatCardZoomProvider>
    <main className={`page ${styles.page}`} data-page="must-eats" data-must-eats="">
      <header className={`${styles.wrap} ${styles.head}`} data-cover={cover ? '' : undefined}>
        <h1 className={styles.title}>
          {c.title.join(' ')}
        </h1>

        {cover && (
          <figure className={styles.cover} data-count={covers.length} style={{ '--fan-count': covers.length } as CSSProperties}>
            {/* Responsive Kartenbilder halten den großen Fächer leicht. */}
            {[...covers].reverse().map((m, i) => (
              <MustEatZoomCard key={m._id} card={m} imageUrl={m.image!} imageAlt={m.dish ?? 'Must Eat'} aria-label={`${m.dish ?? 'Must Eat'}, ${c.zoomAria}`} style={{ '--fan-index': i } as CSSProperties}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  sizes="(max-width: 767px) 34vw, 260px"
                  srcSet={mustEatCardSrcSet(m.image)}
                  src={mustEatCardSrc(m.image, 720)}
                  alt=""
                  width={760}
                  height={1044}
                  fetchPriority={i === covers.length - 1 ? 'high' : undefined}
                />
              </MustEatZoomCard>
            ))}
          </figure>
        )}

        <div className={styles.intro}>
          <h2 className={styles.statement}>{c.statement.map((line) => <span key={line}>{line}</span>)}</h2>
          <div className={styles.sub}>
            {total > 0 && (
              <dl className={styles.catalogCount}>
                <dt>{c.countLabel}</dt>
                <dd>{total}</dd>
              </dl>
            )}
            <p>{c.sub}</p>
            <div className={styles.actions}>
            <span data-guest-only=""><MustEatsStarterButton label={c.headGuestCta} /></span>
            <Link href={mapHref} className="et-btn" data-auth-only="">
              {c.headCta}
            </Link>
            <MustEatsOnboarding initialMapData={initialMapData} tone="ink" triggerLabel={c.howItWorks} />
            </div>
            <p className={styles.accountNote} data-guest-only="">{c.accountNote}</p>
          </div>
        </div>
      </header>

      <MustEatsGallery
        coverIds={covers.map((m) => m._id)}
        initialMapData={initialMapData}
        copy={{
          numberLabel: c.numberLabel,
          openKicker: c.openKicker,
          openTitle: c.openTitle,
          setKicker: c.setKicker,
          coveredTitle: c.coveredTitle,
          coveredBody: c.coveredBody,
          spotAria: c.spotAria,
          zoomAria: c.zoomAria,
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
    </MustEatCardZoomProvider>
  );
}
