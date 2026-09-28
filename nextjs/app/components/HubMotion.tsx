'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/**
 * Bewegung auf der Startseite, mit GSAP. Alles nur ohne `prefers-reduced-motion`
 * und nie als Opacity-Fade (Hausregel für Brand-Flächen): Dinge wachsen aus
 * Masken, fliegen ein, werden aufgedeckt — sie sind nie halb durchsichtig.
 *
 * 1. **Auftritt beim Laden.** Wortmarke wird aufgezogen, die Headline steigt
 *    Zeile für Zeile aus ihrer Maske, Lead und Knopf folgen, die Telefone
 *    schwingen von unten ins Bild. Das ist bewusst CSS, nicht GSAP: es muss ab
 *    dem ersten Paint laufen, nicht erst nach der Hydrierung (Begründung in
 *    HubSection.module.css). Hier nur das Aufräumen, siehe `finishIntro`.
 *
 * 2. **Auftritte unterhalb des Aufmachers**, sobald sie ins Bild kommen:
 *    - Abschnittstitel Buchstabe für Buchstabe aus der Zeilenmaske (SplitText),
 *      das gelbe Quadrat davor dreht sich hinein.
 *    - `data-reveal="stagger"`: Karten steigen gestaffelt auf, ihre Fotos
 *      werden von unten aufgedeckt und zoomen dabei auf ihren Platz zurück.
 *    - `data-reveal="rise"`: dasselbe für einen einzelnen Block (Spot des
 *      Tages), der Text darin rückt danach Zeile für Zeile nach.
 *    - `data-reveal="deal"`: die Must Eats liegen erst als Stapel auf der
 *      ersten Karte und werden von dort an ihre Plätze ausgeteilt.
 *    Versteckt wird nur, was beim Mount unterhalb des Bildschirms liegt —
 *    was schon zu sehen ist (gemerkte Scrollposition), bleibt stehen.
 *
 * 3. **Scroll und Maus, nur ab 768px** (auf dem iPhone läuft Scroll-JS ein bis
 *    zwei Frames hinterher, siehe HeroMarkFlight — das zittert):
 *    - die Telefone driften beim Herausscrollen auseinander (`--phones-drift`),
 *    - das Laufband (HubMarquee) wird beim Scrollen gegeneinander geschoben,
 *    - mit echtem Zeiger kippen die Telefone in 3D zur Maus und trennen sich
 *      in der Tiefe, der Knopf im Aufmacher zieht magnetisch (armHeroPointer),
 *    - ab 1024px werden die Must Eats zur gepinnten Sequenz: Stapel,
 *      Fächer, ausgelegt — am Scrollweg statt an der Uhr (armDeckPin).
 */

function appScroller(): HTMLElement | null {
  /* Ab 768px scrollt nicht das Fenster, sondern `.app-pages` (globals.css,
     Desktop app frame) — gesucht statt angenommen, wie in HeroMarkFlight. */
  const el = document.querySelector<HTMLElement>('.app-pages');
  return el && el.scrollHeight > el.clientHeight + 1 ? el : null;
}

/**
 * Der Ladeauftritt selbst ist CSS (HubSection.module.css) und läuft ab dem
 * ersten Paint. Hier nur: wer scrollt, bevor er fertig ist, spult ihn vierfach
 * ab — und am Ende fällt `data-hero-intro`, damit die Masken nicht dauerhaft
 * an Tinte schneiden, die über die Zeilenbox ragt.
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

/** Scrollt der Container seitwärts? Dann rücken die Karten von rechts nach. */
function sideways(el: Element): boolean {
  return /auto|scroll/.test(getComputedStyle(el).overflowX);
}

/** Foto aufdecken: die Maske fährt von unten auf, das Bild zoomt zurück. */
function photoReveal(item: Element, tl: gsap.core.Timeline, at: number | string) {
  const photo = item.querySelector<HTMLElement>('.hv-photo');
  if (!photo) return;
  const r = getComputedStyle(photo).borderTopLeftRadius || '0px';
  tl.fromTo(
    photo,
    { clipPath: `inset(100% 0% 0% 0% round ${r})` },
    { clipPath: `inset(0% 0% 0% 0% round ${r})`, duration: 1.3, ease: 'expo.inOut', clearProps: 'clipPath' },
    at
  );
  const img = photo.querySelector('img');
  if (img) {
    tl.fromTo(
      img,
      // Die Hover-Transition auf `transform` würde jeden Frame nachziehen.
      { scale: 1.35, transition: 'none' },
      { scale: 1, duration: 1.8, ease: 'expo.out', clearProps: 'transform,transition' },
      at
    );
  }
}

