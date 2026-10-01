'use client';

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { appScroller } from '@/lib/dom/appScroller';
import { scrollProgress } from '@/lib/dom/scrollProgress';

/* Bewusst ohne ScrollTrigger: das Plugin hält ab dem Registrieren eine
   leere requestAnimationFrame-Schleife am Laufen, für die ganze Sitzung und
   auf jeder Seite. Damit rechnet der Hauptthread jedes Frame mit, und selbst
   reine Compositor-Animationen (Laufband, schwebende Telefone) kosteten
   Stil-Neuberechnungen — gemessen 60/s im Leerlauf, am gedrosselten Telefon
   rund ein Viertel der Hauptthread-Zeit (Review 29.09.2026). Ausgelöst wird
   hier per IntersectionObserver, was am Scrollweg hängt, über einen passiven
   Scroll-Listener. */
gsap.registerPlugin(useGSAP);

/**
 * Bewegung auf der Startseite. Alles nur ohne `prefers-reduced-motion` und nie
 * als Opacity-Fade (Hausregel für Brand-Flächen). Kein Text, der sich
 * Buchstabe für Buchstabe oder Zeile für Zeile aufbaut, keine Fotos, die aus
 * Masken ausfahren (Ansage 28.09.2026) — Dinge bewegen sich als Ganzes.
 *
 * 1. **Auftritt beim Laden** (Aufmacher). Bewusst CSS, nicht GSAP: er muss ab
 *    dem ersten Paint laufen, nicht erst nach der Hydrierung (Begründung in
 *    HeroCurtain.module.css). Hier nur das Aufräumen, siehe `finishIntro`.
 *
 * 2. **Am Scrollweg** — und damit umkehrbar — hängen der Spot
 *    des Tages und die Quadrate vor den
 *    Titeln. Das sind Scroll-Timelines des Browsers in den CSS-Modulen,
 *    kein JS: sie laufen im Takt des Scrollens, auch auf dem iPhone, wo
 *    Scroll-JS ein bis zwei Frames hinterherzittert (siehe HeroMarkFlight).
 *    Nur wo der Browser keine Scroll-Timeline kann, treibt `armScrubFallback`
 *    dieselben Werte per Scroll-Listener (`data-scrub`).
 *    Die räumlichen Galerien (Nearby, Magazin, Must Eats) steuert jeweils
 *    HomeGallery: vertikale Scrollstrecke mit nativer Timeline und GSAP-Fallback.
 *
 * 3. **Beim Hereinkommen:**
 *    - `data-reveal="stagger"` (Kategorien): Kacheln rücken gestaffelt nach,
 *      als ganze Kacheln — einmal.
 *    - Frag Remy: das Fragezeichen fliegt von links ein, „Frag Remy." schlägt
 *      ein, Remy schießt von unten hoch und redet, mehrmals. Wer den
 *      Abschnitt verlässt, sieht alles rückwärts gehen; wer zurückkommt, sieht
 *      es neu (`armFragRemy`).
 *    - Knöpfe werden gedrückt, jedes Mal, wenn ihre Section ins Bild kommt
 *      (`data-in-view`, CSS in HubSection.module.css; `armInView`).
 *    - Starter Pack: in das Adressfeld tippt sich eine Adresse, „Anmelden"
 *      wird gedrückt, das Feld leert sich — in Schleife, solange die Tafel im
 *      Bild ist (`armSignupDemo`).
 *    - FAQ: Antworten klappen auf wie eine Klappe; die erste von selbst und
 *      beim Hochscrollen wieder zu, bis jemand selbst klickt (`armFaq`).
 *
 * 4. **Immer:** Remy redet, solange gescrollt wird — der große im Frag-Remy-
 *    Abschnitt und der schwebende unten rechts (`armScrollTalk`).
 *
 * 5. **Nur ab 768px:** die Telefone driften beim Herausscrollen auseinander;
 *    mit echtem Zeiger kippen sie zur Maus, der Knopf zieht magnetisch.
 */

/**
 * Der Schiebe-Auftritt selbst ist CSS (HeroCurtain.module.css) und läuft ab dem
 * ersten Paint. Das Tempo bleibt auch beim Scrollen konstant. Am Ende fällt `data-hero-intro`, damit nichts dauerhaft an den
 * Auftrittsregeln hängt.
 */
