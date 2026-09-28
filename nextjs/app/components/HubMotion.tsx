'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { appScroller } from '@/lib/dom/appScroller';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Bewegung auf der Startseite. Alles nur ohne `prefers-reduced-motion` und nie
 * als Opacity-Fade (Hausregel für Brand-Flächen). Kein Text, der sich
 * Buchstabe für Buchstabe oder Zeile für Zeile aufbaut, keine Fotos, die aus
 * Masken ausfahren (Ansage 28.09.2026) — Dinge bewegen sich als Ganzes.
 *
 * 1. **Auftritt beim Laden** (Aufmacher). Bewusst CSS, nicht GSAP: er muss ab
 *    dem ersten Paint laufen, nicht erst nach der Hydrierung (Begründung in
 *    HubSection.module.css). Hier nur das Aufräumen, siehe `finishIntro`.
 *
 * 2. **Am Scrollweg** — und damit umkehrbar — hängen Must-Eat-Stapel, Spot des Tages, die Magazin-Fotos (Parallaxe) und die
 *    Quadrate vor den Titeln. Das sind Scroll-Timelines des Browsers in den CSS-Modulen,
 *    kein JS: sie laufen im Takt des Scrollens, auch auf dem iPhone, wo
 *    Scroll-JS ein bis zwei Frames hinterherzittert (siehe HeroMarkFlight).
 *    Nur wo der Browser keine Scroll-Timeline kann, treibt `armScrubFallback`
 *    dieselben Werte per GSAP (`data-scrub`).
 *    Der Stapel ist bewusst nicht mehr gepinnt (bis 28.09.2026 ab 1024px eine
 *    Sequenz mit ScrollTrigger-Pin): ein Pin braucht im `.app-pages`-Container
 *    `pinType: 'fixed'` — ein Transform-Pin liefe dem Scrollen dort hinterher
 *    wie Scroll-JS auf dem iPhone — und nach jeder Höhenänderung darüber ein
 *    Neumessen, sonst greift er an der alten Stelle. Ohne Pin fällt beides weg,
 *    und Telefon und Desktop teilen denselben Weg.
 *
 *    Das Nearby-Band ist die Ausnahme: es lässt sich auch selbst wischen, also
 *    schiebt JS seine Scrollposition mit (`armNearbyBand`).
 *
 * 3. **Beim Hereinkommen:**
 *    - `data-reveal="stagger"` (Kategorien): Kacheln rücken gestaffelt nach,
 *      als ganze Kacheln — einmal.
 *    - `data-stamp`: der Titel „Must Eats" und die Magazin-Artikel schlagen
 *      wie Stempel ein, umkehrbar (`armStamps`).
 *    - Frag Remy: das Fragezeichen fliegt von links ein, „Frag Remy." schlägt
 *      ein, Remy schießt von unten hoch und redet, mehrmals. Wer den
 *      Abschnitt verlässt, sieht alles rückwärts gehen; wer zurückkommt, sieht
 *      es neu (`armFragRemy`).
 *    - Knöpfe werden gedrückt, jedes Mal, wenn ihre Section ins Bild kommt
 *      (`data-in-view`, CSS in HubSection.module.css; `armInView`).
 *    - Starter Pack: in das Adressfeld tippt sich eine Adresse, „Anmelden"
 *      wird gedrückt, das Feld leert sich (`armSignupDemo`).
 *
 * 4. **Immer:** Remy redet, solange gescrollt wird — der große im Frag-Remy-
 *    Abschnitt und der schwebende unten rechts (`armScrollTalk`). Scrollen
 *    treibt das Laufband schneller nach rechts und legt es schräg
 *    (`armMarqueeSkew`).
 *
 * 5. **Nur ab 768px:** die Telefone driften beim Herausscrollen auseinander;
 *    mit echtem Zeiger kippen sie zur Maus, der Knopf zieht magnetisch.
 */

/**
 * Der Ladeauftritt selbst ist CSS (HubSection.module.css) und läuft ab dem
 * ersten Paint. Hier nur: wer scrollt, bevor er fertig ist, spult ihn vierfach
 * ab — und am Ende fällt `data-hero-intro`, damit nichts dauerhaft an den
 * Auftrittsregeln hängt.
 */