/** Versteckt ein Foto schon beim Mount — sonst stünde es kurz fertig da. */
function hidePhoto(item: Element) {
  const photo = item.querySelector<HTMLElement>('.hv-photo');
  if (photo) gsap.set(photo, { clipPath: 'inset(100% 0% 0% 0%)' });
}

function armReveals(safe: gsap.ContextSafeFunc, { pinnedDeck }: { pinnedDeck: boolean }): () => void {
  const root = document.querySelector<HTMLElement>('[data-hub]');
  if (!root || typeof IntersectionObserver === 'undefined') return () => {};

  const fold = window.innerHeight;
  const unseen = (el: Element) => el.getBoundingClientRect().top > fold;
  const plays = new Map<Element, () => void>();
  // Später gestartete Tweens gehören trotzdem in den matchMedia-Kontext —
  // sonst räumt ihn ein Wechsel auf reduced motion nicht mit ab.
  const later = (play: () => void) => safe(play) as () => void;

  /* ── Titel ── Bis zum Auftritt ganz angeschnitten; erst beim Auftritt
     zerlegt SplitText den Titel und setzt ihn danach zurück. Früher zerlegen
     hiesse, React-eigene Textknoten lange Zeit durch fremde zu ersetzen. */
  for (const title of root.querySelectorAll<HTMLElement>('.hv-title')) {
    if (!unseen(title)) continue;
    gsap.set(title, { clipPath: 'inset(0% 0% 100% 0%)' });
    plays.set(
      title,
      later(() => {
        // SplitText leert beim Zerlegen die Original-Textknoten und stellt
        // beim `revert()` per innerHTML wieder her — mit neuen Knoten. React
        // schriebe danach in die alten, geleerten (der Nearby-Titel wechselt
        // mit dem Standort) und der Titel bliebe leer. Also die Originale samt
        // Text merken und am Ende genau die zurückhängen. Hat React während
        // des Auftritts schon neuen Text in einen geschrieben, bleibt der.
        const original = Array.from(title.childNodes);
        const text = original.map((n) => (n instanceof Text ? n.data : null));
        const split = SplitText.create(title, { type: 'lines,chars', mask: 'lines' });
        gsap.set(title, { clearProps: 'clipPath' });
        const tl = gsap.timeline({
          onComplete: () => {
            split.revert();
            original.forEach((n, i) => {
              if (n instanceof Text && n.data === '' && text[i]) n.data = text[i];
            });
            title.replaceChildren(...original);
          },
        });
        tl.from(split.chars, {
          yPercent: 120,
          rotation: 10,
          duration: 1.05,
          ease: 'expo.out',
          stagger: Math.min(0.035, 0.6 / split.chars.length),
        });
        const mark = title.querySelector('.hv-mk');
        if (mark) {
          tl.from(
            mark,
            { scale: 0, rotation: -180, duration: 0.9, ease: 'back.out(2)', clearProps: 'transform' },
            0.05
          );
        }
      })
    );
  }

  for (const group of root.querySelectorAll<HTMLElement>('[data-reveal]')) {
    if (!unseen(group)) continue;
    const kind = group.dataset.reveal;

    /* ── Ein Block (Spot des Tages) ── */
    if (kind === 'rise') {
      const lines = Array.from(group.querySelectorAll<HTMLElement>('[data-reveal-line]'));
      gsap.set(group, { y: 90 });
      hidePhoto(group);
      gsap.set(lines, { y: 36 });
      plays.set(
        group,
        later(() => {
          const tl = gsap.timeline();
          tl.to(group, { y: 0, duration: 1.4, ease: 'expo.out', clearProps: 'transform' }, 0);
          photoReveal(group, tl, 0.05);
          tl.to(
            lines,
            { y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07, clearProps: 'transform' },
            0.35
          );
        })
      );
      continue;
    }

    const items = Array.from(group.children) as HTMLElement[];
    if (!items.length) continue;

    /* ── Kartenstapel (Must Eats) ── Die Karten (`data-deal-card`) liegen erst
       alle auf dem Platz der ersten, leicht versetzt wie ein echter Stapel,
       oberste vorn. Beim Auftritt steigt der Stapel auf, dann fliegt eine nach
       der anderen an ihren Platz. Die Beschriftung (`data-deal-caption`) fliegt
       nicht mit — im Stapel läge sie als Textsalat übereinander —, sondern
       wächst an ihrem Platz aus der Maske, sobald ihre Karte landet. */
    if (kind === 'deal') {
      // Ab 1024px gehört der Stapel der gepinnten Sequenz (armDeckPin).
      if (pinnedDeck) continue;
      const cards = items.map((item) => item.querySelector<HTMLElement>('[data-deal-card]') ?? item);
      const captions = items.map((item) => item.querySelector<HTMLElement>('[data-deal-caption]'));
      const home = cards[0].getBoundingClientRect();
      const deck = cards.map((card, i) => {
        const r = card.getBoundingClientRect();
        return { x: home.left - r.left + i * 2, y: home.top - r.top - i * 3 };
      });
      gsap.set(cards, {
        x: (i: number) => deck[i].x,
        y: (i: number) => deck[i].y + 160,
        rotation: (i: number) => (i % 2 ? 1 : -1) * (2 + i * 1.5),
        // Stapelreihenfolge über die Listenelemente hinweg; ohne `position`
        // greift z-index an einem normalen Block nicht.
        position: 'relative',
        zIndex: (i: number) => cards.length - i,
        transition: 'none',
      });
      const shown = captions.filter((c): c is HTMLElement => !!c);
      gsap.set(shown, { y: 28, clipPath: 'inset(-10% -5% 100% -5%)' });
      plays.set(
        group,
        later(() => {
          const tl = gsap.timeline();
          tl.to(cards, { y: (i: number) => deck[i].y, duration: 0.7, ease: 'expo.out' }, 0);
          cards.forEach((card, i) => {
            const at = 0.45 + i * 0.11;
            tl.to(
              card,
              {
                x: 0,
                y: 0,
                rotation: 0,
                duration: 0.95,
                ease: 'power4.inOut',
                clearProps: 'transform,position,zIndex,transition',
              },
              at
            );
            const caption = captions[i];
            if (caption) {
              tl.to(
                caption,
                {
                  y: 0,
                  clipPath: 'inset(-10% -5% -10% -5%)',
                  duration: 0.8,
                  ease: 'expo.out',
                  clearProps: 'transform,clipPath',
                },
                at + 0.75
              );
            }
          });
        })
      );
      continue;
    }

    /* ── Gestaffelte Karten ── */
    const across = sideways(group);
    gsap.set(items, { x: across ? 90 : 0, y: across ? 0 : 70, transition: 'none' });
    items.forEach(hidePhoto);
    plays.set(
      group,
      later(() => {
        const each = Math.min(0.09, 0.7 / items.length);
        const tl = gsap.timeline();
        tl.to(
          items,
          {
            x: 0,
            y: 0,
            duration: 1.3,
            ease: 'expo.out',
            stagger: each,
            clearProps: 'transform,transition',
          },
          0
        );
        items.forEach((item, i) => photoReveal(item, tl, i * each));
      })
    );
  }

  if (!plays.size) return () => {};

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        plays.get(entry.target)?.();
        plays.delete(entry.target);
      }
    },
    // Erst wenn es ein Stück im Bild ist — sonst läuft der Auftritt unter der
    // Bildschirmkante ab, ohne dass ihn jemand sieht.
    { rootMargin: '0px 0px -15% 0px' }
  );
  plays.forEach((_, el) => io.observe(el));
  return () => io.disconnect();
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
    gsap.set(phones, { clearProps: 'transform' });
    gsap.set(hero, { clearProps: '--px,--py' });
    magnets().forEach((el) => gsap.set(el, { clearProps: '--mx,--my' }));
  };
}

