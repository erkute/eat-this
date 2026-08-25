'use client';
import { forwardRef, useCallback, useMemo, useRef, useState, type Ref } from 'react';
import { useTranslation } from '@/lib/i18n';
import { localizedCategoryName, type CategoryDef } from '@/lib/categories';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { abbreviateBezirk, type FilterDimension, type MapOptionCounts } from '@/lib/map';
import type { MapCategory } from '@/lib/types';
import MapFilterPickerSheet, { type PickerItem } from './MapFilterPickerSheet';
import styles from './MapFilters.module.css';

interface Props {
  headerRef: Ref<HTMLDivElement | null>;

  categories: CategoryDef[];
  category: MapCategory;
  onCategoryChange: (c: MapCategory) => void;

  openOnly: boolean;
  onOpenOnly: (next: boolean) => void;

  bezirkNames: string[];
  bezirk: string | null;
  onBezirk: (name: string | null) => void;

  cuisineNames: string[];
  cuisine: string | null;
  onCuisine: (name: string | null) => void;

  /** Hits behind every picker row, counted against the other chips. */
  optionCounts: MapOptionCounts;

  /** A non-empty search query overrides every chip below (see useMapFilters).
   *  The chips stayed painted "live" while being ignored, so the row now
   *  drops back to its inactive fill and says why. */
  searchActive: boolean;
}

type ChipKind = 'category' | 'bezirk' | 'cuisine';

