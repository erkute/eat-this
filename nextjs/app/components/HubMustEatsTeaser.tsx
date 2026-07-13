'use client';

import { useEffect, useMemo, useState } from 'react';
import MapIntentLink from './MapIntentLink';
import { useUnlockedMustEats, resolveUnlockedMustEatIds } from '@/lib/map';
import { useTranslation } from '@/lib/i18n';
import { normalizeName } from '@/lib/normalizeName';
import { filterMustEats } from '@/lib/home/mustEatsGallery';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import { useHomeMapData } from './HomeMapDataContext';
import styles from './HubMustEatsTeaser.module.css';

const TEASER_COUNT = 6;

export default function HubMustEatsTeaser() {
  const { initialMapData, live, uid } = useHomeMapData();
  const { unlockedIds: storedUnlockedIds } = useUnlockedMustEats(uid);
  const { lang, t } = useTranslation();
  const mustEatAria = lang === 'de' ? 'auf der Map anzeigen' : 'show on the map';
  const restaurantAria = lang === 'de' ? 'auf der Map anzeigen' : 'show on the map';

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
          ? 'Every Must Eat is a card — discover it on the map, reveal it on site.'
          : 'Jedes Must Eat ist eine Karte — auf der Map entdecken, vor Ort aufdecken.'}
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={styles.card}
                    src={m.image}
                    // The tile renders at clamp(112px, 14vw, 144px) — the
                    // baked mapCard src (w=600) is ~4× oversized even at 2x
                    // DPR. The srcset lets the browser drop to 300/450.
                    srcSet={sanitySrcSet(m.image, [150, 300, 450])}
                    sizes="(max-width: 760px) 112px, 144px"
                    alt={normalizeName(m.dish ?? '')}
                    loading="lazy"
                  />
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
                <MapIntentLink
                  href={`/map?r=${m.restaurant.slug}`}
                  className={styles.restaurantLink}
                  aria-label={`${normalizeName(m.restaurant.name)} ${restaurantAria}`}
                >
                  <span className="hv-sub">{normalizeName(m.restaurant.name)}</span>
                </MapIntentLink>
              </span>
            </article>
          </li>
        ))}
      </ul>

      <div className={styles.foot}>
        <MapIntentLink href="/must-eats" className="hv-btn">
          {t('mustEats.teaserCta')}
        </MapIntentLink>
      </div>
    </section>
  );
}
