'use client'
import { forwardRef, useMemo, useRef, useState, type Ref } from 'react'
import { useTranslation } from '@/lib/i18n'
import { localizedCategoryName, type CategoryDef } from '@/lib/categories'
import type { MapCategory } from '@/lib/types'
import MapFilterPickerSheet, { type PickerItem } from './MapFilterPickerSheet'
import styles from './map.module.css'

interface Props {
  headerRef: Ref<HTMLDivElement | null>

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
      {/* Chip rail — Kategorie · Bezirk · Küche · Jetzt offen. */}
      <div className={styles.filterChipRow}>
        <FilterChip
          ref={categoryBtnRef}
          label={activeCategoryLabel ?? t('map.filterChipCategory')}
          active={!!activeCategoryLabel}
          expanded={openChip === 'category'}
          onClick={() => setOpenChip(prev => prev === 'category' ? null : 'category')}
        />
        <FilterChip
          ref={bezirkBtnRef}
          label={bezirk ?? t('map.filterChipBezirk')}
          active={!!bezirk}
          expanded={openChip === 'bezirk'}
          onClick={() => setOpenChip(prev => prev === 'bezirk' ? null : 'bezirk')}
        />
        {cuisineNames.length > 0 && (
          <FilterChip
            ref={cuisineBtnRef}
            label={cuisine ?? t('map.filterChipCuisine')}
            active={!!cuisine}
            expanded={openChip === 'cuisine'}
            onClick={() => setOpenChip(prev => prev === 'cuisine' ? null : 'cuisine')}
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
}

const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(
  function FilterChip({ label, active, expanded, onClick }, ref) {
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
        </button>
      </span>
    )
  },
)
