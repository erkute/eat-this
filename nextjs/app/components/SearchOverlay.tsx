'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import { routing } from '@/i18n/routing';
import type { NewsArticle, MapRestaurant } from '@/lib/types';
import styles from './SearchOverlay.module.css';

const MAX_RESULTS_PER_GROUP = 8;

// Self-contained global search. Lives in every layout that wants search
// (the SPA layout and the profile layout). Opens via clicks on
// `#burgerSearchTrigger` or any `eatthis:open-search` custom event.
// Lazy-loads news + restaurants from /api/search-data on first open.
export default function SearchOverlay() {
  const { t, lang } = useTranslation();
  const locale = useLocale();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [restaurants, setRestaurants] = useState<MapRestaurant[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchStartedRef = useRef(false);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  // Wire opening triggers — burger menu button + custom event hook.
  useEffect(() => {
    const onTrigger = () => setOpen(true);

    const trigger = document.getElementById('burgerSearchTrigger');
    trigger?.addEventListener('click', onTrigger);
    document.addEventListener('eatthis:open-search', onTrigger);

    return () => {
      trigger?.removeEventListener('click', onTrigger);
      document.removeEventListener('eatthis:open-search', onTrigger);
    };
  }, []);

  // On open: close burger, focus input, lock body scroll, lazy-load data.
  useEffect(() => {
    if (!open) return;

    document.getElementById('burgerDrawer')?.classList.remove('active');
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => inputRef.current?.focus(), 80);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);

    if (!fetchStartedRef.current) {
      fetchStartedRef.current = true;
      setDataLoading(true);
      fetch('/api/search-data')
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then(({ news, restaurants }: { news: NewsArticle[]; restaurants: MapRestaurant[] }) => {
          setNews(news || []);
          setRestaurants(restaurants || []);
          setDataLoaded(true);
        })
        .catch(() => setDataLoaded(true))
        .finally(() => setDataLoading(false));
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
    return news
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
  }, [news, trimmed, lang]);

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
    dataLoaded;

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
      className={`${styles.wrapper}${open ? ` ${styles.wrapperOpen}` : ''}`}
      role="dialog"
      aria-modal={open}
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputRow}>
          <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder={t('search.placeholder')}
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className={styles.closeBtn} aria-label="Schließen" onClick={close}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.results}>
          {!trimmed && (
            <div className={styles.hint}>
              {t('search.hint')}
            </div>
          )}

          {trimmed && dataLoading && !dataLoaded && (
            <div className={styles.loadingRow}>
              <span className={styles.spinner} aria-hidden="true" />
              <span>Suche läuft …</span>
            </div>
          )}

          {newsMatches.length > 0 && (
            <>
              <div className={styles.sectionLabel}>News</div>
              {newsMatches.map((a) => {
                const title = (lang === 'de' ? a.titleDe : a.title) || a.title;
                const cat = (lang === 'de' ? a.categoryLabelDe : a.categoryLabel) || a.categoryLabel || '';
                return (
                  <button
                    key={a._id}
                    type="button"
                    className={styles.item}
                    onClick={() => goNews(a.slug)}
                  >
                    {a.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.imageUrl} alt="" className={styles.thumb} loading="lazy" />
                    ) : (
                      <div className={styles.thumbPlaceholder} aria-hidden="true">📰</div>
                    )}
                    <div className={styles.body}>
                      <div className={styles.title}>{title}</div>
                      {cat && <div className={styles.meta}>{cat}</div>}
                    </div>
                    <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                );
              })}
            </>
          )}

          {restaurantMatches.length > 0 && (
            <>
              <div className={styles.sectionLabel}>Restaurants</div>
              {restaurantMatches.map((r) => {
                const district = r.bezirk?.name || r.district || '';
                return (
                  <button
                    key={r._id}
                    type="button"
                    className={styles.item}
                    onClick={() => goRestaurant(r.slug)}
                  >
                    {r.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.photo} alt="" className={styles.thumb} loading="lazy" />
                    ) : (
                      <div className={styles.thumbPlaceholder} aria-hidden="true">🍽</div>
                    )}
                    <div className={styles.body}>
                      <div className={styles.title}>{r.name}</div>
                      {district && <div className={styles.meta}>{district}</div>}
                    </div>
                    <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                );
              })}
            </>
          )}

          {noResults && (
            <div className={styles.hint}>
              {t('search.empty') || 'Nichts gefunden.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
