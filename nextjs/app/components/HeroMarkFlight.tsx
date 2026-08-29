'use client';

import { useEffect } from 'react';
import styles from './HeroMarkFlight.module.css';

/**
 * Die Wortmarke fliegt beim Scrollen aus dem Aufmacher in den Header.
 *
 * Warum überhaupt: der Header trägt dieselbe Wortmarke wie der Aufmacher. Zwei
 * gleiche Formen übereinander lesen sich als Fehler. Statt eine davon zu
 * streichen, gibt es sie nur einmal — sie wandert beim Scrollen von unten nach
 * oben und wird dabei auf Headergröße klein.
 *
 * Nur unter 768px. Darüber scrollt `.app-pages` statt des Fensters, der
 * Aufmacher füllt den Bildschirm und die Marke steht groß im Gelb; dort gibt
 * es nichts zu transportieren.
 *
 * Die Strecke ist bewusst ein fester Scrollweg und nicht der geometrische
 * Abstand: der ist auf dem Telefon rund 80px kurz, und eine Bewegung, die nach
 * 80px Scrollen vorbei ist, sieht aus wie ein Ruckeln statt wie ein Flug. Der
 * Landepunkt bleibt exakt der Logoplatz des Headers.
 */
const TRAVEL = 240;

/* Der Header verschwindet erst deutlich hinter der Landung — vorher wäre die
   Marke gerade angekommen und würde im selben Moment mit weggeschoben. */
const NAV_HOLD = TRAVEL + 360;

/* Sanft an beiden Enden. easeOutCubic war zu kopflastig: bei halbem Scrollweg
   stand die Marke schon zu 87 % oben und der Rest der Strecke passierte
   sichtbar nichts mehr. */
function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function HeroMarkFlight() {
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

    let flyer: HTMLImageElement | null = null;
    let ticking = false;
    /** Ist die Marke im Header angekommen? Dann übernimmt dort das echte Bild. */
    let landed = false;
    let geo: {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      startW: number;
      scale: number;
    } | null = null;

    const heroMark = () => document.querySelector<HTMLImageElement>('[data-hero-mark]');
    const navLogo = () => document.querySelector<HTMLElement>('[data-nav-logo]');

    /** Alles zurück auf Anfang: Marke im Aufmacher, Logo im Header, kein Flieger. */
    const teardown = () => {
      flyer?.remove();
      flyer = null;
      geo = null;
      landed = false;
      document.documentElement.removeAttribute('data-hero-flight');
      document.documentElement.removeAttribute('data-hero-landed');
      document.documentElement.removeAttribute('data-nav-hold');
    };

    const measure = () => {
      const mark = heroMark();
      const logo = navLogo();
      if (!mark || !logo || !flyer) return null;

      // Ziel ist das Bild im Header, nicht sein Link: der Link kann Polster
      // tragen und wäre damit breiter als das, worauf die Marke landen soll.
      // Beide Elemente sind `visibility: hidden` — das behält die Maße, die
      // Messung stimmt also, ohne dass etwas kurz aufblitzt.
      const target = logo.querySelector('img') ?? logo;
      const m = mark.getBoundingClientRect();
      const n = target.getBoundingClientRect();

      if (!m.width || !n.width) return null;

      return {
        startX: m.left,
        startY: m.top + window.scrollY,
        endX: n.left,
        endY: n.top, // Der Header ist fixed — das ist bereits Viewport-Koordinate.
        startW: m.width,
        scale: n.width / m.width,
      };
    };

    const draw = () => {
      ticking = false;
      if (!geo || !flyer) return;

      const y = Math.max(0, window.scrollY);
      const p = Math.min(1, y / TRAVEL);
      const e = ease(p);

      // Blendet von „scrollt mit der Seite" nach „klebt im Header".
      const liveY = geo.startY - y;
      const x = geo.startX + (geo.endX - geo.startX) * e;
      const ty = liveY + (geo.endY - liveY) * e;
      const s = 1 + (geo.scale - 1) * e;

      flyer.style.width = `${geo.startW}px`;
      flyer.style.transform = `translate3d(${x}px, ${ty}px, 0) scale(${s})`;

      // Ankunft: ab hier übernimmt wieder das eingebaute Header-Bild, und der
      // Flieger tritt ab. Sonst bliebe er als `position: fixed`-Element am body
      // im Logoplatz kleben, während der Header beim Weiterscrollen nach oben
      // wegklappt — die Marke stünde dann allein über der Seite. Beide zeigen
      // dieselbe Datei in derselben gemessenen Größe an derselben Stelle, der
      // Tausch ist im selben Frame also nicht zu sehen. Scrollt jemand wieder
      // hoch, geht der Platz genauso zurück an den Flieger.
      if (p >= 1 !== landed) {
        landed = p >= 1;
        flyer.style.visibility = landed ? 'hidden' : '';
        if (landed) document.documentElement.setAttribute('data-hero-landed', 'on');
        else document.documentElement.removeAttribute('data-hero-landed');
      }

      // Der Header darf erst danach wegklappen. SiteNav liest das Attribut.
      if (y > NAV_HOLD) {
        document.documentElement.removeAttribute('data-nav-hold');
      } else {
        document.documentElement.setAttribute('data-nav-hold', 'on');
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(draw);
    };

    const setup = () => {
      teardown();
      if (!mobile.matches || calm.matches) return;

      const mark = heroMark();
      if (!mark) return;

      flyer = mark.cloneNode(true) as HTMLImageElement;
      flyer.removeAttribute('data-hero-mark');
      flyer.className = styles.flyer;
      document.body.appendChild(flyer);

      // Erst messen, solange beide noch normal im Layout stehen, dann den
      // Platz übernehmen. Andersherum misst man das eigene Versteck.
      geo = measure();
      if (!geo) {
        teardown();
        return;
      }
      // Das Original tritt zurück, sobald das Attribut steht — die Regel dazu
      // steht in HubSection.module.css. Bewusst nicht über eine Klasse an
      // diesem Element: HubHeroCopy rendert neu, wenn `useAuth` fertig ist,
      // und React schreibt `className` dabei frisch.
      document.documentElement.setAttribute('data-hero-flight', 'on');
      draw();
    };

    /* Erst wenn das Logo wirklich geladen ist, stimmt seine gemessene Breite —
       vorher ist sie 0 und der Flieger landet auf der falschen Größe. */
    const start = () => {
      const mark = heroMark();
      if (mark && !mark.complete) {
        mark.addEventListener('load', setup, { once: true });
        return;
      }
      setup();
    };

    const remeasure = () => {
      if (!flyer) return;
      geo = measure();
      draw();
    };

    start();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', remeasure);
    window.addEventListener('orientationchange', remeasure);
    mobile.addEventListener('change', setup);
    calm.addEventListener('change', setup);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('orientationchange', remeasure);
      mobile.removeEventListener('change', setup);
      calm.removeEventListener('change', setup);
      teardown();
    };
  }, []);

  return null;
}
