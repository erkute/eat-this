'use client';

import { Fragment, useEffect, useMemo, useRef, type MouseEvent } from 'react';
import gsap from 'gsap';
import { useLoginModal } from '@/lib/auth';
import { guardSwipeClick } from '@/lib/home/guardSwipeClick';
import { armMustEatCardMotion } from '@/lib/home/mustEatCardMotion';
import { Link } from '@/i18n/navigation';
import MapIntentLink from './MapIntentLink';
import MustEatsOnboarding from './MustEatsOnboarding';
import { GUEST_SHAKE_MS, prefersReducedMotion } from '@/lib/guestCardShake';
import { useTranslation } from '@/lib/i18n';
import { normalizeName } from '@/lib/normalizeName';
import { spotNameWithoutDistrict } from '@/lib/home/spotNameWithoutDistrict';
import { mustEatCardSrc } from '@/lib/must-eat/cardImage';
import { useHomeMapData } from './HomeMapDataContext';
import styles from './HubMustEatsTeaser.module.css';

const TEASER_COUNT = 5;
const CARD_WIDTHS = [180, 360, 440, 720] as const;

function cardSrcSet(url: string): string {
  return CARD_WIDTHS.map((w) => `${mustEatCardSrc(url, w)} ${w}w`).join(', ');
}

const CARD_SIZES =
  '(min-width: 1400px) calc((96vw - 232px) / 6), (min-width: 1280px) calc((88vw - 120px) / 6), (min-width: 768px) min(280px, calc((92vw - 60px) / 3)), calc((100vw - 64px) / 2)';

