'use client';
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type Ref } from 'react';
import { useTranslation } from '@/lib/i18n';
import { localizedCategoryName, type CategoryDef } from '@/lib/categories';
import { abbreviateBezirk, type FilterDimension, type MapOptionCounts } from '@/lib/map';
import { priceBucketLabelKey } from '@/lib/map/priceBuckets';
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

  /** Preisstufen-IDs in fester Reihenfolge, billig → teuer. */
  priceBucketIds: string[];
  price: string | null;
  onPrice: (id: string | null) => void;

  /** Hits behind every picker row, counted against the other chips. */
  optionCounts: MapOptionCounts;

  /** A non-empty search query overrides every chip below (see useMapFilters).
   *  The chips stayed painted "live" while being ignored, so the row now
   *  drops back to its inactive fill and says why. */
  searchActive: boolean;
}

type ChipKind = 'category' | 'bezirk' | 'price';

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
  priceBucketIds,
  price,
  onPrice,
  optionCounts,
  searchActive,
}: Props) {
  const { t, lang } = useTranslation();
  const loc = lang === 'de' ? 'de' : 'en';

  const [openChip, setOpenChip] = useState<ChipKind | null>(null);
  const categoryBtnRef = useRef<HTMLButtonElement>(null);
  const bezirkBtnRef = useRef<HTMLButtonElement>(null);
  const priceBtnRef = useRef<HTMLButtonElement>(null);

  /* Ab Desktop klappt die Auswahl in der Leiste auf, statt über der Liste zu
     schweben (User, 2026-08-27). Der Zustand startet auf false und wird erst
     im Effekt gesetzt — das ist unkritisch, weil ein Picker ohnehin nie im
     ersten Rendern offen ist. */
  const [inlinePicker, setInlinePicker] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => setInlinePicker(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  /* Every row carries what it would actually return — the whole catalogue,
     paywalled spots included, because that is what the list renders. A zero is
     therefore a real zero, and the row stops being pickable: it is listed
     (hiding it reshuffles the picker between two openings, and "Peruanisch: 0"
     is a real answer) but it cannot lead anywhere except an empty list. */
  const withCount = useCallback(
    (value: string, label: string, dim: FilterDimension): PickerItem => {
      const hits = optionCounts.byValue[dim].get(value) ?? 0;
      return { value, label, sub: String(hits), disabled: hits === 0 };
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
  /* NICHT nachsortiert: eine Preisskala hat ihre Reihenfolge schon, und
     alphabetisch stünde „ab 100 €" vorn. */
  const priceItems: PickerItem[] = useMemo(
    () => priceBucketIds.map((id) => withCount(id, t(priceBucketLabelKey(id)), 'price')),
    [priceBucketIds, t, withCount]
  );

  const activeCategoryLabel = useMemo(() => {
    if (category === 'All') return null;
    const def = categories.find((c) => c.slug === category);
    return def ? localizedCategoryName(def, loc) : null;
  }, [category, categories, loc]);

  /* Only worth saying when a chip actually holds a value — an untouched rail
     has nothing for the query to override. */
  const chipsPaused = searchActive && Boolean(activeCategoryLabel || bezirk || price || openOnly);

  return (
    <div ref={headerRef} className={styles.listHeader}>
      {/* Chip rail — Kategorie · Bezirk · Preis · Jetzt offen. */}
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
        {priceBucketIds.length > 0 && (
          <FilterChip
            ref={priceBtnRef}
            label={price ? t(priceBucketLabelKey(price)) : t('map.filterChipPrice')}
            active={!!price}
            expanded={openChip === 'price'}
            onClick={() => setOpenChip((prev) => (prev === 'price' ? null : 'price'))}
            clearLabel={`${t('map.filterChipClear')}: ${t('map.filterChipPrice')}`}
            onClear={() => onPrice(null)}
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
          inline={inlinePicker}
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
          inline={inlinePicker}
          closeAriaLabel={t('map.searchClose')}
        />
      )}
      {openChip === 'price' && (
        <MapFilterPickerSheet
          title={t('map.pickerPriceTitle')}
          items={priceItems}
          selectedValue={price}
          allLabel={t('map.filterAll')}
          allSub={String(optionCounts.withoutDimension.price)}
          onSelect={(v) => onPrice(v)}
          onClose={() => setOpenChip(null)}
          anchorEl={priceBtnRef.current}
          inline={inlinePicker}
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
