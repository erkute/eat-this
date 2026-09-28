'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { appScroller } from '@/lib/dom/appScroller';

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
 *    - `data-reveal="stagger"`: Karten richten sich gestaffelt aus der Tiefe
 *      auf, ihre Fotos werden von unten aufgedeckt und zoomen zurück.
 *    - `data-reveal="flip"`: Listenzeilen (Kategorien, FAQ) klappen einzeln
 *      aus der Tiefe nach vorn.
 *    - `data-reveal="spot"`: der Spot des Tages als Ganzes — von der Seite
 *      hereingefegt, Foto-Wisch, Datum als Stempel, Text von rechts.
 *    - Starter Pack: Remy springt aus dem Pack und redet dich an.
 *    - Frag Remy: Remy taucht auf, winkt, redet seinen Satz, reicht die
 *      Vorschläge an.
 *    - `data-reveal="deal"`: die Must Eats liegen erst als Stapel auf der
 *      ersten Karte und werden von dort an ihre Plätze ausgeteilt.
 *    Versteckt wird nur, was beim Mount unterhalb des Bildschirms liegt —
 *    was schon zu sehen ist (gemerkte Scrollposition), bleibt stehen.
 *
 * 3. **Remy quatscht beim Scrollen** (armScrollTalk), auf jeder Breite. Auf
 *    dem Telefon zeigt die Nearby-Leiste einmal selbst, dass sie seitwärts
 *    weitergeht (armRailPeek).
 *
 * 4. **Scroll und Maus, nur ab 768px** (auf dem iPhone läuft Scroll-JS ein bis
 *    zwei Frames hinterher, siehe HeroMarkFlight — das zittert):
 *    - die Telefone driften beim Herausscrollen auseinander (`--phones-drift`),
 *    - das Laufband (HubMarquee) wird beim Scrollen zusätzlich weitergeschoben,
 *    - mit echtem Zeiger kippen die Telefone in 3D zur Maus und trennen sich
 *      in der Tiefe, der Knopf im Aufmacher zieht magnetisch (armHeroPointer),
 *    - ab 1024px werden die Must Eats zur gepinnten Sequenz: Stapel,
 *      Fächer, ausgelegt — am Scrollweg statt an der Uhr (armDeckPin).
 */

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

/** GSAP setzt beim Animieren von `transform` auch `translate`/`rotate`/`scale`
 *  inline auf `none`. Wo das Element die aus CSS braucht (`:active` an
 *  Knöpfen und Chips), räumen wir alle vier ab, nicht nur `transform`. */
const CLEAR_TRANSFORMS = 'transform,translate,rotate,scale';

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
    {
      clipPath: `inset(0% 0% 0% 0% round ${r})`,
      duration: 1.3,
      ease: 'expo.inOut',
      clearProps: 'clipPath',
    },
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

/** Die Teile eines Kartenstapels (Must Eats): nur die Karte fliegt, die
 *  Beschriftung darunter wächst erst nach der Landung aus ihrer Maske — im
 *  Stapel läge sie sonst als Textsalat übereinander. Geteilt vom Austeilen
 *  (armReveals) und der gepinnten Sequenz (armDeckPin). */
function deckParts(list: Element) {
  const items = Array.from(list.children) as HTMLElement[];
  return {
    items,
    cards: items.map((item) => item.querySelector<HTMLElement>('[data-deal-card]') ?? item),
    captions: items.map((item) => item.querySelector<HTMLElement>('[data-deal-caption]')),
  };
}
// Nur als Kopie weitergeben — GSAP darf die vars-Objekte verändern.
const CAPTION_HIDDEN = { y: 28, clipPath: 'inset(-10% -5% 100% -5%)' };
const CAPTION_SHOWN = { y: 0, clipPath: 'inset(-10% -5% -10% -5%)' };

