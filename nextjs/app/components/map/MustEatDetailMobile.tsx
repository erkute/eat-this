'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { MapMustEat } from '@/lib/types';
import { Link } from '@/i18n/navigation';
import { formatLocalizedDistance } from '@/lib/map';
import { useTranslations } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import { pickLocale } from '@/lib/i18n/pickLocale';
import { normalizeName } from '@/lib/normalizeName';
import styles from './MapDetails.module.css';
import { UNLOCK_RADIUS_METERS, type MustEatDetailState } from './useMustEatDetailState';
import { useSwipePager } from './useSwipePager';
import { CloseIcon, PagerArrowIcon } from './icons';

const CARD_BACK = '/pics/card-back.webp?v=6';
/* Gesetzt, sobald jemand einmal gewischt hat — danach kommt der Wisch-Hinweis
   nie wieder, auch nicht in einer neuen Session. */
const SWIPE_HINT_KEY = 'et:me-swipe-hint';
const SWIPE_HINT_DONE = 'done';

interface Props {
  mustEat: MapMustEat;
  isUnlocked: boolean;
  /** True for the brief window after the card lands: the "VERDECKT" stamp
   *  burns away and the name un-blurs into view. */
  nameBurning?: boolean;
  onClose: () => void;
  onViewRestaurant?: () => void;
  /** Global must-eat pager — adjacent cards + page handlers. */
  prevMustEat?: MapMustEat | null;
  nextMustEat?: MapMustEat | null;
  /** Whether the adjacent cards are revealed — a locked neighbour must NOT
   *  leak its dish name in the pager (it'd spoil the surprise). */
  prevUnlocked?: boolean;
  nextUnlocked?: boolean;
  onPagePrev?: () => void;
  onPageNext?: () => void;
  state: MustEatDetailState;
}

