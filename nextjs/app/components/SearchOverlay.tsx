'use client';

import { useTranslation } from '@/lib/i18n';

// Shell for the global search overlay. app.min.js binds #searchInput keyup,
// populates #searchResults, and manages open/close via #searchClose.
export default function SearchOverlay() {
  const { t } = useTranslation();
  return (
    <div className="search-overlay" id="searchOverlay">
      <div className="search-container">
        <div className="search-input-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            id="searchInput"
            placeholder={t('search.placeholder')}
            autoComplete="off"
          />
          <button className="search-close" id="searchClose" aria-label="Close">
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="search-results" id="searchResults">
          <div className="search-hint">{t('search.hint')}</div>
        </div>
      </div>
    </div>
  );
}
