'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { resolveUnlockedMustEatIds } from '@/lib/map';
import { cardNumber, sortByCardNumber } from '@/lib/map/cardOrder';
import { useTranslation } from '@/lib/i18n';
import { normalizeName } from '@/lib/normalizeName';
import { spotNameWithoutDistrict } from '@/lib/home/spotNameWithoutDistrict';
import LazyMustEatImageLightbox from '@/app/components/map/LazyMustEatImageLightbox';
import type { InitialMustEatsData } from '@/lib/map/initial-surface-data';
import type { MapMustEat } from '@/lib/types';
import styles from './MustEatsSection.module.css';
import { mustEatCardSrc, mustEatCardSrcSet } from '@/lib/must-eat/cardImage';

const CARD_BACK = '/pics/card-back.webp?v=7';

interface GalleryCopy {
  numberLabel: string;
  openKicker: string;
  openTitle: string;
  openBody: string;
  setKicker: string;
  coveredTitle: string;
  coveredBody: string;
  coveredLabel: string;
  spotAria: string;
}

interface Props {
  initialMapData: InitialMustEatsData;
  /** Composed on the server: the set heading carries a live count, and the
   *  shared t() cannot format ICU placeholders. See MustEatsSection. */
  copy: GalleryCopy;
}

/** Zwei Flächen zeigen dieselben Karten: das Feature mit den offenen, das Set
 *  mit allen. Jede blättert im Zoom durch ihre eigene Liste. */
type Surface = 'open' | 'set';

