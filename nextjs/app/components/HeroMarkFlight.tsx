'use client';

import { useEffect } from 'react';
import { flightKeyframes, flightTransform, type FlightGeo } from '@/lib/home/heroMarkFlight';
import styles from './HeroMarkFlight.module.css';

/**
 * Die Wortmarke fliegt beim Scrollen aus dem Aufmacher in den Header.
 *
 * Warum überhaupt: der Header trägt dieselbe Wortmarke wie der Aufmacher. Zwei
 * gleiche Formen übereinander lesen sich als Fehler. Statt eine davon zu
 * streichen, gibt es sie nur einmal — sie wandert beim Scrollen von unten nach
 * oben und wird dabei auf Headergröße klein.
 *
 * Auf jeder Breite. Bis 767px scrollt das Fenster, darüber `.app-pages` —
 * beides läuft hier über denselben Weg, der Container wird gesucht statt
 * angenommen. Auf Desktop stand die Marke sonst gross im Aufmacher, während
 * der Header dieselbe Form noch einmal trug: zwei gleiche Zeichen auf einem
 * Bildschirm (Ansage 03.09.2026).
 *
 * Die Strecke ist bewusst ein fester Scrollweg und nicht der geometrische
 * Abstand: der ist auf dem Telefon rund 80px kurz, und eine Bewegung, die nach
 * 80px Scrollen vorbei ist, sieht aus wie ein Ruckeln statt wie ein Flug. Auf
 * Desktop ist die Marke gut doppelt so gross und braucht entsprechend mehr
 * Weg, sonst ist der Flug vorbei, bevor das Auge ihn aufnimmt. Der Landepunkt
 * bleibt exakt der Logoplatz des Headers.
 *
 * Zwei Antriebe, eine Bahn (`lib/home/heroMarkFlight.ts`). Wo das Fenster
 * scrollt und der Browser Scroll-Timelines kann, fliegt die Marke als native
 * `animation-timeline: scroll()` — die läuft seit Safari 26.4 im selben
 * Prozess wie das Scrollen. Der JS-Weg hat auf dem iPhone sichtbar geruckelt
 * (19.09.2026): iOS scrollt ausserhalb des Hauptthreads, `scroll`-Ereignis
 * und rAF kommen ein bis zwei Frames später und nur mit 60 Hz an, während die
 * Seite mit 120 Hz läuft. Ein fixiertes Element, das per JS so tun soll, als
 * scrolle es mit der Seite, zittert deshalb gegen die Headline daneben — am
 * stärksten am Anfang des Flugs, wo es der Seite noch fast 1:1 folgen muss.
 * JS bleibt für `.app-pages` (Desktop) und für Browser ohne Scroll-Timeline.
 */
const TRAVEL_MOBILE = 240;
const TRAVEL_DESKTOP = 420;

/* Der Header verschwindet erst deutlich hinter der Landung — vorher wäre die
   Marke gerade angekommen und würde im selben Moment mit weggeschoben. */
const NAV_HOLD_EXTRA = 360;

/* CSS-Module vergeben eigene Keyframe-Namen; die Regel hier entsteht aber zur
   Laufzeit aus den gemessenen Koordinaten und braucht einen festen. */
const KEYFRAMES_NAME = 'et-hero-mark-flight';

