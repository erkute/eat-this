'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import LazyMustEatImageLightbox from '@/app/components/map/LazyMustEatImageLightbox';
import type { MapMustEat } from '@/lib/types';
import { buildAlbum } from '@/lib/profile/mustEatAlbum';
import styles from './ProfileAlbum.module.css';

const CARD_BACK = '/pics/card-back.webp?v=7';

interface Props {
  mustEats: MapMustEat[];
  faceUpIds: Set<string>;
  groupOf: (m: MapMustEat) => string;
  /** Der naechste Zug — steht als Einleitung zwischen Ueberschrift und
   *  Bezirken. Als Slot und nicht fest verdrahtet, weil er seinen eigenen
   *  Standort- und Kartenzustand mitbringt und das Album davon nichts
   *  wissen muss. */
  nextMove?: React.ReactNode;
}

// Collection — Must-Eat cards in district sections. Collected slots show the
// dish card, uncollected ones the face-down card back. Tapping any card does
// the deck-style fly-out zoom, flying back to its slot on close.
//
// Die Gruppen gab es hier immer (buildAlbum liefert sie), nur ebnete das
// Rendering sie wieder zu einer Flaeche ein. Damit sagte die Sammlung
// „24 von 24" und sonst nichts. Mit Bezirken sagt sie, WO noch etwas offen
// ist — die Frage, mit der man auf diese Seite kommt. Nach Bezirk und nicht
// nach Kategorie, weil Kategorien 1:1 die Booster Packs sind: die Sammlung
// waere damit ein zweites Schaufenster geworden, direkt ueber dem echten.
export default function ProfileAlbum({ mustEats, faceUpIds, groupOf, nextMove }: Props) {
  const t = useTranslations('profile');
  const groups = useMemo(
    () => buildAlbum(mustEats, faceUpIds, groupOf),
    [mustEats, faceUpIds, groupOf]
  );
  const slots = useMemo(() => groups.flatMap((g) => g.slots), [groups]);
  const collected = slots.filter((slot) => slot.collected).length;

  const [expanded, setExpanded] = useState<{
    imageUrl: string;
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

  return (
    <div className={styles.panel}>
      {/* Vor der Ueberschrift, nicht dazwischen: erst was zu tun ist, dann
          was da ist. Zwischen Ueberschrift und Bezirken schob sich der Block
          zwischen einen Abschnittstitel und seinen Inhalt. */}
      {nextMove}

      <div className={`hv-head ${styles.head}`}>
        <h2 className="hv-title">{t('albumHeading')}</h2>
        {slots.length > 0 && (
          <span className={styles.count}>
            <strong>{collected}</strong>
            <span>{t('albumCount', { total: slots.length })}</span>
          </span>
        )}
      </div>

      {slots.length === 0 ? (
        <p className={styles.emptyText}>{t('emptyMustEats')}</p>
      ) : (
        <div className={styles.groups}>
          {groups.map((group) => {
            const done = group.slots.filter((slot) => slot.collected).length;
            return (
              <section className={styles.group} key={group.group}>
                {/* aria-label statt des sichtbaren „3/6": das liest sich sonst
                  als „drei Sechstel" vor. */}
                <h3
                  className={styles.groupHead}
                  aria-label={t('albumGroupProgress', {
                    group: group.group,
                    done,
                    total: group.slots.length,
                  })}
                >
                  <span className={styles.groupName}>{group.group}</span>
                  <span className={styles.groupCount}>
                    <strong>{done}</strong>/{group.slots.length}
                  </span>
                  {/* Die Linie bis zur rechten Kante macht aus der Zeile einen
                    Abschnittstrenner statt einer weiteren Ueberschrift. */}
                  <span className={styles.groupRule} aria-hidden="true" />
                </h3>

                <div className={styles.grid}>
                  {group.slots.map((slot) => {
                    const open = slot.collected && !!slot.mustEat?.image;
                    const imageUrl = (open && slot.mustEat?.image) || CARD_BACK;
                    const alt = (open ? slot.mustEat?.dish : undefined) ?? '';
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        aria-label={open ? alt : `${t('lockedSubhead')} ${slot.no}`}
                        className={`${styles.slot} ${open ? styles.filled : styles.empty}`}
                        style={{ visibility: hiddenId === slot.id ? 'hidden' : undefined }}
                        onClick={(e) => {
                          setExpanded({
                            imageUrl,
                            alt,
                            rect: e.currentTarget.getBoundingClientRect(),
                            id: slot.id,
                          });
                        }}
                      >
                        {open && slot.mustEat?.image ? (
                          // The protected image route authorizes the browser's
                          // HttpOnly capability cookie. next/image's internal
                          // optimizer does not forward that cookie, so private
                          // album art must load directly.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={slot.mustEat.image}
                            alt=""
                            className={styles.img}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className={styles.backImg} src={CARD_BACK} alt="" loading="lazy" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <LazyMustEatImageLightbox
        active={Boolean(expanded || hiddenId)}
        imageUrl={expanded?.imageUrl ?? null}
        alt={expanded?.alt ?? ''}
        originRect={expanded?.rect ?? null}
        onClose={() => setExpanded(null)}
        onOpenReady={handleOpenReady}
        onExitComplete={handleExitComplete}
      />
    </div>
  );
}
