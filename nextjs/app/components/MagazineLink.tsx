'use client';

import { useRef, type ComponentProps, type MouseEvent } from 'react';
import { Link } from '@/i18n/navigation';
import { openMagazine } from '@/lib/magazineOpen';
import styles from './MagazineOpen.module.css';

const CLASSES = {
  overlay: styles.overlay,
  table: styles.table,
  book: styles.book,
  page: styles.page,
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

type Props = Omit<ComponentProps<typeof Link>, 'href' | 'onClick'> & {
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
 * Navigiert wird am Ende vom Link selbst: ein zweiter, programmatischer Klick,
 * den dieser Handler durchlässt — so bleibt es Nexts eigene Navigation
 * (Prefetch, Scroll nach oben, Locale), ohne einen zweiten Weg daneben.
 */
export default function MagazineLink({ href, coverFrom, children, ...rest }: Props) {
  const passOn = useRef(false);

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (passOn.current) {
      passOn.current = false;
      return;
    }
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.currentTarget;
    const link = coverFrom ? document.querySelector<HTMLElement>(coverFrom) : anchor;
    const cover = link?.querySelector<HTMLElement>('[data-magazine-cover]');
    if (!link || !cover) return;
    const slug = href.split('/').filter(Boolean).pop() ?? '';
    const opened = openMagazine({
      link,
      cover,
      slug,
      navigate: () => {
        passOn.current = true;
        anchor.click();
      },
      classes: CLASSES,
    });
    if (opened) event.preventDefault();
  };

  return (
    <Link href={href} onClick={onClick} {...rest}>
      {children}
    </Link>
  );
}
