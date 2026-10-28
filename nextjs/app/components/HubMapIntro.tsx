'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Image from './SiteImage';
import MapIntentLink from './MapIntentLink';
import styles from './HubMapIntro.module.css';
import phoneStyles from './PhoneDisplay.module.css';
import PhoneDisplay from './PhoneDisplay';

const SCREEN_ORDER = [4, 1, 3, 2] as const;

export default function HubMapIntro({ locale }: { locale: 'de' | 'en' }) {
  const de = locale === 'de';
  const showcase = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number; index: number; dx: number; axis: 'x' | 'y' | null } | null>(null);
  const suppressClick = useRef(false);
  const activeRef = useRef(0);
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

  const showScreen = useCallback((index: number) => {
    const rail = track.current;
    if (!rail) return;
    activeRef.current = index;
    gsap.to(rail, { xPercent: -index * 25, x: 0, duration: reduced ? 0 : .35, ease: 'power3.out', overwrite: true });
    setActive(index);
  }, [reduced]);

  useEffect(() => {
    if (!visible || paused || interacting || reduced) return;
    const timer = window.setInterval(() => {
      showScreen((activeRef.current + 1) % SCREEN_ORDER.length);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [visible, paused, interacting, reduced, showScreen]);

  useEffect(() => {
    const rail = track.current;
    return () => { gsap.killTweensOf(rail); };
  }, []);

  const descriptions = de
    ? ['Bar Basta im Detail', 'Die Map mit Spots in Berlin', 'Must Eats und Infos zu Bar Basta', 'Die Spot-Liste mit Slice Society, Gazzo und Romeo’s Sandwiches']
    : ['Bar Basta in detail', 'The map with spots in Berlin', 'Must Eats and details for Bar Basta', 'The spot list with Slice Society, Gazzo and Romeo’s Sandwiches'];

  const screens = SCREEN_ORDER.map(id => ({ id, description: descriptions[id - 1] }));

  return (
    <section className={styles.section} data-hub-map-intro="" aria-labelledby="home-map-title">
      <div className={styles.header}>
        <h2 id="home-map-title" className={styles.title}>{de ? 'Wo wir' : 'Where we'}<br />{de ? 'essen gehen.' : 'eat.'}</h2>
        <div className={styles.copy}>
          <p>{de ? 'Entdecke Berlins beste Restaurants, Cafés und Bars, probiere ihre Must Eats und sammle sie in deinem Deck. Alles auf einer Map.' : 'Discover Berlin’s best restaurants, cafés and bars, try their Must Eats and collect them in your deck. All on one map.'}</p>
        </div>
        <div className={styles.desktopCta}><MapIntentLink href="/map" className="et-btn">{de ? 'Zur Map' : 'Explore the map'}</MapIntentLink></div>
      </div>
      <div ref={showcase} className={styles.showcase} onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
        <MapIntentLink
          href="/map"
          className={phoneStyles.phone}
          aria-label={de ? 'Food Map öffnen' : 'Open the food map'}
          onPointerDown={event => {
            if (event.pointerType !== 'touch') suppressClick.current = false;
          }}
          onTouchStart={event => {
            const touch = event.touches[0];
            touchStart.current = touch ? { x: touch.clientX, y: touch.clientY, index: activeRef.current, dx: 0, axis: null } : null;
            suppressClick.current = false;
            gsap.killTweensOf(track.current);
            setPaused(true);
          }}
          onTouchMove={event => {
            const start = touchStart.current;
            const touch = event.touches[0];
            if (!start || !touch) return;
            const dx = touch.clientX - start.x;
            const dy = touch.clientY - start.y;
            if (!start.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 10) {
              start.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
              suppressClick.current = true;
            }
            if (start.axis === 'x' && track.current) {
              start.dx = dx;
              const boundedDx = start.index === 0 ? Math.min(0, dx) : start.index === SCREEN_ORDER.length - 1 ? Math.max(0, dx) : dx;
              gsap.set(track.current, { xPercent: -start.index * 25, x: boundedDx });
            }
          }}
          onTouchEnd={() => {
            const gesture = touchStart.current;
            const rail = track.current;
            touchStart.current = null;
            if (!rail || !gesture) return;
            if (gesture.axis !== 'x') { showScreen(gesture.index); return; }
            const width = rail.clientWidth / SCREEN_ORDER.length;
            const direction = Math.abs(gesture.dx) > Math.max(24, width * .15) ? -Math.sign(gesture.dx) : 0;
            showScreen(Math.max(0, Math.min(SCREEN_ORDER.length - 1, gesture.index + direction)));
          }}
          onTouchCancel={() => {
            touchStart.current = null;
            suppressClick.current = true;
            showScreen(activeRef.current);
          }}
          onClickCapture={event => {
            if (!suppressClick.current || event.detail === 0) return;
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <PhoneDisplay>
            <div className={styles.viewport}>
              <div ref={track} className={styles.track}>
                {screens.map(({ id, description }, index) => (
                  <div key={description} className={styles.slide} aria-hidden={index !== active}>
                    <Image src={`/pics/home-map/iphone-screen-${id}.webp`} alt={description} width={440} height={894} unoptimized loading={visible ? 'eager' : 'lazy'} sizes="(max-width: 411px) 68vw, (max-width: 767px) 280px, 360px" className={styles.screen} />
                  </div>
                ))}
              </div>
            </div>
          </PhoneDisplay>
        </MapIntentLink>
        <div className={styles.controls} role="group" aria-label={de ? 'Screens auswählen' : 'Choose a screen'}>
          {screens.map(({ description }, index) => <button key={description} type="button" className={styles.dot} aria-label={description} aria-pressed={active === index} onClick={() => { showScreen(index); setPaused(true); }} />)}
          {!reduced && <button type="button" className={styles.pause} aria-label={paused ? (de ? 'Automatischen Wechsel starten' : 'Start slideshow') : (de ? 'Automatischen Wechsel pausieren' : 'Pause slideshow')} onClick={() => setPaused(value => !value)}>{paused ? '▶' : 'Ⅱ'}</button>}
        </div>
        <div className={styles.cta}><MapIntentLink href="/map" className="et-btn">{de ? 'Zur Map' : 'Explore the map'}</MapIntentLink></div>
      </div>
    </section>
  );
}
