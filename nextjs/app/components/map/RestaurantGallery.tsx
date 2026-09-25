'use client';
import { useEffect, useState } from 'react';
import RestaurantGalleryLightbox from './RestaurantGalleryLightbox';
import { usePhotoRail } from './usePhotoRail';
import { rememberedSpotPhotoIndex, rememberSpotPhoto } from '@/lib/map/spotGallery';
import type { RestaurantGalleryImage } from '@/lib/map/useRestaurantDetail';
import { useTranslation } from '@/lib/i18n';
import { spotPhotoSrc, spotPhotoSrcSet } from '@/lib/map/spotPhoto';
import styles from './MapDetails.module.css';

const SWIPE_HINT_KEY = 'et:photo-swipe-hint';
const SWIPE_HINT_DONE = 'done';
const SWIPE_HINT_MAX_PLAYS = 3;

interface Props {
  images: RestaurantGalleryImage[];
  restaurantName: string;
  slug: string;
}

/* Blättern wie bei Instagram und Google Maps — die Mechanik steht in
   usePhotoRail, dieselbe wie auf der Listenkarte. Der Parent setzt `key` pro
   Restaurant, damit jeder Spot bei Foto 1 beginnt. */
export default function RestaurantGallery({ images, restaurantName, slug }: Props) {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const usable = images.filter((img) => img.thumb && img.full);
  const multiple = usable.length > 1;
  const { railRef, page, scrollToPage, handlers } = usePhotoRail(usable.length, {
    // Das Foto, das zuletzt in der Liste (oder hier) zu sehen war.
    startPage: rememberedSpotPhotoIndex(slug, usable),
    onPage: (next) => {
      rememberSpotPhoto(slug, usable[next]);
      if (next > 0) {
        setSwipeHint(false);
        writeHint(SWIPE_HINT_DONE);
      }
    },
  });

  /* Wisch-Hinweis: kurz nach dem Öffnen rutschen die Fotos ein Stück nach
     links und federn zurück, das zweite blitzt am rechten Rand herein. Die
     Punkte sagen nur „es gibt mehr", der Stups zeigt, dass man wischt.
     Er läuft, bis jemand selbst einmal geblättert hat, höchstens dreimal —
     wer Fotos nicht will, sieht ihn nicht bei jedem Spot. Bewegt werden die
     Slides, nicht der Scroll-Container: `scroll-snap-type: mandatory` zöge
     jedes programmatische Zwischen-`scrollLeft` sofort zurück. Der Merker wird
     im Effekt gelesen, beim Server-Render gibt es kein localStorage.
     Gestartet wird erst, wenn Foto 1 und 2 da sind: vorher ist der Streifen
     eine leere Ink-Fläche, und der Stups liefe ungesehen durch. */
  const [swipeHint, setSwipeHint] = useState(false);
  const [loadedMask, setLoadedMask] = useState(0);
  const markLoaded = (index: number) => {
    if (index < 2) setLoadedMask((mask) => mask | (1 << index));
  };
  useEffect(() => {
    if (!multiple) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      const seen = window.localStorage.getItem(SWIPE_HINT_KEY);
      if (seen === SWIPE_HINT_DONE || Number(seen) >= SWIPE_HINT_MAX_PLAYS) return;
    } catch {
      /* Private Mode o. ä. — dann läuft der Hinweis eben. */
    }
    setSwipeHint(true);
  }, [multiple]);
  const writeHint = (value: string) => {
    try {
      window.localStorage.setItem(SWIPE_HINT_KEY, value);
    } catch {
      /* ignore */
    }
  };
  const countHintPlay = () => {
    setSwipeHint(false);
    try {
      const seen = window.localStorage.getItem(SWIPE_HINT_KEY);
      if (seen !== SWIPE_HINT_DONE) writeHint(String((Number(seen) || 0) + 1));
    } catch {
      /* ignore */
    }
  };

  if (!usable.length) return null;

  return (
    <>
      <div
        ref={railRef}
        className={`${styles.rdHeroPhotos}${swipeHint && loadedMask === 3 ? ` ${styles.rdHeroPhotosHint}` : ''}`}
        data-h-scroll
        role="region"
        aria-label={`${restaurantName}: ${t('map.photos')}`}
        {...handlers}
        onPointerDown={(event) => {
          // Der Finger übernimmt, ein laufender Stups darf nicht gegenhalten.
          setSwipeHint(false);
          handlers.onPointerDown(event);
        }}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget.firstElementChild) countHintPlay();
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          const next = Math.max(
            0,
            Math.min(usable.length - 1, page + (event.key === 'ArrowRight' ? 1 : -1))
          );
          scrollToPage(next);
          railRef.current
            ?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus({ preventScroll: true });
        }}
      >
        {usable.map((img, index) => (
          <button
            key={img._key}
            type="button"
            className={styles.rdHeroPhoto}
            onClick={() => setOpenIndex(index)}
            aria-label={`${restaurantName}: ${t('map.photos')} ${index + 1}/${usable.length}`}
          >
            <img
              /* Dieselben Stufen wie die Listenkarte (lib/map/spotPhoto.ts):
                 das erste Foto ist das der Karte und kommt aus dem Cache,
                 statt als neue 1200/1600er-Datei nachgezogen zu werden. Die
                 große Fassung (`full`) bekommt erst der Zoom. */
              src={spotPhotoSrc(img.full)}
              srcSet={spotPhotoSrcSet(img.full)}
              sizes="(max-width: 1023.98px) 100vw, 430px"
              alt={img.alt ?? restaurantName}
              draggable={false}
              /* Die Nachbarbilder müssen schon da sein, wenn der Finger sie
                 hereinzieht — `lazy` lädt in einem Querscroller erst, wenn
                 das Bild sichtbar wird, und man wischt in eine leere Fläche.
                 Der Wechsel lazy → eager stößt das Laden sofort an. */
              loading={Math.abs(index - page) <= 1 ? 'eager' : 'lazy'}
              decoding="async"
              onLoad={() => markLoaded(index)}
            />
          </button>
        ))}
      </div>
      {multiple && (
        <>
          {/* Punkte statt „1/6": die Reihe liest man als „hier geht es weiter",
              eine Zahl nur als Menge. Höchstens sechs Fotos (Hero plus fünf
              aus der Galerie), dafür reicht die Reihe. Die Ink-Fläche hält sie
              auf hellen Fotos lesbar, wie die Chips unten. */}
          <span className={styles.rdHeroPhotoDots} aria-hidden="true">
            {usable.map((img, index) => (
              <span
                key={img._key}
                className={index === page ? styles.rdHeroPhotoDotOn : styles.rdHeroPhotoDot}
              />
            ))}
          </span>
          <span className={styles.rdHeroPhotoLive} aria-live="polite" aria-atomic="true">
            {`${t('map.photos')} ${page + 1}/${usable.length}`}
          </span>
        </>
      )}
      <RestaurantGalleryLightbox
        images={usable}
        startIndex={openIndex}
        onClose={() => setOpenIndex(null)}
        restaurantName={restaurantName}
      />
    </>
  );
}
