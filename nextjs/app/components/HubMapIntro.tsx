'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Image from './SiteImage';
import MapIntentLink from './MapIntentLink';
import styles from './HubMapIntro.module.css';

export default function HubMapIntro({ locale }: { locale: 'de' | 'en' }) {
  const de = locale === 'de';
  const showcase = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(preference.matches);
    update();
    preference.addEventListener('change', update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .35 });
    if (showcase.current) observer.observe(showcase.current);
    return () => { observer.disconnect(); preference.removeEventListener('change', update); };
  }, []);

  useEffect(() => {
    if (!visible || paused || interacting || reduced) return;
    const timer = window.setInterval(() => setActive(index => (index + 1) % 4), 2500);
    return () => window.clearInterval(timer);
  }, [visible, paused, interacting, reduced]);

  useEffect(() => {
    const tween = gsap.to(track.current, { xPercent: -active * 25, duration: reduced ? 0 : .45, ease: 'power3.inOut', overwrite: true });
    return () => { tween.kill(); };
  }, [active, reduced]);

  const descriptions = de
    ? ['Die Map mit Spots in Berlin', 'Bar Basta im Detail', 'Must Eats und Infos zu Bar Basta', 'Slice Society und Rram in der Spot-Liste']
    : ['The map with spots in Berlin', 'Bar Basta in detail', 'Must Eats and details for Bar Basta', 'Slice Society and Rram in the spot list'];

  return (
    <section className={styles.section} data-hub-map-intro="" aria-labelledby="home-map-title">
      <div className={styles.header}>
        <h2 id="home-map-title" className={styles.title}>{de ? 'Wo wir' : 'Where we'}<br />{de ? 'essen gehen.' : 'eat.'}</h2>
        <div className={styles.copy}>
          <p>{de ? 'Auf dieser Map stehen die Läden, die wir dir empfehlen. Vom schnellen Slice bis zum langen Abendessen.' : 'These are the places we recommend. From a quick slice to a long dinner.'}</p>
        </div>
        <div className={styles.desktopCta}><MapIntentLink href="/map" className="et-btn">{de ? 'Zur Map' : 'Explore the map'}</MapIntentLink></div>
      </div>
      <div ref={showcase} className={styles.showcase} onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
        <MapIntentLink href="/map" className={styles.phone} aria-label={de ? 'Food Map öffnen' : 'Open the food map'}>
          <div className={styles.display}>
            <div className={styles.status} aria-hidden="true"><span>9:41</span><i /><svg className={styles.statusIcons} viewBox="0 0 64 14" fill="currentColor"><rect x="1" y="8" width="3" height="5" rx=".8"/><rect x="6" y="6" width="3" height="7" rx=".8"/><rect x="11" y="3" width="3" height="10" rx=".8"/><rect x="16" y="0" width="3" height="13" rx=".8"/><path d="M23 4a11 11 0 0 1 16 0l-2 2a8 8 0 0 0-12 0zm3 4a7 7 0 0 1 10 0l-2 2a4 4 0 0 0-6 0zm3 3a3 3 0 0 1 4 0l-2 2z"/><rect x="43" y="1" width="18" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="1"/><rect x="45" y="3" width="14" height="7" rx="1.5"/><path d="M63 4v5" stroke="currentColor" strokeWidth="2"/></svg></div>
            <div className={styles.viewport}>
              <div ref={track} className={styles.track}>
                {descriptions.map((description, index) => (
                  <div key={description} className={styles.slide} aria-hidden={index !== active}>
                    <Image src={`/pics/home-map/screen-${index + 1}.webp`} alt={description} width={660} height={1434} unoptimized loading={visible ? 'eager' : 'lazy'} sizes="(max-width: 411px) 68vw, (max-width: 767px) 280px, 360px" className={styles.screen} />
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.homeBar} aria-hidden="true" />
          </div>
        </MapIntentLink>
        <div className={styles.controls} role="group" aria-label={de ? 'Screens auswählen' : 'Choose a screen'}>
          {descriptions.map((description, index) => <button key={description} type="button" className={styles.dot} aria-label={description} aria-pressed={active === index} onClick={() => { setActive(index); setPaused(true); }} />)}
          {!reduced && <button type="button" className={styles.pause} aria-label={paused ? (de ? 'Automatischen Wechsel starten' : 'Start slideshow') : (de ? 'Automatischen Wechsel pausieren' : 'Pause slideshow')} onClick={() => setPaused(value => !value)}>{paused ? '▶' : 'Ⅱ'}</button>}
        </div>
        <div className={styles.cta}><MapIntentLink href="/map" className="et-btn">{de ? 'Zur Map' : 'Explore the map'}</MapIntentLink></div>
      </div>
    </section>
  );
}
