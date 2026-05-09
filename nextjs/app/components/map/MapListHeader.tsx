'use client'
import { type Ref, type RefObject } from 'react'
import { useTranslation } from '@/lib/i18n'
import type { SortMode, SortDir } from '@/lib/map'
import FilterDropdown from './FilterDropdown'
import styles from './map.module.css'

interface Props {
  headerRef: Ref<HTMLDivElement | null>
  filterBtnRef: RefObject<HTMLButtonElement | null>

  resultCount: number

  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  search: string
  onSearchChange: (value: string) => void

  filterOpen: boolean
  setFilterOpen: (next: boolean | ((prev: boolean) => boolean)) => void

  sort: SortMode
  onSort: (sort: SortMode) => void
  sortDir: SortDir
  onToggleSortDir: () => void
  openOnly: boolean
  onOpenOnly: (next: boolean) => void
  bezirkNames: string[]
  bezirk: string | null
  onBezirk: (name: string | null) => void
}

const SORT_LABEL_KEY: Record<SortMode, string> = {
  distance: 'map.sortDistance',
  newest:   'map.sortNewest',
  price:    'map.sortPrice',
}

export default function MapListHeader({
  headerRef,
  filterBtnRef,
  resultCount,
  searchOpen,
  setSearchOpen,
  search,
  onSearchChange,
  filterOpen,
  setFilterOpen,
  sort,
  onSort,
  sortDir,
  onToggleSortDir,
  openOnly,
  onOpenOnly,
  bezirkNames,
  bezirk,
  onBezirk,
}: Props) {
  const { t } = useTranslation()
  const filtersActive = openOnly || !!bezirk || sort !== 'distance'
  const sortDirAriaLabel = sortDir === 'asc'
    ? t('map.sortDirAriaAsc')
    : t('map.sortDirAriaDesc')

  return (
    // Zone B — count row + action buttons (drag handler attached, 8px threshold)
    <div ref={headerRef} className={styles.listHeader}>
      {searchOpen ? (
        <div className={styles.listHeaderRow}>
          <input
            type="text"
            autoFocus
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={t('map.searchPlaceholder')}
            className={styles.searchInputInline}
            aria-label={t('nav.searchAriaLabel') ?? 'Search'}
          />
          <button
            type="button"
            className={styles.searchCloseBtn}
            onClick={() => { setSearchOpen(false); onSearchChange('') }}
            aria-label={t('map.searchClose')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
      ) : (
        <div className={styles.listHeaderRow}>
          <div className={styles.listHeaderLeft}>
            <span className={styles.listHeaderCount}>
              {resultCount}{' '}
              {resultCount === 1 ? t('map.restaurantOne') : t('map.restaurantMany')}
            </span>
            <button
              type="button"
              className={styles.sortChip}
              onClick={onToggleSortDir}
              aria-label={sortDirAriaLabel}
              data-dir={sortDir}
            >
              <span>{t(SORT_LABEL_KEY[sort])}</span>
              <svg
                className={styles.sortChipArrow}
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="6 11 12 5 18 11" />
              </svg>
            </button>
          </div>
          <div className={styles.listHeaderActions}>
            <button
              type="button"
              className={`${styles.filterIconBtn} ${search ? styles.filterIconBtnActive : ''}`}
              onClick={() => setSearchOpen(true)}
              aria-label={t('map.searchOpenAria')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {search && <span className={styles.filterActiveDot} aria-hidden="true" />}
            </button>
            <button
              ref={filterBtnRef}
              type="button"
              className={`${styles.filterIconBtn} ${filtersActive ? styles.filterIconBtnActive : ''}`}
              onClick={() => setFilterOpen(v => !v)}
              aria-label={t('map.filterSortAria')}
              aria-expanded={filterOpen}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="10" y1="18" x2="14" y2="18" />
              </svg>
              {filtersActive && <span className={styles.filterActiveDot} aria-hidden="true" />}
            </button>
            {filterOpen && (
              <FilterDropdown
                sort={sort}
                onSort={onSort}
                openOnly={openOnly}
                onOpenOnly={onOpenOnly}
                bezirke={bezirkNames}
                bezirk={bezirk}
                onBezirk={onBezirk}
                onClose={() => setFilterOpen(false)}
                anchorEl={filterBtnRef.current}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
