'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './map.module.css'

export interface PickerItem {
  value: string
  label: string
  /** Small muted text rendered right-aligned (e.g. result count). */
  sub?: string
}

interface Props {
  title: string
  items: PickerItem[]
  /** Currently selected value. `null` means the "Alle …" reset row is active. */
  selectedValue: string | null
  /** Receives the picked value, or `null` for the reset row. */
  onSelect: (value: string | null) => void
  onClose: () => void
  /** Anchor element so desktop renders as anchored popover (instead of bottom sheet). */
  anchorEl?: HTMLElement | null
  /** Optional extra rows after the list — e.g. sort direction toggle. */
  footer?: ReactNode
  /** Label for the "Alle …" reset row. Omit to skip the reset row. */
  allLabel?: string
  closeAriaLabel: string
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

/**
 * Mobile: full-width bottom sheet that slides up over the map list-sheet.
 * Desktop: small anchored popover beneath the chip that opened it.
 *
 * The same component handles both modes via `anchorEl`. CSS media-query
 * picks the right layout. Closes on outside-click and on Escape.
 */
export default function MapFilterPickerSheet({
  title, items, selectedValue, onSelect, onClose,
  anchorEl, footer, allLabel, closeAriaLabel,
}: Props) {
  // Callback-ref into state so position + touchmove effects re-run the moment
  // the sheet element actually attaches. The previous useState('mounted') +
  // useRef pattern raced: effects ran on the first pass when the portal
  // returned null, sheetRef.current was still null, and the position effect
  // never re-ran after mounted flipped — leaving the desktop popover at 0,0.
  const [sheetEl, setSheetEl] = useState<HTMLDivElement | null>(null)

  // Outside-click / Escape close.
  useEffect(() => {
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (sheetEl && sheetEl.contains(target)) return
      if (anchorEl && anchorEl.contains(target)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, anchorEl, sheetEl])

  // Prevent the map-sheet's drag handler from absorbing touches that start
  // inside the picker — otherwise scrolling a long bezirk list collapses
  // the bottom sheet underneath.
  useEffect(() => {
    if (!sheetEl) return
    const stop = (e: TouchEvent) => e.stopPropagation()
    sheetEl.addEventListener('touchmove', stop, { passive: true })
    return () => sheetEl.removeEventListener('touchmove', stop)
  }, [sheetEl])

  // Desktop popover positioning relative to the anchor chip.
  useEffect(() => {
    if (!sheetEl || !anchorEl) return
    const apply = () => {
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches
      if (!isDesktop) {
        sheetEl.style.removeProperty('--picker-anchor-top')
        sheetEl.style.removeProperty('--picker-anchor-left')
        return
      }
      const rect = anchorEl.getBoundingClientRect()
      // Clamp horizontally so the 280px popover never spills past the viewport
      // edge — the filter chips live in the right-hand rail, so a left-aligned
      // sheet would overflow the right edge for every chip but the first.
      const margin = 12
      const sheetW = sheetEl.offsetWidth || 280
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - sheetW - margin))
      sheetEl.style.setProperty('--picker-anchor-top', `${rect.bottom + 6}px`)
      sheetEl.style.setProperty('--picker-anchor-left', `${left}px`)
    }
    apply()
    window.addEventListener('resize', apply)
    window.addEventListener('scroll', apply, true)
    return () => {
      window.removeEventListener('resize', apply)
      window.removeEventListener('scroll', apply, true)
    }
  }, [anchorEl, sheetEl])

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div className={styles.pickerBackdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={setSheetEl}
        className={styles.pickerSheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.pickerHandle} aria-hidden="true" />
        <div className={styles.pickerHeader}>
          <span className={styles.pickerTitle}>{title}</span>
          <button
            type="button"
            className={styles.pickerCloseBtn}
            onClick={onClose}
            aria-label={closeAriaLabel}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        <div className={styles.pickerList}>
          {allLabel !== undefined && (
            <button
              type="button"
              className={`${styles.pickerItem} ${selectedValue === null ? styles.pickerItemActive : ''}`}
              onClick={() => { onSelect(null); onClose() }}
            >
              <span>{allLabel}</span>
              {selectedValue === null && <CheckIcon />}
            </button>
          )}
          {items.map(item => {
            const active = item.value === selectedValue
            return (
              <button
                key={item.value}
                type="button"
                className={`${styles.pickerItem} ${active ? styles.pickerItemActive : ''}`}
                onClick={() => { onSelect(item.value); onClose() }}
              >
                <span className={styles.pickerItemLabel}>{item.label}</span>
                {item.sub && <span className={styles.pickerItemSub}>{item.sub}</span>}
                {active && <CheckIcon />}
              </button>
            )
          })}
        </div>
        {footer && <div className={styles.pickerFooter}>{footer}</div>}
      </div>
    </>,
    document.body,
  )
}
