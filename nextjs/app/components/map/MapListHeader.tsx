'use client'
import { forwardRef, useMemo, useRef, useState, type Ref } from 'react'
import { useTranslation } from '@/lib/i18n'
import { localizedCategoryName, type CategoryDef } from '@/lib/categories'
import type { MapCategory, MapLayer } from '@/lib/types'
import MapFilterPickerSheet, { type PickerItem } from './MapFilterPickerSheet'
import styles from './map.module.css'

interface Props {
  headerRef: Ref<HTMLDivElement | null>

  /** Currently visible / filtered count — what's actually in the list now
   *  (20 for an anon viewer with no filter, less with a filter applied). */
  resultCount: number
  /** Catalog size — total restaurants in Sanity, independent of trial cap
   *  / current filters. Pairs with resultCount to read „20 / 172 SPOTS". */
  totalCount: number

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

  /** Current layer — used to decide whether to render the "Zu den
   *  Restaurants" switch (only relevant on the must-eats list). */
  layer: MapLayer
  onSwitchToRestaurants: () => void
}

type ChipKind = 'category' | 'bezirk' | 'cuisine'

export default function MapListHeader({
  headerRef,
  resultCount,
  totalCount,
  searchOpen, setSearchOpen, search, onSearchChange,
  categories, category, onCategoryChange,
  openOnly, onOpenOnly,
  bezirkNames, bezirk, onBezirk,
  cuisineNames, cuisine, onCuisine,
  layer, onSwitchToRestaurants,
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
      {/* Catalog-progress badge — sits in the sheet header. Format:
          „{visible} / {total} SPOTS" — communicates both what the viewer
          can currently see (trial-capped at 20 for anon) and the full
          Sanity catalog size, so the trial feels like a slice of a bigger
          guide, not an arbitrary limit. */}
      <span className={styles.sheetCountMini}>
        {resultCount} / {totalCount}{' '}
        {resultCount === 1 ? t('map.spotsCountOne') : t('map.spotsCountMany')}
      </span>

      {/* Chip rail — Kategorie · Bezirk · Küche · Jetzt offen. Search and
          inline result count moved out; search is now a floating toolbar
          on the map (see MapSectionBody), the count lives in the floating
          spot-count-mini above. */}
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
        <button
          type="button"
          className={`${styles.filterChip} ${openOnly ? styles.filterChipOpenActive : ''}`}
          onClick={() => onOpenOnly(!openOnly)}
          aria-pressed={openOnly}
        >
          <span className={styles.filterChipLabel}>{t('map.filterChipOpen')}</span>
        </button>
      </div>

      {/* Layer-Switch sitzt im selben Header-Block wie die Filter, nur in
          einer eigenen Zeile darunter — sichtbar nur in der Must-Eats-
          Ansicht damit der Weg zurück zu den Restaurants klar ist. */}
      {layer === 'mustEats' && (
        <div className={styles.filterSwitchRow}>
          <button
            type="button"
            className={styles.musteatListSwitchBtn}
            onClick={onSwitchToRestaurants}
          >
            <svg viewBox="0 0 16 11" aria-hidden="true">
              <path d="M15 5.5H2M6.5 1L2 5.5l4.5 4.5" />
            </svg>
            Zu den Restaurants
          </button>
        </div>
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
