'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Link, useRouter } from '@/i18n/navigation';
import geography from '@/lib/berlin-discovery-map.json';
import type { DiscoveryEntry } from './DiscoveryExplorer';
import styles from './DiscoveryExplorer.module.css';
import { districtMapReady, transitionToDistrict } from '@/lib/districtMapTransition';

const FULL_VIEW = '0 0 640 550';

export default function DiscoveryMap({ entries, de }: { entries: DiscoveryEntry[]; de: boolean }) {
  const router = useRouter();
  const svg = useRef<SVGSVGElement>(null);
  const entrance = useRef<gsap.core.Tween | null>(null);
  const transition = useRef<gsap.core.Timeline | null>(null);
  const opening = useRef(false);
  const [pointed, setPointed] = useState<DiscoveryEntry | null>(null);
  const [preview, setPreview] = useState<DiscoveryEntry | null>(null);
  const [exploring, setExploring] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const entriesBySlug = new Map(entries.map(entry => [entry.slug, entry]));

  useEffect(() => {
    const surface = svg.current?.closest<HTMLElement>('[data-discovery]');
    if (!surface) return;
    let width = window.innerWidth;
    const reserveHeight = () => {
      surface.style.removeProperty('--discovery-mobile-min-height');
      if (window.matchMedia('(max-width: 767px)').matches) {
        // Freeze the initial large viewport height: browser bars must neither
        // reveal the footer nor move it. A width change recalculates for rotation.
        surface.style.setProperty('--discovery-mobile-min-height', getComputedStyle(surface).minHeight);
      }
    };
    reserveHeight();
    const resize = () => {
      if (window.innerWidth === width) {
        const reserved = parseFloat(surface.style.getPropertyValue('--discovery-mobile-min-height'));
        if (!Number.isFinite(reserved) || window.innerHeight <= reserved) return;
      }
      width = window.innerWidth;
      reserveHeight();
    };
    const restoreHeight = (event: PageTransitionEvent) => {
      if (event.persisted) reserveHeight();
    };
    window.addEventListener('resize', resize);
    window.addEventListener('pageshow', restoreHeight);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pageshow', restoreHeight);
      surface.style.removeProperty('--discovery-mobile-min-height');
    };
  }, []);

  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    districtMapReady();
    // Only decorative boundaries fade. Links and the Berlin silhouette are
    // already visible and usable in the server-rendered page.
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      entrance.current = gsap.fromTo(element.querySelector('[data-map-boundaries]'),
        { opacity: 0 }, { opacity: 1, duration: 1.4, ease: 'power1.out', clearProps: 'opacity' });
    });
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finish = () => { if (motion.matches) transition.current?.progress(1); };
    const restore = () => {
      transition.current?.revert();
      transition.current = null;
      element.setAttribute('viewBox', FULL_VIEW);
      opening.current = false;
      setSelected(null);
      setPointed(null);
    };
    motion.addEventListener('change', finish);
    window.addEventListener('pageshow', restore);
    return () => {
      media.revert();
      transition.current?.kill();
      motion.removeEventListener('change', finish);
      window.removeEventListener('pageshow', restore);
    };
  }, []);

  useEffect(() => {
    if (exploring) return;
    const available = geography.regions.flatMap(area => {
      const entry = entries.find(item => area.spotSlugs.includes(item.slug));
      return entry ? [entry] : [];
    });
    if (!available.length) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      let index = 0;
      let timer: ReturnType<typeof setTimeout>;
      const next = () => {
        setPreview(available[index++ % available.length]);
        timer = setTimeout(next, 4200);
      };
      timer = setTimeout(next, 2000);
      return () => { clearTimeout(timer); setPreview(null); };
    });
    return () => media.revert();
  }, [entries, exploring]);

  function stopPreview() {
    setExploring(true);
    setPreview(null);
  }

  function pointAt(entry: DiscoveryEntry) {
    if (opening.current) return;
    stopPreview();
    setPointed(entry);
    router.prefetch(entry.href);
  }

  function openDistrict(event: React.MouseEvent<HTMLAnchorElement>, entry: DiscoveryEntry) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const element = svg.current;
    const path = event.currentTarget.querySelector('path');
    if (!element || !path) return;
    event.preventDefault();
    if (opening.current) return;
    opening.current = true;
    setPointed(entry);
    setSelected(entry.slug);
    const go = () => router.push(entry.href);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { go(); return; }

    entrance.current?.progress(1);
    if (typeof document.startViewTransition === 'function') {
      transitionToDistrict(path, entry.slug, go);
      return;
    }
    const bounds = path.getBBox();
    const width = Math.max(bounds.width, bounds.height * 640 / 550) * 1.65;
    const height = width * 550 / 640;
    const camera = { x: 0, y: 0, width: 640, height: 550 };
    const others = Array.from(element.querySelectorAll('[data-map-area]'))
      .filter(area => area !== event.currentTarget);
    transition.current = gsap.timeline({ onComplete: go })
      .to(others, { opacity: 0.12, duration: 0.28, ease: 'power1.out' }, 0)
      .to(element.querySelectorAll('[data-map-silhouette], [data-map-boundaries]'),
        { opacity: 0, duration: 0.25 }, 0)
      .to(camera, {
        x: bounds.x + bounds.width / 2 - width / 2,
        y: bounds.y + bounds.height / 2 - height / 2,
        width, height, duration: 0.55, ease: 'power2.inOut',
        onUpdate: () => element.setAttribute('viewBox', `${camera.x} ${camera.y} ${camera.width} ${camera.height}`),
      }, 0);
  }

  return (
    <div className={styles.mapSection} data-map-opening={Boolean(selected)}>
      <nav aria-label={de ? 'Alle Bezirke' : 'All districts'} aria-describedby="discovery-announcement">
        <svg ref={svg} viewBox={FULL_VIEW} className={styles.geography} role="group"
          aria-label={de ? 'Berlin-Karte' : 'Map of Berlin'} data-map-view="overview"
          onPointerDown={stopPreview}
          onPointerLeave={() => { if (!opening.current) setPointed(null); }}
          onBlur={(event) => {
            if (!opening.current && !event.currentTarget.contains(event.relatedTarget as Node | null)) setPointed(null);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Escape' || !transition.current || !opening.current) return;
            transition.current.revert();
            transition.current = null;
            svg.current?.setAttribute('viewBox', FULL_VIEW);
            opening.current = false;
            setSelected(null);
          }}>
          <path d={geography.outline} className={styles.cityFill} fillRule="evenodd" data-map-silhouette />
          {geography.regions.map(area => {
            const entry = area.spotSlugs.map(slug => entriesBySlug.get(slug)).find(Boolean);
            const path = <path d={area.path} fillRule="evenodd" vectorEffect="non-scaling-stroke" />;
            if (!entry) return <g key={area.slug} className={styles.inertRegion}
              data-map-area={area.slug} aria-hidden="true">{path}</g>;
            return <Link key={area.slug} href={entry.href} prefetch={false}
              aria-label={entry.name} data-map-area={area.slug}
              data-preview={preview?.slug === entry.slug}
              data-highlighted={pointed?.slug === entry.slug} data-selected={selected === entry.slug}
              className={styles.region}
              onPointerEnter={() => pointAt(entry)} onFocus={() => pointAt(entry)}
              onClick={event => openDistrict(event, entry)}>{path}</Link>;
          })}
          <g className={styles.boundaries} data-map-boundaries aria-hidden="true">
            {geography.regions.map(area => <path key={area.slug} d={area.path}
              fillRule="evenodd" vectorEffect="non-scaling-stroke" />)}
          </g>
          <path d={geography.outline} className={styles.cityBoundary} fillRule="evenodd"
            vectorEffect="non-scaling-stroke" data-map-silhouette aria-hidden="true" />
        </svg>
      </nav>
      <p className={styles.mapHint} id="discovery-announcement" role="status" aria-live={preview ? 'off' : 'polite'}>
        {pointed ? <><span className={styles.districtName}>{pointed.name}</span>
          <span className={styles.hintAction}>{selected
            ? de ? 'Spots werden geöffnet …' : 'Opening spots …'
            : de ? 'Spots entdecken' : 'Discover spots'}</span></>
          : preview ? <><span className={styles.districtName}>{preview.name}</span>
            <span className={styles.hintAction}>{de ? 'Tippen zum Entdecken' : 'Tap to discover'}</span></>
          : <span>{de ? 'Tippe auf einen Bezirk.' : 'Tap a district on the map.'}</span>}
      </p>
    </div>
  );
}