function finishIntro(): (() => void) | void {
  const html = document.documentElement;
  if (!html.hasAttribute('data-hero-intro')) return;
  const hero = document.querySelector<HTMLElement>('[data-hub-hero]');
  const running = hero?.querySelector('[data-hero-curtain]')?.getAnimations() ?? [];
  const done = () => {
    html.removeAttribute('data-hero-intro');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    hero?.querySelectorAll<HTMLElement>('h1').forEach((headline) => {
      const lines = Array.from(headline.querySelectorAll<HTMLElement>('span')).filter(
        (line) => !line.children.length && line.getBoundingClientRect().height > 0
      );
      lines.forEach((line, index) => {
        line.animate(
          [
            {
              transform: 'scale(2.8) translateZ(0) rotate(-5deg)',
              visibility: 'hidden',
              offset: 0,
            },
            {
              transform: 'scale(2.8) translateZ(0) rotate(-5deg)',
              visibility: 'visible',
              offset: 0.01,
            },
            {
              transform: 'scale(.97) translateZ(0) rotate(.6deg)',
              visibility: 'visible',
              offset: 0.75,
            },
            { transform: 'scale(1) translateZ(0) rotate(0deg)', visibility: 'visible' },
          ],
          {
            duration: 900,
            delay: 450 + index * 650,
            fill: 'backwards',
            easing: 'cubic-bezier(.16,1,.3,1)',
          }
        );
      });
    });
  };
  if (!running.length) {
    done();
    return;
  }
  let cancelled = false;
  Promise.all(running.map((a) => a.finished))
    .then(() => !cancelled && done())
    // Abgebrochen (Attribut schon weg, Seite verlassen) — nichts mehr zu tun.
    .catch(() => {});

  return () => {
    cancelled = true;
  };
}

/** GSAP setzt beim Animieren von `transform` die CSS-Eigenschaften
 *  `translate/rotate/scale` inline auf `none` — am Ende alles wieder frei
 *  geben, sonst bleiben Druckzustände (`--et-press-tile`) tot. */
const CLEAR_TRANSFORMS = 'transform,translate,rotate,scale';

/** Scrollt der Container seitwärts? Dann rücken die Karten von rechts nach. */
function sideways(el: Element): boolean {
  return /auto|scroll/.test(getComputedStyle(el).overflowX);
}

/** Beobachtet Elemente und spielt ihren Auftritt einmal, sobald sie ein Stück
 *  im Bild sind — nicht schon unter der Bildschirmkante, wo ihn niemand sieht.
 *  Beobachtet werden nur ruhende Elemente: IntersectionObserver misst die
 *  verschobene Box, ein seitlich weggeschobenes Element meldete sich nie. */
function onceInView(plays: Map<Element, () => void>): () => void {
  if (!plays.size || typeof IntersectionObserver === 'undefined') return () => {};
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        plays.get(entry.target)?.();
        plays.delete(entry.target);
      }
    },
    { rootMargin: '0px 0px -15% 0px' }
  );
  plays.forEach((_, el) => io.observe(el));
  return () => io.disconnect();
}

/** Auftritt und Rückweg an einer Section: `enter`, sobald sie das Band des
 *  Bildschirms berührt (Vorgabe 30–70 % der Höhe, `from` verschiebt die
 *  Unterkante), `leave`, sobald sie es nach oben oder unten verlässt — in
 *  beide Richtungen, beliebig oft. */
function whileCentered(el: Element, enter: () => void, leave: () => void, from = 0.7): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  let inside = false;
  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting === inside) return;
      inside = entry.isIntersecting;
      (inside ? enter : leave)();
    },
    { rootMargin: `-30% 0px -${Math.round((1 - from) * 100)}% 0px` }
  );
  io.observe(el);
  return () => io.disconnect();
}

/** Oberkante und Höhe des sichtbaren Scrollbereichs: `.app-pages` ab 768px,
 *  darunter das Fenster. */
function viewportOf(scroller: HTMLElement | Window): { top: number; height: number } {
  return scroller instanceof HTMLElement
    ? scroller.getBoundingClientRect()
    : { top: 0, height: window.innerHeight };
}

/** Ruft `update` höchstens einmal pro Frame, solange gescrollt wird, und einmal
 *  gleich zu Beginn. */
function onScrollFrame(scroller: HTMLElement | Window, update: () => void): () => void {
  let frame = 0;
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(() => ((frame = 0), update()));
  };
  update();
  scroller.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  return () => {
    cancelAnimationFrame(frame);
    scroller.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
  };
}

/** Gestaffelte Kacheln (Kategorien): versteckt wird nur, was beim
 *  Mount unterhalb des Bildschirms liegt — was schon zu sehen ist (gemerkte
 *  Scrollposition), bleibt stehen. */