function finishIntro(): (() => void) | void {
  const html = document.documentElement;
  if (!html.hasAttribute('data-hero-intro')) return;
  const hero = document.querySelector<HTMLElement>('[data-hub-hero]');
  const running = hero?.getAnimations() ?? [];
  const done = () => html.removeAttribute('data-hero-intro');
  if (!running.length) {
    done();
    return;
  }
  let cancelled = false;
  Promise.all(running.map((a) => a.finished))
    .then(() => !cancelled && done())
    // Abgebrochen (Attribut schon weg, Seite verlassen) — nichts mehr zu tun.
    .catch(() => {});

  const hurry = () => running.forEach((a) => (a.playbackRate = 4));
  const scroller = appScroller() ?? window;
  scroller.addEventListener('scroll', hurry, { passive: true, once: true });
  return () => {
    cancelled = true;
    scroller.removeEventListener('scroll', hurry);
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

/** Gestaffelte Kacheln (Magazin, Kategorien): versteckt wird nur, was beim
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
 * sieht ihn neu. ScrollTrigger löst nur aus, er hängt nicht an der Position:
 * auf dem iPhone zittert da nichts.
 * Getrieben wird Remy über `--remy-y/--remy-r` (siehe HubFragRemy.module.css),
 * der Mund über `data-speaking`; beides verwaltet React nicht.
 */
function armFragRemy(scroller: HTMLElement | Window): () => void {
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
  const st = ScrollTrigger.create({
    trigger: section,
    scroller,
    start: 'top 70%',
    end: 'bottom 30%',
    onEnter: show,
    onEnterBack: show,
    onLeave: hide,
    onLeaveBack: hide,
  });
  return () => {
    st.kill();
    stopTalk();
    entrance.kill();
    settle();
    gsap.set(avatar, { clearProps: '--remy-y,--remy-r' });
  };
}

/**
 * Stempel wie „Frag Remy." (Ansage 28.09.2026): gross, gedreht und etwas zu
 * hoch, dann mit anziehendem Tempo flach auf seinen Platz, ein kurzer
 * Aufprall. `data-stamp` am Element — der Titel „Must Eats" —, oder
 * `data-stamp="stagger"` an einer Liste, dann schlagen ihre Einträge
 * nacheinander ein (die Artikel unter „Auf dem Teller"). Wie Frag Remy
 * umkehrbar: wer die Section verlässt, sieht den Stempel rückwärts abheben,
 * wer zurückkommt, sieht ihn neu. Bis zum Einschlag ist nichts da
 * (`visibility`, kein Ausblenden). Jeder Eintrag hat genau einen Tween auf
 * seinem `transform` — zwei liessen bei Frag Remy den Rückweg fallen.
 *
 * Die Artikel stempeln kleiner, langsamer und erst, wenn die Liste gut im
 * Bild ist: mit Titel-Werten (2,4-fach, ab Section-Oberkante bei 70 %) war
 * der Einschlag am Handy vorbei, bevor die Karten zu sehen waren, und die
 * Wischreihe schnitt die grossen Karten ab („man sieht nicht richtig was").
 */
const STAMP = {
  single: { scale: 2.4, duration: 0.34, stagger: 0, start: 'top 70%', end: 'bottom 30%' },
  group: { scale: 1.5, duration: 0.45, stagger: 0.22, start: 'top 55%', end: 'bottom 25%' },
};

function armStamps(scroller: HTMLElement | Window): () => void {
  const root = document.querySelector<HTMLElement>('[data-hub]');
  if (!root) return () => {};
  const stops: Array<() => void> = [];
  for (const el of root.querySelectorAll<HTMLElement>('[data-stamp]')) {
    const group = el.dataset.stamp === 'stagger';
    const how = group ? STAMP.group : STAMP.single;
    const targets = group ? (Array.from(el.children) as HTMLElement[]) : [el];
    if (!targets.length) continue;
    gsap.set(targets, { visibility: 'hidden' });
    const stamp = gsap.timeline({ paused: true });
    targets.forEach((target, i) => {
      // Nicht bei 0: ein `set` ganz am Anfang einer Zeitleiste greift sofort.
      const at = 0.01 + i * how.stagger;
      stamp
        .set(
          target,
          {
            visibility: 'visible',
            scale: how.scale,
            rotation: i % 2 ? 6 : -7,
            y: -24,
            transformOrigin: group ? '50% 60%' : '0% 60%',
          },
          at
        )
        .to(
          target,
          {
            keyframes: [
              { scale: 1, rotation: 0, y: 0, duration: how.duration, ease: 'power4.in' },
              { y: 6, duration: 0.07, ease: 'power1.out' },
              { y: 0, duration: 0.5, ease: 'elastic.out(1, 0.35)' },
            ],
          },
          at
        );
    });
    const st = ScrollTrigger.create({
      // Der Titel hängt an seiner Section, eine Liste an sich selbst.
      trigger: group ? el : (el.closest('section') ?? el),
      scroller,
      start: how.start,
      end: how.end,
      onEnter: () => stamp.timeScale(1).play(),
      onEnterBack: () => stamp.timeScale(1).play(),
      onLeave: () => stamp.timeScale(1.6).reverse(),
      onLeaveBack: () => stamp.timeScale(1.6).reverse(),
    });
    stops.push(() => {
      st.kill();
      stamp.kill();
      gsap.set(targets, { clearProps: `${CLEAR_TRANSFORMS},transformOrigin,visibility` });
    });
  }
  return () => stops.forEach((stop) => stop());
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
 * Das Nearby-Band läuft beim Scrollen von links nach rechts durchs Bild und
 * lässt sich trotzdem selbst wischen. Die Scrollposition der Reihe folgt der
 * Seite: kommt das Band unten herein, steht es am Ende, verlässt es oben das
 * Bild, am Anfang. Wischt jemand selbst, merkt sich das der Versatz
 * (`offset`) — weiterscrollen setzt dort an, statt das Wischen zu überschreiben.
 * Das ist seitliches Scrollen, kein Mitziehen mit der Seite: ein Frame Verzug
 * auf dem iPhone fällt hier nicht auf.
 */
function armNearbyBand(scroller: HTMLElement | Window): () => void {
  const rail = document.querySelector<HTMLElement>('[data-nearby-rail]');
  if (!rail) return () => {};
  let offset = 0;
  let written = -1;
  let frame = 0;
  const viewport = () =>
    scroller instanceof HTMLElement
      ? scroller.getBoundingClientRect()
      : { top: 0, height: window.innerHeight };
  const goal = () => {
    const r = rail.getBoundingClientRect();
    const v = viewport();
    const p = gsap.utils.clamp(0, 1, (v.top + v.height - r.top) / (v.height + r.height));
    return (1 - p) * (rail.scrollWidth - rail.clientWidth);
  };
  const apply = () => {
    frame = 0;
    const max = rail.scrollWidth - rail.clientWidth;
    if (max <= 0) return;
    const x = Math.round(gsap.utils.clamp(0, max, goal() + offset));
    if (x === Math.round(rail.scrollLeft)) return;
    written = x;
    rail.scrollLeft = x;
  };
  const onPage = () => {
    if (!frame) frame = requestAnimationFrame(apply);
  };
  const onRail = () => {
    // Unser eigenes Schreiben meldet sich auch — nur echtes Wischen zählt.
    if (Math.abs(rail.scrollLeft - written) < 2) return;
    offset = rail.scrollLeft - goal();
  };
  apply();
  scroller.addEventListener('scroll', onPage, { passive: true });
  window.addEventListener('resize', onPage);
  rail.addEventListener('scroll', onRail, { passive: true });
  return () => {
    cancelAnimationFrame(frame);
    scroller.removeEventListener('scroll', onPage);
    window.removeEventListener('resize', onPage);
    rail.removeEventListener('scroll', onRail);
  };
}

/**
 * Starter Pack: sobald die Tafel ins Bild kommt, tippt sich eine Adresse ins
 * Feld, „Anmelden" wird gedrückt, das Feld leert sich wieder (Ansage
 * 28.09.2026). Getippt wird in den Platzhalter, nie in den Wert — es wird
 * nichts abgeschickt, nichts validiert, und wer selbst ins Feld tippt, bricht
 * die Vorführung sofort ab. Jedes Mal beim Hereinkommen, höchstens alle 12s.
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
  let lastRun = -Infinity;
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
  const run = () => {
    const input = section.querySelector<HTMLInputElement>('input[type="email"]');
    const submit = section.querySelector<HTMLButtonElement>('button[type="submit"]');
    // Kein Formular (gerade „Mail gesendet") — nichts vorzuführen.
    if (!input || !submit) return;
    if (input.value || document.activeElement === input) return;
    if (performance.now() - lastRun < 12000) return;
    lastRun = performance.now();
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
    later(reset, t + 1700);
  };
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => (e.isIntersecting ? run() : reset())),
    { rootMargin: '0px 0px -30% 0px' }
  );
  io.observe(section);
  const interrupt = (e: Event) => {
    if (isField(e.target)) reset();
  };
  section.addEventListener('focusin', interrupt);
  section.addEventListener('input', interrupt);
  return () => {
    io.disconnect();
    section.removeEventListener('focusin', interrupt);
    section.removeEventListener('input', interrupt);
    reset();
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
 * Tempo als Form: schnelles Scrollen legt die Schrift im Laufband schräg und
 * treibt sie schneller nach rechts, in Ruhe richtet sie sich wieder auf und
 * läuft im Grundtakt. Das Tempo zählt in beide Richtungen gleich — das Band
 * läuft immer von links nach rechts, Hochscrollen kehrt es nicht um (Ansage
 * 28.09.2026). Nur die Spitze zählt — wird schneller gescrollt als gerade
 * eingestellt, springt es mit, sonst klingt es aus. Das hängt am Tempo, nicht
 * an der Position: auf dem iPhone ist ein Frame Verzug hier unsichtbar.
 */
function armMarqueeSkew(scroller: HTMLElement | Window): () => void {
  const tape = document.querySelector<HTMLElement>('[data-marquee-tape]');
  if (!tape) return () => {};
  const run = tape.firstElementChild?.getAnimations()[0];
  const proxy = { skew: 0, rate: 1 };
  const write = () => tape.style.setProperty('--skew', proxy.skew.toFixed(2));
  const rest = () => tape.style.removeProperty('--skew');
  const writeRate = () => {
    if (run) run.playbackRate = proxy.rate;
  };
  const clamp = gsap.utils.clamp(-12, 12);
  ScrollTrigger.create({
    trigger: tape,
    scroller,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
      const v = self.getVelocity();
      const rate = 1 + Math.min(12, Math.abs(v) / 120);
      if (rate > proxy.rate) {
        proxy.rate = rate;
        gsap.to(proxy, {
          rate: 1,
          duration: 1.4,
          ease: 'power2.out',
          overwrite: 'auto',
          onUpdate: writeRate,
        });
      }
      const skew = clamp(v / -260);
      if (Math.abs(skew) <= Math.abs(proxy.skew)) return;
      proxy.skew = skew;
      gsap.to(proxy, {
        skew: 0,
        duration: 0.9,
        ease: 'power3',
        overwrite: 'auto',
        onUpdate: write,
        onComplete: rest,
      });
    },
  });
  return () => {
    if (run) run.playbackRate = 1;
  };
}

/**
 * Für Browser ohne Scroll-Timeline (`animation-timeline: view()`): dieselben
 * Werte, die sonst CSS am Scrollweg treibt, per ScrollTrigger. Jedes Element
 * sagt selbst, welche Variable von wo nach wo läuft (`data-scrub="--deal 0 1"`)
 * und über welche Strecke (`data-scrub-start/-end`, ScrollTrigger-Notation).
 */
function armScrubFallback(scroller: HTMLElement | Window): void {
  if (typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()')) return;
  for (const el of document.querySelectorAll<HTMLElement>('[data-hub] [data-scrub]')) {
    const [prop, from, to] = (el.dataset.scrub ?? '').split(' ');
    if (!prop?.startsWith('--')) continue;
    gsap.fromTo(
      el,
      { [prop]: Number(from) },
      {
        [prop]: Number(to),
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          scroller,
          start: el.dataset.scrubStart ?? 'top bottom',
          end: el.dataset.scrubEnd ?? 'bottom top',
          scrub: 0.3,
        },
      }
    );
  }
}

function armPhonesDrift(scroller: HTMLElement | Window): void {
  const hero = document.querySelector<HTMLElement>('[data-hub-hero]');
  if (!hero) return;
  gsap.fromTo(
    hero,
    { '--phones-drift': 0 },
    {
      '--phones-drift': 1,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        scroller,
        start: 'top top',
        end: 'bottom top',
        // Ein halber Takt Nachlauf: liest sich als Trägheit, nicht als Ruckeln.
        scrub: 0.5,
      },
    }
  );
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

/**
 * ScrollTrigger misst Start und Ende einmal und dann nur bei Resize/Load neu.
 * Wächst die Seite oberhalb eines Triggers danach — die Markenschrift von
 * Typekit kommt nach, Bilder ohne feste Höhe, die Nearby-Karten nach der
 * Standortfreigabe —, griffe er an der alten Stelle. Also bei jeder
 * Höhenänderung der Seite neu messen, gebündelt auf eine Messung pro
 * Ruhephase.
 */
function refreshOnReflow(): () => void {
  const root = document.querySelector<HTMLElement>('[data-hub]');
  if (!root || typeof ResizeObserver === 'undefined') return () => {};
  let timer = 0;
  let last = root.offsetHeight;
  const ro = new ResizeObserver(() => {
    if (root.offsetHeight === last) return;
    last = root.offsetHeight;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
  });
  ro.observe(root);
  return () => {
    ro.disconnect();
    window.clearTimeout(timer);
  };
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
        armScrubFallback(scroller);
        stops.push(armStaggers(safe!));
        stops.push(armFragRemy(scroller));
        stops.push(armStamps(scroller));
        stops.push(armInView());
        stops.push(armNearbyBand(scroller));
        stops.push(armSignupDemo());
        stops.push(armScrollTalk(scroller));
        stops.push(armMarqueeSkew(scroller));
        // Scroll-JS an der Position nur ab 768px: auf dem iPhone läuft es ein
        // bis zwei Frames hinterher (siehe HeroMarkFlight) und zittert.
        if (desk) armPhonesDrift(scroller);
        if (desk && pointer) stops.push(armHeroPointer());
        stops.push(refreshOnReflow());
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
