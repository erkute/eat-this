'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import { routing } from '@/i18n/routing';
import type { NewsArticle, MapRestaurant } from '@/lib/types';

interface Props {
  newsArticles: NewsArticle[];
}

const MAX_RESULTS_PER_GROUP = 8;

export default function SearchOverlay({ newsArticles }: Props) {
  const { t, lang } = useTranslation();
  const locale = useLocale();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [restaurants, setRestaurants] = useState<MapRestaurant[]>([]);
  const [restaurantsLoaded, setRestaurantsLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const restaurantFetchStartedRef = useRef(false);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  // Wire the burger drawer trigger and any external "open search" events.
  useEffect(() => {
    const onTrigger = () => setOpen(true);

    const trigger = document.getElementById('burgerSearchTrigger');
    trigger?.addEventListener('click', onTrigger);

    // Also listen for a generic event so legacy nav buttons (or future
    // entry points) can open the overlay without a hardcoded ID lookup.
    const onCustom = () => setOpen(true);
    document.addEventListener('eatthis:open-search', onCustom);

    return () => {
      trigger?.removeEventListener('click', onTrigger);
      document.removeEventListener('eatthis:open-search', onCustom);
    };
  }, []);

  // When opened: close burger drawer, focus input, lock body scroll, lazy-load restaurants.
  useEffect(() => {
    if (!open) return;

    document.getElementById('burgerDrawer')?.classList.remove('active');
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => inputRef.current?.focus(), 80);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);

    if (!restaurantFetchStartedRef.current) {
      restaurantFetchStartedRef.current = true;
      fetch('/api/map-data')
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then(({ restaurants }: { restaurants: MapRestaurant[] }) => {
          setRestaurants(restaurants);
          setRestaurantsLoaded(true);
        })
        .catch(() => setRestaurantsLoaded(true));
    }

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      clearTimeout(focusTimer);
    };
  }, [open, close]);

  const localePath = useCallback(
    (path: string) => (locale === routing.defaultLocale ? path : `/${locale}${path}`),
    [locale],
  );

  const trimmed = query.trim().toLowerCase();

  const newsMatches = useMemo(() => {
    if (!trimmed) return [];
    return newsArticles
      .filter((a) => {
        const title = (lang === 'de' ? a.titleDe : a.title) || a.title;
        const excerpt = (lang === 'de' ? a.excerptDe : a.excerpt) || a.excerpt || '';
        const cat = (lang === 'de' ? a.categoryLabelDe : a.categoryLabel) || a.categoryLabel || '';
        return (
          title.toLowerCase().includes(trimmed) ||
          excerpt.toLowerCase().includes(trimmed) ||
          cat.toLowerCase().includes(trimmed)
        );
      })
      .slice(0, MAX_RESULTS_PER_GROUP);
  }, [newsArticles, trimmed, lang]);

  const restaurantMatches = useMemo(() => {
    if (!trimmed) return [];
    return restaurants
      .filter((r) => {
        if (r.isClosed) return false;
        const district = r.bezirk?.name || r.district || '';
        const cats = (r.categories || []).join(' ');
        return (
          r.name.toLowerCase().includes(trimmed) ||
          district.toLowerCase().includes(trimmed) ||
          cats.toLowerCase().includes(trimmed)
        );
      })
      .slice(0, MAX_RESULTS_PER_GROUP);
  }, [restaurants, trimmed]);

  const noResults =
    trimmed.length > 0 &&
    newsMatches.length === 0 &&
    restaurantMatches.length === 0 &&
    restaurantsLoaded;

  const goNews = useCallback(
    (slug: string) => {
      close();
      window.location.assign(localePath(`/news/${slug}`));
    },
    [close, localePath],
  );

  const goRestaurant = useCallback(
    (slug: string) => {
      close();
      window.location.assign(localePath(`/map?r=${encodeURIComponent(slug)}`));
    },
    [close, localePath],
  );

  return (
    <div
      className={`search-overlay${open ? ' active' : ''}`}
      role="dialog"
      aria-modal={open}
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="search-container">
        <div className="search-input-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder={t('search.placeholder')}
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="search-close"
            aria-label="Close"
            onClick={close}
          >
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="search-results">
          {!trimmed && <div className="search-hint">{t('search.hint')}</div>}

          {newsMatches.length > 0 && (
            <>
              <div className="search-section-title">News</div>
              {newsMatches.map((a) => {
                const title = (lang === 'de' ? a.titleDe : a.title) || a.title;
                const cat = (lang === 'de' ? a.categoryLabelDe : a.categoryLabel) || a.categoryLabel || '';
                return (
                  <button
                    key={a._id}
                    type="button"
                    className="search-result-item"
                    onClick={() => goNews(a.slug)}
                  >
                    {a.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.imageUrl} alt="" className="search-result-img" loading="lazy" />
                    )}
                    <div className="search-result-content">
                      <div className="search-result-title">{title}</div>
                      {cat && <div className="search-result-meta">{cat}</div>}
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {restaurantMatches.length > 0 && (
            <>
              <div className="search-section-title">{t('search.restaurants') || 'Restaurants'}</div>
              {restaurantMatches.map((r) => {
                const district = r.bezirk?.name || r.district || '';
                return (
                  <button
                    key={r._id}
                    type="button"
                    className="search-result-item"
                    onClick={() => goRestaurant(r.slug)}
                  >
                    {r.photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.photo} alt="" className="search-result-img" loading="lazy" />
                    )}
                    <div className="search-result-content">
                      <div className="search-result-title">{r.name}</div>
                      {district && <div className="search-result-meta">{district}</div>}
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {noResults && (
            <div className="search-hint">{t('search.empty') || 'Nichts gefunden.'}</div>
          )}
        </div>
      </div>
    </div>
  );
}
