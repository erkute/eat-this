'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import MapIntentLink from './MapIntentLink';
import MustEatsOnboarding from './MustEatsOnboarding';
import { useUnlockedMustEats, resolveUnlockedMustEatIds } from '@/lib/map';
import { useTranslation } from '@/lib/i18n';
import { normalizeName } from '@/lib/normalizeName';
import { composeTeaserCards } from '@/lib/home/mustEatsGallery';
import { useHomeMapData } from './HomeMapDataContext';
import styles from './HubMustEatsTeaser.module.css';

const TEASER_COUNT = 6;

// Face-up cards sit between the face-down ones rather than leading the row:
// the first tile poses the question and the second answers it. The row used to
// be six face-up cards, which showed the reward without ever showing the
// mechanic that earns it — the card frame then had no visible reason to exist.
const FACE_UP_SLOTS = [1, 4] as const;

const CARD_BACK = '/pics/card-back.webp?v=7';

// Card art comes from /api/must-eat-image, not the Sanity CDN, so
// `sanitySrcSet` silently returned undefined here: every tile downloaded the
// 1200px original (~140 kB) into a slot that is at most 208 px wide, and the
// `sizes` attribute below described a candidate list that did not exist. The
// route resizes on demand, but only for widths on its own ladder — these three
// are its rungs for 1x and 2x of the desktop (178 px) and phone (208 px) slot.
// Measured 25.08.2026: 22 kB at w=360 against 142 kB for the original, at the
// same TTFB.
const CARD_WIDTHS = [180, 360, 440] as const;

function cardSrcSet(url: string): string {
  return CARD_WIDTHS.map((w) => `${url}?w=${w}&auto=format&q=80 ${w}w`).join(', ');
}

export default function HubMustEatsTeaser() {
  const { initialMapData, live, uid } = useHomeMapData();
  const { unlockedIds: storedUnlockedIds } = useUnlockedMustEats(uid);
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

  // A row with nothing face-up would leave the lead ("ein paar Karten liegen
  // offen") describing a row that isn't there.
  if (!cards.some((c) => c.faceUp)) return null;

  return (
    <section className="homeV2 hv-section hv-wrap" data-hub-must-eats="">
      <div className="hv-head">
        <h2 className="hv-title">
          <span className="hv-mk" aria-hidden="true" />
          {t('mustEats.teaserTitle')}
        </h2>
      </div>

      <div className={styles.intro}>
        <p className={styles.lead}>{t('mustEats.teaserSub')}</p>
        {/* The same three-slide explainer the Must-Eats page opens on first
            visit, trigger-only here. Until now it lived exclusively behind the
            CTA below, so a visitor who bounced off this section because they
            didn't understand it never reached the thing that explains it. */}
        <MustEatsOnboarding initialMapData={initialMapData} autoOpen={false} />
      </div>

      <ul className={`hv-rail ${styles.rail}`} role="list">
        {cards.map(({ mustEat: m, faceUp: isFaceUp }) => {
          const restaurant = normalizeName(m.restaurant.name);
          const dish = isFaceUp ? normalizeName(m.dish ?? '') : '';
          // A covered card carries no dish name — the server strips it (see
          // stripCoveredMustEats), and naming it would give away the reveal.
          // Its restaurant is the hook: it says where the secret is.
          const cardAria = isFaceUp
            ? `${dish} ${mustEatAria}`
            : lang === 'de'
              ? `Verdecktes Must Eat bei ${restaurant} — auf der Map aufdecken`
              : `Face-down Must Eat at ${restaurant} — reveal it on the map`;

          return (
            <li key={m._id} className={styles.item}>
              <article className={styles.cardShell}>
                {/* Deep-link into the map: ?me= opens the must-eat detail —
                    face-up as the card, face-down with the reveal affordance. */}
                <MapIntentLink
                  href={`/map?me=${m._id}`}
                  className={styles.cardLink}
                  aria-label={cardAria}
                >
                  <span className={styles.photo}>
                    {/* Server-rendered with native lazy loading rather than
                      mounted by an IntersectionObserver after hydration. The
                      observer kept the images off the initial payload, which
                      `loading="lazy"` does by itself — but it also made every
                      card wait for the JS bundle and hydration first, on the
                      section furthest down the page. */}
                    {isFaceUp && m.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className={styles.card}
                        src={`${m.image}?w=360&auto=format&q=80`}
                        srcSet={cardSrcSet(m.image)}
                        // The tile is clamp(168px, 20vw, 208px) on the phone rail
                        // and capped at 178px from 761px up.
                        sizes="(min-width: 761px) 178px, 208px"
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
                </MapIntentLink>
                <span className={styles.meta}>
                  {isFaceUp ? (
                    <MapIntentLink
                      href={`/map?me=${m._id}`}
                      className={styles.dishLink}
                      aria-label={cardAria}
                    >
                      <span className={styles.dish}>{dish}</span>
                    </MapIntentLink>
                  ) : (
                    <span className={`${styles.dish} ${styles.dishCovered}`}>
                      {t('mustEats.covered')}
                    </span>
                  )}
                  <Link
                    href={`/restaurant/${m.restaurant.slug}`}
                    className={styles.restaurantLink}
                    aria-label={`${restaurant} ${restaurantAria}`}
                  >
                    <span className="hv-sub">{restaurant}</span>
                  </Link>
                </span>
              </article>
            </li>
          );
        })}
      </ul>

      <div className={styles.foot}>
        <MapIntentLink href="/must-eats" className="hv-btn">
          {t('mustEats.teaserCta')}
        </MapIntentLink>
      </div>
    </section>
  );
}
