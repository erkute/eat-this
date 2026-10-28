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

const CARD_BACK = '/pics/card-back.webp?v=20261028';
/* Gesetzt, sobald jemand in DIESER Sitzung gewischt hat — danach ruht der
   Wisch-Hinweis bis zum nächsten Besuch. Er stand in localStorage und kam nie
   wieder; wer die Geste einmal probiert hatte, sah auf dem Telefon danach kein
   Zeichen mehr, dass es weitergeht (Nutzer, 02.09.2026). */
const SWIPE_HINT_KEY = 'et:me-swipe-hint';
const SWIPE_HINT_DONE = 'done';

interface Props {
  mustEat: MapMustEat;
  isUnlocked: boolean;
  /** Die Bühne des Aufdeckens deckt das Sheet gerade ganz ab — darunter darf
   *  der offene Text schon stehen, die sich schließende Iris legt ihn frei. */
  revealCovered?: boolean;
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
  /** Stand im Stapel, 1-basiert — steht hinter dem Kicker („3 / 25"). */
  position?: { index: number; count: number };
  state: MustEatDetailState;
  /** Kein Konto: die verdeckte Karte fragt nicht nach dem Standort — der Tipp
   *  auf den Ruecken oeffnet sofort das Anmeldeformular (MustEatDetail). */
  guest?: boolean;
  /** Stapel für die Must-Eats-Erklärung, die ein Gast unter der verdeckten
   *  Karte bekommt (die Demo-Karte der Folien ist eine offene daraus). */
  onboardingData?: InitialMustEatsData;
}