function armStaggers(safe: gsap.ContextSafeFunc): () => void {
  const root = document.querySelector<HTMLElement>('[data-hub]');
  if (!root) return () => {};
  const fold = window.innerHeight;
  const plays = new Map<Element, () => void>();

  for (const group of root.querySelectorAll<HTMLElement>('[data-reveal="stagger"]')) {
    if (group.getBoundingClientRect().top <= fold) continue;
    const items = Array.from(group.children) as HTMLElement[];
    if (!items.length) continue;
    const across = sideways(group);
    gsap.set(items, {
      x: across ? 120 : 0,
      y: across ? 0 : 90,
      rotation: across ? 0 : (i: number) => (i % 2 ? 3 : -3),
      transition: 'none',
    });
    // Später gestartete Tweens gehören trotzdem in den matchMedia-Kontext —
    // sonst räumt ihn ein Wechsel auf reduced motion nicht mit ab.
    plays.set(
      group,
      safe(() => {
        gsap.to(items, {
          x: 0,
          y: 0,
          rotation: 0,
          duration: 1.2,
          ease: 'expo.out',
          stagger: Math.min(0.08, 0.6 / items.length),
          clearProps: `${CLEAR_TRANSFORMS},transition`,
        });
      }) as () => void
    );
  }
  return onceInView(plays);
}

/**
 * „Keine Idee? Frag Remy." mit Wucht: das Fragezeichen fliegt drehend von
 * links herein und schlägt ein, die Zeile davor zuckt vom Aufprall; dann
 * knallt „Frag Remy." von groß auf seine Größe wie ein Stempel. Remy steht
 * bis dahin unter der Kante der Tafel und schießt jetzt hoch, dann redet er
 * und wackelt dabei — dreimal, mit Pausen.
 * Umkehrbar (Ansage 28.09.2026): wer den Abschnitt nach oben oder unten
 * verlässt, sieht den Auftritt rückwärts laufen — Remy taucht ab, „Frag
 * Remy." fliegt weg, das Fragezeichen zurück nach links —, wer zurückkommt,
 * sieht ihn neu. Der Observer löst nur aus, nichts hängt an der Position:
 * auf dem iPhone zittert da nichts.
 * Getrieben wird Remy über `--remy-y/--remy-r` (siehe HubFragRemy.module.css),
 * der Mund über `data-speaking`; beides verwaltet React nicht.
 */