function armReveals(
  safe: gsap.ContextSafeFunc,
  { pinnedDeck }: { pinnedDeck: boolean }
): () => void {
  const root = document.querySelector<HTMLElement>('[data-hub]');
  if (!root || typeof IntersectionObserver === 'undefined') return () => {};

  const fold = window.innerHeight;
  const unseen = (el: Element) => el.getBoundingClientRect().top > fold;
  const plays = new Map<Element, () => void>();
  // Später gestartete Tweens gehören trotzdem in den matchMedia-Kontext —
  // sonst räumt ihn ein Wechsel auf reduced motion nicht mit ab.
  const later = (play: () => void) => safe(play) as () => void;

  /* ── Titel ── Bis zum Auftritt ganz angeschnitten. Zerlegt wird dann eine
     Kopie, die für die Dauer des Auftritts deckungsgleich im Titel liegt —
     nie der Titel selbst: SplitText leert beim Zerlegen die Textknoten und
     stellt per innerHTML wieder her, React schriebe danach ins Leere (der
     Nearby-Titel wechselt mit dem Standort), und verschachtelte Zeilen wie
     bei Remy blieben zerlegt stehen. So fasst die Animation React-eigene
     Knoten nicht an; am Ende fliegt die Kopie raus. */
  for (const title of root.querySelectorAll<HTMLElement>('.hv-title')) {
    if (!unseen(title)) continue;
    gsap.set(title, { clipPath: 'inset(0% 0% 100% 0%)' });
    plays.set(
      title,
      later(() => {
        const cs = getComputedStyle(title);
        const ghost = title.cloneNode(true) as HTMLElement;
        ghost.removeAttribute('id');
        ghost.setAttribute('aria-hidden', 'true');
        Object.assign(ghost.style, {
          position: 'absolute',
          inset: '0',
          margin: '0',
          color: cs.color,
          pointerEvents: 'none',
        });
        // Das Original hält Platz und Semantik, sichtbar ist die Kopie.
        gsap.set(title, { clearProps: 'clipPath', position: 'relative', color: 'transparent' });
        const marks = title.querySelectorAll<HTMLElement>('.hv-mk');
        gsap.set(marks, { visibility: 'hidden' });
        title.append(ghost);
        const split = SplitText.create(ghost, { type: 'lines,chars', mask: 'lines' });
        const tl = gsap.timeline({
          onComplete: () => {
            ghost.remove();
            gsap.set(title, { clearProps: 'position,color' });
            gsap.set(marks, { clearProps: 'visibility' });
          },
        });
        tl.from(split.chars, {
          yPercent: 120,
          rotation: 10,
          duration: 1.05,
          ease: 'expo.out',
          stagger: Math.min(0.035, 0.6 / split.chars.length),
        });
        const mark = ghost.querySelector('.hv-mk');
        if (mark) {
          tl.from(mark, { scale: 0, rotation: -180, duration: 0.9, ease: 'back.out(2)' }, 0.05);
        }
      })
    );
  }

  for (const group of root.querySelectorAll<HTMLElement>('[data-reveal]')) {
    if (!unseen(group)) continue;
    const kind = group.dataset.reveal;

    /* ── Spot des Tages ── Die Tafel fegt als Ganzes von rechts herein und
       richtet sich auf, dabei wischt das Foto von links auf und zoomt zurück.
       Dann landet das Datum wie ein Stempel — die Tafel ruckt beim Aufprall
       —, und der Text rückt Zeile für Zeile von rechts nach, der Knopf springt
       zuletzt auf. Seitlich raus ragt dabei nichts: `.page` schneidet quer ab
       (HubSection.module.css). */
    if (kind === 'spot') {
      const lines = Array.from(group.querySelectorAll<HTMLElement>('[data-reveal-line]'));
      const cta = lines.pop();
      const stamp = group.querySelector<HTMLElement>('[data-reveal-stamp]');
      const photo = group.querySelector<HTMLElement>('.hv-photo');
      const img = photo?.querySelector('img');
      gsap.set(group, { xPercent: 105, rotation: 4, skewX: -8, transformOrigin: '100% 100%' });
      if (photo) gsap.set(photo, { clipPath: 'inset(0% 100% 0% 0%)' });
      gsap.set(lines, { x: 80 });
      if (cta) gsap.set(cta, { scale: 0 });
      // Bis zum Aufschlag verborgen, sonst hinge das Datum dreifach groß über
      // dem Titel. `visibility`, kein Durchsichtig-Werden.
      if (stamp) gsap.set(stamp, { scale: 3, rotation: -18, visibility: 'hidden' });
      // Beobachtet wird die ruhende Section, nicht die Tafel: die steht jetzt
      // neben dem Bildschirm, und ihre verschobene Box käme nie ins Bild.
      plays.set(
        group.parentElement ?? group,
        later(() => {
          const r = photo ? getComputedStyle(photo).borderTopLeftRadius || '0px' : '0px';
          const tl = gsap.timeline();
          tl.to(group, {
            xPercent: 0,
            rotation: 0,
            skewX: 0,
            duration: 1.25,
            ease: 'expo.out',
            clearProps: 'transform,transformOrigin',
          });
          if (photo) {
            tl.fromTo(
              photo,
              { clipPath: `inset(0% 100% 0% 0% round ${r})` },
              {
                clipPath: `inset(0% 0% 0% 0% round ${r})`,
                duration: 1.1,
                ease: 'expo.inOut',
                clearProps: 'clipPath',
              },
              0.25
            );
          }
          if (img) {
            tl.fromTo(
              img,
              { scale: 1.45, xPercent: -8, transition: 'none' },
              {
                scale: 1,
                xPercent: 0,
                duration: 1.8,
                ease: 'expo.out',
                clearProps: 'transform,transition',
              },
              0.25
            );
          }
          if (stamp) {
            tl.set(stamp, { visibility: 'visible' }, 0.75).to(
              stamp,
              {
                scale: 1,
                rotation: 0,
                duration: 0.45,
                ease: 'back.out(2.4)',
                clearProps: 'transform,visibility',
              },
              0.75
            );
            // Der Aufprall des Stempels geht durch die Tafel.
            tl.fromTo(
              group,
              { y: 0 },
              // Kein clearProps hier: der Einflug läuft noch und räumt am Ende ab.
              { y: 5, duration: 0.07, yoyo: true, repeat: 1, ease: 'power1.inOut' },
              0.95
            );
          }
          tl.to(
            lines,
            { x: 0, duration: 1, ease: 'expo.out', stagger: 0.08, clearProps: CLEAR_TRANSFORMS },
            0.55
          );
          if (cta) {
            tl.to(
              cta,
              { scale: 1, duration: 0.6, ease: 'back.out(2)', clearProps: CLEAR_TRANSFORMS },
              '-=0.6'
            );
          }
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
      const { cards, captions } = deckParts(group);
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
      gsap.set(shown, { ...CAPTION_HIDDEN });
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
                  ...CAPTION_SHOWN,
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

    /* ── Klappliste (Kategorien, FAQ) ── Jede Zeile klappt aus der Tiefe nach
       vorn, an ihrer Oberkante aufgehängt, wie ein Blatt, das umgeschlagen
       wird — im Raster diagonal von oben links nach unten rechts. */
    if (kind === 'flip') {
      gsap.set(items, {
        rotationX: -100,
        y: 24,
        transformPerspective: 700,
        transformOrigin: '50% 0%',
        transition: 'none',
      });
      plays.set(
        group,
        later(() =>
          gsap.to(items, {
            rotationX: 0,
            y: 0,
            duration: 0.9,
            ease: 'back.out(1.3)',
            stagger: { amount: 0.6, grid: 'auto', from: 'start' },
            clearProps: 'transform,transition',
          })
        )
      );
      continue;
    }

    /* ── Gestaffelte Karten ── Sie stehen auf: aus einer nach hinten gekippten
       Lage unter ihrem Platz richten sie sich auf, während das Foto von unten
       aufgedeckt wird. In seitwärts scrollenden Leisten kommen sie gedreht
       von rechts, wie Karten, die man aufschlägt. */
    const across = sideways(group);
    // Über Variablen, nicht über `transform`: GSAP zöge sonst die CSS-Eigen-
    // schaften `translate`/`rotate`/`scale` der Karten in sein `transform` und
    // setzte sie inline auf `none` — das Schwingen der Nearby-Karten und ihr
    // Druckzustand wären tot, und eingefrorene Werte blieben stehen (gemessen).
    // Die Regel dazu (`[data-revealing]`) steht in HubSection.module.css.
    gsap.set(items, {
      '--rv-x': across ? 110 : 0,
      '--rv-y': across ? 0 : 90,
      '--rv-rx': across ? 0 : 28,
      '--rv-ry': across ? -28 : 0,
      '--rv-origin': across ? '0% 50%' : '50% 100%',
    });
    items.forEach((item) => item.setAttribute('data-revealing', ''));
    items.forEach(hidePhoto);
    plays.set(
      group,
      later(() => {
        const each = Math.min(0.1, 0.7 / items.length);
        const tl = gsap.timeline();
        tl.to(
          items,
          {
            '--rv-x': 0,
            '--rv-y': 0,
            '--rv-rx': 0,
            '--rv-ry': 0,
            duration: 1.4,
            ease: 'expo.out',
            stagger: each,
            onComplete() {
              for (const t of this.targets() as HTMLElement[]) t.removeAttribute('data-revealing');
              gsap.set(this.targets(), { clearProps: '--rv-x,--rv-y,--rv-rx,--rv-ry,--rv-origin' });
            },
          },
          0
        );
        items.forEach((item, i) => photoReveal(item, tl, i * each));
      })
    );
  }

  /* ── Starter Pack ── Das Pack ruckelt, als rege sich etwas darin; dann
     springt Remy im Bogen heraus, landet vorn mit einem Stauchen, beugt sich
     zu dir und redet — die Blase tippt sich Zeichen für Zeichen, sein Mund
     klappt dazu (`data-talking`). Danach alle sieben Sekunden noch ein Satz,
     nur der Mund. Ausgangspunkt ist die Mitte des Packs, gerechnet aus der
     Lage beim Mount. */
  const scene = root.querySelector<HTMLElement>('[data-starter-scene]');
  const pack = scene?.querySelector<HTMLElement>('[data-starter-pack]');
  const remy = scene?.querySelector<HTMLElement>('[data-starter-remy]');
  const bubble = scene?.querySelector<HTMLElement>('[data-starter-bubble]');
  if (scene && pack && remy && bubble && unseen(scene)) {
    const chars = Array.from(bubble.querySelectorAll<HTMLElement>('[data-starter-char]'));
    const p = pack.getBoundingClientRect();
    const r = remy.getBoundingClientRect();
    const dx = p.left + p.width / 2 - (r.left + r.width / 2);
    const dy = p.top + p.height * 0.45 - (r.top + r.height / 2);
    const arc = Math.min(dy, 0) - r.height * 0.7;
    gsap.set(remy, { x: dx, y: dy, scale: 0.2, rotation: -25, visibility: 'hidden' });
    gsap.set(bubble, { scale: 0, visibility: 'hidden' });
    gsap.set(chars, { visibility: 'hidden' });
    const talk = (on: boolean) => remy.toggleAttribute('data-talking', on);
    plays.set(
      scene,
      later(() => {
        const tl = gsap.timeline();
        tl.to(pack, { rotation: 3, duration: 0.06, yoyo: true, repeat: 7, ease: 'sine.inOut' })
          .to(pack, { rotation: 0, duration: 0.1, clearProps: 'transform' })
          .set(remy, { visibility: 'visible' }, '-=0.05')
          .addLabel('jump')
          .to(remy, { x: 0, scale: 1, rotation: 0, duration: 0.8, ease: 'power1.out' }, 'jump')
          .to(remy, { y: arc, duration: 0.38, ease: 'power2.out' }, 'jump')
          .to(remy, { y: 0, duration: 0.42, ease: 'power2.in' }, 'jump+=0.38')
          // Landung: stauchen, dann federnd aufrichten.
          .to(remy, { scaleY: 0.8, scaleX: 1.14, duration: 0.08, ease: 'power1.out' }, 'jump+=0.8')
          .to(remy, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1, 0.45)' })
          // Zu dir hin: vorbeugen, dann wieder gerade.
          .to(remy, { scale: 1.12, rotation: -5, duration: 0.35, ease: 'power2.out' }, '-=0.35')
          .addLabel('talk')
          .call(() => talk(true), undefined, 'talk')
          .set(bubble, { visibility: 'visible' }, 'talk')
          .to(bubble, { scale: 1, duration: 0.45, ease: 'back.out(2.2)' }, 'talk')
          .to(chars, { visibility: 'visible', duration: 0, stagger: 0.045 }, 'talk+=0.15')
          .to(remy, { scale: 1, rotation: 0, duration: 0.6, ease: 'power2.inOut' }, '>+0.3')
          .call(() => talk(false))
          .set(remy, { clearProps: 'transform,visibility' })
          .set(bubble, { clearProps: 'transform,visibility' })
          .set(chars, { clearProps: 'visibility' });
        // Ab und zu noch ein Satz.
        gsap
          .timeline({ repeat: -1, repeatDelay: 7, delay: tl.duration() + 7 })
          .call(() => talk(true))
          .call(() => talk(false), undefined, 1.6);
      })
    );
  }

  /* ── Frag Remy ── Remy taucht von unten auf wie hinter einem Tresen, die
     Hand kommt nach, winkt und dreht sich dann zum Chat. Während er redet
     (`data-speaking`, der Mund klappt), schreibt sich sein Satz von links nach
     rechts hin — als Wisch, nicht zerlegt: der Satz wechselt nach der
     Hydrierung mit der Tageszeit, React muss hineinschreiben können. Danach
     reicht er die Vorschläge an (sie springen auf) und das Feld steigt nach. */
  const remyStage = root.querySelector<HTMLElement>('[data-hub-fragremy]');
  const remyWrap = remyStage?.querySelector<HTMLElement>('[data-fragremy-avatar]');
  const hand = remyStage?.querySelector<HTMLElement>('[data-fragremy-hand]');
  const remyLead = remyStage?.querySelector<HTMLElement>('[data-fragremy-lead]');
  const remyForm = remyStage?.querySelector<HTMLElement>('[data-fragremy-form]');
  const chipBox = remyStage?.querySelector<HTMLElement>('[data-fragremy-chips]');
  if (remyStage && remyWrap && hand && remyLead && unseen(remyStage)) {
    const chips = chipBox ? (Array.from(chipBox.children) as HTMLElement[]) : [];
    gsap.set(remyWrap, { yPercent: 70, rotation: -6 });
    gsap.set(hand, { yPercent: 150 });
    gsap.set(remyLead, { clipPath: 'inset(-20% 100% -20% 0%)' });
    gsap.set(chips, { scale: 0, transformOrigin: '0% 50%' });
    if (remyForm) gsap.set(remyForm, { y: 40, clipPath: 'inset(0% 0% 100% 0%)' });
    const speak = (on: boolean) => remyWrap.toggleAttribute('data-speaking', on);
    plays.set(
      remyStage,
      later(() => {
        const words = remyLead.textContent?.length ?? 60;
        const say = gsap.utils.clamp(1, 2.4, words * 0.028);
        const tl = gsap.timeline();
        tl.to(remyWrap, {
          yPercent: 0,
          rotation: 0,
          duration: 0.9,
          ease: 'back.out(1.4)',
          clearProps: 'transform',
        })
          .to(hand, { yPercent: 0, duration: 0.6, ease: 'back.out(1.6)' }, 0.45)
          // Winken: vom Handgelenk aus hin und her, dann zum Chat gedreht stehen.
          .to(hand, { rotation: 20, duration: 0.16, ease: 'sine.inOut' }, 1)
          .to(hand, { rotation: -14, duration: 0.2, ease: 'sine.inOut', yoyo: true, repeat: 4 })
          .to(hand, { rotation: 0, duration: 0.35, ease: 'back.out(2)', clearProps: 'transform' })
          .call(() => speak(true), undefined, 0.7)
          .to(
            remyLead,
            {
              clipPath: 'inset(-20% 0% -20% 0%)',
              duration: say,
              ease: 'none',
              clearProps: 'clipPath',
            },
            0.75
          )
          .call(() => speak(false), undefined, 0.75 + say)
          .to(
            chips,
            {
              scale: 1,
              duration: 0.5,
              ease: 'back.out(2.2)',
              stagger: 0.12,
              clearProps: CLEAR_TRANSFORMS,
            },
            0.75 + say - 0.2
          )
          .to(
            remyForm ?? [],
            {
              y: 0,
              clipPath: 'inset(-10% -5% -10% -5%)',
              duration: 0.8,
              ease: 'expo.out',
              clearProps: 'transform,clipPath',
            },
            '-=0.3'
          );
        // Alle neun Sekunden winkt er noch einmal kurz.
        gsap
          .timeline({ repeat: -1, repeatDelay: 9, delay: tl.duration() + 6 })
          .to(hand, { rotation: 18, duration: 0.18, ease: 'sine.inOut' })
          .to(hand, { rotation: -10, duration: 0.2, ease: 'sine.inOut', yoyo: true, repeat: 3 })
          .to(hand, { rotation: 0, duration: 0.3, ease: 'back.out(2)' });
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
 * kippen im 3D-Raum (Perspektive aus `.heroGrid`) zur Maus und trennen sich in der Tiefe (`--px/--py`, die Bahn
 * steht in HubSection.module.css), der Knopf zieht magnetisch zum Zeiger.
 * Die Knöpfe werden bei jeder Bewegung neu gesucht: HubHeroCopy tauscht sie
 * aus, sobald `useAuth` steht.
 */
function armHeroPointer(): () => void {
  const hero = document.querySelector<HTMLElement>('[data-hub-hero]');
  const phones = hero?.querySelector<HTMLElement>('[data-hub-phones]');
  if (!hero || !phones) return () => {};

  const follow = { duration: 0.9, ease: 'power3' };
  const px = gsap.quickTo(hero, '--px', follow);
  const py = gsap.quickTo(hero, '--py', follow);
  // Neigung als Variablen, nicht als `transform` über GSAP: das würde den
  // CSS-Schwenk (`rotate`) und den Druckzustand (`scale`) inline auf `none`
  // setzen (gemessen). Die Bahn steht in HubSection.module.css.
  const tiltX = gsap.quickTo(phones, '--tilt-x', follow);
  const tiltY = gsap.quickTo(phones, '--tilt-y', follow);

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
    tiltY(nx * 22);
    tiltX(ny * -14);
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
    gsap.set(phones, { clearProps: '--tilt-x,--tilt-y' });
    gsap.set(hero, { clearProps: '--px,--py' });
    magnets().forEach((el) => gsap.set(el, { clearProps: '--mx,--my' }));
  };
}

/** Das Laufband läuft von allein (CSS); Scrollen schiebt es zusätzlich
 *  weiter, in der Richtung aus `data-marquee-row`. */
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
        scrollTrigger: {
          trigger: band,
          scroller,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6,
        },
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
  const parts = deckParts(list);
  const cards = parts.cards;
  const captions = parts.captions.filter((c): c is HTMLElement => !!c);
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
  gsap.set(captions, { ...CAPTION_HIDDEN });

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
      {
        x: 0,
        y: 0,
        rotation: 0,
        duration: 1.2,
        ease: 'power3.inOut',
        stagger: { each: 0.06, from: 'center' },
      },
      '+=0.2'
    )
    .to(captions, { ...CAPTION_SHOWN, duration: 0.5, ease: 'power2.out', stagger: 0.05 }, '-=0.35')
    // Kurz liegen lassen, bevor der Pin loslässt.
    .to({}, { duration: 0.3 });
}

/**
 * „Um dich herum" auf dem Telefon: die Leiste scrollt seitwärts, und dass
 * rechts noch mehr kommt, sah man nur an einer angeschnittenen Karte. Kommt
 * sie ins Bild, stupst sie sich selbst an — ein Stück nach rechts und zurück,
 * wie jemand, der kurz zeigt, dass es weitergeht. Zweimal, dann Ruhe; sobald
 * jemand selbst wischt, sofort.
 */
function armRailPeek(): () => void {
  const rail = document.querySelector<HTMLElement>('[data-hub-nearby] .hv-rail');
  if (!rail || typeof IntersectionObserver === 'undefined') return () => {};
  let tl: gsap.core.Timeline | null = null;
  const stop = () => {
    tl?.kill();
    tl = null;
    rail.style.removeProperty('scroll-snap-type');
  };
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting || rail.scrollWidth <= rail.clientWidth + 10) return;
      io.disconnect();
      // Scroll-Snap würde jeden Zwischenschritt zurückschnappen lassen.
      rail.style.setProperty('scroll-snap-type', 'none');
      const peek = Math.min(140, rail.scrollWidth - rail.clientWidth);
      tl = gsap
        .timeline({ delay: 1.2, repeat: 1, repeatDelay: 2.4, onComplete: stop })
        .to(rail, { scrollLeft: peek, duration: 0.7, ease: 'power2.inOut' })
        .to(rail, { scrollLeft: 0, duration: 0.9, ease: 'back.out(1.6)' }, '+=0.25');
    },
    { threshold: 0.6 }
  );
  io.observe(rail);
  rail.addEventListener('pointerdown', stop, { once: true });
  rail.addEventListener('touchstart', stop, { once: true, passive: true });
  rail.addEventListener('wheel', stop, { once: true, passive: true });
  return () => {
    io.disconnect();
    stop();
    rail.removeEventListener('pointerdown', stop);
    rail.removeEventListener('touchstart', stop);
    rail.removeEventListener('wheel', stop);
  };
}

/**
 * Remy quatscht, solange gescrollt wird: `data-remy-talk` am <html>, bis eine
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
 * ScrollTrigger misst Start und Ende einmal und dann nur bei Resize/Load neu.
 * Wächst die Seite oberhalb eines Triggers danach — die Markenschrift von
 * Typekit kommt nach, Bilder ohne feste Höhe, die Nearby-Karten nach der
 * Standortfreigabe —, griffe der Must-Eat-Pin an der alten Stelle: gemessen
 * 300px zu früh bei 300px Zuwachs. Also bei jeder Höhenänderung der Seite neu
 * messen, gebündelt auf eine Messung pro Ruhephase.
 */
function refreshOnReflow(): () => void {
  const root = document.querySelector<HTMLElement>('[data-hub]');
  if (!root || typeof ResizeObserver === 'undefined') return () => {};
  let timer = 0;
  let last = root.offsetHeight;
  const ro = new ResizeObserver(() => {
    // Der Pin-Abstandhalter ändert die Höhe selbst nicht mehr, sobald er steht;
    // nur echte Änderungen zählen, sonst misst es sich im Kreis.
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
        stops.push(armScrollTalk(scroller));
        if (!desk) stops.push(armRailPeek());
        // Scroll-JS nur ab 768px: auf dem iPhone läuft es ein bis zwei Frames
        // hinterher (siehe HeroMarkFlight) und zittert gegen die Seite.
        if (desk) {
          armPhonesDrift(scroller);
          armMarqueePush(scroller);
          stops.push(refreshOnReflow());
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
