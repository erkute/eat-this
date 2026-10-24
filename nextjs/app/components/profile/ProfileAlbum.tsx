'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import LazyMustEatImageLightbox from '@/app/components/map/LazyMustEatImageLightbox';
import MapIntentLink from '@/app/components/MapIntentLink';
import type { MapMustEat } from '@/lib/types';
import { buildAlbum } from '@/lib/profile/mustEatAlbum';
import { computeBadges } from '@/lib/profile/badges';
import { mustEatCardSrc, mustEatCardSrcSet } from '@/lib/must-eat/cardImage';
import styles from './ProfileAlbum.module.css';

const CARD_BACK = '/pics/card-back.webp?v=8';
// Vollständig sichtbare Albumplätze: vier Spalten am Desktop, zwei am Telefon.
const GRID_SIZES =
  '(max-width: 767.98px) calc((100vw - 50px) / 2), (max-width: 1440px) 22vw, 330px';
interface Props {
  mustEats: MapMustEat[];
  faceUpIds: Set<string>;
  /** Die Karten, die dieses Konto VOR ORT umgedreht hat — der Stempel. Kaufen
   *  legt eine Karte ins Album, hingehen stempelt sie ab; das ist die einzige
   *  Auszeichnung im Deck, die es nicht zu kaufen gibt. */
  stampedIds: ReadonlySet<string>;
  groupOf: (m: MapMustEat) => string;
  nextMove?: React.ReactNode;
}

