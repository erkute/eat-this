'use client'
import { useEffect, useRef, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './map.module.css'

export type SortOption = 'distance' | 'name'

interface FilterDropdownProps {
  sort: SortOption
  onSort: (s: SortOption) => void
  openOnly: boolean
  onOpenOnly: (v: boolean) => void
  bezirke: string[]
  bezirk: string | null
  onBezirk: (b: string | null) => void
  onClose: () => void
  anchorEl?: HTMLElement | null
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function FilterDropdown({
  sort, onSort, openOnly, onOpenOnly, bezirke, bezirk, onBezirk, onClose, anchorEl,
}: FilterDropdownProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // Compute fixed position from anchor element. Uses left+top (not right) so
  // viewport-width quirks in mobile simulation can't push the dropdown off
  // screen. Right-aligns with anchor by computing dropdown width offset, and
  // clamps to viewport bounds so it stays visible regardless of anchor pos.
  useLayoutEffect(() => {
    if (!anchorEl) return
    const update = () => {
      const r = anchorEl.getBoundingClientRect()
      const viewportW = document.documentElement.clientWidth || window.innerWidth
      const viewportH = document.documentElement.clientHeight || window.innerHeight
      const dropdownW = 220 // matches min-width 200 + border
      // Right-aligned with anchor's right edge, but clamped to viewport
      const idealLeft = r.right - dropdownW
      const left = Math.max(8, Math.min(idealLeft, viewportW - dropdownW - 8))
      // Below anchor, but if there's no room below, flip above
      const idealTop = r.bottom + 6
      const top = idealTop + 320 > viewportH ? Math.max(8, r.top - 320 - 6) : idealTop
      setPos({ top, left })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchorEl])

  // Outside-click close. We exclude clicks on the anchor element (filter
  // button) so its own onClick can toggle the dropdown without this listener
  // racing it. React's e.stopPropagation() doesn't stop native events from
  // reaching document-level listeners, so the anchor check is the reliable
  // approach.
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (ref.current && ref.current.contains(target)) return
      if (anchorEl && anchorEl.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', handler as EventListener)
    document.addEventListener('touchstart', handler as EventListener)
    return () => {
      document.removeEventListener('mousedown', handler as EventListener)
      document.removeEventListener('touchstart', handler as EventListener)
    }
  }, [onClose, anchorEl])

  const dropdown = (
    <div
      ref={ref}
      className={styles.filterDropdown}
      style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' }}
    >
      <div className={styles.filterDropdownSection}>
        <div className={styles.filterDropdownLabel}>Sortieren</div>
        {(['distance', 'name'] as SortOption[]).map(opt => (
          <button
            key={opt}
            type="button"
            className={`${styles.filterDropdownItem} ${sort === opt ? styles.filterDropdownItemActive : ''}`}
            onClick={() => { onSort(opt); onClose() }}
          >
            <span>{opt === 'distance' ? 'Distanz' : 'Name'}</span>
            {sort === opt && <CheckIcon />}
          </button>
        ))}
      </div>

      <div className={styles.filterDropdownDivider} />

      <div className={styles.filterDropdownSection}>
        <button
          type="button"
          className={styles.filterDropdownItem}
          onClick={() => { onOpenOnly(!openOnly); onClose() }}
        >
          <span>Nur Geöffnete</span>
          <div className={`${styles.filterToggle} ${openOnly ? styles.filterToggleOn : ''}`}>
            <div className={styles.filterToggleThumb} />
          </div>
        </button>
      </div>

      {bezirke.length > 0 && (
        <>
          <div className={styles.filterDropdownDivider} />
          <div className={styles.filterDropdownSection}>
            <div className={styles.filterDropdownLabel}>Bezirk</div>
            <button
              type="button"
              className={`${styles.filterDropdownItem} ${bezirk === null ? styles.filterDropdownItemActive : ''}`}
              onClick={() => { onBezirk(null); onClose() }}
            >
              <span>Alle</span>
              {bezirk === null && <CheckIcon />}
            </button>
            {bezirke.map(b => (
              <button
                key={b}
                type="button"
                className={`${styles.filterDropdownItem} ${bezirk === b ? styles.filterDropdownItemActive : ''}`}
                onClick={() => { onBezirk(b); onClose() }}
              >
                <span>{b}</span>
                {bezirk === b && <CheckIcon />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )

  // Portal into document.body (same as BezirkFilter) so the sheet's
  // overflow:hidden doesn't clip the fixed-positioned dropdown.
  if (typeof document === 'undefined') return null
  return createPortal(dropdown, document.body)
}
