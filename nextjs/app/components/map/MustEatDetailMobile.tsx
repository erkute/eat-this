'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { MapMustEat } from '@/lib/types';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import { pickLocale } from '@/lib/i18n/pickLocale';
import { normalizeName } from '@/lib/normalizeName';
import styles from './MapDetails.module.css';
import { type MustEatDetailState } from './useMustEatDetailState';
import { useSwipePager } from './useSwipePager';
import { CloseIcon, PagerArrowIcon, PinIcon } from './icons';

const CARD_BACK = '/pics/card-back.webp?v=7';
/* Gesetzt, sobald jemand in DIESER Sitzung gewischt hat — danach ruht der
   Wisch-Hinweis bis zum nächsten Besuch. Er stand in localStorage und kam nie
   wieder; wer die Geste einmal probiert hatte, sah auf dem Telefon danach kein
   Zeichen mehr, dass es weitergeht (Nutzer, 02.09.2026). */
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
  /** Stand im Stapel, 1-basiert — steht hinter dem Kicker („3 / 25"). */
  position?: { index: number; count: number };
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
  position,
  state,
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
  const nameRevealed = open && !nameBurning;
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

  /* Die Kopfzeile des verdeckten Zustands sitzt IM Namens-Track, nicht darunter.
     Der Track ist reserviert, damit beim Aufdecken nichts springt — verdeckt
     stand dort aber nur der unsichtbar gestellte Gerichtsname, seit das
     "Verdeckt"-Badge raus ist also eine leere Fläche von ~90px zwischen Karte
     und Text. Jetzt füllt die Kopfzeile sie, in der Größe des Gerichtsnamens,
     und beim Aufdecken wird sie schlicht vom Gericht ersetzt: gleicher Track,
     gleiche Höhe, kein Sprung. Während der Reveal-Animation (nameBurning)
     gehört der Track wieder dem Gericht, das dort aufscharft.

     Der Track gehört dabei dem GERICHT — auch ohne Standort-Fix. „Wo bist du?"
     und „Standort blockiert" standen hier in Gerichtsgröße und lasen sich wie
     der Name eines Gerichts (Nutzer, 02.09.2026). Eine Browser-Berechtigung ist
     aber kein Produktmoment: die Zeile sagt jetzt in jedem verdeckten Zustand,
     was unter der Karte liegt, und der Standort steht darunter als eigener
     Chip (siehe .fdLocation). */
  const coverHead = unlocking
    ? t('map.revealSaving')
    : unlockError
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
  const coverSub = unlocking
    ? t('map.revealSavingHint')
    : unlockError
      ? t('map.revealRetry')
      : canUnlock
        ? tMap('proximityTapReveal')
        : needsLocation && !locationDenied
          ? null
          : tMap('proximityHint');
  const showLocationChip = needsLocation && !locationDenied && !unlocking && !unlockError;
  const kicker = mustEat.restaurant.district
    ? `Must Eat · ${mustEat.restaurant.district}`
    : 'Must Eat';
  const headInNameSlot = !open && !nameBurning;
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
        <div className={`${styles.fdMid}${!open ? ` ${styles.fdMidLocked}` : ''}`}>
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
            {/* Der Kicker ist die Blätter-Zeile: „‹ MUST EAT · BEZIRK ›". Die
                Pfeile standen an den Kartenkanten — auf dem Telefon geht das
                nicht auf: nah an der Karte kleben sie an ihr, weiter weg
                kleben sie am Bildschirmrand, und jede Spur neben der Karte
                kostet Kartenbreite (Nutzer, 02.09.2026, drei Runden). Bei der
                Schrift sind sie in jeder Breite gleich weit von allem, und die
                Karte nimmt die ganze Höhe. Die Namen der Nachbarn tragen die
                aria-Labels. `data-detail-pager` misst useMapSheet weiter. */}
            <div
              className={styles.fdKickerRow}
              data-detail-pager
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
                  <PagerArrowIcon />
                </button>
              )}
              <p className={styles.fdKicker}>{kicker}</p>
              {(prevMustEat || nextMustEat) && (
                <button
                  type="button"
                  className={styles.fdPagerNext}
                  disabled={!nextMustEat}
                  onClick={() => pageWithCard('next')}
                  aria-label={nextName ? `${t('map.pagerNext')}: ${nextName}` : t('map.pagerNext')}
                >
                  <PagerArrowIcon />
                </button>
              )}
            </div>
            {/* h2 — siehe RestaurantDetail: die H1 gehört der Kartenseite. */}
            <h2 className={`${styles.fdName}${slotSizeClass ? ` ${slotSizeClass}` : ''}`}>
              {headInNameSlot ? (
                <span className={styles.fdNameText}>{slotText}</span>
              ) : (
                <span
                  className={`${styles.fdNameText}${nameBurning ? ` ${styles.fdNameUnblurring}` : ''}`}
                  aria-hidden={nameRevealed ? undefined : true}
                >
                  {dishName}
                </span>
              )}
            </h2>
          </div>

          {/* Beschreibung — komplett (keine Klemmung), in der Marken-Schrift. */}
          {open && localizedDescription && <p className={styles.fdText}>{localizedDescription}</p>}

          {/* Locked: Näherungs-Hinweis statt Beschreibung. */}
          {!open && (
            <div
              className={`${styles.fdProximity}${unlockError ? ` ${styles.fdProximityError}` : canUnlock ? ` ${styles.fdProximityReady}` : ` ${styles.fdProximityAway}`}`}
              role={unlockError ? 'alert' : 'status'}
              aria-live="polite"
            >
              {/* Nur solange der Namens-Track dem aufscharfenden Gericht gehört
                  — sonst steht die Kopfzeile oben im Track (siehe coverHead). */}
              {!headInNameSlot && <p className={styles.fdProximityHead}>{coverHead}</p>}
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
              {showLocationChip && (
                <div className={styles.fdLocation} data-location-needed="ask">
                  <button
                    type="button"
                    className={styles.fdLocationChip}
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