function armFragRemy(): () => void {
  const section = document.querySelector<HTMLElement>('[data-hub-fragremy]');
  const q = section?.querySelector<HTMLElement>('[data-fragremy-q]');
  const ask = section?.querySelector<HTMLElement>('[data-fragremy-ask]');
  const avatar = section?.querySelector<HTMLElement>('[data-fragremy-avatar]');
  const title = q?.closest<HTMLElement>('h2');
  const line = q?.parentElement;
  if (!section || !q || !ask || !avatar || !title || !line) return () => {};

  // Bis links hinter die Kante der Tafel (`.body` schneidet ab).
  const offLeft = () => {
    const board = section.getBoundingClientRect();
    const box = q.getBoundingClientRect();
    return -(box.right - board.left + 40);
  };
  const texts = [ask, title, line];
  // Aufgeräumt wird erst beim Abbauen: die Rückwärtsfahrt braucht die Werte,
  // nach einem `clearProps` kam das Fragezeichen gedreht, aber ohne seinen
  // Weg nach links zurück (gemessen). Keiner der Texte trägt eigene
  // `translate/rotate/scale`, die GSAP hier überschreiben könnte.
  const settle = () => {
    gsap.set(texts, { clearProps: `${CLEAR_TRANSFORMS},transformOrigin,visibility` });
    gsap.set(q, { clearProps: '--q-x,--q-r,--q-sx,--q-sy' });
  };

  // Ausgangswerte ausdrücklich: eine nie gesetzte Variable merkt sich GSAP
  // als 0 — rückwärts gelaufen stand das Fragezeichen sonst auf Grösse 0 und
  // flog beim nächsten Auftritt unsichtbar ein (gemessen).
  gsap.set(q, { '--q-sx': 1, '--q-sy': 1 });
  const entrance = gsap
    .timeline({ paused: true, onStart: () => stopTalk() })
    // Das Fragezeichen über Variablen (HubFragRemy.module.css): zwei Tweens
    // auf seinem `transform` liessen beim Rückwärtslaufen den Weg nach links
    // fallen — es kam gedreht, aber an seinem Platz zurück (gemessen).
    .fromTo(
      q,
      { '--q-x': offLeft, '--q-r': -540 },
      { '--q-x': 0, '--q-r': 0, duration: 0.55, ease: 'power3.in' }
    )
    // Aufprall: das Zeichen staucht, die Zeile davor zuckt weg.
    .fromTo(
      q,
      { '--q-sx': 1.35, '--q-sy': 0.7 },
      {
        '--q-sx': 1,
        '--q-sy': 1,
        duration: 0.7,
        ease: 'elastic.out(1.1, 0.35)',
        immediateRender: false,
      }
    )
    .fromTo(
      line,
      { x: 16 },
      { x: 0, duration: 0.7, ease: 'elastic.out(1, 0.3)', immediateRender: false },
      '<'
    )
    .fromTo(
      ask,
      { scale: 2.8, rotation: -7, y: -24, visibility: 'hidden', transformOrigin: '0% 60%' },
      { scale: 1, rotation: 0, y: 0, visibility: 'visible', duration: 0.34, ease: 'power4.in' },
      '-=0.45'
    )
    .fromTo(
      title,
      { y: 8 },
      { y: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)', immediateRender: false }
    )
    .fromTo(
      avatar,
      { '--remy-y': 118 },
      { '--remy-y': 0, duration: 0.7, ease: 'back.out(1.7)', onComplete: () => startTalk() },
      '-=0.5'
    );
  // Die Startpose sofort: vor dem ersten Auftritt ist nichts zu sehen.
  entrance.progress(0);

  let talk: gsap.core.Timeline | null = null;
  const stopTalk = () => {
    talk?.kill();
    talk = null;
    avatar.removeAttribute('data-speaking');
    gsap.set(avatar, { '--remy-r': 0 });
  };
  const startTalk = () => {
    stopTalk();
    talk = gsap.timeline();
    [0, 5.4, 11.2].forEach((at, i) => {
      const seconds = [2.2, 1.8, 2][i];
      talk!.call(() => avatar.setAttribute('data-speaking', ''), undefined, at);
      talk!.to(
        avatar,
        {
          keyframes: {
            '--remy-r': [0, -3.5, 3, -2.5, 2, -1, 0],
            '--remy-y': [0, -2.5, 0, -2, 0, -1, 0],
          },
          duration: seconds,
          ease: 'sine.inOut',
        },
        at
      );
      talk!.call(() => avatar.removeAttribute('data-speaking'), undefined, at + seconds);
    });
  };

  const show = () => entrance.timeScale(1).play();
  const hide = () => {
    stopTalk();
    entrance.timeScale(1.6).reverse();
  };
  // Schon ab 85 % der Höhe, nicht erst ab 70 %: „Keine Idee? Frag Remy." kam
  // zu spät, die Tafel stand schon leer im Bild (Ansage 29.09.2026).
  const unwatch = whileCentered(section, show, hide, 0.85);
  return () => {
    unwatch();
    stopTalk();
    entrance.kill();
    settle();
    gsap.set(avatar, { clearProps: '--remy-y,--remy-r' });
  };
}

/**
 * `data-in-view` an jeder Section mit einem Knopf, der gedrückt werden soll
 * (`data-press`), und am Aufmacher: `1` im Bild, `0` draussen. Das CSS dazu
 * (HubSection.module.css) startet den Druck neu, sobald es auf `1` springt:
 * wer zurückscrollt, sieht den Knopf wieder gedrückt. Beobachtet wird die
 * Section, nicht der Knopf: HubHeroCopy baut die Knöpfe neu, sobald `useAuth`
 * steht.
 * Der Aufmacher bekommt die `1` erst, nachdem er einmal draussen war: beim
 * Laden ist er schon im Bild, und die `1` gleich beim Mount verkürzte nur die
 * Verzögerung des laufenden Drucks — ab Seitenstart gerechnet, der Knopf
 * drückte dann mitten in seinem Einflug.
 */
function armInView(): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const sections = new Set<HTMLElement>();
  const hero = document.querySelector<HTMLElement>('[data-hub-hero]');
  if (hero) sections.add(hero);
  document.querySelectorAll<HTMLElement>('[data-hub] [data-press]').forEach((el) => {
    const section = el.closest<HTMLElement>('section');
    if (section) sections.add(section);
  });
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (!entry.isIntersecting) el.setAttribute('data-in-view', '0');
        else if (el !== hero || el.hasAttribute('data-in-view')) {
          el.setAttribute('data-in-view', '1');
        }
      }
    },
    { rootMargin: '0px 0px -20% 0px' }
  );
  sections.forEach((el) => io.observe(el));
  return () => {
    io.disconnect();
    sections.forEach((el) => el.removeAttribute('data-in-view'));
  };
}

