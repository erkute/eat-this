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
 * 3. **Die Telefone driften beim Herausscrollen auseinander** (ScrollTrigger,
 *    `--phones-drift`). Nur ab 768px: auf dem iPhone läuft Scroll-JS ein bis
 *    zwei Frames hinterher (siehe HeroMarkFlight), das zittert.
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

function armReveals(safe: gsap.ContextSafeFunc): () => void {
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

function armPhonesDrift(): void {
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
        scroller: appScroller() ?? window,
        start: 'top top',
        end: 'bottom top',
        // Ein halber Takt Nachlauf: liest sich als Trägheit, nicht als Ruckeln.
        scrub: 0.5,
      },
    }
  );
}

export default function HubMotion() {
  useGSAP(() => {
    // Ausserhalb von matchMedia: aufräumen muss es auch, wenn jemand während
    // des Auftritts auf reduced motion umschaltet.
    const stopIntro = finishIntro();
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', (_ctx, safe) => armReveals(safe!));
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      armPhonesDrift();
    });
    return () => {
      stopIntro?.();
      mm.revert();
    };
  });

  return null;
}