export default function HubMustEatsTeaser() {
  const { initialMapData, uid } = useHomeMapData();
  const { open: openLoginModal } = useLoginModal();
  const covered = initialMapData.mustEats.find(
    (card) => !initialMapData.revealedMustEatIds.includes(card._id)
  );
  const { lang, t } = useTranslation();
  const mustEatAria = lang === 'de' ? 'auf der Map anzeigen' : 'show on the map';
  const restaurantAria = lang === 'de' ? 'Restaurantseite öffnen' : 'open restaurant page';

  // The teaser always shows the public selection, including for signed-in visitors.
  const cards = useMemo(() => {
    const publicIds = new Set(initialMapData.revealedMustEatIds);
    return initialMapData.mustEats
      .filter((card) => publicIds.has(card._id) && card.image)
      .slice(0, TEASER_COUNT);
  }, [initialMapData]);

  const clickAnimation = useRef<gsap.core.Timeline | null>(null);
  useEffect(
    () => () => {
      clickAnimation.current?.kill();
    },
    []
  );

  const animateCoveredClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (!covered || clickAnimation.current?.isActive()) return;
    const open = () => openLoginModal({ kind: 'card', mustEatId: covered._id });
    if (prefersReducedMotion()) {
      open();
      return;
    }
    const photo = event.currentTarget.querySelector('[data-stack-photo]');
    if (!photo) return;
    clickAnimation.current = gsap
      .timeline({
        onComplete: () => {
          gsap.set(photo, { clearProps: 'transform' });
          open();
        },
      })
      .to(photo, { xPercent: -5, rotation: -6, duration: GUEST_SHAKE_MS / 1000 / 8 })
      .to(photo, {
        xPercent: 5,
        rotation: 6,
        duration: GUEST_SHAKE_MS / 1000 / 8,
        repeat: 5,
        yoyo: true,
      })
      .to(photo, { xPercent: 0, rotation: 0, duration: GUEST_SHAKE_MS / 1000 / 8 });
  };

  const deckRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;
    return guardSwipeClick(deck);
  }, [cards]);
  useEffect(() => {
    const deck = deckRef.current;
    if (!deck || !window.matchMedia || typeof IntersectionObserver === 'undefined') return;
    return armMustEatCardMotion(deck);
  }, [cards]);

  if (!cards.length) return null;

  const coveredCard = covered ? (
    <li className={styles.slide}>
      <article className={styles.cardShell}>
        {uid ? (
          <MapIntentLink
            href={`/map?me=${covered._id}`}
            className={styles.cardLink}
            aria-label={
              lang === 'de'
                ? 'Verdecktes Must Eat auf der Map öffnen'
                : 'Open face-down Must Eat on the map'
            }
          >
            <span className={styles.photo} data-stack-photo="covered">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.card}
                src="/pics/card-back.webp?v=7"
                alt=""
                width={760}
                height={1044}
                draggable={false}
              />
            </span>
          </MapIntentLink>
        ) : (
          <button
            type="button"
            className={`${styles.cardLink} ${styles.coveredButton}`}
            onClick={animateCoveredClick}
            aria-label={
              lang === 'de'
                ? 'Verdecktes Must Eat — anmelden und aufdecken'
                : 'Face-down Must Eat — sign in to reveal'
            }
          >
            <span className={styles.photo} data-stack-photo="covered">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.card}
                src="/pics/card-back.webp?v=7"
                alt=""
                width={760}
                height={1044}
                draggable={false}
              />
            </span>
          </button>
        )}
        <span className={styles.meta}>
          <span className={styles.dish}>{t('mustEats.teaserMystery')}</span>
          <span className={styles.tapHint}>{t('mustEats.teaserTap')}</span>
        </span>
      </article>
    </li>
  ) : null;

  return (
    <section
      className="homeV2 hv-section hv-wrap"
      data-hub-musteats=""
      aria-labelledby="home-musteats-title"
    >
      <div className={styles.runway}>
        <div className={styles.stage}>
          <div className={styles.intro}>
            <div className="hv-head">
              <h2 className="hv-title" id="home-musteats-title">
                {t('mustEats.teaserTitle')}
              </h2>
            </div>
            <p className={styles.lead}>{t('mustEats.teaserSub')}</p>
          </div>
          <div className={styles.collection}>
            <ul
              ref={deckRef}
              className={styles.deck}
              role="list"
              aria-label={t('mustEats.teaserTitle')}
            >
              {cards.map((m, index) => {
                const restaurant = spotNameWithoutDistrict(
                  normalizeName(m.restaurant.name),
                  m.restaurant.district
                );
                const dish = normalizeName(m.dish ?? '');
                const cardAria = `${dish} ${mustEatAria}`;
                return (
                  <Fragment key={m._id}>
                    <li className={styles.slide}>
                      <article className={styles.cardShell}>
                        <MapIntentLink
                          href={`/map?me=${m._id}`}
                          className={styles.cardLink}
                          aria-label={cardAria}
                        >
                          <span data-stack-photo="open" className={styles.photo}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              className={styles.card}
                              src={mustEatCardSrc(m.image!, 360)}
                              srcSet={cardSrcSet(m.image!)}
                              sizes={CARD_SIZES}
                              alt={dish}
                              draggable={false}
                              width={760}
                              height={1044}
                              loading="eager"
                              fetchPriority="low"
                              decoding="async"
                            />
                          </span>
                        </MapIntentLink>
                        <span className={styles.meta} data-stack-caption="">
                          <MapIntentLink
                            href={`/map?me=${m._id}`}
                            className={styles.dishLink}
                            aria-label={cardAria}
                          >
                            <span className={styles.dish}>{dish}</span>
                          </MapIntentLink>
                          {m.restaurant.name && m.restaurant.slug && (
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
                    {index === 0 && coveredCard}
                  </Fragment>
                );
              })}
            </ul>
            <p className={styles.browseHint}>{t('mustEats.teaserBrowse')}</p>
          </div>
          <div className={styles.foot}>
            <MapIntentLink href="/must-eats" className={`hv-btn ${styles.cta}`}>
              {t('mustEats.teaserCta')}
            </MapIntentLink>
            <MustEatsOnboarding initialMapData={initialMapData} autoOpen={false} tone="plain" />
          </div>
        </div>
      </div>
    </section>
  );
}