/**
 * FAQ: jede Antwort klappt auf wie eine Klappe (Ansage 29.09.2026: „der Text
 * muss schon drinstehen … wirklich wie ein Tab auf", nicht gewischt). Die
 * Antwort steht fertig gesetzt und schwenkt um ihre Oberkante aus der Tiefe
 * nach vorn, federt kurz nach und steht; die Zeilen darunter rücken genau so
 * weit, wie die Klappe schon Höhe zeigt (Kosinus des Winkels) — nichts wird
 * abgeschnitten, nichts wächst von oben nach unten auf. Zu geht es rückwärts.
 * „Was ist Eat This?" klappt von selbst auf, sobald die Frage oberhalb von
 * 55 % der Höhe steht, und beim Hochscrollen wieder zu. Ein eigener Klick
 * klappt genauso und beendet die Automatik. Ohne JS oder bei reduced motion
 * schaltet `<details>` einfach um.
 */
function armFaq(): () => void {
  const faq = document.querySelector<HTMLElement>('[data-hub-faq]');
  const first = faq?.querySelector<HTMLDetailsElement>('details');
  if (!faq || !first || typeof IntersectionObserver === 'undefined') return () => {};
  const CLEAR = 'height,paddingTop,paddingBottom,boxSizing,transform,transformOrigin';
  type Flap = { tween: gsap.core.Animation; open: boolean; state: { p: number } };
  const flaps = new Map<HTMLDetailsElement, Flap>();
  const isOpen = (d: HTMLDetailsElement) => flaps.get(d)?.open ?? d.open;
  let touched = false;

  const flap = (d: HTMLDetailsElement, open: boolean) => {
    const answer = d.querySelector<HTMLElement>('p');
    if (!answer || isOpen(d) === open) return;
    const running = flaps.get(d);
    running?.tween.kill();
    // Mitten im Schwenk umgedreht: von der aktuellen Stellung aus weiter.
    const state = { p: running ? running.state.p : open ? 0 : 1 };
    d.open = true;
    // Die fertige Höhe messen, bevor gezeichnet wird — im selben Takt, es
    // blitzt also nichts auf.
    gsap.set(answer, { clearProps: CLEAR });
    const cs = getComputedStyle(answer);
    const pad = [parseFloat(cs.paddingTop), parseFloat(cs.paddingBottom)];
    const full = answer.getBoundingClientRect().height;
    const draw = () => {
      // 90° = hochgeklappt (Kante voraus), 0° = steht. Über 1 hinaus
      // (Nachfedern) schwenkt sie kurz ein Stück nach vorn.
      const angle = (1 - state.p) * 90;
      const k = Math.max(0, Math.cos((angle * Math.PI) / 180));
      Object.assign(answer.style, {
        boxSizing: 'border-box',
        height: `${full * k}px`,
        paddingTop: `${pad[0] * k}px`,
        paddingBottom: `${pad[1] * k}px`,
        transformOrigin: '50% 0',
        transform: `perspective(900px) rotateX(${angle}deg)`,
      });
    };
    const done = () => {
      flaps.delete(d);
      if (!open) d.open = false;
      gsap.set(answer, { clearProps: CLEAR });
    };
    // Auf: sie fällt nach vorn — erst langsam, dann schneller, ein Stück über
    // die Senkrechte hinaus (p 1,1 ≈ −9°) — und federt aus. Zu: sie wird
    // gleichmässig wieder hochgeklappt.
    const tween = open
      ? gsap
          .timeline({ onUpdate: draw, onComplete: done })
          .to(state, { p: 1.1, duration: 0.7, ease: 'power2.in' })
          .to(state, { p: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' })
      : gsap.to(state, {
          p: 0,
          duration: 0.6,
          ease: 'power2.inOut',
          onUpdate: draw,
          onComplete: done,
        });
    flaps.set(d, { tween, open, state });
    draw();
  };

  const onClick = (e: MouseEvent) => {
    const summary = e.target instanceof Element ? e.target.closest('summary') : null;
    const d = summary?.parentElement;
    if (!(d instanceof HTMLDetailsElement) || !faq.contains(d)) return;
    e.preventDefault();
    touched = true;
    flap(d, !isOpen(d));
  };
  faq.addEventListener('click', onClick);

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (touched) return;
        if (e.isIntersecting) flap(first, true);
        // Unter die Linie gerutscht = wieder hochgescrollt. Oben hinaus
        // (weitergescrollt) bleibt sie offen.
        else if (e.rootBounds && e.boundingClientRect.top > e.rootBounds.bottom) flap(first, false);
      }
    },
    { rootMargin: '0px 0px -45% 0px' }
  );
  io.observe(first);
  return () => {
    io.disconnect();
    faq.removeEventListener('click', onClick);
    flaps.forEach(({ tween, open }, d) => {
      tween.kill();
      d.open = open;
      const answer = d.querySelector('p');
      if (answer) gsap.set(answer, { clearProps: CLEAR });
    });
    flaps.clear();
  };
}

