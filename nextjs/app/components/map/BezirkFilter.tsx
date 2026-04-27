'use client'
import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

interface BezirkFilterProps {
  bezirke: string[]
  active: string | null
  onChange: (bezirk: string | null) => void
}

/**
 * Custom dropdown — replaces the native <select> so the panel always opens
 * directly below the trigger (native iOS opens a wheel picker; native desktop
 * sometimes flips upward when the field sits high in the viewport).
 *
 * The panel is portaled into a `position: fixed` overlay so the toolbar's
 * `overflow: hidden` (rounded pill clipping) doesn't clip it.
 */
export default function BezirkFilter({ bezirke, active, onChange }: BezirkFilterProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  // Compute panel position from the trigger rect — fixed coords so the toolbar's
  // rounded-pill `overflow: hidden` doesn't clip the popover.
  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const r = btnRef.current?.getBoundingClientRect()
      if (!r) return
      setPos({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 168) })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  // Outside click + Escape close.
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (btnRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const label = active ?? (t('map.allBezirke') ?? 'Alle Bezirke')

  // Portal the panel into document.body so the toolbar's transform-creating
  // ancestors don't shift the fixed-positioned popover.
  const panel = open && pos && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={panelRef}
          className={styles.bezirkPanel}
          style={{ top: pos.top, left: pos.left, minWidth: pos.width }}
          role="listbox"
        >
          <button
            type="button"
            className={`${styles.bezirkOption} ${!active ? styles.bezirkOptionActive : ''}`}
            onClick={() => { onChange(null); setOpen(false) }}
            role="option"
            aria-selected={!active}
          >
            {t('map.allBezirke') ?? 'Alle Bezirke'}
          </button>
          {bezirke.map(name => (
            <button
              key={name}
              type="button"
              className={`${styles.bezirkOption} ${active === name ? styles.bezirkOptionActive : ''}`}
              onClick={() => { onChange(name); setOpen(false) }}
              role="option"
              aria-selected={active === name}
            >
              {name}
            </button>
          ))}
        </div>,
        document.body
      )
    : null

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`${styles.select} ${active ? styles.selectActive : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Bezirk"
      >
        {label}
      </button>
      {panel}
    </>
  )
}