/** Das Laufband läuft von allein (CSS); Scrollen schiebt die Bänder dazu
 *  gegeneinander — ein Band pro Richtung (`data-marquee-row`). */
function armMarqueePush(scroller: HTMLElement | Window): void {
  const band = document.querySelector<HTMLElement>('[data-hub-marquee]');
  if (!band) return;
  band.querySelectorAll<HTMLElement>('[data-marquee-row]').forEach((row) => {
    const dir = Number(row.dataset.marqueeRow) || 1;
    gsap.fromTo(
      row,
      { '--push': dir * 260 },
      {
        '--push': dir * -260,
        ease: 'none',
        scrollTrigger: { trigger: band, scroller, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
      }
    );
  });
}

/**
 * Must Eats als gepinnte Sequenz (ab 1024px): die Section bleibt stehen, und
 * der Scrollweg spielt das Kartenspiel — Stapel in der Mitte, auffächern wie
 * eine Hand Karten, auslegen auf die Plätze. Scrub statt Zeit: wer
 * zurückscrollt, sammelt die Karten wieder ein. Nur die Karten
 * (`data-deal-card`) fliegen; die Beschriftung (`data-deal-caption`) wächst
 * am Ende aus ihrer Maske.
 * Gepinnt wird `fixed`, auch im `.app-pages`-Container: ein Transform-Pin
 * liefe dem Scrollen dort genauso hinterher wie Scroll-JS auf dem iPhone.
 */
function armDeckPin(scroller: HTMLElement | Window): void {
  const section = document.querySelector<HTMLElement>('[data-hub-must-eats]');
  const list = section?.querySelector<HTMLElement>('[data-reveal="deal"]');
  if (!section || !list) return;
  const items = Array.from(list.children) as HTMLElement[];
  const cards = items.map((item) => item.querySelector<HTMLElement>('[data-deal-card]') ?? item);
  const captions = items
    .map((item) => item.querySelector<HTMLElement>('[data-deal-caption]'))
    .filter((c): c is HTMLElement => !!c);
  if (cards.length < 2) return;

  // Geometrie, solange alles noch an seinem Platz liegt.
  const rects = cards.map((c) => c.getBoundingClientRect());
  const box = list.getBoundingClientRect();
  const cx = box.left + box.width / 2;
  const top = rects[0].top;
  const n = cards.length;
  const mid = (i: number) => rects[i].left + rects[i].width / 2;
  const angle = (i: number) => (i - (n - 1) / 2) * 8;
  const R = 1000;

  gsap.set(cards, {
    x: (i: number) => cx - mid(i) + i * 1.5,
    y: (i: number) => top - rects[i].top - i * 2.5,
    rotation: (i: number) => (i % 2 ? 1 : -1) * (1.5 + i),
    position: 'relative',
    zIndex: (i: number) => n - i,
    transition: 'none',
  });
  gsap.set(captions, { y: 28, clipPath: 'inset(-10% -5% 100% -5%)' });

  gsap
    .timeline({
      scrollTrigger: {
        trigger: section,
        scroller,
        pin: true,
        pinType: 'fixed',
        start: 'center center',
        end: () => `+=${Math.round(window.innerHeight * 1.4)}`,
        scrub: 0.8,
        anticipatePin: 1,
      },
    })
    // Auffächern: auf einem Kreisbogen um einen Punkt weit unter dem Stapel.
    .to(cards, {
      x: (i: number) => cx + Math.sin((angle(i) * Math.PI) / 180) * R - mid(i),
      y: (i: number) => top - rects[i].top + (1 - Math.cos((angle(i) * Math.PI) / 180)) * R,
      rotation: (i: number) => angle(i),
      duration: 1,
      ease: 'power2.inOut',
      stagger: { each: 0.04, from: 'center' },
    })
    // Auslegen.
    .to(
      cards,
      { x: 0, y: 0, rotation: 0, duration: 1.2, ease: 'power3.inOut', stagger: { each: 0.06, from: 'center' } },
      '+=0.2'
    )
    .to(
      captions,
      { y: 0, clipPath: 'inset(-10% -5% -10% -5%)', duration: 0.5, ease: 'power2.out', stagger: 0.05 },
      '-=0.35'
    )
    // Kurz liegen lassen, bevor der Pin loslässt.
    .to({}, { duration: 0.3 });
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
        wide: '(min-width: 1024px)',
        pointer: '(hover: hover) and (pointer: fine)',
      },
      (ctx, safe) => {
        const { motion, desk, wide, pointer } = ctx.conditions as Record<string, boolean>;
        if (!motion) return;
        const scroller = appScroller() ?? window;
        const stops: Array<() => void> = [];
        if (wide) armDeckPin(scroller);
        stops.push(armReveals(safe!, { pinnedDeck: wide }));
        // Scroll-JS nur ab 768px: auf dem iPhone läuft es ein bis zwei Frames
        // hinterher (siehe HeroMarkFlight) und zittert gegen die Seite.
        if (desk) {
          armPhonesDrift(scroller);
          armMarqueePush(scroller);
        }
        if (desk && pointer) stops.push(armHeroPointer());
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
