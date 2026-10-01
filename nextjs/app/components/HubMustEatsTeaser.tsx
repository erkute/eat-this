'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from '@/i18n/navigation';
import MapIntentLink from './MapIntentLink';
import MustEatsOnboarding from './MustEatsOnboarding';
import { useUnlockedMustEats, resolveUnlockedMustEatIds } from '@/lib/map';
import { useLoginModal } from '@/lib/auth';
import { GUEST_SHAKE_MS, prefersReducedMotion } from '@/lib/guestCardShake';
import { trackEvent } from '@/lib/analytics';
import { useTranslation } from '@/lib/i18n';
import { normalizeName } from '@/lib/normalizeName';
import { spotNameWithoutDistrict } from '@/lib/home/spotNameWithoutDistrict';
import { composeTeaserCards } from '@/lib/home/mustEatsGallery';
import { mustEatCardSrc } from '@/lib/must-eat/cardImage';
import { useHomeMapData } from './HomeMapDataContext';
import { appScroller } from '@/lib/dom/appScroller';
import styles from './HubMustEatsTeaser.module.css';

const TEASER_COUNT = 6;

// Face-up cards sit between the face-down ones rather than leading the set:
// the first tile poses the question and the second answers it. The row used to
// be six face-up cards, which showed the reward without ever showing the
// mechanic that earns it — the card frame then had no visible reason to exist.
// Both examples remain between covered cards as visitors browse the gallery.
const FACE_UP_SLOTS = [1, 4] as const;

const CARD_BACK = '/pics/card-back.webp?v=7';

// The large gallery card reaches 300px; the image route supplies the same
// supported width ladder used elsewhere in the collection.
const CARD_WIDTHS = [180, 360, 440, 720] as const;

function cardSrcSet(url: string): string {
  return CARD_WIDTHS.map((w) => `${mustEatCardSrc(url, w)} ${w}w`).join(', ');
}

const CARD_SIZES = '(min-width: 768px) 340px, 60vw';