export default function MapListHeader({
  headerRef,
  categories,
  category,
  onCategoryChange,
  openOnly,
  onOpenOnly,
  bezirkNames,
  bezirk,
  onBezirk,
  cuisineNames,
  cuisine,
  onCuisine,
  optionCounts,
  searchActive,
}: Props) {
  const { t, lang } = useTranslation();
  const loc = lang === 'de' ? 'de' : 'en';

  const [openChip, setOpenChip] = useState<ChipKind | null>(null);
  const categoryBtnRef = useRef<HTMLButtonElement>(null);
  const bezirkBtnRef = useRef<HTMLButtonElement>(null);
  const cuisineBtnRef = useRef<HTMLButtonElement>(null);

  /* Every row carries what it would actually return, and the number decides
     what kind of row it is. Three states, because "0" was hiding two very
     different things:

     - free hits          → the count, plain.
     - only locked hits   → that count behind a padlock. Not a dead end: the
                            list shows the spots the pack is holding and names
                            the price, which is the whole reason the row exists.
     - nothing either way → listed, but not pickable. Hiding it would reshuffle
                            the picker between two openings and "Peruanisch: 0"
                            is a real answer; leading someone to a list that can
                            only say "0 Treffer" is not. */
  const withCount = useCallback(
    (value: string, label: string, dim: FilterDimension): PickerItem => {
      const hits = optionCounts.byValue[dim].get(value) ?? 0;
      const locked = optionCounts.lockedByValue[dim].get(value) ?? 0;
      return {
        value,
        label,
        sub: String(hits || locked),
        lockedOnly: hits === 0 && locked > 0,
        disabled: hits === 0 && locked === 0,
      };
    },
    [optionCounts]
  );

  const categoryItems: PickerItem[] = useMemo(
    () => categories.map((c) => withCount(c.slug, localizedCategoryName(c, loc), 'category')),
    [categories, loc, withCount]
  );
  const bezirkItems: PickerItem[] = useMemo(
    () => bezirkNames.map((n) => withCount(n, n, 'bezirk')),
    [bezirkNames, withCount]
  );
  /* Wert bleibt der rohe Sanity-String — er ist die Filteridentität und steht
     so auch im `?cuisine=`-Parameter. Übersetzt wird nur das Label, genau wie
     bei den Kategorien eine Zeile höher.

     Neu sortiert, und zwar nach dem Label: `cuisineNames` kommt alphabetisch
     nach den englischen Rohwerten aus useMapFilters, und die laufen nicht
     parallel zu den deutschen — „German/Deutsche Küche" und „Middle Eastern/
     Orientalisch" landen sonst quer in der Liste. */
  const cuisineItems: PickerItem[] = useMemo(
    () =>
      cuisineNames
        .map((n) => withCount(n, localizedCuisine(n, loc), 'cuisine'))
        .sort((a, b) => a.label.localeCompare(b.label, loc)),
    [cuisineNames, loc, withCount]
  );

  const activeCategoryLabel = useMemo(() => {
    if (category === 'All') return null;
    const def = categories.find((c) => c.slug === category);
    return def ? localizedCategoryName(def, loc) : null;
  }, [category, categories, loc]);

  /* Only worth saying when a chip actually holds a value — an untouched rail
     has nothing for the query to override. */
  const chipsPaused = searchActive && Boolean(activeCategoryLabel || bezirk || cuisine || openOnly);

  return (
    <div ref={headerRef} className={styles.listHeader}>
      {/* Chip rail — Kategorie · Bezirk · Küche · Jetzt offen. */}
      <div className={`${styles.filterChipRow} ${chipsPaused ? styles.filterChipRowPaused : ''}`}>
        <FilterChip
          ref={categoryBtnRef}
          label={activeCategoryLabel ?? t('map.filterChipCategory')}
          active={!!activeCategoryLabel}
          expanded={openChip === 'category'}
          onClick={() => setOpenChip((prev) => (prev === 'category' ? null : 'category'))}
          clearLabel={`${t('map.filterChipClear')}: ${t('map.filterChipCategory')}`}
          onClear={() => onCategoryChange('All' as MapCategory)}
        />
        <FilterChip
          ref={bezirkBtnRef}
          /* "Prenzlauer Berg" is the one district name the rail cannot hold;
             the list stickers already shorten it the same way. */
          label={abbreviateBezirk(bezirk) ?? t('map.filterChipBezirk')}
          active={!!bezirk}
          expanded={openChip === 'bezirk'}
          onClick={() => setOpenChip((prev) => (prev === 'bezirk' ? null : 'bezirk'))}
          clearLabel={`${t('map.filterChipClear')}: ${t('map.filterChipBezirk')}`}
          onClear={() => onBezirk(null)}
        />
        {cuisineNames.length > 0 && (
          <FilterChip
            ref={cuisineBtnRef}
            label={cuisine ? localizedCuisine(cuisine, loc) : t('map.filterChipCuisine')}
            active={!!cuisine}
            expanded={openChip === 'cuisine'}
            onClick={() => setOpenChip((prev) => (prev === 'cuisine' ? null : 'cuisine'))}
            clearLabel={`${t('map.filterChipClear')}: ${t('map.filterChipCuisine')}`}
            onClear={() => onCuisine(null)}
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

      {chipsPaused && (
        <p className={styles.filterChipPausedNote}>{t('map.filterChipsPausedBySearch')}</p>
      )}

      {openChip === 'category' && (
        <MapFilterPickerSheet
          title={t('map.pickerCategoryTitle')}
          items={categoryItems}
          selectedValue={category === 'All' ? null : category}
          allLabel={t('map.filterAll')}
          allSub={String(optionCounts.withoutDimension.category)}
          onSelect={(v) => onCategoryChange((v ?? 'All') as MapCategory)}
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
          allSub={String(optionCounts.withoutDimension.bezirk)}
          onSelect={(v) => onBezirk(v)}
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
          allSub={String(optionCounts.withoutDimension.cuisine)}
          onSelect={(v) => onCuisine(v)}
          onClose={() => setOpenChip(null)}
          anchorEl={cuisineBtnRef.current}
          closeAriaLabel={t('map.searchClose')}
        />
      )}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  active: boolean;
  expanded: boolean;
  onClick: () => void;
  /** Accessible name for the reset affordance, e.g. "Filter Bezirk zurücksetzen". */
  clearLabel: string;
  /** Drops this filter. Rendered only while the chip is active. */
  onClear: () => void;
}

const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(function FilterChip(
  { label, active, expanded, onClick, clearLabel, onClear },
  ref
) {
  return (
    <span className={styles.filterChipWrap}>
      <button
        ref={ref}
        type="button"
        className={`${styles.filterChip} ${active ? styles.filterChipActive : ''}`}
        onClick={onClick}
        aria-expanded={expanded}
        /* Without this, `aria-expanded` alone says the chip expands in place —
           it actually opens MapFilterPickerSheet, which is role="dialog"
           aria-modal="true". The "Geöffnet" chip next to these is a real toggle
           and correctly stays on aria-pressed. */
        aria-haspopup="dialog"
      >
        <span
          className={`${styles.filterChipLabel} ${label.length > 9 ? styles.filterChipLabelLong : ''}`}
        >
          {label}
        </span>
      </button>
      {/* Sibling, not a child: a button inside a button is invalid markup and
            makes screen readers announce two controls for one chip. Clearing a
            filter otherwise meant opening the picker and hunting for "Alle". */}
      {active && (
        <button
          type="button"
          className={styles.filterChipClear}
          onClick={onClear}
          aria-label={clearLabel}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </span>
  );
});
