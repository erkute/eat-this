'use client'
import { forwardRef, useMemo, useRef, useState, type Ref } from 'react'
import { useTranslation } from '@/lib/i18n'
import { localizedCategoryName, type CategoryDef } from '@/lib/categories'
import type { MapCategory } from '@/lib/types'
import MapFilterPickerSheet, { type PickerItem } from './MapFilterPickerSheet'
import styles from './map.module.css'

interface Props {
  headerRef: Ref<HTMLDivElement | null>

  resultCount: number

  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  search: string
  onSearchChange: (value: string) => void

  categories: CategoryDef[]
  category: MapCategory
  onCategoryChange: (c: MapCategory) => void

  openOnly: boolean
  onOpenOnly: (next: boolean) => void

  bezirkNames: string[]
  bezirk: string | null
  onBezirk: (name: string | null) => void

  cuisineNames: string[]
  cuisine: string | null
  onCuisine: (name: string | null) => void
}

type ChipKind = 'category' | 'bezirk' | 'cuisine'

export default function MapListHeader({
  headerRef,
  resultCount,
  searchOpen, setSearchOpen, search, onSearchChange,
  categories, category, onCategoryChange,
  openOnly, onOpenOnly,
  bezirkNames, bezirk, onBezirk,
  cuisineNames, cuisine, onCuisine,
}: Props) {
  const { t, lang } = useTranslation()
  const loc = lang === 'de' ? 'de' : 'en'

  const [openChip, setOpenChip] = useState<ChipKind | null>(null)
  const categoryBtnRef = useRef<HTMLButtonElement>(null)
  const bezirkBtnRef   = useRef<HTMLButtonElement>(null)
  const cuisineBtnRef  = useRef<HTMLButtonElement>(null)

  const categoryItems: PickerItem[] = useMemo(
    () => categories.map(c => ({ value: c.slug, label: localizedCategoryName(c, loc) })),
    [categories, loc],
  )
  const bezirkItems: PickerItem[] = useMemo(
    () => bezirkNames.map(n => ({ value: n, label: n })),
    [bezirkNames],
  )
  const cuisineItems: PickerItem[] = useMemo(
    () => cuisineNames.map(n => ({ value: n, label: n })),
    [cuisineNames],
  )

  const activeCategoryLabel = useMemo(() => {
    if (category === 'All') return null
    const def = categories.find(c => c.slug === category)
    return def ? localizedCategoryName(def, loc) : null
  }, [category, categories, loc])

  return (
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
      ) : (
        /* Two-row header (Google / Apple Maps pattern):
           Row 1 — count + the "Open now" binary toggle + search-icon.
           Open-now stays out of the scrolling rail so the most-used filter
           is always visible and one tap away.
           Row 2 — horizontal-scroll chip rail with the pickers. */
        <>
          <div className={styles.listHeaderRow}>
            <span className={styles.listHeaderCount}>
              {resultCount}{' '}
              {resultCount === 1 ? t('map.restaurantOne') : t('map.restaurantMany')}
            </span>
            <div className={styles.listHeaderActions}>
              <button
                type="button"
                className={`${styles.filterChip} ${openOnly ? styles.filterChipOpenActive : ''}`}
                onClick={() => onOpenOnly(!openOnly)}
                aria-pressed={openOnly}
              >
                <span className={styles.filterChipLabel}>{t('map.filterChipOpen')}</span>
              </button>
              <button
                type="button"
                className={`${styles.filterIconBtn} ${search ? styles.filterIconBtnActive : ''}`}
                onClick={() => setSearchOpen(true)}
                aria-label={t('map.searchOpenAria')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                {search && <span className={styles.filterActiveDot} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <div className={styles.filterChipRow}>
            <FilterChip
              ref={categoryBtnRef}
              label={activeCategoryLabel ?? t('map.filterChipCategory')}
              active={!!activeCategoryLabel}
              expanded={openChip === 'category'}
              onClick={() => setOpenChip(prev => prev === 'category' ? null : 'category')}
              onReset={activeCategoryLabel ? () => onCategoryChange('All') : undefined}
            />
            <FilterChip
              ref={bezirkBtnRef}
              label={bezirk ?? t('map.filterChipBezirk')}
              active={!!bezirk}
              expanded={openChip === 'bezirk'}
              onClick={() => setOpenChip(prev => prev === 'bezirk' ? null : 'bezirk')}
              onReset={bezirk ? () => onBezirk(null) : undefined}
            />
            {cuisineNames.length > 0 && (
              <FilterChip
                ref={cuisineBtnRef}
                label={cuisine ?? t('map.filterChipCuisine')}
                active={!!cuisine}
                expanded={openChip === 'cuisine'}
                onClick={() => setOpenChip(prev => prev === 'cuisine' ? null : 'cuisine')}
                onReset={cuisine ? () => onCuisine(null) : undefined}
              />
            )}
          </div>
        </>
      )}

      {openChip === 'category' && (
        <MapFilterPickerSheet
          title={t('map.pickerCategoryTitle')}
          items={categoryItems}
          selectedValue={category === 'All' ? null : category}
          allLabel={t('map.filterAll')}
          onSelect={v => onCategoryChange((v ?? 'All') as MapCategory)}
          onClose={() => setOpenChip(null)}
          anchorEl={categoryBtnRef.current}
          closeAriaLabel={t('map.searchClose')}
        />
      )}
      {openChip === 'bezirk' && (
        <MapFilterPickerSheet
          title={t('map.pickerBezirkTitle')}
          items={bezirkItems}
          selectedValue={bezirk}
          allLabel={t('map.filterAll')}
          onSelect={v => onBezirk(v)}
          onClose={() => setOpenChip(null)}
          anchorEl={bezirkBtnRef.current}
          closeAriaLabel={t('map.searchClose')}
        />
      )}
      {openChip === 'cuisine' && (
        <MapFilterPickerSheet
          title={t('map.pickerCuisineTitle')}
          items={cuisineItems}
          selectedValue={cuisine}
          allLabel={t('map.filterAll')}
          onSelect={v => onCuisine(v)}
          onClose={() => setOpenChip(null)}
          anchorEl={cuisineBtnRef.current}
          closeAriaLabel={t('map.searchClose')}
        />
      )}
    </div>
  )
}

interface FilterChipProps {
  label: string
  active: boolean
  expanded: boolean
  onClick: () => void
  onReset?: () => void
}

const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(
  function FilterChip({ label, active, expanded, onClick, onReset }, ref) {
    return (
      <span className={styles.filterChipWrap}>
        <button
          ref={ref}
          type="button"
          className={`${styles.filterChip} ${active ? styles.filterChipActive : ''}`}
          onClick={onClick}
          aria-expanded={expanded}
        >
          <span className={styles.filterChipLabel}>{label}</span>
          {!onReset && (
            <svg className={styles.filterChipCaret} width="9" height="9" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        {onReset && (
          <button
            type="button"
            className={styles.filterChipReset}
            onClick={onReset}
            aria-label={`${label} reset`}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
              <line x1="3" y1="3" x2="9" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="9" y1="3" x2="3" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </span>
    )
  },
)
