'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import MapIntentLink from './MapIntentLink';
import { useUnlockedMustEats, resolveUnlockedMustEatIds } from '@/lib/map';
import { useTranslation } from '@/lib/i18n';
import { normalizeName } from '@/lib/normalizeName';
import { filterMustEats } from '@/lib/home/mustEatsGallery';
import { useHomeMapData } from './HomeMapDataContext';
import styles from './HubMustEatsTeaser.module.css';

const TEASER_COUNT = 6;

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

/**
 * `children` carries the cutout-dish strip, which used to be its own section
 * ("Das willst du essen"). Both sections showed a row of food photos with a
 * restaurant name underneath, so they read as the same thing twice. Folded
 * into one: the card mechanic is the headline, the cutouts are its texture.
 */
interface Props {
  children?: React.ReactNode;
}

export default function HubMustEatsTeaser({ children }: Props) {
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

  // Showcase: nur face-up Karten — der „Schatzkarte"-Job (verdeckte Karten in
  // deiner Nähe) lebt jetzt in HubNearby.
  const teaser = useMemo(() => {
    return filterMustEats(mustEats, faceUp, 'open').slice(0, TEASER_COUNT);
  }, [mustEats, faceUp]);

  if (teaser.length === 0) return null;

  return (
    <section className="homeV2 hv-section hv-wrap" data-hub-must-eats="">
      <div className="hv-head">
        <h2 className="hv-title">
          <span className="hv-mk" aria-hidden="true" />
          {t('mustEats.teaserTitle')}
        </h2>
      </div>

      <p className={styles.lead}>
        {lang === 'en'
          ? 'Every Must Eat is a card: discover it on the map, reveal it on site.'
          : 'Jedes Must Eat ist eine Karte: auf der Map entdecken, vor Ort aufdecken.'}
      </p>

      <ul className={`hv-rail ${styles.rail}`} role="list">
        {teaser.map((m) => (
          <li key={m._id} className={styles.item}>
            <article className={styles.cardShell}>
              {/* Deep-link into the map: ?me= opens the must-eat detail. */}
              <MapIntentLink
                href={`/map?me=${m._id}`}
                className={styles.cardLink}
                aria-label={`${normalizeName(m.dish ?? '')} ${mustEatAria}`}
              >
                <span className={styles.photo}>
                  {/* Server-rendered with native lazy loading rather than
                    mounted by an IntersectionObserver after hydration. The
                    observer kept the images off the initial payload, which
                    `loading="lazy"` does by itself — but it also made every
                    card wait for the JS bundle and hydration first, on the
                    section furthest down the page. */}
                  {m.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className={styles.card}
                      src={`${m.image}?w=360&auto=format&q=80`}
                      srcSet={cardSrcSet(m.image)}
                      // The tile is clamp(168px, 20vw, 208px) on the phone rail
                      // and capped at 178px from 761px up.
                      sizes="(min-width: 761px) 178px, 208px"
                      alt={normalizeName(m.dish ?? '')}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </span>
              </MapIntentLink>
              <span className={styles.meta}>
                <MapIntentLink
                  href={`/map?me=${m._id}`}
                  className={styles.dishLink}
                  aria-label={`${normalizeName(m.dish ?? '')} ${mustEatAria}`}
                >
                  <span className={styles.dish}>{normalizeName(m.dish ?? '')}</span>
                </MapIntentLink>
                <Link
                  href={`/restaurant/${m.restaurant.slug}`}
                  className={styles.restaurantLink}
                  aria-label={`${normalizeName(m.restaurant.name)} ${restaurantAria}`}
                >
                  <span className="hv-sub">{normalizeName(m.restaurant.name)}</span>
                </Link>
              </span>
            </article>
          </li>
        ))}
      </ul>

      {children}

      <div className={styles.foot}>
        <MapIntentLink href="/must-eats" className="hv-btn">
          {t('mustEats.teaserCta')}
        </MapIntentLink>
      </div>
    </section>
  );
}
