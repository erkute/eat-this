'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './MapFilters.module.css';

export interface PickerItem {
  value: string;
  label: string;
  /** Small muted text rendered right-aligned (e.g. result count). */
  sub?: string;
  /** Nothing behind this row, anywhere in the catalogue. Stays listed — hiding
   *  it reshuffles the picker between openings, and "Peruanisch: 0" is the
   *  answer someone came for — but it is not pickable, because the only thing
   *  it could ever show is an empty list. */
  disabled?: boolean;
}

interface Props {
  title: string;
  items: PickerItem[];
  /** Currently selected value. `null` means the "Alle …" reset row is active. */
  selectedValue: string | null;
  /** Receives the picked value, or `null` for the reset row. */
  onSelect: (value: string | null) => void;
  onClose: () => void;
  /** Anchor element so desktop renders as anchored popover (instead of bottom sheet). */
  anchorEl?: HTMLElement | null;
  /** Desktop: die Liste klappt IN der Kopfzeile auf und schiebt die Ergebnisse
   *  nach unten, statt als Popover darüber zu schweben (User, 2026-08-27).
   *  Dann kein Portal, kein Backdrop, keine Ankerrechnung und keine
   *  Fokusfalle — das ist kein Dialog mehr, sondern ein aufgeklappter Teil der
   *  Leiste. Mobile bleibt das Bottom-Sheet: dort liegt die Leiste in einer
   *  Sheet mit Schnappunkten, und ein Block, der sie von innen wachsen lässt,
   *  verschiebt genau die Höhe, an der die Schnappunkte rechnen. */
  inline?: boolean;
  /** Label for the "Alle …" reset row. Omit to skip the reset row. */
  allLabel?: string;
  /** Count for the reset row — hits with this picker's filter lifted. */
  allSub?: string;
  closeAriaLabel: string;
}

/**
 * Mobile: full-width bottom sheet that slides up over the map list-sheet.
 * Desktop: small anchored popover beneath the chip that opened it.
 *
 * The same component handles both modes via `anchorEl`. CSS media-query
 * picks the right layout. Closes on outside-click and on Escape.
 */
