'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Bewegung auf der Startseite, mit GSAP.
 *
 * Zwei Dinge, beide nur ohne `prefers-reduced-motion`:
 *
 * 1. **Auftritte unterhalb des Aufmachers.** Die Abschnittstitel werden wie mit
 *    Kreide von links nach rechts auf die Tafel geschrieben (clip-path), die
 *    Karten darunter rücken gestaffelt an ihren Platz, die Must Eats werden
 *    ausgeteilt wie ein Kartenspiel. Wer mitmacht, markiert das im Markup:
 *    `data-reveal="stagger"` (die Kinder rücken nach), `"deal"` (die Kinder
 *    werden ausgeteilt), `"rise"` (das Element selbst steigt auf). Titel
 *    brauchen nichts, das sind alle `.hv-title` der Seite.
 *    Kein Opacity-Fade (Hausregel für Brand-Flächen): alles ist die ganze Zeit
 *    voll deckend und nur verschoben oder angeschnitten.
 *
 * 2. **Die Telefone im Aufmacher driften beim Scrollen auseinander** —
 *    ScrollTrigger schiebt `--phones-drift` von 0 auf 1, die Bahn steht in
 *    HubSection.module.css. Nur ab 768px: dort scrollt `.app-pages` und die
 *    Wortmarke fliegt ohnehin aus JS. Auf dem iPhone läuft Scroll-JS ein bis
 *    zwei Frames hinterher (siehe HeroMarkFlight) — für ein Detail, das dort
 *    unter dem Text steht, lohnt das Zittern nicht.
 *
 * Der Aufmacher selbst bekommt keinen Auftritt beim Laden: er ist schon da,
 * bevor React hydriert. Ein `from()` ließe ihn fertig aufblitzen, zurückspringen
 * und dann erst einfliegen; das Telefon vorne ist außerdem das LCP-Element, und
 * HubHeroCopy baut Headline und Knöpfe neu, sobald `useAuth` steht — mitten in
 * einem Auftritt.
 *
 * Deshalb verstecken die Auftritte auch nur, was beim Mount unterhalb des
 * Bildschirms liegt. Was schon zu sehen ist (zurück-Navigation mit gemerkter
 * Scrollposition), bleibt stehen, wie es ist.
 */

/** Sprung beim Nachrücken, in px. */
const STAGGER_SHIFT = 56;
const RISE_SHIFT = 72;
const DEAL_SHIFT = 140;

function appScroller(): HTMLElement | Window {
  /* Ab 768px scrollt nicht das Fenster, sondern `.app-pages` (globals.css,
     Desktop app frame) — gesucht statt angenommen, wie in HeroMarkFlight. */
  const el = document.querySelector<HTMLElement>('.app-pages');
  return el && el.scrollHeight > el.clientHeight + 1 ? el : window;
}

/** Scrollt der Container seitwärts? Dann rücken die Karten von rechts nach. */
function sideways(el: Element): boolean {
  return /auto|scroll/.test(getComputedStyle(el).overflowX);
}

/**
 * Kreide-Anschnitt eines Titels in px. Gemessen wird der Text, nicht die Box:
 * `.hv-title` ist ein Block über die volle Tafelbreite, der Wisch wäre sonst
 * bei kurzen Titeln nach einem Drittel der Zeit fertig und stünde den Rest
 * still. Das Polster hält Providence-Tinte frei, die über die Zeilenbox ragt.
 */
function chalkInsets(title: HTMLElement): { hidden: string; shown: string } {
  const box = title.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(title);
  const text = range.getBoundingClientRect();
  const pad = Math.round(parseFloat(getComputedStyle(title).fontSize) * 0.4);
  const tail = Math.max(0, box.right - text.right) - pad;
  const lead = Math.max(0, text.left - box.left);
  return {
    hidden: `inset(${-pad}px ${box.width - lead + pad}px ${-pad}px ${-pad}px)`,
    shown: `inset(${-pad}px ${tail}px ${-pad}px ${-pad}px)`,
  };
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

  for (const title of root.querySelectorAll<HTMLElement>('.hv-title')) {
    if (!unseen(title)) continue;
    const { hidden, shown } = chalkInsets(title);
    gsap.set(title, { clipPath: hidden });
    plays.set(
      title,
      later(() =>
        gsap.to(title, {
          clipPath: shown,
          duration: 0.9,
          ease: 'power1.inOut',
          clearProps: 'clipPath',
        })
      )
    );
  }

  for (const group of root.querySelectorAll<HTMLElement>('[data-reveal]')) {
    if (!unseen(group)) continue;
    const kind = group.dataset.reveal;

    if (kind === 'rise') {
      gsap.set(group, { y: RISE_SHIFT });
      plays.set(
        group,
        later(() =>
          gsap.to(group, { y: 0, duration: 1, ease: 'power3.out', clearProps: 'transform' })
        )
      );
      continue;
    }

    const items = Array.from(group.children) as HTMLElement[];
    if (!items.length) continue;
    const across = sideways(group);
    const deal = kind === 'deal';
    const shift = deal ? DEAL_SHIFT : STAGGER_SHIFT;

    gsap.set(items, {
      x: across ? shift : 0,
      y: across ? 0 : shift,
      // Ausgeteilt liegt keine Karte gerade: abwechselnd gekippt, sie
      // richten sich beim Landen auf. Die Schräglage der Karte selbst
      // (HubMustEatsTeaser.module.css) sitzt eine Ebene tiefer und bleibt.
      rotation: deal ? (i: number) => (i % 2 ? 9 : -7) : 0,
      // Hover-Transitions auf `transform` würden jeden Frame nachziehen.
      transition: 'none',
    });
    plays.set(
      group,
      later(() =>
        gsap.to(items, {
          x: 0,
          y: 0,
          rotation: 0,
          duration: deal ? 0.95 : 0.8,
          ease: deal ? 'back.out(1.3)' : 'power3.out',
          // Lange Listen (Kategorien) sollen nicht ewig nachtröpfeln.
          stagger: Math.min(deal ? 0.1 : 0.07, 0.6 / items.length),
          clearProps: 'transform,transition',
        })
      )
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
    { rootMargin: '0px 0px -12% 0px' }
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
        scroller: appScroller(),
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
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', (_ctx, safe) => armReveals(safe!));
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      armPhonesDrift();
    });
    return () => mm.revert();
  });

  return null;
}