// Daumennägel nach Spaltenbreite (MustEatsSection.module.css): das Feature
// läuft am Telefon als Band mit ~74vw, am Desktop in vier Spalten; das Set
// am Telefon in vier, ab 768px in sechs, ab 1120px in acht Spalten.
const OPEN_SIZES = '(max-width: 767px) 74vw, (max-width: 1023px) 46vw, 300px';
const SET_SIZES = '(max-width: 767px) 23vw, (max-width: 1119px) 15vw, 160px';

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
  // rechts auf jeder Karte, und das Set ist genau diese Zählung. Im Set liegen
  // offene und verdeckte Karten deshalb gemischt: jede Rückseite trägt ihre
  // Nummer darunter und liest sich als Lücke im Album, nicht als Ladefehler.
  const all = useMemo(() => sortByCardNumber(initialMapData.mustEats), [initialMapData]);
  const open = useMemo(() => all.filter((m) => faceUp.has(m._id)), [all, faceUp]);
  const lists = useMemo(() => ({ open, set: all }), [open, all]);
  const listsRef = useRef(lists);
  listsRef.current = lists;

  /* Eine verdeckte Karte nennt hier ihren Spot, sonst nichts: Gericht und
     Bild bleiben auf dem Server (`stripCoveredMustEats`), vom Spot kommen nur
     Name und Bezirk mit (`trimCoveredSpot`). */

  /* Die Slots — aus ihnen fliegt die Karte heraus und in sie fliegt sie
     zurück. Je Fläche eigene Schlüssel, weil eine offene Karte zweimal liegt. */
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const slotKey = (surface: Surface, id: string) => `${surface}:${id}`;
  const cardFace = useCallback(
    (m: MapMustEat) => {
      const isOpen = faceUp.has(m._id);
      return {
        imageUrl: (isOpen && m.image) || CARD_BACK,
        alt: (isOpen ? m.dish : undefined) ?? t('mustEats.covered'),
      };
    },
    [faceUp, t]
  );

  // Tap a card → deck-style fly-out zoom (same lightbox the profile deck and
  // the map detail use). Works for open cards (the dish art) AND locked cards
  // (the card-back). Tapping the zoomed card flies it back to its slot.
  const [expanded, setExpanded] = useState<{
    imageUrl: string;
    placeholderUrl?: string | null;
    alt: string;
    rect: DOMRect;
    id: string;
    surface: Surface;
  } | null>(null);
  // The origin card is hidden while its zoomed clone is on screen so it doesn't
  // show twice; revealed again in onExitComplete — the same frame the fly-back
  // clone unmounts — so there's no blink between clone and origin.
  const [hiddenKey, setHiddenKey] = useState<string | null>(null);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const handleOpenReady = useCallback(() => {
    const current = expandedRef.current;
    if (current) setHiddenKey(slotKey(current.surface, current.id));
  }, []);
  const closeExpanded = () => setExpanded(null);
  /* Im Zoom durch die Karten blättern — gewischt, geklickt oder mit den
     Pfeiltasten. Der Zoom selbst kennt die Reihenfolge nicht: er meldet nur
     die Richtung, hier steht die Liste. */
  const pageTo = useCallback(
    (delta: number) => {
      const current = expandedRef.current;
      if (!current) return;
      const list = listsRef.current[current.surface];
      const index = list.findIndex((m) => m._id === current.id);
      const target = list[index + delta];
      if (!target) return;
      const key = slotKey(current.surface, target._id);
      const slot = cardRefs.current.get(key);
      if (!slot) return;
      // Das Band am Telefon scrollt seitwärts: die nächste Karte ins Bild
      // holen, damit sie beim Zurückfliegen einen Platz auf dem Schirm hat.
      // Nur quer — die Seite selbst bleibt unter dem Zoom stehen.
      const band = slot.closest('ol');
      if (band && band.scrollWidth > band.clientWidth) {
        const bandRect = band.getBoundingClientRect();
        const slotRect = slot.getBoundingClientRect();
        if (slotRect.left < bandRect.left || slotRect.right > bandRect.right) {
          const pad = parseFloat(getComputedStyle(band).scrollPaddingInlineStart) || 0;
          band.scrollLeft += slotRect.left - bandRect.left - pad;
        }
      }
      const face = cardFace(target);
      setExpanded({
        ...face,
        rect: slot.getBoundingClientRect(),
        id: target._id,
        surface: current.surface,
      });
      // Der neue Ursprung verschwindet, der alte kommt im selben Zug zurück.
      setHiddenKey(key);
    },
    [cardFace]
  );
  const expandedList = expanded ? lists[expanded.surface] : [];
  const expandedIndex = expanded ? expandedList.findIndex((m) => m._id === expanded.id) : -1;
  /* Die Nachbarn des Zooms vorladen, wie es das Map-Detail tut: der Tausch
     wartet auf das neue Bild (siehe lib/dom/imageReady), und ein Bild, das
     schon da ist, lässt ihn gar nicht erst warten. */
  const zoomNeighbours =
    expandedIndex >= 0
      ? [expandedList[expandedIndex - 1], expandedList[expandedIndex + 1]]
          .filter((m): m is MapMustEat => Boolean(m))
          .map((m) => cardFace(m).imageUrl)
          .filter((url) => url !== CARD_BACK)
      : [];
  const handleExitComplete = () => {
    // If another card was opened mid fly-back, its origin must stay hidden.
    if (!expandedRef.current) setHiddenKey(null);
  };

  const renderCard = (m: MapMustEat, surface: Surface, sizes: string, label: string) => {
    const key = slotKey(surface, m._id);
    const { imageUrl, alt } = cardFace(m);
    return (
      <button
        type="button"
        ref={(el) => {
          if (el) cardRefs.current.set(key, el);
          else cardRefs.current.delete(key);
        }}
        className={styles.card}
        aria-label={label}
        // Both faces are the same object — a complete card artwork, drawn
        // freestanding — so the face is data, not a style hook.
        data-face={faceUp.has(m._id) ? 'up' : 'down'}
        style={{ visibility: hiddenKey === key ? 'hidden' : undefined }}
        onClick={(e) => {
          setExpanded({
            imageUrl,
            // Das Raster laedt nur Daumennaegel — der Zoom fliegt mit dem, was
            // schon auf dem Schirm liegt, und holt das Original nach.
            placeholderUrl: e.currentTarget.querySelector('img')?.currentSrc || null,
            alt,
            rect: e.currentTarget.getBoundingClientRect(),
            id: m._id,
            surface,
          });
        }}
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
      </button>
    );
  };

  return (
    <>
      {open.length > 0 && (
        <section className={`${styles.wrap} ${styles.section}`} data-band="open">
          {/* This header defines the term. It deliberately does NOT repeat the
              count: the head already states it and the cards show it. */}
          <header className={styles.sectionHead}>
            <p className={styles.kicker}>{copy.openKicker}</p>
            <h2 className={styles.sectionTitle}>{copy.openTitle}</h2>
            <p className={styles.sectionBody}>{copy.openBody}</p>
          </header>
          {/* Am Telefon ein Band zum Wischen, ab 768px ein Raster, das nur nach
              unten läuft. Unter jeder Karte die Bildunterschrift wie im Heft:
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
                  {renderCard(m, 'open', OPEN_SIZES, [no && `${copy.numberLabel} ${no}`, dish].filter(Boolean).join(', '))}
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

      {all.length > 0 && (
        <section className={`${styles.wrap} ${styles.section}`} data-band="set">
          <header className={styles.sectionHead}>
            <p className={styles.kicker}>{copy.setKicker}</p>
            <h2 className={styles.sectionTitle}>{copy.coveredTitle}</h2>
            <p className={styles.sectionBody}>{copy.coveredBody}</p>
          </header>
          {/* Das ganze Set in Nummern-Reihenfolge, wie die Seite eines Albums:
              offene Karten zeigen ihr Gericht, verdeckte ihre Rückseite —
              darunter Gericht und Spot, bei verdeckten „Verdeckt“ und der
              Spot. Der Unterschied hängt so nie nur an Bild oder Farbe. */}
          <ol className={styles.set}>
            {all.map((m) => {
              const isOpen = faceUp.has(m._id);
              const no = cardNumber(m.order);
              const name = isOpen ? normalizeName(m.dish ?? '') : copy.coveredLabel;
              // Auch die verdeckte Karte nennt ihren Spot — ohne Bezirk, wie
              // überall unter einem Must Eat.
              const spot = spotNameWithoutDistrict(
                normalizeName(m.restaurant.name),
                m.restaurant.district
              );
              return (
                <li key={m._id} className={styles.setItem} data-face={isOpen ? 'up' : 'down'}>
                  {renderCard(m, 'set', SET_SIZES, [no && `${copy.numberLabel} ${no}`, name, spot].filter(Boolean).join(', '))}
                  <p className={styles.setCaption} aria-hidden="true">
                    <span className={styles.setName}>{name}</span>
                    {spot && <span className={styles.setSpot}>{spot}</span>}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* React hoisted die link-Tags in den <head>. */}
      {zoomNeighbours.map((url) => (
        <link key={url} rel="preload" as="image" href={url} />
      ))}

      <LazyMustEatImageLightbox
        active={Boolean(expanded || hiddenKey)}
        imageUrl={expanded?.imageUrl ?? null}
        placeholderUrl={expanded?.placeholderUrl ?? null}
        alt={expanded?.alt ?? ''}
        originRect={expanded?.rect ?? null}
        onClose={closeExpanded}
        onOpenReady={handleOpenReady}
        onExitComplete={handleExitComplete}
        onPrev={() => pageTo(-1)}
        onNext={() => pageTo(1)}
        hasPrev={expandedIndex > 0}
        hasNext={expandedIndex >= 0 && expandedIndex < expandedList.length - 1}
        position={
          expandedIndex >= 0 ? { index: expandedIndex + 1, count: expandedList.length } : undefined
        }
      />
    </>
  );
}
