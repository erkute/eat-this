'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { resolveUnlockedMustEatIds } from '@/lib/map';
import { cardNumber, sortByCardNumber } from '@/lib/map/cardOrder';
import { useTranslation } from '@/lib/i18n';
import { normalizeName } from '@/lib/normalizeName';
import { spotNameWithoutDistrict } from '@/lib/home/spotNameWithoutDistrict';
import MapIntentLink from './MapIntentLink';
import type { InitialMustEatsData } from '@/lib/map/initial-surface-data';
import type { MapMustEat } from '@/lib/types';
import styles from './MustEatsSection.module.css';
import { mustEatCardSrc, mustEatCardSrcSet } from '@/lib/must-eat/cardImage';

const CARD_BACK = '/pics/card-back.webp?v=20261028';

interface GalleryCopy {
  numberLabel: string;
  openKicker: string;
  openTitle: string;
  openBody: string;
  setKicker: string;
  coveredTitle: string;
  coveredBody: string;
  spotAria: string;
  mapAria: string;
  setMore: string;
}

interface Props {
  initialMapData: InitialMustEatsData;
  /** Composed on the server: the set heading carries a live count, and the
   *  shared t() cannot format ICU placeholders. See MustEatsSection. */
  copy: GalleryCopy;
}

// Daumennägel nach Spaltenbreite (MustEatsSection.module.css): das Feature
// liegt am Telefon und Tablet in zwei Spalten, am Desktop in vier; das Set
// am Telefon in drei, ab 768px in fünf, ab 1024px in sechs Spalten.
const OPEN_SIZES = '(max-width: 1023px) 46vw, 300px';
const SET_SIZES = '(max-width: 767px) 30vw, (max-width: 1023px) 18vw, 210px';

/** Spalten des Sets je Breite — zugeklappt zeigt es genau eine Reihe davon. */
const SET_ROW = { phone: 3, tablet: 5, desktop: 6 } as const;

/** Jede Karte führt auf ihren Spot in der Map: dort liegt sie im
 *  Restaurant-Detail, und eine verdeckte verhält sich wie überall auf der Map
 *  (ohne Konto: Zittern, dann Login). Ohne Slug bleibt nur die Karte selbst. */
function mapHref(m: MapMustEat): string {
  return m.restaurant.slug
    ? `/map?r=${encodeURIComponent(m.restaurant.slug)}`
    : `/map?me=${encodeURIComponent(m._id)}`;
}

