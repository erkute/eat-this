'use client';

import { useEffect, useRef, useState, type ComponentProps, type MouseEvent } from 'react';
import { Link } from '@/i18n/navigation';
import styles from './MagazineOpen.module.css';

const CLASSES = {
  overlay: styles.overlay,
  table: styles.table,
  edge: styles.edge,
  book: styles.book,
  paper: styles.paper,
  shadow: styles.shadow,
  gutter: styles.gutter,
  strip: styles.strip,
  front: styles.front,
  back: styles.back,
  skin: styles.skin,
  inside: styles.inside,
  backFolio: styles.backFolio,
  backMark: styles.backMark,
};

type Props = Omit<ComponentProps<typeof Link>, 'href' | 'onClick' | 'prefetch'> & {
  /** `/news/<slug>` — the article the magazine opens on. */
  href: string;
  /** For a link without its own cover („Lesen"): selector of the link that
   *  holds the cover to open. */
  coverFrom?: string;
};

/**
 * Der Link um ein Heft (MagazineCover): ein Tipp schlägt das Heft auf und
 * landet im Artikel (lib/magazineOpen.ts). Was der Klick sonst bedeutet,
 * bleibt: neuer Tab mit Modifier, Mittelklick, und ein Klick, den schon jemand
 * abgefangen hat — der Fächer der Startseite blättert damit zu einem hinteren
 * Heft, statt es zu öffnen. Ohne Bewegung navigiert der Link wie jeder andere.
 *
 * Article data starts loading on pointer or keyboard intent, while the opening
 * animation runs. Merely displaying a shelf must not fetch all its articles.
 *
 * Navigiert wird am Ende vom Link selbst: ein zweiter, programmatischer Klick,
 * den dieser Handler durchlässt — so bleibt es Nexts eigene Navigation
 * (Prefetch, Scroll nach oben, Locale), ohne einen zweiten Weg daneben.
 */
export default function MagazineLink({ href, coverFrom, children, className, onPointerEnter, onPointerDown, onFocus, ...rest }: Props) {
  const passOn = useRef(false);
  const [prefetch, setPrefetch] = useState(false);
  const active = useRef(true);
  const opening = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const prepare = () => {
    setPrefetch(true);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void import('@/lib/magazineOpen').catch(() => {});
    }
  };

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (passOn.current) {
      passOn.current = false;
      return;
    }
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setPrefetch(true);
    const anchor = event.currentTarget;
    const link = coverFrom ? document.querySelector<HTMLElement>(coverFrom) : anchor;
    const cover = link?.querySelector<HTMLElement>('[data-magazine-cover]');
    if (!link || !cover) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    event.preventDefault();
    if (opening.current) return;
    opening.current = true;
    const navigate = () => {
      if (!active.current || !anchor.isConnected) return;
      opening.current = false;
      passOn.current = true;
      anchor.click();
    };
    const slug = href.split('/').filter(Boolean).pop() ?? '';
    void import('@/lib/magazineOpen').then(({ openMagazine }) => {
      if (!active.current || !anchor.isConnected) return;
      const opened = openMagazine({ link, cover, slug, navigate, classes: CLASSES });
      if (!opened) navigate();
    }).catch(navigate);
  };

  return (
    <Link
      {...rest}
      href={href}
      prefetch={prefetch ? null : false}
      onPointerEnter={(event) => { prepare(); onPointerEnter?.(event); }}
      onPointerDown={(event) => { prepare(); onPointerDown?.(event); }}
      onFocus={(event) => { prepare(); onFocus?.(event); }}
      onClick={onClick}
      className={[styles.link, className].filter(Boolean).join(' ')}
    >
      {children}
    </Link>
  );
}