// Vollständig sichtbare Karten, getrennt nach offenen und verdeckten Plätzen.
export default function ProfileAlbum({
  mustEats,
  faceUpIds,
  stampedIds,
  groupOf,
  nextMove,
}: Props) {
  const t = useTranslations('profile');
  const album = useMemo(
    () => buildAlbum(mustEats, faceUpIds, stampedIds, groupOf),
    [mustEats, faceUpIds, stampedIds, groupOf]
  );
  const { slots: allSlots, groups } = album;
  const collected = allSlots.filter((slot) => slot.collected).length;
  const [expanded, setExpanded] = useState<{
    imageUrl: string;
    placeholderUrl: string | null;
    alt: string;
    rect: DOMRect;
    id: string;
  } | null>(null);
  // Hide the origin card while its zoomed clone is on screen; reveal it again in
  // onExitComplete (same frame the fly-back clone unmounts) so there's no blink.
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const handleOpenReady = useCallback(() => {
    const current = expandedRef.current;
    if (current) setHiddenId(current.id);
  }, []);
  const handleExitComplete = () => {
    if (!expandedRef.current) setHiddenId(null);
  };

  const hands = [
    {
      id: 'open',
      label: t('deckFaceUp'),
      cards: allSlots.filter((slot) => slot.collected && slot.mustEat?.image),
    },
    {
      id: 'covered',
      label: t('deckFaceDown'),
      cards: allSlots.filter((slot) => !slot.collected || !slot.mustEat?.image),
    },
  ].filter((hand) => hand.cards.length > 0);

  /* Abzeichen — was das Deck ueber den Stand hinaus hergibt. Rechnet sich
     aus dem Album aus, das hier ohnehin steht: kein Firestore-Feld, nichts
     nachzuhalten, nie veraltet. Bewusst keine Rangliste (siehe badges.ts).

     Gezaehlt werden die STEMPEL, nicht die offenen Karten: das Starter Pack
     legt in jedes frische Deck fuenfzehn offene Karten, ein Kauf weitere —
     ein Abzeichen dafuer waere eine Quittung fuer die Anmeldung. Die Reiter
     darueber zaehlen weiter offen gegen alle; das ist der Stand des Decks,
     das hier ist, was jemand dafuer getan hat. */
  const badges = useMemo(
    () =>
      computeBadges({
        stamped: allSlots.filter((slot) => slot.stamped).length,
        groups: groups.map((g) => ({
          group: g.group,
          done: g.slots.filter((s) => s.stamped).length,
          total: g.slots.length,
        })),
      }),
    [allSlots, groups]
  );

  return (
    <div className={styles.panel}>
      <div className={styles.deckIntro}>
        <div className={styles.collectionHead}>
          <h2 className={styles.collectionTitle}>{t('albumHeading')}</h2>
          <p className={styles.collectionCount}>
            {t('collectionProgress', { done: collected, total: allSlots.length })}
          </p>
        </div>
        {nextMove && <div className={styles.albumMove}>{nextMove}</div>}
      </div>
      {allSlots.length === 0 ? (
        <p className={styles.emptyText}>{t('emptyMustEats')}</p>
      ) : (
        <div className={styles.deckTable}>
          {hands.map((hand) => (
            <section key={hand.id} className={styles.hand} aria-labelledby={`deck-hand-${hand.id}`}>
              <h3 id={`deck-hand-${hand.id}`} className={styles.handTitle}>
                {hand.label}
              </h3>
              <div className={styles.grid}>
                {hand.cards.map((slot) => {
                  const open = slot.collected && !!slot.mustEat?.image;
                  const imageUrl = (open && slot.mustEat?.image) || CARD_BACK;
                  const alt = (open ? slot.mustEat?.dish : undefined) ?? '';
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      aria-label={
                        open
                          ? slot.stamped
                            ? `${alt} — ${t('albumStamped')}`
                            : alt
                          : `${t('lockedSubhead')}${slot.no ? ` — ${slot.no}` : ''}`
                      }
                      className={`${styles.slot} ${open ? styles.filled : styles.empty}`}
                      style={{ visibility: hiddenId === slot.id ? 'hidden' : undefined }}
                      onClick={(e) => {
                        setExpanded({
                          imageUrl,
                          /* Das Raster laedt nur Daumennaegel — der Zoom fliegt
                           mit dem, was schon auf dem Schirm liegt, und holt
                           das Original nach. */
                          placeholderUrl: e.currentTarget.querySelector('img')?.currentSrc || null,
                          alt,
                          rect: e.currentTarget.getBoundingClientRect(),
                          id: slot.id,
                        });
                      }}
                    >
                      {open && slot.mustEat?.image ? (
                        <>
                          {/* The protected image route authorizes the browser's
                        HttpOnly capability cookie. next/image's internal
                        optimizer does not forward that cookie, so private
                        album art must load directly. */}
                          {/* Eigener `key`, damit React beim Aufdecken ein NEUES
                        <img> baut, statt das der Rueckseite umzuschreiben: dann
                        setzt es nacheinander src, srcset, sizes, und Safari
                        waehlt bei jedem Schritt neu — erst die 360er, dann
                        (srcset ohne sizes = 100vw) die 720er. Ein iPhone lud so
                        jede Karte doppelt (Prod-Log 26.09.2026). Chrome waehlt
                        einmal und zeigt es nicht. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            key="card"
                            src={mustEatCardSrc(slot.mustEat.image, 360)}
                            srcSet={mustEatCardSrcSet(slot.mustEat.image)}
                            sizes={GRID_SIZES}
                            alt=""
                            className={styles.img}
                            loading="lazy"
                            decoding="async"
                          />
                          {/* Der Stempel. Er sitzt auf der Karte, leicht schief wie
                        ein echter, und sagt das Einzige, was ein Kauf nicht
                        kann: da war jemand. */}
                          {slot.stamped && (
                            <span className={styles.stamp} aria-hidden="true">
                              {t('albumStamped')}
                            </span>
                          )}
                        </>
                      ) : (
                        /* Verdeckt bleibt nur der Kartenrücken. Der Spot ist
                     nach dem Antippen über den Zoom erreichbar. */
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            key="back"
                            className={styles.backImg}
                            src={CARD_BACK}
                            alt=""
                            loading="lazy"
                          />
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Unter dem Raster, nicht darueber: ein Abzeichen ist das Ergebnis
          der Karten, nicht ihre Ueberschrift. Leer rendert die Zeile gar
          nichts — eine Reihe verschlossener Abzeichen waere eine Liste
          dessen, was fehlt, und die steht auf dieser Seite schon zweimal. */}
      {badges.length > 0 && (
        <div className={styles.badges}>
          <span className={styles.badgesLabel}>{t('badgesHeading')}</span>
          <ul className={styles.badgeList}>
            {badges.map((badge) => (
              <li
                className={styles.badge}
                key={badge.kind === 'district' ? `d:${badge.value}` : badge.kind}
              >
                {badge.kind === 'cards'
                  ? badge.value === 1
                    ? t('badgeFirstCard')
                    : t('badgeCards', { count: badge.value })
                  : badge.kind === 'district'
                    ? t('badgeDistrict', { district: badge.value })
                    : t('badgeAllBerlin')}
              </li>
            ))}
          </ul>
        </div>
      )}

      <LazyMustEatImageLightbox
        active={Boolean(expanded || hiddenId)}
        imageUrl={expanded?.imageUrl ?? null}
        alt={expanded?.alt ?? ''}
        placeholderUrl={expanded?.placeholderUrl ?? null}
        originRect={expanded?.rect ?? null}
        action={
          expanded ? (
            <MapIntentLink
              href={`/map?me=${encodeURIComponent(expanded.id)}`}
              rel="nofollow"
              className="et-btn et-btn-alt"
              onClick={() => setExpanded(null)}
            >
              {t('albumOpenDetail')}
            </MapIntentLink>
          ) : null
        }
        onClose={() => setExpanded(null)}
        onOpenReady={handleOpenReady}
        onExitComplete={handleExitComplete}
      />
    </div>
  );
}
