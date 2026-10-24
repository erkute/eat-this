'use client';
import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import styles from './RemyStartMenu.module.css';

export default function RemyStartMenu({ en, onLeave, onChat }: {
  en: boolean;
  onLeave: () => void;
  onChat: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [clock, setClock] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const start = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const update = () => setClock(new Date().toLocaleTimeString(en ? 'en-GB' : 'de-DE', {
      timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit',
    }));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [en]);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function closeMenu() {
    setOpen(false);
    start.current?.focus();
  }
  return (
    <div className={styles.taskbar} ref={root} onKeyDown={(event) => {
      if (!open) return;
      if (event.key === 'Escape' || event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
      }
    }}>
      {open && <div className={styles.menu} id="remy-start-menu" role="menu" aria-label={en ? 'Start menu' : 'Startmenü'} ref={menu} onKeyDown={(event) => {
        const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
        const index = items.indexOf(document.activeElement as HTMLElement);
        let next: number | undefined;
        if (event.key === 'ArrowDown') next = (index + 1) % items.length;
        if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = items.length - 1;
        if (next !== undefined) { event.preventDefault(); items[next]?.focus(); }
      }}>
        <div className={styles.brand} aria-hidden="true"><b>Windows</b> 95</div>
        <div className={styles.items}>
          <button type="button" role="menuitem" tabIndex={-1} onClick={() => { setOpen(false); onChat(); }}>{en ? 'Ask Remy' : 'Frag Remy'}</button>
          <Link href="/map" role="menuitem" tabIndex={-1} onClick={onLeave}>Map</Link>
          <Link href="/news" role="menuitem" tabIndex={-1} onClick={onLeave}>{en ? 'Magazine' : 'Magazin'}</Link>
          <Link href="/must-eats" role="menuitem" tabIndex={-1} onClick={onLeave}>Must Eats</Link>
          <Link href="/packs" role="menuitem" tabIndex={-1} onClick={onLeave}>Booster Packs</Link>
          <div className={styles.separator} role="separator" />
          <button type="button" role="menuitem" tabIndex={-1} onClick={onLeave}>{en ? 'Leave desktop' : 'Desktop verlassen'}</button>
        </div>
      </div>}
      <button type="button" className={styles.start} ref={start} aria-expanded={open} aria-controls="remy-start-menu" aria-haspopup="menu" onClick={() => setOpen(value => !value)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pics/remy/icons/windows-flag.webp" width={32} height={32} alt="" />
        Start
      </button>
      <span className={styles.divider} aria-hidden="true" />
      <button type="button" className={styles.activeTask} onClick={() => { setOpen(false); onChat(); }}>{en ? 'Ask Remy' : 'Frag Remy'}</button>
      <time className={styles.clock} aria-label={en ? `Time ${clock}` : `Uhrzeit ${clock}`}>{clock}</time>
    </div>
  );
}
