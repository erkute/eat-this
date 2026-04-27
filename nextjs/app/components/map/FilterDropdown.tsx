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
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  // Compute fixed position from anchor element — same pattern as BezirkFilter
  // so the `.list` overflow:hidden doesn't clip the dropdown.
  useLayoutEffect(() => {
    if (!anchorEl) return
    const update = () => {
      const r = anchorEl.getBoundingClientRect()
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchorEl])

  // Outside-click + touchstart close (Fix 3: add touchstart alongside mousedown)
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler as EventListener)
    document.addEventListener('touchstart', handler as EventListener)
    return () => {
      document.removeEventListener('mousedown', handler as EventListener)
      document.removeEventListener('touchstart', handler as EventListener)
    }
  }, [onClose])

  const dropdown = (
    <div
      ref={ref}
      className={styles.filterDropdown}
      style={pos ? { top: pos.top, right: pos.right } : undefined}
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