export default function HubMustEatsTeaser() {
  const { initialMapData, live, uid } = useHomeMapData();
  const { unlockedIds: storedUnlockedIds } = useUnlockedMustEats(uid);
  const { open: openLoginModal } = useLoginModal();
  const { lang, t } = useTranslation();
  const mustEatAria = lang === 'de' ? 'auf der Map anzeigen' : 'show on the map';
  const restaurantAria = lang === 'de' ? 'Restaurantseite öffnen' : 'open restaurant page';

  // The first client render must match SSR exactly: SSR renders the anonymous
  // view (uid=null) from `initialMapData`, so the pre-mount render here mirrors
  // it — uid=null + initialMapData fed through the shared face-up helper. That
  // yields the deterministic anon view (10 curated cards + spot-of-day) face-up,
  // identical on server and first client paint. After mount, swap to the live
  // dataset + the real uid so signed-in stored unlocks + proximity reveals show
  // too — exactly like the map.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const effUid = mounted ? uid : null;
  const mustEats = mounted ? live.mustEats : initialMapData.mustEats;
  // Memoized: the pre-mount fallbacks construct fresh Sets, which would
  // otherwise re-trigger the faceUp memo below on every render.
  const revealedMustEatIds = useMemo(
    () => (mounted ? live.revealedMustEatIds : new Set<string>(initialMapData.revealedMustEatIds)),
    [mounted, live.revealedMustEatIds, initialMapData]
  );
  const storedSet = useMemo(
    () => (mounted ? storedUnlockedIds : new Set<string>()),
    [mounted, storedUnlockedIds]
  );
  // Public anon face-up set — folded in for signed-in users too so the teaser
  // matches the map/profile ("publicly face-up means face-up everywhere").
  const publicFaceUpIds = useMemo(
    () => new Set<string>(initialMapData.revealedMustEatIds),
    [initialMapData]
  );
  const faceUp = useMemo(
    () =>
      resolveUnlockedMustEatIds({
        uid: effUid,
        storedUnlockedIds: storedSet,
        revealedMustEatIds,
        publicFaceUpIds,
      }),
    [effUid, storedSet, revealedMustEatIds, publicFaceUpIds]
  );

  const cards = useMemo(
    () => composeTeaserCards(mustEats, faceUp, TEASER_COUNT, FACE_UP_SLOTS),
    [mustEats, faceUp]
  );

  /* Der Tipp auf einen Rücken ohne Konto lässt die Karte erst zittern und
     öffnet dann das Anmeldeformular — derselbe Griff wie im Map-Detail
     (Betreiber, 07.09.2026: „auf der Startseite eigentlich genau das
     Gleiche"). Der Timer wird beim Abräumen gestoppt: sonst setzte er den
     Zustand einer Karte, die nicht mehr auf der Seite steht. */
  const [shakingId, setShakingId] = useState<string | null>(null);
  const shakeTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (shakeTimer.current !== null) window.clearTimeout(shakeTimer.current);
    },
    []
  );

  /* ── Bühne (A24, 30.09.2026) ── Die Karten fahren stufenlos am Scrollweg:
     von rechts klein über die Mitte gross nach links klein, jede auf ihrem
     eigenen Fenster der Scroll-Timeline (HubMustEatsTeaser.module.css). Das
     läuft im Takt des Scrollens, auch auf dem iPhone; JS misst nur die
     Bühne aus. Nichts hält den Scroll fest. Mit reduzierter Bewegung und
     ohne Scroll-Timelines liegen die Karten nebeneinander. */
  const runwayRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLUListElement>(null);
  const [staged, setStaged] = useState(false);
  const count = cards.length;

  useEffect(() => {
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!calm || typeof ResizeObserver === 'undefined') return;
    if (!CSS.supports?.('animation-timeline: view()')) return;
    const update = () => setStaged(!calm.matches);
    update();
    calm.addEventListener?.('change', update);
    return () => calm.removeEventListener?.('change', update);
  }, []);

  /** Runway geometry: where the stage pins and how far it travels. */
  const measure = useCallback(() => {
    const runway = runwayRef.current;
    const stage = runway?.firstElementChild as HTMLElement | null;
    if (!runway || !stage) return null;
    const scroller = appScroller();
    // `scroll-margin-top` carries the stage's pin line (CSS `--stage-top`)
    // as a resolved pixel value.
    const stageTop = parseFloat(getComputedStyle(runway).scrollMarginTop) || 0;
    const portHeight = scroller ? scroller.clientHeight : window.innerHeight;
    const pinTop = (scroller?.getBoundingClientRect().top ?? 0) + stageTop;
    const travel = runway.offsetHeight - stage.offsetHeight;
    return { runway, stage, scroller, stageTop, portHeight, pinTop, travel };
  }, []);

  useEffect(() => {
    const runway = runwayRef.current;
    if (!staged || !runway || count < 2) return;
    // The stage fills the scroll area below its pin line; its height then
    // sets the runway and the timeline's window (CSS reads the three).
    const stage = runway.firstElementChild as HTMLElement;
    const size = () => {
      const m = measure();
      if (!m) return;
      // Desktop scrolls `.app-pages`, measured here. The phone keeps the CSS
      // values (`100svh` for the stage, `100dvh` for the timeline window):
      // `innerHeight` changes with every move of Safari's toolbar, and a stage
      // sized from it grew and shrank the cards while scrolling.
      if (m.scroller) {
        runway.style.setProperty('--view-h', `${m.portHeight - m.stageTop}px`);
        runway.style.setProperty('--port-h', `${m.portHeight}px`);
      } else {
        runway.style.removeProperty('--view-h');
        runway.style.removeProperty('--port-h');
      }
      runway.style.setProperty('--stage-h', `${stage.offsetHeight}px`);
    };
    size();
    const resize = new ResizeObserver(size);
    resize.observe(stage);
    window.addEventListener('resize', size);
    return () => {
      resize.disconnect();
      window.removeEventListener('resize', size);
      ['--view-h', '--stage-h', '--port-h'].forEach((v) => runway.style.removeProperty(v));
    };
  }, [staged, count, measure]);

  /** Tab brings an off-stage card into view: scroll to where it stands in
   *  the middle. A tap on a visible card never moves the page. */
  const focusCard = (index: number) => {
    if (!staged || !deckRef.current?.querySelector(':focus-visible')) return;
    const m = measure();
    if (!m) return;
    const delta =
      m.runway.getBoundingClientRect().top - m.pinTop + (m.travel * index) / Math.max(1, count - 1);
    if (m.scroller) m.scroller.scrollTop += delta;
    else window.scrollTo({ top: window.scrollY + delta, behavior: 'instant' });
  };

  // Nothing face-up means six card backs and no example of what is under one —
  // a section that asks visitors to collect something it never shows.
  if (!cards.some((c) => c.faceUp)) return null;

  /* Ohne Konto ist eine verdeckte Karte hier keine Aufgabe, sondern das
     Angebot: die Rücken kommen aus dem ganzen Stapel (getHomeInitialMapData),
     nicht aus einem Deck, das der Besucher hätte — auf der Map gäbe es für
     ihn dort nichts aufzudecken. Der Tipp führt deshalb zur Anmeldung, und
     zwar in den Starter-Pack-Modus, weil das die Antwort auf „was ist unter
     der Karte" ist: zwanzig davon, zehn liegen dann offen. Mit Konto bleibt
     die Karte, was sie im Profil ist — der Weg auf die Map, an den Spot.

     Die angetippte Karte reist mit (pendingStarterCard): das Starter Pack
     legt sie garantiert offen hinein — dieselbe Zusage wie auf der Map. Und
     wie dort oeffnet der Tipp sofort das Formular, ohne Tafel dazwischen
     (Betreiber, 07.09.2026). */
  const openStarterLogin = (mustEatId: string) => {
    // Ein zweiter Tipp waehrend des Zitterns startet nichts doppelt.
    if (shakeTimer.current !== null) return;
    trackEvent('login_start', { method: 'home_covered_card' });
    const open = () => openLoginModal({ kind: 'card', mustEatId });
    // Ohne Bewegung waere die Wartezeit ein toter Moment.
    if (prefersReducedMotion()) {
      open();
      return;
    }
    setShakingId(mustEatId);
    shakeTimer.current = window.setTimeout(() => {
      shakeTimer.current = null;
      setShakingId(null);
      open();
    }, GUEST_SHAKE_MS);
  };

  return (
    <section className="homeV2 hv-section hv-wrap" data-hub-musteats="">
      <div
        ref={runwayRef}
        className={styles.runway}
        data-staged={staged && count > 1 ? '' : undefined}
        style={{ '--count': count } as CSSProperties}
      >
        <div className={styles.stage}>
          <div className={styles.side}>
            <div className="hv-head">
              <h2 className="hv-title">
                <span className="hv-mk" aria-hidden="true" />
                {t('mustEats.teaserTitle')}
              </h2>
            </div>
            <p className={styles.lead}>{t('mustEats.teaserSub')}</p>
            <div className={styles.foot}>
              <MapIntentLink href="/must-eats" className={`hv-btn ${styles.cta}`}>
                {t('mustEats.teaserCta')}
              </MapIntentLink>
              <MustEatsOnboarding initialMapData={initialMapData} autoOpen={false} tone="ink" />
            </div>
          </div>
          <ul
            ref={deckRef}
            className={styles.deck}
            role="list"
            aria-label={t('mustEats.teaserTitle')}
          >
          {cards.map(({ mustEat: m, faceUp: isFaceUp }, index) => {
            // Ohne Bezirk: „AERA Charlottenburg“ heisst unter dem Gericht nur „AERA“.
            const restaurant = spotNameWithoutDistrict(
              normalizeName(m.restaurant.name),
              m.restaurant.district
            );
            const dish = isFaceUp ? normalizeName(m.dish ?? '') : '';
            // Eine verdeckte Karte aus dem Stapel kennt ihren Spot nicht
            // (trimCoveredSpot): welches Lokal die Karte hält, ist Teil der
            // Überraschung. Eine aus dem eigenen Deck kennt ihn — dort ist der
            // Spot die Aufgabe, und die Zeile darunter führt hin.
            const hasSpot = m.restaurant.name !== '' && m.restaurant.slug !== '';
            const needsAccount = !isFaceUp && effUid === null;
            // A covered card carries no dish name — the server strips it (see
            // stripCoveredMustEats), and naming it would give away the reveal.
            const cardAria = isFaceUp
              ? `${dish} ${mustEatAria}`
              : needsAccount
                ? lang === 'de'
                  ? 'Verdecktes Must Eat — anmelden und aufdecken'
                  : 'Face-down Must Eat — sign in to reveal it'
                : lang === 'de'
                  ? `Verdecktes Must Eat bei ${restaurant} — auf der Map aufdecken`
                  : `Face-down Must Eat at ${restaurant} — reveal it on the map`;

            const photo = (
              <span
                className={`${styles.photo}${shakingId === m._id ? ` ${styles.photoTapping}` : ''}`}
              >
                {/* Server-rendered with native lazy loading rather than
                    mounted by an IntersectionObserver after hydration. The
                    observer kept the images off the initial payload, which
                    `loading="lazy"` does by itself — but it also made every
                    card wait for the JS bundle and hydration first, on the
                    section furthest down the page. */}
                {isFaceUp && m.image ? (
                  // Eigener `key`: deckt sich eine Karte nach dem Mount auf
                  // (angemeldet, Standort), baut React ein neues <img>, statt
                  // das der Rueckseite umzuschreiben — sonst waehlt Safari bei
                  // src, srcset und sizes einzeln neu und laedt zwei Varianten.
                  // Grund und Beleg in ProfileAlbum.tsx.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key="card"
                    className={styles.card}
                    src={mustEatCardSrc(m.image, 360)}
                    srcSet={cardSrcSet(m.image)}
                    sizes={CARD_SIZES}
                    alt={dish}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  // One shared asset across every face-down tile, so the
                  // row costs a single request. Same 760×1044 aspect as the
                  // card art, which keeps the tiles the same height.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key="back"
                    className={styles.card}
                    src={CARD_BACK}
                    alt=""
                    width={760}
                    height={1044}
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </span>
            );

            return (
              <li
                  key={m._id}
                  className={styles.slide}
                  style={{ '--i': index } as CSSProperties}
                  onFocusCapture={() => focusCard(index)}
                >
                <article className={styles.cardShell}>
                {needsAccount ? (
                  <button
                    type="button"
                    className={`${styles.cardLink} ${styles.cardButton}`}
                    aria-label={cardAria}
                    onClick={() => openStarterLogin(m._id)}
                  >
                    {photo}
                  </button>
                ) : (
                  /* Deep-link into the map: ?me= opens the must-eat detail —
                       face-up as the card, face-down with the reveal affordance. */
                  <MapIntentLink
                    href={`/map?me=${m._id}`}
                    className={styles.cardLink}
                    aria-label={cardAria}
                  >
                    {photo}
                  </MapIntentLink>
                )}
                <span className={styles.meta}>
                  {isFaceUp ? (
                    <MapIntentLink
                      href={`/map?me=${m._id}`}
                      className={styles.dishLink}
                      aria-label={cardAria}
                    >
                      <span className={styles.dish}>
                        {dish}
                      </span>
                    </MapIntentLink>
                  ) : (
                    <span
                      className={styles.dish}
                    >
                      {t('mustEats.covered')}
                    </span>
                  )}
                  {hasSpot && (
                    <Link
                      href={`/restaurant/${m.restaurant.slug}`}
                      className={styles.restaurantLink}
                      aria-label={`${restaurant} ${restaurantAria}`}
                    >
                      <span className="hv-sub">{restaurant}</span>
                    </Link>
                  )}
                </span>
              </article>
              </li>
            );
          })}
          </ul>
        </div>
      </div>
    </section>
  );
}