/**
 * Starter Pack: sobald die Tafel ins Bild kommt, tippt sich eine Adresse ins
 * Feld, „Anmelden" wird gedrückt, das Feld leert sich wieder (Ansage
 * 28.09.2026). Getippt wird in den Platzhalter, nie in den Wert — es wird
 * nichts abgeschickt, nichts validiert, und wer selbst ins Feld tippt, bricht
 * die Vorführung sofort ab. Sie läuft in Schleife, solange die Tafel im Bild
 * ist: tippen, drücken, leeren, kurz Pause, von vorn (Ansage 29.09.2026).
 * Nach eigenem Tippen erst wieder, wenn die Tafel neu ins Bild kommt.
 * Feld und Knopf werden bei jedem Lauf neu gesucht, Fokus und Eingabe an der
 * Section abgefangen: nach einem Absenden baut LoginBoard das Formular über
 * die „Mail gesendet"-Ansicht neu, gemerkte Knoten wären dann tot.
 */
const DEMO_ADDRESS = 'hunger@eatthisdot.com';

function armSignupDemo(): () => void {
  const section = document.querySelector<HTMLElement>('[data-hub-starter]');
  if (!section || typeof IntersectionObserver === 'undefined') return () => {};
  const isField = (el: EventTarget | null): el is HTMLInputElement =>
    el instanceof HTMLInputElement && el.type === 'email';
  // Die Knoten des laufenden Durchgangs, damit `reset` genau sie zurücksetzt.
  let shown: { input: HTMLInputElement; submit: HTMLButtonElement; original: string } | null = null;
  let timers: number[] = [];
  let active = false;
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
  const reset = () => {
    timers.forEach(clearTimeout);
    timers = [];
    if (!shown) return;
    shown.input.placeholder = shown.original;
    shown.input.removeAttribute('data-demo-typing');
    shown.submit.removeAttribute('data-pressing');
    shown = null;
  };
  const stop = () => {
    active = false;
    reset();
  };
  const run = () => {
    if (!active) return;
    const input = section.querySelector<HTMLInputElement>('input[type="email"]');
    const submit = section.querySelector<HTMLButtonElement>('button[type="submit"]');
    // Kein Formular (gerade „Mail gesendet"), oder jemand ist im Feld.
    if (!input || !submit || input.value || document.activeElement === input) {
      stop();
      return;
    }
    reset();
    shown = { input, submit, original: input.placeholder };
    input.setAttribute('data-demo-typing', '');
    input.placeholder = '';
    let t = 400;
    for (let i = 1; i <= DEMO_ADDRESS.length; i++) {
      // Ungleichmässig wie echtes Tippen: tick, tick — tick.
      t += 55 + ((i * 37) % 70);
      later(() => (input.placeholder = DEMO_ADDRESS.slice(0, i)), t);
    }
    later(() => submit.setAttribute('data-pressing', ''), t + 450);
    later(() => submit.removeAttribute('data-pressing'), t + 1250);
    later(() => {
      input.placeholder = '';
    }, t + 1000);
    // Leeren, kurz Pause mit dem echten Platzhalter, dann von vorn.
    later(() => {
      reset();
      later(run, 1800);
    }, t + 1700);
  };
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) stop();
        else if (!active) {
          active = true;
          run();
        }
      }),
    { rootMargin: '0px 0px -30% 0px' }
  );
  io.observe(section);
  const interrupt = (e: Event) => {
    if (isField(e.target)) stop();
  };
  section.addEventListener('focusin', interrupt);
  section.addEventListener('input', interrupt);
  return () => {
    io.disconnect();
    section.removeEventListener('focusin', interrupt);
    section.removeEventListener('input', interrupt);
    stop();
  };
}

/**
 * Remy redet, solange gescrollt wird: `data-remy-talk` am <html>, bis eine
 * Viertelsekunde Ruhe ist. Den Mund bewegen die Stylesheets (RemyLauncher,
 * HubFragRemy) — hier nur das Signal, darum auch auf dem Telefon: es hängt
 * nicht an der Scrollposition und kann nicht nachzittern.
 */
