'use client';

import { useTranslation } from '@/lib/i18n';

interface Props {
  isActive?: boolean;
}

// Shell for the Map page. Leaflet + marker + nearby-grid population are
// driven by map-init.min.js / app.min.js; this component only provides the
// DOM contract (#foodMap, #mapNearby, #mapSpotOverlay and child IDs) so the
// legacy init code keeps working. All strings go through next-intl.
export default function MapSection({ isActive = false }: Props) {
  const { t } = useTranslation();
  const filters = [
    { value: 'all', label: t('map.filterAll') },
    { value: 'Dinner', label: t('map.filterDinner') },
    { value: 'Lunch', label: t('map.filterLunch') },
    { value: 'Coffee', label: t('map.filterCoffee') },
    { value: 'Breakfast', label: t('map.filterBreakfast') },
    { value: 'Sweets', label: t('map.filterSweets') },
    { value: 'Pizza', label: t('map.filterPizza') },
  ];

  return (
    <div className={`app-page${isActive ? ' active' : ''}`} data-page="map" suppressHydrationWarning>
      <section className="map-section" id="map">
        <div className="map-container" id="foodMap">
          <button
            className="map-location-btn-fixed"
            id="mapLocationBtnFixed"
            aria-label={t('map.myLocationAriaLabel')}
          >
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </button>
        </div>
        <div className="map-zoom-btns">
          <button className="map-zoom-btn" id="mapZoomIn" aria-label="Zoom in">+</button>
          <button className="map-zoom-btn" id="mapZoomOut" aria-label="Zoom out">−</button>
        </div>
        <div className="map-nearby" id="mapNearby">
          <div className="map-nearby-handle" id="mapNearbyHandle">
            <div className="map-nearby-handle-bar"></div>
          </div>
          <div className="map-nearby-toolbar">
            <div className="map-search-wrap">
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="map-search-icon">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                id="mapSearchInput"
                className="map-search-input"
                placeholder={t('map.searchPlaceholder')}
                autoComplete="off"
              />
            </div>
            <div className="map-filter-chips" id="mapFilterChips" role="tablist" aria-label="Category filters"></div>
            <div className="map-filter-dropdown" id="mapFilterDropdown">
              <button type="button" className="map-filter-dropdown-btn" id="mapFilterBtn">
                <span id="mapFilterLabel">{t('map.filterAll')}</span>
                <svg viewBox="0 0 10 6" width={10} height={6} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                  <path d="M1 1l4 4 4-4" />
                </svg>
              </button>
              <div className="map-filter-dropdown-menu" id="mapFilterMenu">
                {filters.map(f => (
                  <button
                    key={f.value}
                    type="button"
                    className={`map-filter-option${f.value === 'all' ? ' active' : ''}`}
                    data-value={f.value}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div id="mapOpenToggle" className="map-open-switch" role="switch" aria-checked="false" tabIndex={0}>
              <div className="map-switch-track"><div className="map-switch-thumb"></div></div>
              <span className="map-switch-label">{t('map.openNow')}</span>
            </div>
          </div>
          <div className="map-nearby-grid-wrapper">
            <div className="map-nearby-grid" id="mapNearbyGrid"></div>
          </div>
        </div>
        <div className="map-spot-overlay" id="mapSpotOverlay">
          <div className="map-spot-card" id="mapSpotCard">
            <button className="map-spot-close" id="mapSpotClose" aria-label="Close">
              <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="map-spot-content" id="mapSpotContent"></div>
          </div>
        </div>
      </section>
    </div>
  );
}