// Poster sheet: card hero → huge dish name → prose → spot action. Horizontal
// must-eat paging works both as a swipe gesture and as a quiet bottom nav.
export default function MustEatDetailMobile({
  mustEat,
  isUnlocked,
  nameBurning,
  onClose,
  onViewRestaurant,
  prevMustEat,
  nextMustEat,
  prevUnlocked,
  nextUnlocked,
  onPagePrev,
  onPageNext,
  state,
}: Props) {
  const { t, lang } = useTranslation();
  // Legacy t() can't interpolate ICU values — parametrized keys go through next-intl directly.
  const tMap = useTranslations('map');
  const localizedDescription = pickLocale(mustEat.description, mustEat.descriptionEn, lang);
  const {
    distance,
    canUnlock,
    needsLocation,
    locationDenied,
    vibrateIntensity,
    tapping,
    unlocking,
    unlockError,
    revealOrigin,
    handleCardClick,
    handleCardZoom,
  } = state;
  const { name: restaurantName } = mustEat.restaurant;
  const restaurantPhoto = mustEat.restaurant.photo;
  const open = isUnlocked && !revealOrigin;
  const nameRevealed = open && !nameBurning;
  const dishName = mustEat.dish ? normalizeName(mustEat.dish) : t('mustEats.covered');
  const dishNameWeight = dishName.replace(/\s+/g, '').length;
  const dishNameSizeClass =
    dishNameWeight > 22 ? styles.fdNameCompact : dishNameWeight > 12 ? styles.fdNameLong : '';
  const closeAction = onViewRestaurant ?? onClose;
  /* Verdeckte Nachbarn hießen beide "Verdeckt" — zwei gleich beschriftete
     Tasten, die nichts über ihr Ziel sagten. Geheim ist aber nur das GERICHT:
     der Server strippt dish/image/description für verdeckte Karten (siehe
     lib/map/stripCoveredMustEats.ts), das Restaurant liefert er mit. Es steht
     ohnehin auf der Karte, in der Liste und im Detail darunter. Also zeigt der
     Pager, was er zeigen darf, statt zweimal dasselbe Wort.

     Die Richtung tragen allein die Pfeile — ein "Zurück"/"Weiter" darüber las
     sich wie ein Formular-Wizard und stand als einziger Map-String hartkodiert
     im Ternary. Zeigen beide Nachbarn denselben Restaurantnamen, ist das keine
     Mehrdeutigkeit, sondern wahr: beide liegen dort, die Pfeile unterscheiden
     sie. Fürs Screenreader-Ohr benennen aria-Labels die Richtung. */
  const neighbourName = (neighbour: MapMustEat | null | undefined, unlocked?: boolean) => {
    if (!neighbour) return null;
    if (unlocked) return normalizeName(neighbour.dish ?? '') || neighbour.restaurant.name;
    return neighbour.restaurant.name;
  };
  const previousName = neighbourName(prevMustEat, prevUnlocked);
  const nextName = neighbourName(nextMustEat, nextUnlocked);

  // Swipe anywhere on the sheet (hero, name, pager band) pages to the
  // neighbouring must-eat — same gesture as the restaurant detail.
  const rootRef = useRef<HTMLDivElement>(null);
  const topCardRef = useRef<HTMLDivElement>(null);
  const cardEnterDirRef = useRef<'prev' | 'next' | null>(null);
  const [cardHiddenForPage, setCardHiddenForPage] = useState(false);
  useLayoutEffect(() => {
    const target = topCardRef.current;
    const enterDir = cardEnterDirRef.current;
    cardEnterDirRef.current = null;
    setCardHiddenForPage(false);
    if (!target) return;

    target.style.removeProperty('transition');
    target.style.removeProperty('transform');

    if (enterDir) {
      const root = rootRef.current;
      const startX =
        enterDir === 'next'
          ? (root?.clientWidth ?? window.innerWidth)
          : -(root?.clientWidth ?? window.innerWidth);

      target.style.setProperty('transition', 'none', 'important');
      target.style.setProperty('transform', `translateX(${startX}px)`, 'important');
      void target.offsetWidth;
      window.requestAnimationFrame(() => {
        target.style.setProperty(
          'transition',
          'transform .34s cubic-bezier(0.2, 0.8, 0.2, 1)',
          'important'
        );
        target.style.setProperty('transform', 'translateX(0)', 'important');
        window.setTimeout(() => {
          target.style.removeProperty('transition');
          target.style.removeProperty('transform');
        }, 360);
      });
    }
  }, [mustEat._id]);
  /* Auf dem Phone gibt es keine Pager-Tasten mehr (siehe MapDetails.module.css,
     "Phone: gewischt wird, nicht getippt") — die Geste muss sich selbst zeigen:
     die oberste Karte ruckt zur Seite und federt zurück, wodurch die Karten
     darunter kurz sichtbar werden.

     Der Hinweis läuft DURCHGEHEND, im Takt mit Pause dazwischen, bei jedem
     geöffneten Must Eat — und ist nach der ersten echten Wischgeste für immer
     weg, über Sessions hinweg. Bewusst nicht "einmal zeigen und abhaken": ein
     Hinweis, der im Öffnen-Moment untergeht, wäre damit verbrannt gewesen.
     Wer die Geste kennt, macht sie sofort und ist ihn nach anderthalb
     Sekunden los.

     Der Merker wird im Effekt gelesen, nicht beim Rendern: localStorage gibt
     es beim Server-Render nicht, und ein Lazy-Init würde eine
     Hydration-Abweichung erzeugen. Der Hinweis startet mit 0,45s Verzögerung,
     die eine Runde bis zum Effekt sieht also niemand.

     Nicht in Reichweite: dort zittert die Karte bereits dauerhaft als
     "tipp mich zum Aufdecken" (fdRevealReadyShake). Zwei Dauerbewegungen mit
     verschiedener Bedeutung auf derselben Karte heben sich gegenseitig auf —
     das Aufdecken ist in dem Moment die wichtigere Botschaft.

     Kein Hinweis ohne Nachbarn — ohne zweite Karte gäbe es nichts zu wischen. */
  const [hasSwiped, setHasSwiped] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(SWIPE_HINT_KEY) === SWIPE_HINT_DONE) setHasSwiped(true);
    } catch {
      /* Private Mode o. ä. — dann bleibt es beim Hinweis. */
    }
  }, []);
  const markSwiped = () => {
    setHasSwiped(true);
    try {
      window.localStorage.setItem(SWIPE_HINT_KEY, SWIPE_HINT_DONE);
    } catch {
      /* ignore */
    }
  };
  const swipeHint = (!!prevMustEat || !!nextMustEat) && !canUnlock && !hasSwiped;

  useSwipePager(rootRef, {
    onPrev:
      onPagePrev &&
      (() => {
        markSwiped();
        onPagePrev();
      }),
    onNext:
      onPageNext &&
      (() => {
        markSwiped();
        onPageNext();
      }),
    hasPrev: !!prevMustEat,
    hasNext: !!nextMustEat,
    transformRef: topCardRef,
    animateIn: true,
    flushPage: true,
  });

  const pageWithCard = (dir: 'prev' | 'next') => {
    const target = topCardRef.current;
    const root = rootRef.current;
    const page = dir === 'prev' ? onPagePrev : onPageNext;
    if (!target || !root || !page) {
      page?.();
      return;
    }
    const outX = dir === 'next' ? -root.clientWidth : root.clientWidth;
    target.style.setProperty(
      'transition',
      'transform .3s cubic-bezier(0.2, 0.8, 0.2, 1)',
      'important'
    );
    target.style.setProperty('transform', `translateX(${outX}px)`, 'important');
    window.setTimeout(() => {
      cardEnterDirRef.current = dir;
      flushSync(() => page());
    }, 300);
  };

  return (
    <div
      ref={rootRef}
      className={`${styles.detailV13} ${styles.detailV13MustEat}`}
      data-detail-root="must-eat"
      role="dialog"
      aria-label={tMap('mustEatAtAria', { name: restaurantName })}
    >
      {/* Nachbar-Bilder vorladen, damit beim Swipen die nächste Karte sofort
          komplett dasteht statt nachzuladen (Card-Back der Locked-Karten ist
          eh im Cache). React hoisted die link-Tags in den <head>. */}
      {prevUnlocked && prevMustEat?.image && (
        <link rel="preload" as="image" href={prevMustEat.image} />
      )}
      {nextUnlocked && nextMustEat?.image && (
        <link rel="preload" as="image" href={nextMustEat.image} />
      )}
      {/* Der Schließen-Glyph hängt am Panel-Root, NICHT im Scrollport: seit der
          Scrollport bei Überlauf wirklich scrollt (siehe „Slots als Mindestmaß"
          in MapDetails.module.css) würde ein Kind darin mit dem Inhalt
          wegwandern. Am Root — der ist position: relative und scrollt nie —
          bleibt er, wo das Auge ihn erwartet. */}
      <button
        type="button"
        className={styles.fdClose}
        aria-label={onViewRestaurant ? t('map.toSpot') : t('map.searchClose')}
        onClick={closeAction}
      >
        <CloseIcon />
      </button>
      <div className={styles.detailV13Scroll} data-detail-scroll>
        {/* HERO — freigestellte Karte mit Glow-Halo. Open: dish card (3D-Tilt
            via CSS, tap-to-zoom). Locked: card-back (flach + Wackeln, tap to
            reveal in range — flach bleibt wichtig für die Reveal-Fly-Origin). */}
        <div className={styles.fdHeroWrap} data-detail-hero>
          <div className={styles.fdCardStack}>
            <img
              className={`${styles.fdStackCard} ${styles.fdStackCardOne}`}
              src={CARD_BACK}
              alt=""
              aria-hidden="true"
            />
            <img
              className={`${styles.fdStackCard} ${styles.fdStackCardTwo}`}
              src={CARD_BACK}
              alt=""
              aria-hidden="true"
            />
            <img
              className={`${styles.fdStackCard} ${styles.fdStackCardThree}`}
              src={CARD_BACK}
              alt=""
              aria-hidden="true"
            />
            {/* Der Wisch-Nudge bewegt NUR die oberste Karte, nicht den ganzen
                Stapel: so kommen die Karten darunter kurz zum Vorschein, und
                der Hinweis zeigt dasselbe, was eine echte Wischgeste tut
                (useSwipePager animiert ebenfalls topCardRef). Am Stapel als
                Ganzem sah man nur "die Karte wackelt". */}
            <div
              className={`${styles.fdTopCard}${cardHiddenForPage ? ` ${styles.fdTopCardHidden}` : ''}${swipeHint ? ` ${styles.fdTopCardHint}` : ''}`}
              ref={topCardRef}
            >
              {open ? (
                <button
                  type="button"
                  className={styles.fdHero}
                  onClick={mustEat.image ? handleCardZoom : undefined}
                  disabled={!mustEat.image}
                  aria-label={t('map.zoomCard')}
                  /* Während des Zooms (inkl. Fly-Back) verstecken, sonst liegt die
                    Karte doppelt da — Zoom-Klon + statische Slot-Karte. */
                  style={state.zoomActive ? { visibility: 'hidden' } : undefined}
                >
                  <img
                    src={mustEat.image || CARD_BACK}
                    alt={mustEat.image ? (mustEat.dish ?? '') : t('mustEats.covered')}
                  />
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles.fdHero} ${styles.fdHeroLocked} ${canUnlock && !unlocking ? styles.mustEatCardCanUnlock : ''} ${tapping ? styles.mustEatCardTapping : ''}`}
                  onClick={handleCardClick}
                  disabled={unlocking}
                  aria-busy={unlocking || undefined}
                  data-reveal-ready={canUnlock && !unlocking ? '' : undefined}
                  /* The accessible name has to follow the same state machine
                     as the copy above. Without a fix "Zu weit weg" is the same
                     guess the headline used to make — and here it is the ONLY
                     thing a screen reader gets, since the tap now opens the
                     permission prompt rather than revealing anything. */
                  aria-label={
                    unlocking
                      ? t('map.revealSaving')
                      : canUnlock
                        ? t('map.revealHere')
                        : needsLocation
                          ? locationDenied
                            ? tMap('locationBlocked')
                            : tMap('locationNeeded')
                          : t('map.tooFarToReveal')
                  }
                  style={{
                    ...(revealOrigin ? { visibility: 'hidden' } : {}),
                    ['--vibrate-intensity' as string]: tapping
                      ? '2.4'
                      : vibrateIntensity.toFixed(3),
                  }}
                >
                  <img src={CARD_BACK} alt={t('mustEats.covered')} />
                </button>
              )}
            </div>
            {/* Blättern direkt an der Karte: zwei runde Pfeile auf den
                Kartenkanten statt einer Buttonleiste unter dem Panel — die
                Karte ist das Objekt, durch das geblättert wird. Nur ab 768px
                sichtbar; auf dem Phone wird gewischt. Die Namen der Nachbarn
                tragen die aria-Labels, nicht mehr die Fläche. */}
            {(prevMustEat || nextMustEat) && (
              <nav className={styles.fdPager} data-detail-pager aria-label={t('map.pagerAria')}>
                <button
                  type="button"
                  className={styles.fdPagerPrev}
                  disabled={!prevMustEat}
                  onClick={() => pageWithCard('prev')}
                  aria-label={
                    previousName ? `${t('map.pagerPrev')}: ${previousName}` : t('map.pagerPrev')
                  }
                >
                  <span className={styles.fdPagerArrow}>
                    <PagerArrowIcon />
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.fdPagerNext}
                  disabled={!nextMustEat}
                  onClick={() => pageWithCard('next')}
                  aria-label={nextName ? `${t('map.pagerNext')}: ${nextName}` : t('map.pagerNext')}
                >
                  <span className={styles.fdPagerArrow}>
                    <PagerArrowIcon />
                  </span>
                </button>
              </nav>
            )}
          </div>
          {/* Textfassung desselben Hinweises — sichtbar NUR bei
              prefers-reduced-motion, wo der Nudge nicht laufen darf. Absolut
              positioniert, damit sie keine Grid-Höhe kostet. */}
          {swipeHint && (
            <p className={styles.fdSwipeHint} aria-hidden="true">
              {t('map.swipeHint')}
            </p>
          )}
        </div>

        {/* Clip-sicherer Mittelteil: Gericht-Name + Beschreibung (open) bzw.
            Näherungs-Hinweis (locked) hängen direkt unter der Karte; läuft der
            Text über, klemmt fdMid statt den fixen Footer zu verdrängen. */}
        <div className={`${styles.fdMid}${!open ? ` ${styles.fdMidLocked}` : ''}`}>
          {/* Gericht-Name — unten im 2-Zeilen-Feld verankert, sitzt direkt über
              der Beschreibung; eine 2. Zeile füllt nach oben → nichts darunter
              springt. Locked: stark verschwommen (kein Stempel).

              In Reichweite verschwindet der "Verdeckt"-Titel, BEHÄLT aber seinen
              Platz (fdNameVoid → visibility: hidden): darunter steht schon der
              "Jetzt aufdecken"-Chip, und zwei gleich laute Chips übereinander
              sagten Zustand und Aufforderung durcheinander. Ausgehängt statt
              versteckt rutschte die Copy jedoch in den Namens-Track hoch — und
              genau dort sitzt aufgedeckt der Gerichtsname, der Text sprang also
              beim Aufdecken um 40px. */}
          {
            <h1
              className={`${styles.fdName}${dishNameSizeClass ? ` ${dishNameSizeClass}` : ''}${
                !open && canUnlock ? ` ${styles.fdNameVoid}` : ''
              }`}
              aria-hidden={!open && canUnlock ? true : undefined}
              aria-label={nameRevealed || (!open && canUnlock) ? undefined : t('mustEats.covered')}
            >
              <span
                className={`${styles.fdNameText}${!open ? ` ${styles.fdNameBlur}` : ''}${nameBurning ? ` ${styles.fdNameUnblurring}` : ''}`}
                aria-hidden={nameRevealed ? undefined : true}
                /* Das Badge über dem verschwommenen Namen ist ein
                   ::before-Pseudo — sein Text muss als Attribut hier hoch,
                   sonst steht er unübersetzbar im Stylesheet. */
                data-covered={t('mustEats.covered')}
              >
                {dishName}
              </span>
            </h1>
          }

          {/* Beschreibung — komplett (keine Klemmung), in der Marken-Schrift. */}
          {open && localizedDescription && <p className={styles.fdText}>{localizedDescription}</p>}

          {/* Locked: Näherungs-Hinweis statt Beschreibung. */}
          {!open && (
            <div
              className={`${styles.fdProximity}${unlockError ? ` ${styles.fdProximityError}` : canUnlock ? ` ${styles.fdProximityReady}` : ` ${styles.fdProximityAway}`}`}
              data-location-needed={
                needsLocation ? (locationDenied ? 'blocked' : 'ask') : undefined
              }
              role={unlockError ? 'alert' : 'status'}
              aria-live="polite"
            >
              <p className={styles.fdProximityHead}>
                {unlocking
                  ? t('map.revealSaving')
                  : unlockError
                    ? t('map.revealError')
                    : canUnlock
                      ? tMap('proximityHere')
                      : distance !== null
                        ? tMap('proximityAway', {
                            distance: formatLocalizedDistance(distance, lang),
                          })
                        : locationDenied
                          ? tMap('locationBlocked')
                          : tMap('locationNeeded')}
              </p>
              {/* Kein Distanz-Balken mehr: die log-Skala von 10 km auf 50 m
                  sagte niemandem etwas. Die Headline nennt die Distanz, der
                  Satz darunter erklärt die Spielregel — mehr braucht es nicht. */}
              <p className={styles.fdProximitySub}>
                {unlocking
                  ? t('map.revealSavingHint')
                  : unlockError
                    ? t('map.revealRetry')
                    : canUnlock
                      ? tMap('proximityTapReveal')
                      : distance !== null
                        ? tMap('proximityHint', { meters: UNLOCK_RADIUS_METERS })
                        : locationDenied
                          ? tMap('locationBlockedHint')
                          : tMap('enableLocation')}
              </p>
            </div>
          )}
        </div>

        {/* Restaurant / price / Zum Spot — one thick stripe underneath. */}
        <div className={`${styles.fdRest} ${styles.fdRestInline}`}>
          {restaurantPhoto && (
            <img className={styles.fdRestPhoto} src={restaurantPhoto} alt="" aria-hidden="true" />
          )}
          <div className={styles.fdRestName}>
            <div className={styles.fdK}>{t('map.inRestaurant')}</div>
            <div className={styles.fdV}>{normalizeName(restaurantName)}</div>
          </div>
          {onViewRestaurant ? (
            <button type="button" className={styles.ctaPill} onClick={onViewRestaurant}>
              {t('map.toSpot')}
            </button>
          ) : (
            <Link href={`/restaurant/${mustEat.restaurant.slug}`} className={styles.ctaPill}>
              {t('map.toSpot')}
            </Link>
          )}
        </div>
      </div>

      <div className={`${styles.fdRest} ${styles.fdRestDock}`}>
        {restaurantPhoto && (
          <img className={styles.fdRestPhoto} src={restaurantPhoto} alt="" aria-hidden="true" />
        )}
        <div className={styles.fdRestName}>
          <div className={styles.fdK}>{t('map.inRestaurant')}</div>
          <div className={styles.fdV}>{normalizeName(restaurantName)}</div>
        </div>
        {onViewRestaurant ? (
          <button type="button" className={styles.ctaPill} onClick={onViewRestaurant}>
            {t('map.toSpot')}
          </button>
        ) : (
          <Link href={`/restaurant/${mustEat.restaurant.slug}`} className={styles.ctaPill}>
            {t('map.toSpot')}
          </Link>
        )}
      </div>
    </div>
  );
}