function armScrollTalk(scroller: HTMLElement | Window): () => void {
  const html = document.documentElement;
  let quiet = 0;
  const onScroll = () => {
    if (!quiet) html.setAttribute('data-remy-talk', '');
    window.clearTimeout(quiet);
    quiet = window.setTimeout(() => {
      quiet = 0;
      html.removeAttribute('data-remy-talk');
    }, 260);
  };
  scroller.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    scroller.removeEventListener('scroll', onScroll);
    window.clearTimeout(quiet);
    html.removeAttribute('data-remy-talk');
  };
}

/**
 * Für Browser ohne Scroll-Timeline (`animation-timeline: view()`): dieselben
 * Werte, die sonst CSS am Scrollweg treibt, per Scroll-Listener. Jedes Element
 * sagt selbst, welche Variable von wo nach wo läuft (`data-scrub="--deal 0 1"`)
 * und über welche Strecke (`data-scrub-start/-end`, lib/dom/scrollProgress).
 * Ein Drittel Sekunde Nachlauf, damit es sich nicht wie eingerastet anfühlt.
 */
function armScrubFallback(scroller: HTMLElement | Window): () => void {
  if (typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()')) return () => {};
  const scrubs = Array.from(
    document.querySelectorAll<HTMLElement>('[data-hub] [data-scrub]'),
    (el) => {
      const [prop, from, to] = (el.dataset.scrub ?? '').split(' ');
      if (!prop?.startsWith('--')) return null;
      const a = Number(from);
      const b = Number(to);
      const set = gsap.quickTo(el, prop, { duration: 0.3, ease: 'power1.out' });
      const start = el.dataset.scrubStart ?? 'top bottom';
      const end = el.dataset.scrubEnd ?? 'bottom top';
      gsap.set(el, {
        [prop]:
          a +
          (b - a) * scrollProgress(el.getBoundingClientRect(), viewportOf(scroller), start, end),
      });
      return {
        el,
        prop,
        update: () =>
          set(
            a +
              (b - a) * scrollProgress(el.getBoundingClientRect(), viewportOf(scroller), start, end)
          ),
      };
    }
  ).filter((s) => s !== null);
  if (!scrubs.length) return () => {};
  const stop = onScrollFrame(scroller, () => scrubs.forEach((s) => s.update()));
  return () => {
    stop();
    scrubs.forEach(({ el, prop }) => {
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: prop });
    });
  };
}

/** Die Telefone driften auseinander, während der Aufmacher oben hinausläuft
 *  (`--phones-drift`, HubSection.module.css) — mit einem halben Takt Nachlauf:
 *  liest sich als Trägheit, nicht als Ruckeln. */
function armPhonesDrift(scroller: HTMLElement | Window): () => void {
  const hero = document.querySelector<HTMLElement>('[data-hub-hero]');
  if (!hero) return () => {};
  const drift = gsap.quickTo(hero, '--phones-drift', { duration: 0.5, ease: 'power1.out' });
  const progress = () =>
    scrollProgress(hero.getBoundingClientRect(), viewportOf(scroller), 'top top', 'bottom top');
  gsap.set(hero, { '--phones-drift': progress() });
  const stop = onScrollFrame(scroller, () => drift(progress()));
  return () => {
    stop();
    gsap.killTweensOf(hero);
    gsap.set(hero, { clearProps: '--phones-drift' });
  };
}

/**
 * Maus über dem Aufmacher (nur Desktop mit echtem Zeiger): die Telefone
 * kippen in 3D zur Maus und trennen sich in der Tiefe (`--px/--py`, die Bahn
 * steht in HubSection.module.css), der Knopf zieht magnetisch zum Zeiger.
 * Die Knöpfe werden bei jeder Bewegung neu gesucht: HubHeroCopy tauscht sie
 * aus, sobald `useAuth` steht.
 */