export default function HeroMarkFlight() {
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* Ab 768px scrollt nicht das Fenster, sondern `.app-pages` (globals.css,
       Desktop app frame). Der Container wird gesucht statt angenommen: auf dem
       Telefon steht er im Fluss und scrollt gar nicht, dann bleibt das
       Fenster. */
    const scroller = (): HTMLElement | null => {
      const el = document.querySelector<HTMLElement>('.app-pages');
      return el && el.scrollHeight > el.clientHeight + 1 ? el : null;
    };
    const scrollTop = () => {
      const el = scroller();
      return el ? el.scrollTop : window.scrollY;
    };
    const travel = () => (mobile.matches ? TRAVEL_MOBILE : TRAVEL_DESKTOP);

    let flyer: HTMLImageElement | null = null;
    let keyframes: HTMLStyleElement | null = null;
    let ticking = false;
    /** Fliegt die Marke über die native Scroll-Timeline statt aus JS? */
    let native = false;
    /** Ist die Marke im Header angekommen? Dann übernimmt dort das echte Bild.
        `null` heisst: noch nie geschrieben — der erste `draw` setzt in jedem
        Fall. */
    let landed: boolean | null = null;
    /** Steht die Seite ganz oben? Dann zeigt der Aufmacher sein Original. */
    let resting: boolean | null = null;
    let geo: FlightGeo | null = null;

    const heroMark = () => document.querySelector<HTMLImageElement>('[data-hero-mark]');
    const navLogo = () => document.querySelector<HTMLElement>('[data-nav-logo]');

    /** Alles zurück auf Anfang: Marke im Aufmacher, Logo im Header, kein Flieger. */
    const teardown = () => {
      flyer?.remove();
      flyer = null;
      keyframes?.remove();
      keyframes = null;
      geo = null;
      native = false;
      landed = null;
      resting = null;
      document.documentElement.removeAttribute('data-hero-flight');
      document.documentElement.removeAttribute('data-hero-rest');
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
        startY: m.top + scrollTop(),
        endX: n.left,
        endY: n.top, // Der Header ist fixed — das ist bereits Viewport-Koordinate.
        startW: m.width,
        scale: n.width / m.width,
      };
    };

    /** Schreibt die Bahn: nativ als Keyframes, sonst für die aktuelle Position. */
    const place = (y: number) => {
      if (!geo || !flyer) return;
      if (native) {
        if (!keyframes) {
          keyframes = document.createElement('style');
          document.head.appendChild(keyframes);
        }
        // Nur bei neuer Geometrie anfassen: iOS feuert `resize`, wenn die
        // Safari-Leiste einklappt — mitten im Flug und ohne dass sich an der
        // Bahn etwas ändert.
        const css = `@keyframes ${KEYFRAMES_NAME}{${flightKeyframes(geo, travel())}}`;
        if (keyframes.textContent !== css) keyframes.textContent = css;
        return;
      }
      flyer.style.transform = flightTransform(geo, Math.min(1, y / travel()), travel());
    };

    const draw = () => {
      ticking = false;
      if (!geo || !flyer) return;

      const y = Math.max(0, scrollTop());
      const p = Math.min(1, y / travel());

      if (!native) place(y);

      // Ganz oben steht das Original im Aufmacher, nicht der Flieger: zieht
      // jemand die Seite über den Anschlag, federt es mit ihr — der fixierte
      // Flieger bliebe stehen, während die Headline darunter wegrutscht.
      //
      // Ankunft: ab hier übernimmt wieder das eingebaute Header-Bild, und der
      // Flieger tritt ab. Sonst bliebe er als `position: fixed`-Element am body
      // im Logoplatz kleben, während der Header beim Weiterscrollen nach oben
      // wegklappt — die Marke stünde dann allein über der Seite. Beide zeigen
      // dieselbe Datei in derselben gemessenen Größe an derselben Stelle, der
      // Tausch ist also nicht zu sehen. Scrollt jemand wieder hoch, geht der
      // Platz genauso zurück an den Flieger.
      if (p <= 0 !== resting || p >= 1 !== landed) {
        resting = p <= 0;
        landed = p >= 1;
        flyer.style.visibility = resting || landed ? 'hidden' : '';
        document.documentElement.toggleAttribute('data-hero-rest', resting);
        document.documentElement.toggleAttribute('data-hero-landed', landed);
      }

      // Der Header darf erst danach wegklappen. SiteNav liest das Attribut.
      document.documentElement.toggleAttribute('data-nav-hold', y <= travel() + NAV_HOLD_EXTRA);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(draw);
    };

    const setup = () => {
      teardown();
      if (calm.matches) return;

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
      flyer.style.width = `${geo.startW}px`;

      // Nativ nur, wo das Fenster scrollt: der Flieger hängt am body und
      // erreicht `.app-pages` mit `scroll()` nicht.
      // Beide Eigenschaften prüfen: griffe die Timeline, der Bereich aber nicht,
      // flöge die Marke über die ganze Seitenlänge statt über den Scrollweg.
      native =
        !scroller() &&
        CSS.supports('animation-timeline: scroll()') &&
        CSS.supports('animation-range: 0px 1px');
      if (native) {
        place(0);
        // Die Kurzform setzt `animation-timeline` zurück — sie muss zuerst.
        flyer.style.animation = `${KEYFRAMES_NAME} linear both`;
        flyer.style.setProperty('animation-timeline', 'scroll(root block)');
        flyer.style.setProperty('animation-range', `0px ${travel()}px`);
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
      if (geo) flyer.style.width = `${geo.startW}px`;
      place(Math.max(0, scrollTop()));
      draw();
    };

    start();
    /* Beide Quellen: welche von beiden wirklich scrollt, entscheidet die
       Breite — und sie kann sich waehrend der Sitzung aendern. */
    window.addEventListener('scroll', onScroll, { passive: true });
    const container = document.querySelector<HTMLElement>('.app-pages');
    container?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', remeasure);
    window.addEventListener('orientationchange', remeasure);
    mobile.addEventListener('change', setup);
    calm.addEventListener('change', setup);

    return () => {
      window.removeEventListener('scroll', onScroll);
      container?.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('orientationchange', remeasure);
      mobile.removeEventListener('change', setup);
      calm.removeEventListener('change', setup);
      teardown();
    };
  }, []);

  return null;
}
