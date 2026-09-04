'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import LazyMustEatImageLightbox from '@/app/components/map/LazyMustEatImageLightbox';
import lightboxStyles from '@/app/components/map/MustEatImageLightbox.module.css';
import MapIntentLink from '@/app/components/MapIntentLink';
import { normalizeName } from '@/lib/normalizeName';
import type { MapMustEat } from '@/lib/types';
import { buildAlbum } from '@/lib/profile/mustEatAlbum';
import styles from './ProfileAlbum.module.css';

const CARD_BACK = '/pics/card-back.webp?v=7';
const ALL = '__all__';

interface Props {
  mustEats: MapMustEat[];
  faceUpIds: Set<string>;
  groupOf: (m: MapMustEat) => string;
  /** Die Spielerkarte — steht als erste Karte neben der Kopfzeile. */
  playerCard?: React.ReactNode;
  /** Der naechste Zug, unter der Filterleiste. */
  nextMove?: React.ReactNode;
}

// Die Sammlung — Prototyp, 04.09.2026: ein Album statt sieben Abschnitte.
//
// Bisher brach das Deck pro Bezirk eine eigene Zeile an, in zwei Spalten
// nebeneinander. Gemessen auf 1440 px hiess das: „Charlottenburg 2/2" liess
// vier von sechs Spalten leer, „Steglitz 2/2" stand allein in der letzten
// Zeile. Sieben Ueberschriften, sieben angebrochene Raster, kein einziges
// volles — die Sammlung sah zerlegt aus, nicht sortiert (Nutzer, 04.09.2026).
//
// Jetzt traegt EIN durchgehendes Raster alle Plaetze, und die Bezirke sind
// dorthin gewandert, wo sie ohne Loecher stehen: in eine Filterleiste, die
// ihren Zaehler gleich mitbringt. Damit beantwortet die Leiste die Frage
// „wo fehlt mir noch was" besser als die Ueberschriften es konnten — sie
// zeigt alle Bezirke auf einen Blick statt ueber zwei Bildschirme verteilt.
//
// Der Unterschied zwischen leerem und gefuelltem Platz ist haptisch, nicht
// nur bildlich: der leere Platz liegt IM Album (eingelassener Schatten,
// Nummer, Ort), die gesammelte Karte liegt DARAUF (Schlagschatten). Das ist
// der Panini-Griff — man sieht sofort, was noch aussteht.
export default function ProfileAlbum({
  mustEats,
  faceUpIds,
  groupOf,
  playerCard,
  nextMove,
}: Props) {
  const t = useTranslations('profile');
  const groups = useMemo(
    () => buildAlbum(mustEats, faceUpIds, groupOf),
    [mustEats, faceUpIds, groupOf]
  );
  const allSlots = useMemo(() => groups.flatMap((g) => g.slots), [groups]);
  const collected = allSlots.filter((slot) => slot.collected).length;

  const [filter, setFilter] = useState<string>(ALL);
  const [missingOnly, setMissingOnly] = useState(false);

  /* Der gewaehlte Bezirk kann verschwinden, waehrend er gewaehlt ist — ein
     Pack-Kauf bringt neue Bezirke, ein Datenfehler nimmt welche weg. Statt
     einen leeren Rost zu zeigen, faellt die Auswahl dann auf „Alle". */
  const active = groups.some((g) => g.group === filter) ? filter : ALL;

  const slots = useMemo(() => {
    const base = active === ALL ? allSlots : (groups.find((g) => g.group === active)?.slots ?? []);
    return missingOnly ? base.filter((s) => !s.collected) : base;
  }, [active, allSlots, groups, missingOnly]);

  const [expanded, setExpanded] = useState<{
    imageUrl: string;
    alt: string;
    rect: DOMRect;
    id: string;
    /* Nur bei verdeckten Plaetzen gesetzt — sie sind die einzigen, aus denen
       der Zoom weiterfuehrt. */
    spot: { slug: string; name: string } | null;
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

  const missingTotal = allSlots.length - collected;

  return (
    <div className={styles.panel}>
      {/* Ein Raster aus vier Feldern statt einer Spalte mit Unterspalte: auf
          dem Telefon muss die Reiterleiste unter dem Paar aus Karte und Titel
          durchlaufen, und das geht nur, wenn sie im selben Raster liegt. */}
      <div className={styles.masthead}>
        {playerCard}

        <div className={`hv-head ${styles.head}`}>
          {/* Das h1 der Seite. Bisher hiess es „Ersan" und stand in der
              Ink-Bank; mit deren Wegfall ist die Sammlung der Seitenanfang,
              und sie ist auch das ehrlichere Thema: die Seite handelt vom
              Deck, nicht vom Vornamen. */}
          <h1 className="hv-title">{t('albumHeading')}</h1>
          {allSlots.length > 0 && (
            <span className={styles.count}>
              <strong>{collected}</strong>
              <span>{t('albumCount', { total: allSlots.length })}</span>
            </span>
          )}
        </div>

        {/* Die Bezirke als Reiter, nicht als Ueberschriften: hier stehen
            sie vollstaendig nebeneinander und tragen ihren Zaehler mit.
            „Fehlende" ist ein Schalter und kein achter Reiter — er
            schneidet quer durch jeden Bezirk. */}
        {groups.length > 1 && (
          <div className={styles.filters} role="group" aria-label={t('albumFilterLabel')}>
            <button
              type="button"
              className={styles.chip}
              aria-pressed={active === ALL}
              onClick={() => setFilter(ALL)}
            >
              <span className={styles.chipName}>{t('albumFilterAll')}</span>
              <span className={styles.chipCount}>{allSlots.length}</span>
            </button>
            {missingTotal > 0 && (
              <button
                type="button"
                className={`${styles.chip} ${styles.chipMissing}`}
                aria-pressed={missingOnly}
                onClick={() => setMissingOnly((v) => !v)}
              >
                <span className={styles.chipName}>{t('albumFilterMissing')}</span>
                <span className={styles.chipCount}>{missingTotal}</span>
              </button>
            )}
            {groups.map((g) => {
              const done = g.slots.filter((s) => s.collected).length;
              return (
                <button
                  key={g.group}
                  type="button"
                  className={styles.chip}
                  aria-pressed={active === g.group}
                  aria-label={t('albumGroupProgress', {
                    group: g.group,
                    done,
                    total: g.slots.length,
                  })}
                  onClick={() => setFilter(g.group)}
                >
                  <span className={styles.chipName}>{g.group}</span>
                  <span className={styles.chipCount} aria-hidden="true">
                    {done}/{g.slots.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {nextMove && <div className={styles.mastheadMove}>{nextMove}</div>}
      </div>

      {allSlots.length === 0 ? (
        <p className={styles.emptyText}>{t('emptyMustEats')}</p>
      ) : slots.length === 0 ? (
        /* Nur erreichbar mit „Fehlende" auf einem vollen Bezirk — und genau
           dann ist das keine Panne, sondern die beste Nachricht der Seite. */
        <p className={styles.emptyText}>{t('albumFilterComplete')}</p>
      ) : (
        <div className={styles.grid}>
          {slots.map((slot) => {
            const open = slot.collected && !!slot.mustEat?.image;
            const imageUrl = (open && slot.mustEat?.image) || CARD_BACK;
            const alt = (open ? slot.mustEat?.dish : undefined) ?? '';
            const where = slot.where ? normalizeName(slot.where) : null;
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
                    spot: !open && slot.slug && where ? { slug: slot.slug, name: where } : null,
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
                  /* Der leere Platz zeigt, was dorthin gehoert: die Nummer
                     der Karte und das Lokal, in dem sie liegt. Ein Album-
                     Feld ohne Beschriftung waere nur ein Loch — mit ihr ist
                     es eine Aufgabe. Die Rueckseite bleibt als Wasserzeichen
                     darunter, damit der Platz zur Marke gehoert. */
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className={styles.backImg} src={CARD_BACK} alt="" loading="lazy" />
                    <span className={styles.slotNo} aria-hidden="true">
                      {slot.no}
                    </span>
                    {where && (
                      <span className={styles.slotWhere} aria-hidden="true">
                        {where}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}

      <LazyMustEatImageLightbox
        active={Boolean(expanded || hiddenId)}
        imageUrl={expanded?.imageUrl ?? null}
        alt={expanded?.alt ?? ''}
        originRect={expanded?.rect ?? null}
        /* Der Zoom einer verdeckten Karte war eine Sackgasse: Rueckseite
           gross, und der einzige Weg weiter war Zumachen. Jetzt fuehrt er
           auf den SPOT, nicht auf das Must Eat — ein Spot traegt mehrere
           Karten, und wer hier steht, will wissen, wo er hin muss, nicht
           welche der Karten dort als naechste faellt. */
        action={
          expanded?.spot ? (
            <MapIntentLink
              href={`/map?r=${encodeURIComponent(expanded.spot.slug)}`}
              rel="nofollow"
              className={lightboxStyles.actionBtn}
            >
              {t('albumToSpot', { name: expanded.spot.name })}
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
