'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link } from '@/i18n/navigation';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import { prefersReducedMotion, rememberDiscoveryImage } from '@/lib/discovery-motion';
import styles from './DiscoveryExplorer.module.css';

export interface DiscoveryEntry {
  slug: string;
  name: string;
  href: string;
  spots: { slug: string; name: string; photo: string }[];
}

/** Real links also work before hydration. Touch previews; the explicit CTA enters. */
export default function DiscoveryExplorer({
  entries,
  kind,
  locale,
}: {
  entries: DiscoveryEntry[];
  kind: 'bezirk' | 'kategorie';
  locale: 'de' | 'en';
}) {
  const de = locale === 'de';
  const initial =
    entries.find((e) => e.slug === (kind === 'bezirk' ? 'schoeneberg' : 'pizza')) ?? entries[0];
  const [slug, setSlug] = useState(initial?.slug);
  const active = entries.find((e) => e.slug === slug) ?? initial;
  const visibleSpots = kind === 'kategorie' ? active?.spots.slice(0, 1) : active?.spots;
  const preview = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const previous = useRef(slug);
  const pointer = useRef('');
  const storageKey = `eat-this:discovery:${kind}`;

  useEffect(() => {
    const restore = () => {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (entries.some((e) => e.slug === saved)) setSlug(saved!);
      } catch {
        /* Selection is still usable without storage. */
      }
    };
    restore();
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, [entries, storageKey]);

  useEffect(() => {
    if (previous.current === slug) return;
    previous.current = slug;
    if (prefersReducedMotion()) return;
    let cancelled = false;
    let context: { revert: () => void } | undefined;
    void import('gsap').then(({ gsap }) => {
      if (cancelled || prefersReducedMotion()) return;
      context = gsap.context(() => {
        gsap.fromTo(
          '[data-discovery-photo] img',
          { x: 8, scale: 1.07 },
          {
            x: 0,
            scale: 1,
            duration: 0.45,
            stagger: 0.035,
            ease: 'power2.out',
            clearProps: 'all',
          }
        );
      }, preview);
    });
    return () => {
      cancelled = true;
      context?.revert();
    };
  }, [slug]);

  function select(next: string) {
    setSlug(next);
    try {
      sessionStorage.setItem(storageKey, next);
    } catch {
      /* Optional. */
    }
  }

  function enter(event: MouseEvent<HTMLAnchorElement>) {
    const clickedImage =
      event.target instanceof Element
        ? event.target.closest('[data-discovery-photo]')?.querySelector('img')
        : null;
    const visibleImage = [...(preview.current?.querySelectorAll('img') ?? [])].find((photo) => {
      const bounds = photo.getBoundingClientRect();
      return bounds.left + bounds.width / 2 > 0 && bounds.left + bounds.width / 2 < innerWidth;
    });
    rememberDiscoveryImage(event, clickedImage ?? visibleImage ?? image.current);
  }

  if (!active)
    return (
      <section className={styles.explorer}>
        <header className={styles.head}>
          <h1 className={styles.title}>{de ? 'Berlin entdecken' : 'Discover Berlin'}</h1>
          <p>
            {de
              ? 'Hier gibt es gerade keine Spots. Entdecke inzwischen unser Magazin.'
              : 'No spots here yet. Explore our magazine in the meantime.'}
          </p>
          <Link href="/news" className={styles.discover}>
            {de ? 'Zum Magazin' : 'Explore the magazine'}
          </Link>
        </header>
      </section>
    );
  return (
    <section className={styles.explorer} aria-labelledby="discovery-title" data-discovery={kind}>
      <header className={styles.head}>
        <p className={styles.kicker}>
          {kind === 'bezirk'
            ? de
              ? 'Berlin entdecken'
              : 'Discover Berlin'
            : de
              ? 'Kategorien'
              : 'Categories'}
        </p>
        <h1 id="discovery-title" className={styles.title}>
          {kind === 'bezirk'
            ? de
              ? 'Wohin heute?'
              : 'Where to today?'
            : de
              ? 'Was darf’s sein?'
              : 'What are you craving?'}
        </h1>
      </header>
      <div className={styles.choices}>
        <nav
          aria-label={
            de
              ? kind === 'bezirk'
                ? 'Alle Bezirke'
                : 'Alle Kategorien'
              : kind === 'bezirk'
                ? 'All districts'
                : 'All categories'
          }
        >
          <ul className={styles.names}>
            {entries.map((entry) => (
              <li key={entry.slug}>
                <Link
                  href={entry.href}
                  className={styles.choice}
                  data-selected={entry.slug === active.slug}
                  aria-current={entry.slug === active.slug ? 'true' : undefined}
                  aria-controls="discovery-preview"
                  onPointerDown={(event) => {
                    pointer.current = event.pointerType;
                  }}
                  onPointerEnter={(event) => {
                    if (event.pointerType === 'mouse') select(entry.slug);
                  }}
                  onFocus={() => select(entry.slug)}
                  onClick={(event) => {
                    if (
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return;
                    if (pointer.current === 'touch' || pointer.current === 'pen') {
                      event.preventDefault();
                      select(entry.slug);
                    } else if (entry.slug === active.slug) enter(event);
                    pointer.current = '';
                  }}
                >
                  {entry.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div id="discovery-preview" ref={preview} className={styles.preview}>
        <Link
          key={active.slug}
          href={active.href}
          className={styles.collage}
          data-count={visibleSpots?.length}
          onClick={enter}
          tabIndex={-1}
          aria-hidden="true"
        >
          {visibleSpots?.map((spot, index) => (
            <span key={spot.slug} className={styles.photo} data-discovery-photo>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={index === 0 ? image : undefined}
                src={spot.photo}
                srcSet={sanitySrcSet(spot.photo, [400, 640, 960])}
                sizes={
                  kind === 'bezirk'
                    ? '(max-width: 767px) 92vw, 24vw'
                    : '(max-width: 767px) 92vw, 70vw'
                }
                alt=""
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
              <span className={styles.caption}>{spot.name}</span>
            </span>
          ))}
          {active.spots.length === 0 && <span className={styles.noPhoto}>{active.name}</span>}
        </Link>
        <div className={styles.previewFoot} aria-live="polite" aria-atomic="true">
          <h2 className={styles.selected}>{active.name}</h2>
          <Link href={active.href} className={styles.discover} onClick={enter}>
            {de ? 'Entdecken' : 'Explore'}
          </Link>
        </div>
      </div>
    </section>
  );
}