// Poster sheet: card hero → huge dish name → prose → spot action. Horizontal
// must-eat paging works both as a swipe gesture and as a quiet bottom nav.
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
  // Legacy t() can't interpolate ICU values — parametrized keys go through next-intl directly.
  const tMap = useTranslations('map');
  const localizedDescription = pickLocale(mustEat.description, mustEat.descriptionEn, lang);
  const {
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
  /* Der Text wechselt nicht erst nach der Landung, sondern sobald die Bühne
     ihn verdeckt: Gericht und Beschreibung stehen dann fertig da, wenn die
     Iris sich um die heimkehrende Karte schließt. Vorher stand beim Heimflug
     noch „Du bist da." im Sheet, und erst nach der Landung blendete der Name
     ein — ein zweiter, schwächerer Auftritt nach der Beute (Betreiber,
     24.09.2026). Die Karte selbst bleibt bis zur Landung verborgen. */
  const textOpen = isUnlocked && (!revealOrigin || revealCovered);
  const dishName = mustEat.dish ? normalizeName(mustEat.dish) : t('mustEats.covered');
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
  /* Der Wechsel spielt zwei Karten zugleich (siehe lib/cardDeal): die
     abfahrende ist ein eigenes, kurzlebiges Element mit dem Bild, das eben
     noch oben lag, die einfahrende ist die echte Top-Karte, die schon das
     neue Must Eat trägt. So steht Text und Karte des neuen Must Eats sofort
     da — nichts wartet auf die Animation. */
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
       backwards` hält den ersten Keyframe) — sie kommt nie leer herein. Mit
       vorgeladenen Nachbarn ist das sofort. */
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
  /* Auf dem Phone gibt es keine Pager-Tasten mehr (siehe MustEatDetail.module.css,
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
      if (window.sessionStorage.getItem(SWIPE_HINT_KEY) === SWIPE_HINT_DONE) setHasSwiped(true);
    } catch {
      /* Private Mode o. ä. — dann bleibt es beim Hinweis. */
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

  /* Das Bild der Karte, auf die geblättert wird — der Tausch wartet darauf.
     Eine verdeckte Nachbarkarte zeigt den Rücken, der liegt ohnehin im Cache. */
  const neighbourFace = (dir: 'prev' | 'next') => {
    const neighbour = dir === 'prev' ? prevMustEat : nextMustEat;
    const unlocked = dir === 'prev' ? prevUnlocked : nextUnlocked;
    return (unlocked && neighbour?.image) || CARD_BACK;
  };

  /* Die Nachbarbilder liegen per <link rel=preload> schon im Cache, dekodiert
     sind sie damit noch nicht — und die einfahrende Karte wartet draußen, bis
     ihr Bild zeichenbar ist. Vorab dekodiert kommt sie ohne Zögern. */
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
    /* Ohne Bewegung wechselt die Karte sofort, ohne Flug. */
    if (!card || !face || prefersReducedMotion()) {
      card?.style.removeProperty('transition');
      card?.style.removeProperty('transform');
      page();
      return;
    }
    flushSync(() => {
      setLeaving({ id: performance.now(), src: face.currentSrc || face.src, dir, fromX });
      const src = neighbourFace(dir);
      /* Schon vorab dekodiert (siehe decodedFacesRef): sofort los. Jede
         weitere Zusage kostet unter Last ein, zwei Frames, und die Karte
         käme der abfahrenden erst hinterher. */
      const href = new URL(src, window.location.href).href;
      const decoded = decodedFacesRef.current.find((img) => img.src === href);
      const ready =
        decoded?.complete && decoded.naturalWidth > 0 ? Promise.resolve() : whenImageReady(src);
      cardEnterRef.current = { dir, ready };
      page();
    });
  };

  /* Die Kopfzeile des verdeckten Zustands sitzt IM Namens-Track, nicht darunter.
     Der Track ist reserviert, damit beim Aufdecken nichts springt — verdeckt
     stand dort aber nur der unsichtbar gestellte Gerichtsname, seit das
     "Verdeckt"-Badge raus ist also eine leere Fläche von ~90px zwischen Karte
     und Text. Jetzt füllt die Kopfzeile sie, in der Größe des Gerichtsnamens,
     und beim Aufdecken wird sie schlicht vom Gericht ersetzt: gleicher Track,
     gleiche Höhe, kein Sprung.

     Der Track gehört dabei dem GERICHT — auch ohne Standort-Fix. „Wo bist du?"
     und „Standort blockiert" standen hier in Gerichtsgröße und lasen sich wie
     der Name eines Gerichts (Nutzer, 02.09.2026). Eine Browser-Berechtigung ist
     aber kein Produktmoment: die Zeile sagt jetzt in jedem verdeckten Zustand,
     was unter der Karte liegt, und der Standort steht darunter als eigener
     Chip (siehe .fdLocation).

     Während gespeichert wird, steht hier nichts Eigenes mehr: die Karte ist
     dann schon auf der Bühne des Aufdeckens (MustEatRevealOverlay), und was
     sie in die Sammlung bringt, sagt die Bühne selbst — in Ruhe, nicht als
     Aufblitzen im Feld des Gerichts (Betreiber, 24.09.2026). */
  const coverHead = unlockError
    ? t('map.revealError')
    : canUnlock
      ? tMap('proximityHere')
      : tMap('proximityAway');
  /* Ohne Fix trägt die Copy-Zeile nur den Chip — ein Schritt pro Zustand.
     Der Satz, der die Karte erklärt („Ein Gericht, das du probieren musst …"),
     kommt, sobald die App weiß, wo der Besucher ist.

     Verweigert ist KEIN eigener Zustand der Karte: sie liest sich wie jede
     verdeckte Karte, und erst der Tipp darauf sagt, was fehlt — als Meldung in
     der zentralen Info-Karte, wie auf Map und Startseite (siehe
     onLocationBlocked in MustEatDetail). Ein stiller „Standort blockiert"-Chip
     mit Hinweis darunter stand hier kurz und wurde als Fremdkörper abgelehnt
     (Nutzer, 02.09.2026). */
  const explainerData = guest ? onboardingData : undefined;
  /* Einem Gast erklärt der Knopf „Wie funktioniert's?" die Karte (siehe
     unten) — der Näherungs-Hinweis sagte dasselbe noch einmal, und beide
     zusammen sprengten den Text-Slot: die Karte darüber schrumpfte. */
  const coverSub = unlockError
    ? t('map.revealRetry')
    : canUnlock
      ? tMap('proximityTapReveal')
      : (needsLocation && !locationDenied) || explainerData
        ? null
        : tMap('proximityHint');
  /* Ein Gast wird nicht nach seinem Standort gefragt — sein Weg zur Karte
     ist die Anmeldung, nicht die Naehe (siehe MustEatDetail). */
  const showLocationChip = !guest && needsLocation && !locationDenied && !unlocking && !unlockError;
  const guestPitch = guest && !textOpen;
  const kicker = mustEat.restaurant.district
    ? `Must Eat · ${mustEat.restaurant.district}`
    : 'Must Eat';
  const headInNameSlot = !textOpen;
  const slotText = headInNameSlot ? coverHead : dishName;
  const slotWeight = slotText.replace(/\s+/g, '').length;
  /* Die Stufe hängt auch am LÄNGSTEN WORT, nicht nur an der Zeichenzahl: ein
     Wort bricht nicht, und „RINDERGULASCH" (13 Versalien) war in der Grundgröße
     breiter als der Rail — die Zeile stand links an und ragte rechts heraus,
     die zweite Zeile mittig darunter (Nutzer, 02.09.2026: „nicht mittig
     zentriert"). Ab 11 Buchstaben eine Stufe kleiner, ab 14 zwei. */
  const longestWord = Math.max(...slotText.split(/\s+/).map((word) => word.length));
  const slotSizeClass =
    slotWeight > 22 || longestWord > 13
      ? styles.fdNameCompact
      : slotWeight > 12 || longestWord > 10
        ? styles.fdNameLong
        : '';

  /* Der Restaurantname staffelt sich nach Länge, wie der Gerichtsname darüber —
     nicht pro Lokal. Eine Regel für „Saveur de Bánh Mì Schöneberg" bräche beim
     nächsten langen Namen wieder; die Spalte ist rund 175px breit, in eine
     Zeile passt so ein Name auch klein nicht. Die Stufen sorgen dafür, dass er
     in die zwei reservierten Zeilen passt, statt geklemmt zu werden. */
  /* Stufen für EINE Zeile: die Spalte misst rund 250px (Telefon) bzw. 237px
     (Rail); „Bursa Uludağ Kebapçısı" (20 Zeichen) braucht bei 17px 195 — die
     Stufen greifen erst bei wirklich langen Namen. */
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
          in MustEatDetail.module.css) würde ein Kind darin mit dem Inhalt
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
      <div className={styles.scroll} data-detail-scroll>
        {/* HERO — freigestellte Karte mit Glow-Halo. Open: dish card (3D-Tilt
            via CSS, tap-to-zoom). Locked: card-back (flach + Wackeln, tap to
            reveal in range — flach bleibt wichtig für die Reveal-Fly-Origin). */}
        <div className={styles.fdHeroWrap} data-detail-hero>
          {/* Die Blätter-Winkel gehören zum Stapel: ab 768px stehen sie neben
              der Karte (absolut an ihren Kanten, siehe MustEatDetail.module.css
              „Blättern an der Karte"), auf dem Telefon gibt es keine — dort
              wird gewischt. Der Stapel ist deshalb die Gruppe fürs
              Screenreader-Ohr; die Namen der Nachbarn tragen die aria-Labels. */}
          <div
            className={styles.fdCardStack}
            role={prevMustEat || nextMustEat ? 'group' : undefined}
            aria-label={prevMustEat || nextMustEat ? t('map.pagerAria') : undefined}
          >
            {(prevMustEat || nextMustEat) && (
              <button
                type="button"
                className={styles.fdPagerPrev}
                disabled={!prevMustEat}
                onClick={() => pageWithCard('prev')}
                aria-label={
                  previousName ? `${t('map.pagerPrev')}: ${previousName}` : t('map.pagerPrev')
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H4m7-7-7 7 7 7" /></svg>
              </button>
            )}
            {(prevMustEat || nextMustEat) && (
              <button
                type="button"
                className={styles.fdPagerNext}
                disabled={!nextMustEat}
                onClick={() => pageWithCard('next')}
                aria-label={nextName ? `${t('map.pagerNext')}: ${nextName}` : t('map.pagerNext')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7" /></svg>
              </button>
            )}
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
                  /* Während des Zooms (inkl. Fly-Back) verstecken, sonst liegt die
                    Karte doppelt da — Zoom-Klon + statische Slot-Karte. */
                  style={state.zoomActive ? { visibility: 'hidden' } : undefined}
                >
                  {/* Pro Bild ein eigenes <img>: ein wiederverwendetes Element
                      zeigt nach einem `src`-Wechsel weiter das ALTE Bild, bis
                      das neue dekodiert ist — beim Blättern kam die nächste
                      Karte dadurch mit dem Bild der vorigen herein. */}
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
                  /* The accessible name has to follow the same state machine
                     as the copy above. Without a fix "Zu weit weg" is the same
                     guess the headline used to make — and here it is the ONLY
                     thing a screen reader gets, since the tap now opens the
                     permission prompt rather than revealing anything. */
                  aria-label={
                    /* Ohne Konto oeffnet der Tipp das Anmeldeformular — und
                       so heisst die Karte auch, mit demselben kurzen Wort wie
                       der Knopf im Spot-Sheet. */
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
                  /* Auch die verdeckte Karte verschwindet während des Zooms:
                     der Zoom blättert inzwischen weiter, und landet er auf einer
                     verdeckten Karte, läge sonst deren Rücken doppelt da —
                     Zoom-Klon plus Slot-Karte. */
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
        <div className={`${styles.fdMid}${!textOpen ? ` ${styles.fdMidLocked}` : ''}`}>
          {/* Ein Track für beides: verdeckt trägt er die Zustands-Kopfzeile,
              aufgedeckt den Gerichtsnamen — in derselben Größe, unten im
              2-Zeilen-Feld verankert, sodass eine zweite Zeile nach oben füllt
              und nichts darunter springt. Vorher stand hier verdeckt der
              unsichtbar gestellte Gerichtsname und die Kopfzeile eine Etage
              tiefer; das ergab eine leere Fläche zwischen Karte und Text und
              zwei konkurrierende Zustandsanzeigen. */}
          {/* Kicker und Gerichtsname als ein Kopf, wie im Onboarding jede Folie
              (Kicker → Titel → Text). Der Kicker nennt den Bezirk: die eine
              Angabe, die verdeckt wie aufgedeckt gilt und nicht schon im
              Restaurant-Streifen steht. */}
          <div className={styles.fdHead}>
            {/* Der Zählstand in eigener Zeile über dem Kicker („1 / 23") — hinter
                dem Kicker stand er als Anhängsel, der Nutzer wollte ihn
                zentriert für sich (02.09.2026). Auf dem Telefon ist er neben dem
                Nudge das Zeichen, dass der Stapel weitergeht. */}
            {position && position.count > 1 && (
              <p className={styles.fdKickerCount}>
                {position.index} / {position.count}
              </p>
            )}
            {/* Der Kicker: „MUST EAT · BEZIRK". Die Winkel standen kurz hier
                neben der Schrift (02.09.2026), seit dem 03.09. wieder an der
                Karte — im Rail und im Tablet-Sheet ist neben ihr Platz, und
                geblättert wird die Karte, nicht der Kicker.
                `data-detail-pager` misst useMapSheet weiter. */}
            <div className={styles.fdKickerRow} data-detail-pager>
              <p className={`et-label ${styles.fdKicker}`}>{kicker}</p>
            </div>
            {/* h2 — siehe RestaurantDetail: die H1 gehört der Kartenseite. */}
            <h2 className={`${styles.fdName}${slotSizeClass ? ` ${slotSizeClass}` : ''}`}>
              {headInNameSlot ? (
                <span className={styles.fdNameText}>{slotText}</span>
              ) : (
                <span className={styles.fdNameText}>{dishName}</span>
              )}
            </h2>
          </div>

          {/* Beschreibung — komplett (keine Klemmung), in der Marken-Schrift. */}
          {textOpen && localizedDescription && (
            <p className={styles.fdText}>{localizedDescription}</p>
          )}

          {/* Locked: Näherungs-Hinweis statt Beschreibung. Ohne Konto steht
              hier statt des Hinweises „Wie funktioniert's?" (siehe unten) —
              der Tipp auf den Ruecken oeffnet weiterhin sofort das
              Anmeldeformular (MustEatDetail). Ein Anmelde-Block in der Karte
              stand hier kurz und wurde als Fremdkoerper abgelehnt, eine Tafel
              als Layer zwischen Tipp und Formular als Klick zu viel
              (Betreiber, 07.09.2026). */}
          {!textOpen && (
            <div
              className={`${styles.fdProximity}${unlockError ? ` ${styles.fdProximityError}` : canUnlock ? ` ${styles.fdProximityReady}` : ''}`}
              role={unlockError ? 'alert' : 'status'}
              aria-live="polite"
            >
              {/* Hier steht keine Entfernung mehr — weder als Balken (die
                  log-Skala von 10 km auf 50 m sagte niemandem etwas) noch als
                  Zahl. „Noch 8,2 km" ließ den Spot weit und mühsam wirken und
                  beantwortete die Frage nicht, die der Kartenrücken stellt.
                  Wie weit es ist, zeigt die Map; diese Zeile sagt, was unter
                  der Karte liegt. */}
              {coverSub && <p className={styles.fdProximitySub}>{coverSub}</p>}
              {/* Der Standort als eigenes Objekt: eine Taste, solange man den
                  Browser noch fragen darf. Der Kartentipp fragt weiterhin mit —
                  die Taste macht nur sichtbar, dass es etwas zu tun gibt. */}
              {/* Ein Gast weiß nicht, was eine verdeckte Karte ist — der
                  Tipp darauf führt ihn direkt zur Anmeldung. Erklärt wird
                  deshalb hier, mit den Folien der Must-Eats-Seite: beim ersten
                  Mal legen sie sich von selbst über das Detail (derselbe
                  „gesehen"-Merker wie auf /must-eats), danach holt dieser
                  Knopf sie zurück. Er steht, wo ein angemeldeter Besucher den
                  Standort-Chip hat — den bekommt ein Gast nie (Betreiber,
                  28.09.2026). */}
              {explainerData && (
                <div className={styles.fdLocation}>
                  <MustEatsOnboarding
                    initialMapData={explainerData}
                    autoOpen={!state.zoomActive}
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

        {/* Restaurant-Zeile: die GANZE Zeile ist der Weg zum Spot — Foto, Label,
            Name, sonst nichts; dass sie ein Knopf ist, sagt ihr Ring (CSS).
            Vorher stand rechts eine „Zum Spot"-Pille; sie nahm der Namensspalte
            100px, und lange Namen brachen („Knödelwirt-/schaft SÜD", Nutzer
            02.09.2026). Danach ein Pfeilkreis („mag den Pfeil nicht"), dann das
            Wort „Zum Spot" („braucht man das?") — beides wieder raus. Der Name
            bleibt einzeilig (Stufen unten, Ellipse als letztes Mittel), damit
            die Zeile in jeder Karte gleich hoch ist: mit einem zweizeiligen
            Namen war sie 9px höher und der Kartenstapel sprang beim Blättern.
            Screenreader hören weiter „Zum Spot: <Name>". */}
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
