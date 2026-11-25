'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { MapMustEat } from '@/lib/types';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import { pickLocale } from '@/lib/i18n/pickLocale';
import { normalizeName } from '@/lib/normalizeName';
import { whenImageReady } from '@/lib/dom/imageReady';
import {
  DEAL_IN_DELAY_MS,
  DEAL_IN_EASE,
  DEAL_IN_MS,
  DEAL_OUT_EASE,
  DEAL_OUT_MS,
  DEAL_TILT_DEG,
  cssEase,
} from '@/lib/cardDeal';
import { prefersReducedMotion } from '@/lib/guestCardShake';
import type { InitialMustEatsData } from '@/lib/map/initial-surface-data';
import MustEatsOnboarding from '../MustEatsOnboarding';
import styles from './MustEatDetail.module.css';
import { type MustEatDetailState } from './useMustEatDetailState';
import { useSwipePager } from './useSwipePager';
import { CloseIcon, PinIcon } from './icons';
import MustEatPager from './MustEatPager';

const CARD_BACK = '/pics/card-back.webp?v=20261028';
/* Gesetzt, sobald jemand in dieser Sitzung gewischt hat; der Wisch-Hinweis ruht
   dann bis zum nächsten Besuch. */
const SWIPE_HINT_KEY = 'et:me-swipe-hint';
const SWIPE_HINT_DONE = 'done';

interface Props {
  mustEat: MapMustEat;
  isUnlocked: boolean;
  /**
   * Die Aufdeck-Bühne deckt das Sheet gerade ganz ab; darunter darf der offene
   * Text schon stehen.
   */
  revealCovered?: boolean;
  onClose: () => void;
  onViewRestaurant?: () => void;
  prevMustEat?: MapMustEat | null;
  nextMustEat?: MapMustEat | null;
  /**
   * A covered neighbour must not leak its dish name in the pager.
   */
  prevUnlocked?: boolean;
  nextUnlocked?: boolean;
  onPagePrev?: () => void;
  onPageNext?: () => void;
  position?: { index: number; count: number };
  state: MustEatDetailState;
  guest?: boolean;
  onboardingData?: InitialMustEatsData;
}