function armHeroPointer(): () => void {
  const hero = document.querySelector<HTMLElement>('[data-hub-hero]');
  const phones = hero?.querySelector<HTMLElement>('[data-hub-phones]');
  if (!hero || !phones) return () => {};

  gsap.set(phones, { transformPerspective: 1100 });
  const follow = { duration: 0.9, ease: 'power3' };
  const px = gsap.quickTo(hero, '--px', follow);
  const py = gsap.quickTo(hero, '--py', follow);
  const tiltX = gsap.quickTo(phones, 'rotationX', follow);
  const tiltY = gsap.quickTo(phones, 'rotationY', follow);

  type Pull = { x: (v: number) => void; y: (v: number) => void };
  const pulls = new WeakMap<HTMLElement, Pull>();
  const pull = (el: HTMLElement): Pull => {
    let p = pulls.get(el);
    if (!p) {
      const snap = { duration: 0.5, ease: 'power3' };
      p = { x: gsap.quickTo(el, '--mx', snap), y: gsap.quickTo(el, '--my', snap) };
      pulls.set(el, p);
    }
    return p;
  };
  const magnets = () => hero.querySelectorAll<HTMLElement>('[data-magnetic]');

  const onMove = (e: PointerEvent) => {
    const r = hero.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    px(nx);
    py(ny);
    tiltY(nx * 12);
    tiltX(ny * -8);
    magnets().forEach((el) => {
      const b = el.getBoundingClientRect();
      const dx = e.clientX - (b.left + b.width / 2);
      const dy = e.clientY - (b.top + b.height / 2);
      // Fängt knapp vor dem Knopf an zu ziehen, nicht erst darauf — und nie
      // weiter als ein paar Pixel: ein Knopf, der wegläuft, ist keiner.
      const near = Math.hypot(dx, dy) < Math.max(b.width, b.height) * 0.8;
      pull(el).x(near ? gsap.utils.clamp(-16, 16, dx * 0.25) : 0);
      pull(el).y(near ? gsap.utils.clamp(-10, 10, dy * 0.3) : 0);
    });
  };
  const onLeave = () => {
    px(0);
    py(0);
    tiltX(0);
    tiltY(0);
    magnets().forEach((el) => {
      pull(el).x(0);
      pull(el).y(0);
    });
  };

  hero.addEventListener('pointermove', onMove);
  hero.addEventListener('pointerleave', onLeave);
  return () => {
    hero.removeEventListener('pointermove', onMove);
    hero.removeEventListener('pointerleave', onLeave);
    gsap.set(phones, { clearProps: CLEAR_TRANSFORMS });
    gsap.set(hero, { clearProps: '--px,--py' });
    magnets().forEach((el) => gsap.set(el, { clearProps: '--mx,--my' }));
  };
}

/** A small camera response, only on devices with a real hovering pointer. */
function armDepthPointer(): () => void {
  const cleanups = Array.from(
    document.querySelectorAll<HTMLElement>('[data-home-pointer]'),
    (el) => {
      const options = { duration: 0.65, ease: 'power3.out' };
      const x = gsap.quickTo(el, '--look-x', options);
      const y = gsap.quickTo(el, '--look-y', options);
      const move = (e: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        x(gsap.utils.clamp(-1, 1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
        y(gsap.utils.clamp(-1, 1, ((e.clientY - rect.top) / rect.height) * 2 - 1));
      };
      const leave = () => {
        x(0);
        y(0);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      return () => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerleave', leave);
        x.tween.kill();
        y.tween.kill();
        el.style.removeProperty('--look-x');
        el.style.removeProperty('--look-y');
      };
    }
  );
  return () => cleanups.forEach((stop) => stop());
}

export default function HubMotion() {
  useGSAP(() => {
    // Ausserhalb von matchMedia: aufräumen muss es auch, wenn jemand während
    // des Auftritts auf reduced motion umschaltet.
    const stopIntro = finishIntro();
    const mm = gsap.matchMedia();
    mm.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        desk: '(min-width: 768px)',
        pointer: '(hover: hover) and (pointer: fine)',
      },
      (ctx, safe) => {
        const { motion, desk, pointer } = ctx.conditions as Record<string, boolean>;
        if (!motion) return;
        const scroller = appScroller() ?? window;
        const stops: Array<() => void> = [];
        stops.push(armScrubFallback(scroller));
        stops.push(armStaggers(safe!));
        stops.push(armFragRemy());
        stops.push(armInView());
        stops.push(armSignupDemo());
        stops.push(armFaq());
        stops.push(armScrollTalk(scroller));
        // Scroll-JS an der Position nur ab 768px: auf dem iPhone läuft es ein
        // bis zwei Frames hinterher (siehe HeroMarkFlight) und zittert.
        if (desk) stops.push(armPhonesDrift(scroller));
        if (desk && pointer) {
          stops.push(armHeroPointer());
          stops.push(armDepthPointer());
        }
        return () => stops.forEach((stop) => stop());
      }
    );
    return () => {
      stopIntro?.();
      mm.revert();
    };
  });

  return null;
}