export default function MustEatsGallery({ initialMapData, copy }: Props) {
  const { t } = useTranslation();

  // Deterministic public catalog: every visitor — guest or signed-in — sees
  // the same anon view (10 curated cards + spot-of-day face-up, rest covered).
  // The personal collection lives in the profile; this page never
  // personalizes. Pure function of `initialMapData` → identical on server and
  // client, no hydration risk.
  const faceUp = useMemo(
    () =>
      resolveUnlockedMustEatIds({
        uid: null,
        storedUnlockedIds: new Set<string>(),
        revealedMustEatIds: new Set<string>(initialMapData.revealedMustEatIds),
      }),
    [initialMapData]
  );

  // Beide Flächen liegen in Kartennummer-Reihenfolge — die Nummer steht unten
  // rechts auf jeder Karte. Oben die offenen, darunter nur die verdeckten:
  // bis zum 27.10.2026 lag hier das ganze Set gemischt, die offenen Karten
  // standen damit zweimal auf der Seite, unter „54 warten vor Ort“ lagen 62.
  const all = useMemo(() => sortByCardNumber(initialMapData.mustEats), [initialMapData]);
  const open = useMemo(() => all.filter((m) => faceUp.has(m._id)), [all, faceUp]);
  const covered = useMemo(() => all.filter((m) => !faceUp.has(m._id)), [all, faceUp]);

  /* Eine verdeckte Karte nennt hier ihren Spot, sonst nichts: Gericht und
     Bild bleiben auf dem Server (`stripCoveredMustEats`), vom Spot kommen nur
     Name, Bezirk und Slug mit (`trimCoveredSpot`). */

  /* Die verdeckten Karten zeigen zuerst eine Reihe; „Mehr“ klappt den Rest auf. Welche
     Karten zugeklappt fehlen, entscheidet das CSS je Spaltenzahl — der Knopf
     merkt sich beim Tippen die erste davon, damit der Fokus dort weiterliest
     statt mit dem verschwundenen Knopf ins Leere zu fallen. */
  const setId = useId();
  const setRef = useRef<HTMLOListElement>(null);
  const [setOpen, setSetOpen] = useState(false);
  const focusAfterOpen = useRef<number | null>(null);
  useEffect(() => {
    if (!setOpen || focusAfterOpen.current === null) return;
    const item = setRef.current?.children[focusAfterOpen.current];
    focusAfterOpen.current = null;
    item?.querySelector('a')?.focus();
  }, [setOpen]);
  const openSet = () => {
    const items = [...(setRef.current?.children ?? [])];
    const firstHidden = items.findIndex((el) => getComputedStyle(el).display === 'none');
    focusAfterOpen.current = firstHidden >= 0 ? firstHidden : null;
    setSetOpen(true);
  };
  // Passen sie schon in eine Reihe, fehlt dort nichts — der Knopf auch nicht.
  const n = covered.length;
  const setFits =
    n <= SET_ROW.phone ? 'phone' : n <= SET_ROW.tablet ? 'tablet' : n <= SET_ROW.desktop ? 'desktop' : undefined;

  const renderCard = (m: MapMustEat, sizes: string, label: string) => {
    const isOpen = faceUp.has(m._id);
    const imageUrl = (isOpen && m.image) || CARD_BACK;
    const alt = (isOpen ? m.dish : undefined) ?? t('mustEats.covered');
    return (
      <MapIntentLink
        href={mapHref(m)}
        className={styles.card}
        aria-label={`${label}, ${copy.mapAria}`}
        // Both faces are the same object — a complete card artwork, drawn
        // freestanding — so the face is data, not a style hook.
        data-face={isOpen ? 'up' : 'down'}
      >
        {/* `key` je Motiv, damit Safari beim Wechsel Rueckseite → Karte nicht
            zwei Varianten laedt (siehe ProfileAlbum.tsx). Die Rueckseite aus
            public/ laeuft ohne Breiten durch. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={imageUrl}
          sizes={sizes}
          srcSet={mustEatCardSrcSet(imageUrl)}
          src={mustEatCardSrc(imageUrl, 360)}
          alt={alt}
          width={760}
          height={1044}
          loading="lazy"
          decoding="async"
        />
      </MapIntentLink>
    );
  };

  return (
    <>
      {open.length > 0 && (
        <section className={`${styles.wrap} ${styles.section}`} data-band="open">
          {/* This header defines the term. It deliberately does NOT repeat the
              count: the head already states it and the cards show it. */}
          <header className={styles.sectionHead}>
            <p className={`et-label ${styles.kicker}`}>{copy.openKicker}</p>
            <h2 className={styles.sectionTitle}>{copy.openTitle}</h2>
            <p className={styles.sectionBody}>{copy.openBody}</p>
          </header>
          {/* Ein Raster, das nur nach unten läuft — am Telefon zwei Karten
              je Reihe (Betreiber, 27.10.2026; vorher ein Band zum Wischen).
              Unter jeder Karte die Bildunterschrift wie im Heft:
              Gericht und Spot. Die Nummer steht schon auf der Karte; im
              aria-label bleibt sie, als Orientierung beim Vorlesen. */}
          <ol className={styles.feature}>
            {open.map((m) => {
              const no = cardNumber(m.order);
              const dish = normalizeName(m.dish ?? '');
              const spot = spotNameWithoutDistrict(
                normalizeName(m.restaurant.name),
                m.restaurant.district
              );
              return (
                <li key={m._id} className={styles.featureItem}>
                  {renderCard(m, OPEN_SIZES, [no && `${copy.numberLabel} ${no}`, dish].filter(Boolean).join(', '))}
                  <div className={styles.caption}>
                    <h3 className={styles.dish}>{dish}</h3>
                    {spot && (
                      <p className={styles.where}>
                        {m.restaurant.slug ? (
                          <Link
                            href={`/restaurant/${m.restaurant.slug}`}
                            className={styles.spotLink}
                            aria-label={`${spot}, ${copy.spotAria}`}
                          >
                            {spot}
                          </Link>
                        ) : (
                          spot
                        )}
                        {m.restaurant.district && (
                          <span className={styles.district}>{m.restaurant.district}</span>
                        )}
                      </p>
                    )}
                    {/* Nur ein Preis mit Zahl: in Sanity steht teils nur „€“. */}
                    {/\d/.test(m.price ?? '') && <p className={styles.price}>{m.price!.trim()}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {covered.length > 0 && (
        <section className={`${styles.wrap} ${styles.section}`} data-band="set">
          <header className={styles.sectionHead}>
            <p className={`et-label ${styles.kicker}`}>{copy.setKicker}</p>
            <h2 className={styles.sectionTitle}>{copy.coveredTitle}</h2>
            <p className={styles.sectionBody}>{copy.coveredBody}</p>
          </header>
          {/* Nur Rückseiten, darunter der Spot. „Verdeckt“ steht schon über
              dem Abschnitt und auf jeder Karte; vorgelesen wird es im
              aria-label trotzdem, weil die Rückseite dort nichts sagt. */}
          <ol
            ref={setRef}
            id={setId}
            className={styles.set}
            data-collapsed={setOpen ? undefined : ''}
          >
            {covered.map((m) => {
              const no = cardNumber(m.order);
              // Die verdeckte Karte nennt ihren Spot — ohne Bezirk, wie
              // überall unter einem Must Eat.
              const spot = spotNameWithoutDistrict(
                normalizeName(m.restaurant.name),
                m.restaurant.district
              );
              return (
                <li key={m._id} className={styles.setItem}>
                  {renderCard(m, SET_SIZES, [no && `${copy.numberLabel} ${no}`, t('mustEats.covered'), spot].filter(Boolean).join(', '))}
                  {spot && (
                    <p className={styles.setCaption} aria-hidden="true">
                      <span className={styles.setSpot}>{spot}</span>
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
          {!setOpen && setFits !== 'phone' && (
            <div className={styles.setMore} data-fits={setFits}>
              <button
                type="button"
                className="et-btn"
                aria-expanded="false"
                aria-controls={setId}
                onClick={openSet}
              >
                {copy.setMore}
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}