export default function MustEatDetailMobile({
  mustEat,
  isUnlocked,
  revealCovered = false,
  onClose,
  onViewRestaurant,
  prevMustEat,
  nextMustEat,
  prevUnlocked,
  nextUnlocked,
  onPagePrev,
  onPageNext,
  position,
  state,
  guest = false,
  onboardingData,
}: Props) {
  const { t, lang } = useTranslation();
  // Legacy t() can't interpolate ICU values.
  const tMap = useTranslations('map');
  const localizedDescription = pickLocale(mustEat.description, mustEat.descriptionEn, lang);
  const {
    distance,
    canUnlock,
    needsLocation,
    locationDenied,
    requestLocation,
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
  /* Der Text wechselt, sobald die Bühne ihn verdeckt, nicht erst nach der
     Landung; die Karte selbst bleibt bis zur Landung verborgen. */
  const textOpen = isUnlocked && (!revealOrigin || revealCovered);
  const dishName = mustEat.dish ? normalizeName(mustEat.dish) : t('mustEats.covered');
  const closeAction = onViewRestaurant ?? onClose;
  /* Geheim ist nur das Gericht; das Restaurant liefert der Server mit
     (stripCoveredMustEats), also nennt der Pager es. */
  const neighbourName = (neighbour: MapMustEat | null | undefined, unlocked?: boolean) => {
    if (!neighbour) return null;
    if (unlocked) return normalizeName(neighbour.dish ?? '') || neighbour.restaurant.name;
    return neighbour.restaurant.name;
  };
  const previousName = neighbourName(prevMustEat, prevUnlocked);
  const nextName = neighbourName(nextMustEat, nextUnlocked);

  const rootRef = useRef<HTMLDivElement>(null);
  const topCardRef = useRef<HTMLDivElement>(null);
  /* Zwei Karten zugleich (lib/cardDeal): Die abfahrende ist ein kurzlebiges
     Element mit dem alten Bild, die einfahrende ist schon die echte Top-Karte.
     So steht das neue Must Eat sofort da. */
  const [leaving, setLeaving] = useState<{
    id: number;
    src: string;
    dir: 'prev' | 'next';
    fromX: number;
  } | null>(null);
  const leavingRef = useRef<HTMLDivElement>(null);
  const cardEnterRef = useRef<{ dir: 'prev' | 'next'; ready: Promise<void> } | null>(null);
  useLayoutEffect(() => {
    const target = topCardRef.current;
    const enter = cardEnterRef.current;
    cardEnterRef.current = null;
    if (!target) return;

    target.style.removeProperty('transition');
    target.style.removeProperty('transform');
    if (!enter) return;

    const width = rootRef.current?.clientWidth ?? window.innerWidth;
    const sign = enter.dir === 'next' ? 1 : -1;
    /* Bis das neue Bild zeichenbar ist, wartet die Karte draußen (`fill:
       backwards`); sie kommt nie leer herein. */
    const enterAnim = target.animate(
      [
        { transform: `translateX(${sign * width}px) rotate(${sign * DEAL_TILT_DEG}deg)` },
        { transform: 'none' },
      ],
      {
        duration: DEAL_IN_MS,
        delay: DEAL_IN_DELAY_MS,
        easing: cssEase(DEAL_IN_EASE),
        fill: 'backwards',
      }
    );
    enterAnim.pause();
    let cancelled = false;
    void enter.ready.then(() => {
      if (!cancelled) enterAnim.play();
    });
    return () => {
      cancelled = true;
      enterAnim.cancel();
    };
  }, [mustEat._id]);
  useLayoutEffect(() => {
    const el = leavingRef.current;
    if (!leaving || !el) return;
    const width = rootRef.current?.clientWidth ?? window.innerWidth;
    const sign = leaving.dir === 'next' ? -1 : 1;
    const leaveAnim = el.animate(
      [
        { transform: `translateX(${leaving.fromX}px)` },
        { transform: `translateX(${sign * width}px) rotate(${sign * DEAL_TILT_DEG}deg)` },
      ],
      { duration: DEAL_OUT_MS, easing: cssEase(DEAL_OUT_EASE), fill: 'forwards' }
    );
    leaveAnim.onfinish = () =>
      setLeaving((current) => (current?.id === leaving.id ? null : current));
    return () => leaveAnim.cancel();
  }, [leaving]);
  /* Auf dem Phone gibt es keine Pager-Tasten; die oberste Karte ruckt deshalb
     im Takt zur Seite und federt zurück, bis in dieser Sitzung einmal gewischt
     wurde. Nicht in Reichweite (dort zittert die Karte schon fürs Aufdecken)
     und nicht ohne Nachbarn. Der Merker wird im Effekt gelesen, weil es beim
     Server-Render keinen Storage gibt. */
  const [hasSwiped, setHasSwiped] = useState(false);
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SWIPE_HINT_KEY) === SWIPE_HINT_DONE) setHasSwiped(true);
    } catch {
    }
  }, []);
  const markSwiped = () => {
    setHasSwiped(true);
    try {
      window.sessionStorage.setItem(SWIPE_HINT_KEY, SWIPE_HINT_DONE);
    } catch {
      /* ignore */
    }
  };
  const swipeHint = (!!prevMustEat || !!nextMustEat) && !canUnlock && !hasSwiped;

  const neighbourFace = (dir: 'prev' | 'next') => {
    const neighbour = dir === 'prev' ? prevMustEat : nextMustEat;
    const unlocked = dir === 'prev' ? prevUnlocked : nextUnlocked;
    return (unlocked && neighbour?.image) || CARD_BACK;
  };

  /* Vorgeladen ist noch nicht dekodiert; vorab dekodiert kommt die einfahrende
     Karte ohne Zögern. */
  const prevFace = prevMustEat ? neighbourFace('prev') : null;
  const nextFace = nextMustEat ? neighbourFace('next') : null;
  const decodedFacesRef = useRef<HTMLImageElement[]>([]);
  useEffect(() => {
    decodedFacesRef.current = [prevFace, nextFace]
      .filter((src): src is string => Boolean(src))
      .map((src) => {
        const img = new window.Image();
        img.src = src;
        img.decode?.().catch(() => undefined);
        return img;
      });
  }, [prevFace, nextFace]);

  useSwipePager(rootRef, {
    onCommit: (dir, offsetPx) => {
      markSwiped();
      pageWithCard(dir, offsetPx);
    },
    hasPrev: !!prevMustEat,
    hasNext: !!nextMustEat,
    transformRef: topCardRef,
  });

  const pageWithCard = (dir: 'prev' | 'next', fromX = 0) => {
    const page = dir === 'prev' ? onPagePrev : onPageNext;
    if (!page) return;
    const card = topCardRef.current;
    const face = card?.querySelector('img');
    if (!card || !face || prefersReducedMotion()) {
      card?.style.removeProperty('transition');
      card?.style.removeProperty('transform');
      page();
      return;
    }
    flushSync(() => {
      setLeaving({ id: performance.now(), src: face.currentSrc || face.src, dir, fromX });
      const src = neighbourFace(dir);
      const href = new URL(src, window.location.href).href;
      const decoded = decodedFacesRef.current.find((img) => img.src === href);
      const ready =
        decoded?.complete && decoded.naturalWidth > 0 ? Promise.resolve() : whenImageReady(src);
      cardEnterRef.current = { dir, ready };
      page();
    });
  };

  /* Die Kopfzeile des verdeckten Zustands sitzt im Namens-Track und wird beim
     Aufdecken vom Gericht ersetzt: gleiche Höhe, kein Sprung. Der Standort ist
     ein eigener Chip darunter, kein Teil der Zeile. */
  const coverHead = unlockError
    ? t('map.revealError')
    : canUnlock
      ? tMap('proximityHere')
      : tMap('proximityAway');
  /* Ohne Fix trägt die Copy-Zeile nur den Chip. Verweigert ist kein eigener
     Zustand: Erst der Tipp sagt, was fehlt, als Meldung in der Info-Karte. */
  const explainerData = guest ? onboardingData : undefined;
  const showPackLink =
    !guest && !isUnlocked && distance !== null && !canUnlock && !unlocking && !unlockError;
  /* Ein Gast bekommt „Wie funktioniert's?" statt des Näherungs-Hinweises;
     beides zusammen sprengte den Text-Slot. */
  const coverSub = unlockError
    ? t('map.revealRetry')
    : canUnlock
      ? tMap('proximityTapReveal')
      : (needsLocation && !locationDenied) || explainerData
        ? null
        : tMap(showPackLink ? 'proximityFreeAtSpot' : 'proximityHint');
  const showLocationChip = !guest && needsLocation && !locationDenied && !unlocking && !unlockError;
  const guestPitch = guest && !textOpen;
  const kicker = mustEat.restaurant.district
    ? `Must Eat · ${mustEat.restaurant.district}`
    : 'Must Eat';
  const headInNameSlot = !textOpen;
  const slotText = headInNameSlot ? coverHead : dishName;
  const slotWeight = slotText.replace(/\s+/g, '').length;
  /* Die Stufe hängt auch am längsten Wort: Ein Wort bricht nicht, und lange
     Versalwörter wären in der Grundgröße breiter als der Rail. */
  const longestWord = Math.max(...slotText.split(/\s+/).map((word) => word.length));
  const slotSizeClass =
    slotWeight > 22 || longestWord > 13
      ? styles.fdNameCompact
      : slotWeight > 12 || longestWord > 10
        ? styles.fdNameLong
        : '';

  /* Der Restaurantname staffelt sich nach Länge, nicht pro Lokal. */
  const restNameWeight = restaurantName.replace(/\s+/g, '').length;
  const restNameSizeClass =
    restNameWeight > 22 ? styles.fdVCompact : restNameWeight > 16 ? styles.fdVLong : '';

  return (
    <div
      ref={rootRef}
      className={styles.detail}
      data-detail-root="must-eat"
      role="dialog"
      aria-label={tMap('mustEatAtAria', { name: restaurantName })}
    >
      {/* Nachbarbilder vorladen, damit die nächste Karte beim Wischen sofort
          dasteht. React hoisted die link-Tags in den <head>. */}
      {prevUnlocked && prevMustEat?.image && (
        <link rel="preload" as="image" href={prevMustEat.image} />
      )}
      {nextUnlocked && nextMustEat?.image && (
        <link rel="preload" as="image" href={nextMustEat.image} />
      )}
      {/* Am Panel-Root, nicht im Scrollport: Dort würde das X mit dem Inhalt
          wegscrollen. */}
      <button
        type="button"
        className={styles.fdClose}
        aria-label={onViewRestaurant ? t('map.toSpot') : t('map.searchClose')}
        onClick={closeAction}
      >
        <CloseIcon />
      </button>
      {(prevMustEat || nextMustEat || (position && position.count > 1)) && (
        <div className={styles.fdPager}>
          <MustEatPager
            position={position}
            previousName={previousName}
            nextName={nextName}
            onPrevious={prevMustEat && onPagePrev ? () => pageWithCard('prev') : undefined}
            onNext={nextMustEat && onPageNext ? () => pageWithCard('next') : undefined}
          />
        </div>
      )}
      <div className={styles.scroll} data-detail-scroll>
        {/* Locked bleibt flach: Die Karte ist der Startpunkt des Aufdeck-Flugs. */}
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
            {/* Der Wisch-Nudge bewegt nur die oberste Karte, wie eine echte
                Wischgeste (useSwipePager animiert ebenfalls topCardRef). */}
            {leaving && (
              <div
                key={leaving.id}
                ref={leavingRef}
                className={`${styles.fdTopCard} ${styles.fdTopCardLeaving}`}
                aria-hidden="true"
              >
                <span className={styles.fdHero}>
                  <img src={leaving.src} alt="" />
                </span>
              </div>
            )}
            <div
              className={`${styles.fdTopCard}${swipeHint ? ` ${styles.fdTopCardHint}` : ''}`}
              ref={topCardRef}
            >
              {open ? (
                <button
                  type="button"
                  className={styles.fdHero}
                  onClick={mustEat.image ? handleCardZoom : undefined}
                  disabled={!mustEat.image}
                  aria-label={t('map.zoomCard')}
                  /* Während des Zooms verstecken, sonst liegt die Karte doppelt
                     da. */
                  style={state.zoomActive ? { visibility: 'hidden' } : undefined}
                >
                  {/* Pro Bild ein eigenes <img>: Ein wiederverwendetes zeigt
                      nach einem `src`-Wechsel weiter das alte Bild, bis das
                      neue dekodiert ist. */}
                  <img
                    key={mustEat.image || CARD_BACK}
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
                  /* The accessible name follows the same state machine as the
                     copy above; without a fix the tap opens the permission
                     prompt, not a reveal. */
                  aria-label={
                    guestPitch
                      ? tMap('starterCta')
                      : canUnlock
                        ? t('map.revealHere')
                        : needsLocation
                          ? locationDenied
                            ? tMap('locationBlocked')
                            : tMap('locationAllow')
                          : t('map.tooFarToReveal')
                  }
                  /* Auch die verdeckte Karte verschwindet während des Zooms,
                     sonst läge ihr Rücken doppelt da. */
                  style={{
                    ...(revealOrigin || state.zoomActive ? { visibility: 'hidden' } : {}),
                    ['--vibrate-intensity' as string]: tapping
                      ? '2.4'
                      : vibrateIntensity.toFixed(3),
                  }}
                >
                  <img src={CARD_BACK} alt={t('mustEats.covered')} />
                </button>
              )}
            </div>
          </div>
          {/* Textfassung des Hinweises, nur bei prefers-reduced-motion. */}
          {swipeHint && (
            <p className={styles.fdSwipeHint} aria-hidden="true">
              {t('map.swipeHint')}
            </p>
          )}
        </div>

        <div className={`${styles.fdMid}${!textOpen ? ` ${styles.fdMidLocked}` : ''}`}>
          {/* Kicker und Gerichtsname als ein Kopf. Der Kicker nennt den Bezirk:
              die Angabe, die verdeckt wie aufgedeckt gilt. */}
          <div className={styles.fdHead}>
            {/* `data-detail-pager` misst useMapSheet. */}
            <div className={styles.fdKickerRow} data-detail-pager>
              <p className={`et-label ${styles.fdKicker}`}>{kicker}</p>
            </div>
            {/* h2: Die H1 gehört der Kartenseite. */}
            <h2 className={`${styles.fdName}${slotSizeClass ? ` ${slotSizeClass}` : ''}`}>
              {headInNameSlot ? (
                <span className={styles.fdNameText}>{slotText}</span>
              ) : (
                <span className={styles.fdNameText}>{dishName}</span>
              )}
            </h2>
          </div>

          {textOpen && localizedDescription && (
            <p className={styles.fdText}>{localizedDescription}</p>
          )}

          {!textOpen && (
            <div
              className={`${styles.fdProximity}${unlockError ? ` ${styles.fdProximityError}` : canUnlock ? ` ${styles.fdProximityReady}` : ''}`}
            >
              {/* Die Map zeigt die Entfernung. Die Zeile erklärt den nächsten Schritt. */}
              <div role={unlockError ? 'alert' : 'status'} aria-live="polite">
                {coverSub && <p className={styles.fdProximitySub}>{coverSub}</p>}
              </div>
              {showPackLink && (
                <Link href="/packs" prefetch={false} className={`et-btn et-btn-sm et-btn-alt ${styles.fdPackLink}`}>
                  {tMap('proximityPacks')}
                </Link>
              )}
              {/* Für Gäste die Erklärfolien der Must-Eats-Seite, nur auf
                  Knopfdruck. */}
              {explainerData && (
                <div className={styles.fdLocation}>
                  <MustEatsOnboarding
                    initialMapData={explainerData}
                    tone="sheet"
                    starterMustEatId={mustEat._id}
                  />
                </div>
              )}
              {showLocationChip && (
                <div className={styles.fdLocation} data-location-needed="ask">
                  <button
                    type="button"
                    className={`et-btn et-btn-sm ${styles.fdLocationChip}`}
                    onClick={requestLocation ?? undefined}
                  >
                    <PinIcon />
                    <span>{tMap('locationAllow')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Die ganze Zeile ist der Weg zum Spot, ohne Pille oder Pfeil. Der
            Name bleibt einzeilig, damit die Zeile in jeder Karte gleich hoch
            ist und der Stapel beim Blättern nicht springt. */}
        {(() => {
          const rowContent = (
            <>
              {restaurantPhoto && (
                <img
                  className={styles.fdRestPhoto}
                  src={restaurantPhoto}
                  alt=""
                  aria-hidden="true"
                />
              )}
              <span className={styles.fdRestName}>
                <span className={styles.fdK}>{t('map.inRestaurant')}</span>
                <span
                  className={`${styles.fdV}${restNameSizeClass ? ` ${restNameSizeClass}` : ''}`}
                >
                  {normalizeName(restaurantName)}
                </span>
              </span>
            </>
          );
          const rowClass = `${styles.fdRest} ${styles.fdRestInline}`;
          const rowLabel = `${t('map.toSpot')}: ${normalizeName(restaurantName)}`;
          return onViewRestaurant ? (
            <button
              type="button"
              className={rowClass}
              onClick={onViewRestaurant}
              aria-label={rowLabel}
            >
              {rowContent}
            </button>
          ) : (
            <Link
              href={`/restaurant/${mustEat.restaurant.slug}`}
              className={rowClass}
              aria-label={rowLabel}
            >
              {rowContent}
            </Link>
          );
        })()}
      </div>
    </div>
  );
}
