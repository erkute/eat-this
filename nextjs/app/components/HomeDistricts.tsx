'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { DISTRICT_PATHS } from '@/lib/home/districtPaths';
import MapIntentLink from './MapIntentLink';
import styles from './HomeDistricts.module.css';

const districts = [['mitte','Mitte'], ['kreuzberg','Kreuzberg'], ['neukoelln','Neukölln'], ['wedding','Wedding'], ['schoeneberg','Schöneberg'], ['prenzlauer-berg','Prenzlauer Berg'], ['charlottenburg','Charlottenburg'], ['friedrichshain','Friedrichshain']];
/** So lange bleibt ein Bezirk markiert, bevor die Markierung weiterzieht. */
const STEP_MS = 2200;

/**
 * Die Bezirke der Startseite. Auf der Karte wandert die rote Fläche
 * fortlaufend von Bezirk zu Bezirk der Liste, der Name daneben wird mit rot
 * (Ansage 21.10.2026: „hier sollte fortlaufend was passieren"). Zeigt jemand
 * auf einen Namen, hält sie dort an. Ausser Sicht und mit reduzierter
 * Bewegung steht sie still auf Mitte.
 */
export default function HomeDistricts({ locale }: { locale: 'de' | 'en' }) {
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || held !== null) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer = 0;
    const run = (on: boolean) => {
      window.clearInterval(timer);
      timer = on ? window.setInterval(() => setActive((index) => (index + 1) % districts.length), STEP_MS) : 0;
    };
    const io = new IntersectionObserver(([entry]) => run(entry.isIntersecting));
    io.observe(section);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
    };
  }, [held]);

  const shown = held ?? active;
  const hold = (index: number) => ({
    onPointerEnter: () => setHeld(index),
    onPointerLeave: () => { setActive(index); setHeld(null); },
    onFocus: () => setHeld(index),
    onBlur: () => { setActive(index); setHeld(null); },
  });
  const link = ([slug, name]: string[], index: number) => (
    <Link key={slug} href={`/bezirk/${slug}`} data-active={index === shown || undefined} {...hold(index)}>{name}</Link>
  );

  return (
    <section ref={sectionRef} className={styles.section} data-hub-districts="" aria-label={locale === 'de' ? 'Berlin entdecken' : 'Explore Berlin'}>
      <div className={styles.map} data-districts-map="">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pics/home/berlin.svg?v=2" width={640} height={550} alt={locale === 'de' ? 'Die Berliner Bezirke' : 'Berlin districts'} loading="lazy" />
        <svg className={styles.marks} viewBox="0 0 640 550" preserveAspectRatio="none" aria-hidden="true">
          {districts.map(([slug], index) => (
            <path key={slug} d={DISTRICT_PATHS[slug]} fillRule="evenodd" data-active={index === shown || undefined} />
          ))}
        </svg>
      </div>
      <div className={styles.content}>
        <div className={styles.large} data-districts-large="">{districts.slice(0,4).map(link)}</div>
        <div className={styles.small} data-districts-small="">{districts.slice(4).map((district, index) => link(district, index + 4))}</div>
        <MapIntentLink href="/map" className="hv-btn">{locale === 'de' ? 'Map entdecken' : 'Explore the map'}</MapIntentLink>
      </div>
    </section>
  );
}
