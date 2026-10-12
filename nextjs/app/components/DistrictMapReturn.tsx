'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Link, useRouter } from '@/i18n/navigation';
import geography from '@/lib/berlin-discovery-map.json';
import styles from './DistrictMapReturn.module.css';
import { transitionToDistrictMap } from '@/lib/districtMapTransition';

export default function DistrictMapReturn({ locale }: { locale: 'de' | 'en' }) {
  const router = useRouter();
  const navigating = useRef(false);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      let tween: gsap.core.Tween | undefined;
      const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        tween = gsap.fromTo(element.querySelector('[data-return-outline]'),
          { strokeDasharray: 1, strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 1.6, ease: 'power2.out', clearProps: 'strokeDasharray,strokeDashoffset' });
      }, { threshold: .25 });
      observer.observe(element);
      return () => { observer.disconnect(); tween?.revert(); };
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
      <svg data-map-view="return" viewBox="0 0 640 550" aria-hidden="true" style={{ viewTransitionName: 'berlin-map' }}>
        <path className={styles.silhouette} d={geography.outline} pathLength="1" data-return-outline />
        <g className={styles.boundaries}>
          {geography.regions.map(area => <path key={area.slug} d={area.path} />)}
        </g>
      </svg>
      <span className={styles.title}>{locale === 'de' ? 'Entdecke die anderen Bezirke' : 'Explore the other districts'}</span>
    </Link>
  </nav>;
}
