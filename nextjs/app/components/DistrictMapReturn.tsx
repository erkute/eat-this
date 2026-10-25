'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Link, useRouter } from '@/i18n/navigation';
import geography from '@/lib/berlin-discovery-map.json';
import styles from './DistrictMapReturn.module.css';
import { transitionToDistrictMap } from '@/lib/districtMapTransition';

export default function DistrictMapReturn({ locale }: { locale: 'de' | 'en' }) {
  const router = useRouter();
  const navigating = useRef(false);
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      let tween: gsap.core.Tween | undefined;
      let timer = 0;
      const observer = new IntersectionObserver(entries => {
        window.clearInterval(timer);
        if (!entries.some(entry => entry.isIntersecting)) return;
        timer = window.setInterval(() => setActive(index => (index + 1) % geography.regions.length), 2200);
        if (!tween) tween = gsap.fromTo(element.querySelector('[data-return-outline]'),
          { strokeDasharray: 1, strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 1.6, ease: 'power2.out', clearProps: 'strokeDasharray,strokeDashoffset' });
      }, { threshold: .25 });
      observer.observe(element);
      return () => { observer.disconnect(); window.clearInterval(timer); tween?.revert(); };
    });
    const restore = () => { navigating.current = false; };
    window.addEventListener('pageshow', restore);
    return () => { media.revert(); window.removeEventListener('pageshow', restore); };
  }, []);
  function openMap(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    event.preventDefault();
    if (navigating.current) return;
    navigating.current = true;
    router.prefetch('/bezirk');
    transitionToDistrictMap(() => router.push('/bezirk'));
  }
  return <nav ref={root} className={styles.return} aria-label={locale === 'de' ? 'Zur Berlin-Karte' : 'Back to the Berlin map'}>
    <Link href="/bezirk" className={styles.link} onClick={openMap}>
      <svg data-map-view="return" viewBox="0 0 640 550" aria-hidden="true">
        <path className={styles.silhouette} d={geography.outline} pathLength="1" data-return-outline />
        <g className={styles.boundaries}>
          {geography.regions.map((area, index) => <path key={area.slug} d={area.path} data-active={index === active || undefined} />)}
        </g>
      </svg>
      <span className={styles.title}>{locale === 'de' ? 'Zur Bezirksübersicht' : 'View all districts'}</span>
    </Link>
  </nav>;
}
