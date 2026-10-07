'use client';

import dynamic from 'next/dynamic';
import SiteImage from './SiteImage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HOME_MAP_CATEGORIES, mapPreviewHref, mapPreviewSpots } from '@/lib/home/mapPreview';
import { normalizeName } from '@/lib/normalizeName';
import type { MapRestaurant } from '@/lib/types';
import { useHomeMapData } from './HomeMapDataContext';
import MapIntentLink from './MapIntentLink';
import styles from './HubMapPreview.module.css';
import HomeMapLoading from './HomeMapLoading';

const PreviewCanvas = dynamic(() => import('./map/HomeMapCanvas'), { ssr: false, loading: () => <HomeMapLoading /> });

const copy = {
  de: {
    title: 'Worauf hast du Hunger?',
    intro: 'Probier’s aus. Wähle eine Kategorie und entdecke unsere Spots.',
    categories: 'Kategorie ausprobieren',
    map: 'Berlin Food Map — Vorschau',
    loading: 'Berlin lädt …',
    unavailable: 'Die Vorschau ist gerade nicht verfügbar. Entdecke die Spots direkt auf der Map.',
    empty: 'Noch mehr gute Spots findest du auf der Map.',
    hint: 'Tippe auf einen Spot.',
    cta: 'Zur Map',
    details: 'auf der Map ansehen',
  },
  en: {
    title: 'What are you craving?',
    intro: 'Try it. Pick a category and discover our spots.',
    categories: 'Try a category',
    map: 'Berlin food map — preview',
    loading: 'Loading Berlin …',
    unavailable: 'The preview is currently unavailable. Discover the spots on the map.',
    empty: 'Find more great spots on the map.',
    hint: 'Tap a spot to explore.',
    cta: 'Open the map',
    details: 'on the map',
  },
};

export default function HubMapPreview({ locale }: { locale: 'de' | 'en' }) {
  const t = copy[locale];
  const { initialMapData } = useHomeMapData();
  const [category, setCategory] = useState<(typeof HOME_MAP_CATEGORIES)[number]>(HOME_MAP_CATEGORIES[0]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const spots = useMemo(
    () => mapPreviewSpots(initialMapData.restaurants, category,
      initialMapData.categories.find((item) => item.slug === category.slug)?.recommendedSpots),
    [initialMapData.restaurants, initialMapData.categories, category]
  );
  const selected = spots.find((spot) => spot._id === selectedId) ?? spots[0];
  const selectSpot = useCallback((spot: MapRestaurant) => setSelectedId(spot._id), []);

  // Copy, photo and map link are in the initial HTML. Only WebGL waits until
  // the section is close, so it doesn't compete with the hero and magazine.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (!('IntersectionObserver' in window)) {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setNearViewport(true);
      observer.disconnect();
    }, { rootMargin: '400px' });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hub-map"
      data-hub-map-preview=""
      className={`hv-section hv-wrap ${styles.section}`}
      aria-labelledby="home-map-title"
    >
      <div className={styles.head}>
        <h2 id="home-map-title" className="hv-title">{t.title}</h2>
        <p>{t.intro}</p>
      </div>
      <div className={styles.categories} role="group" aria-label={t.categories}>
        {HOME_MAP_CATEGORIES.map((item) => (
          <button
            key={item.slug}
            type="button"
            aria-pressed={category.slug === item.slug}
            aria-controls="home-map-preview"
            onClick={() => {
              setCategory(item);
              setSelectedId(null);
            }}
          >
            {item[locale]}
          </button>
        ))}
      </div>
      <div id="home-map-preview" className={styles.preview} data-empty={!selected || undefined}>
        <div className={styles.map} role="region" aria-label={t.map}>
          {nearViewport && spots.length > 0 ? (
            <PreviewCanvas
              spots={spots}
              selectedId={selected?._id ?? null}
              onSelect={selectSpot}
              loadingLabel={t.loading}
              unavailableLabel={t.unavailable}
            />
          ) : spots.length ? <HomeMapLoading label={t.loading} /> : <p className={styles.mapStatus}>{t.empty}</p>}
        </div>
        <div className={styles.detail} hidden={!selected}>
          {selected ? (
            <MapIntentLink
              href={mapPreviewHref(category.slug, selected.slug)}
              className={styles.spot}
              aria-label={`${selected.name} ${t.details}`}
            >
              <div className={styles.photo}>
                <SiteImage
                  key={selected._id}
                  src={selected.photo!}
                  sizes="(max-width: 767px) 120px, (max-width: 1100px) 32vw, 380px"
                  alt={selected.name}
                  fill
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className={styles.caption} aria-live="polite" aria-atomic="true">
                <h3>{normalizeName(selected.name)}</h3>
                <p>{[selected.bezirk?.name || selected.district, category[locale]].filter(Boolean).join(' · ')}</p>
                <span className={styles.hint}>{t.hint}</span>
              </div>
            </MapIntentLink>
          ) : null}
        </div>
      </div>
      <div className={styles.action}>
        <MapIntentLink className={styles.cta} href={mapPreviewHref(category.slug)}>
          {t.cta}
        </MapIntentLink>
      </div>
    </section>
  );
}