export default function MapFilterPickerSheet({
  title,
  items,
  selectedValue,
  onSelect,
  onClose,
  anchorEl,
  inline = false,
  allLabel,
  allSub,
  closeAriaLabel,
}: Props) {
  // Callback-ref into state so position + touchmove effects re-run the moment
  // the sheet element actually attaches. The previous useState('mounted') +
  // useRef pattern raced: effects ran on the first pass when the portal
  // returned null, sheetRef.current was still null, and the position effect
  // never re-ran after mounted flipped — leaving the desktop popover at 0,0.
  const [sheetEl, setSheetEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* Außenklick — NUR für die eingeklappte Desktop-Variante.
   *
   * Als Bottom-Sheet liegt ein Backdrop über allem, und der schließt über
   * seinen eigenen `onClick` (siehe unten im Markup). Das ist der ganze Trick:
   * der wegtippende Klick landet AUF dem Backdrop und ist damit verbraucht —
   * er kann gar nichts darunter treffen.
   *
   * Vorher hing das an `touchstart`/`mousedown`. Damit war das Sheet schon weg,
   * bevor der Klick überhaupt kam, und der schlug auf die Karte durch und
   * öffnete einen Spot. Dagegen stand ein Abfänger, der genau den nächsten
   * Klick schluckte — mit einer Frist von 400 ms. Ein bedächtiger Tipp ist
   * länger: mit 600 ms Finger auf demselben Punkt ging reproduzierbar
   * `?r=bonanza-coffee-heroes` auf. Nicht die Frist verlängern — ein
   * Down-Ereignis ist hier grundsätzlich das falsche Signal.
   *
   * Die eingeklappte Variante (ab 1024px) hat keinen Backdrop, sie braucht
   * deshalb einen Wächter. `click` statt `mousedown` aus demselben Grund: beim
   * Zuklappen fließt die Leiste um, und ein auf `mousedown` geschlossener
   * Picker schickt den Klick an das Element, das NACH dem Umfließen dort liegt.
   *
   * Die ganze Chip-Zeile bleibt ausgenommen, nicht nur der eigene Chip: JEDER
   * Chip entscheidet in seinem eigenen `onClick` selbst, was offen sein soll
   * (nochmal derselbe = zu, ein anderer = umschalten). Käme hier zuerst ein
   * `onClose`, zöge der Klick danach denselben Chip wieder auf — die Leiste
   * ginge beim zweiten Tippen nicht zu. Das deckt zugleich den Klick ab, der
   * den Picker gerade geöffnet hat: React hängt diesen Wächter noch während
   * dessen Lauf ein, er sähe ihn also selbst. */
  useEffect(() => {
    if (!inline) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (sheetEl && sheetEl.contains(target)) return;
      if (anchorEl && anchorEl.contains(target)) return;
      if (target instanceof Element && target.closest('[data-filter-chip-row]')) return;
      onClose();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [inline, onClose, anchorEl, sheetEl]);

  // Prevent the map-sheet's drag handler from absorbing touches that start
  // inside the picker — otherwise scrolling a long bezirk list collapses
  // the bottom sheet underneath.
  useEffect(() => {
    if (!sheetEl) return;
    const stop = (e: TouchEvent) => e.stopPropagation();
    sheetEl.addEventListener('touchmove', stop, { passive: true });
    return () => sheetEl.removeEventListener('touchmove', stop);
  }, [sheetEl]);

  /* Focus management. This is an aria-modal dialog, but focus used to stay on
     <body>: keyboard and VoiceOver users were told a modal had opened and then
     left outside it, tabbing through the map behind. Move focus to the current
     selection (or the first row), trap Tab inside, and hand focus back to
     whatever opened the picker on close. */
  useEffect(() => {
    if (!sheetEl) return;
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        sheetEl.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);

    const initial =
      sheetEl.querySelector<HTMLElement>(`.${styles.pickerItemActive}`) ?? focusables()[0];
    initial?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    if (inline) return;
    sheetEl.addEventListener('keydown', onKey);
    return () => {
      sheetEl.removeEventListener('keydown', onKey);
      // Only reclaim focus if it is still inside the closing dialog; a pick
      // that navigates elsewhere must not be yanked back to the chip.
      if (!opener || !document.contains(opener)) return;
      if (sheetEl.contains(document.activeElement)) opener.focus({ preventScroll: true });
    };
  }, [inline, sheetEl]);

  // Desktop popover positioning relative to the anchor chip.
  useEffect(() => {
    if (inline || !sheetEl || !anchorEl) return;
    const apply = () => {
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
      if (!isDesktop) {
        sheetEl.style.removeProperty('--picker-anchor-top');
        sheetEl.style.removeProperty('--picker-anchor-left');
        return;
      }
      const rect = anchorEl.getBoundingClientRect();
      // Clamp horizontally so the 280px popover never spills past the viewport
      // edge — the filter chips live in the right-hand rail, so a left-aligned
      // sheet would overflow the right edge for every chip but the first.
      const margin = 12;
      const sheetW = sheetEl.offsetWidth || 280;
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - sheetW - margin));
      sheetEl.style.setProperty('--picker-anchor-top', `${rect.bottom + 6}px`);
      sheetEl.style.setProperty('--picker-anchor-left', `${left}px`);
      sheetEl.style.setProperty(
        '--picker-caret-left',
        `${Math.max(22, Math.min(rect.left + rect.width / 2 - left, sheetW - 22))}px`
      );
    };
    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('scroll', apply, true);
    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('scroll', apply, true);
    };
  }, [anchorEl, inline, sheetEl]);

  if (typeof document === 'undefined') return null;

  const sheet = (
    <div
      ref={setSheetEl}
      className={`${styles.pickerSheet} ${inline ? styles.pickerSheetInline : ''}`}
      role={inline ? 'group' : 'dialog'}
      aria-modal={inline ? undefined : true}
      aria-label={title}
    >
      <div className={styles.pickerHead}>
        <span className={styles.pickerTitle}>{title}</span>
        <button
          type="button"
          className={styles.pickerClose}
          onClick={onClose}
          aria-label={closeAriaLabel}
        >
          ×
        </button>
      </div>
      <div className={styles.pickerList}>
        {allLabel !== undefined && (
          <button
            type="button"
            className={`${styles.pickerItem} ${selectedValue === null ? styles.pickerItemActive : ''}`}
            aria-current={selectedValue === null ? 'true' : undefined}
            onClick={() => {
              onSelect(null);
              onClose();
            }}
          >
            <span className={styles.pickerItemLabel}>{allLabel}</span>
            {allSub && <span className={styles.pickerItemSub}>{allSub}</span>}
          </button>
        )}
        {items.map((item) => {
          const active = item.value === selectedValue;
          /* The active row is never dead, whatever its count says: it is the
               filter you are looking at, and a disabled button cannot take the
               focus this dialog hands to the current selection on open. */
          const dead = Boolean(item.disabled) && !active;
          return (
            <button
              key={item.value}
              type="button"
              disabled={dead}
              className={`${styles.pickerItem} ${active ? styles.pickerItemActive : ''} ${
                dead ? styles.pickerItemDead : ''
              }`}
              aria-current={active ? 'true' : undefined}
              onClick={() => {
                onSelect(item.value);
                onClose();
              }}
            >
              <span className={styles.pickerItemLabel}>{item.label}</span>
              {item.sub && <span className={styles.pickerItemSub}>{item.sub}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (inline) return sheet;

  return createPortal(
    <>
      <div className={styles.pickerBackdrop} onClick={onClose} aria-hidden="true" />
      {sheet}
    </>,
    document.body
  );
}
