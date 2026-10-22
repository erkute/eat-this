'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Link } from '@/i18n/navigation';
import type { HubArticle } from '@/lib/home/getHomeData';
import MagazineCover from './MagazineCover';
import MagazineLink from './MagazineLink';
import styles from './MagazineGrid.module.css';

const MOBILE = '(max-width: 767.98px)';

/* Am Telefon liegen die Hefte als Stapel wie auf einem Couchtisch (Ansage
   22.10.2026: „neu designen im Wischen auf Mobile, so ne geile GSAP-
   Animation"): das oberste gerade, die übrigen schauen verdreht darunter
   hervor. Man zieht das oberste zur Seite, es kippt mit dem Finger, fliegt
   beim Loslassen weg und schiebt sich unten wieder unter den Stapel.
   Bewusst Draggable statt Scroll-Snap — einen Stapel kann Scroll-Snap nicht;
   senkrecht scrollt die Seite weiter nativ (allowNativeTouchScrolling). */
const POSES = [
  { x: 0, y: 0, rotation: 0, scale: 1 },
  { x: -10, y: 12, rotation: -4.5, scale: 0.955 },
  { x: 12, y: 20, rotation: 3.5, scale: 0.92 },
  { x: -5, y: 27, rotation: -1.5, scale: 0.89 },
];

const depthOf = (index: number, top: number, count: number) => (index - top + count) % count;

function pose(depth: number, count: number) {
  return { ...POSES[Math.min(depth, POSES.length - 1)], zIndex: count - depth };
}

export default function MagazineGrid({ articles, locale }: { articles: HubArticle[]; locale: 'de' | 'en' }) {
  const [selected, setSelected] = useState(0);
  const coversRef = useRef<HTMLOListElement>(null);
  const shown = useRef(0);
  const flickDir = useRef(-1);
  const list = articles.slice(0, 4);
  const count = list.length;

  // Der Stapel selbst: Posen setzen, Ziehen anbinden. Nur am Telefon; am
  // Desktop räumt matchMedia alle Transforms wieder ab. Die verdeckten Hefte
  // bleiben echte Links für Tastatur und Vorlesen — bekommt eins den Fokus,
  // wandert es nach oben (onFocus). Antippen lässt sich nur das oberste.
  useEffect(() => {
    const ol = coversRef.current;
    if (!ol || count < 2) return;
    const mm = gsap.matchMedia();
    mm.add(MOBILE, () => {
      const items = Array.from(ol.children) as HTMLElement[];
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const top = () => items[shown.current];
      items.forEach((item, i) => gsap.set(item, pose(depthOf(i, shown.current, count), count)));

      let dragged = false;
      let lastX = 0;
      let lastT = 0;
      let velocity = 0;
      let draggable: { kill: () => void } | null = null;
      let alive = true;
      const proxy = document.createElement('div');

      void import('gsap/Draggable').then(({ Draggable }) => {
        if (!alive) return;
        gsap.registerPlugin(Draggable);
        [draggable] = Draggable.create(proxy, {
          type: 'x',
          trigger: ol,
          allowNativeTouchScrolling: true,
          minimumMovement: 6,
          dragClickables: true,
          onPress() {
            dragged = false;
            gsap.killTweensOf(top());
            gsap.set(proxy, { x: 0 });
            lastX = 0;
            lastT = performance.now();
            velocity = 0;
          },
          onDrag(this: { x: number }) {
            dragged = true;
            const now = performance.now();
            velocity = (this.x - lastX) / Math.max(1, now - lastT);
            lastX = this.x;
            lastT = now;
            // Das Heft kippt mit dem Finger; das nächste hebt sich schon an.
            const progress = Math.min(1, Math.abs(this.x) / (ol.clientWidth * 0.5));
            gsap.set(top(), { x: this.x, rotation: this.x * 0.05, y: -Math.abs(this.x) * 0.04 });
            const next = items[(shown.current + 1) % count];
            const from = POSES[1];
            gsap.set(next, {
              x: from.x * (1 - progress), y: from.y * (1 - progress),
              rotation: from.rotation * (1 - progress), scale: from.scale + (1 - from.scale) * progress,
            });
          },
          onRelease(this: { x: number }) {
            if (!dragged) return;
            const far = Math.abs(this.x) > ol.clientWidth * 0.28 || Math.abs(velocity) > 0.55;
            if (far) {
              flickDir.current = Math.sign(this.x || velocity) || -1;
              setSelected(s => (s + 1) % count);
              return;
            }
            // Nicht weit genug: alles legt sich zurück.
            items.forEach((item, i) => gsap.to(item, {
              ...pose(depthOf(i, shown.current, count), count),
              duration: reduced ? 0 : 0.5, ease: 'elastic.out(1, 0.6)',
            }));
          },
        }) as unknown as { kill: () => void }[];
      });

      // Nach einem Zug ist der folgende Klick kein Antippen — sonst öffnete
      // jedes weggewischte Heft seinen Artikel.
      const swallow = (event: MouseEvent) => {
        if (!dragged) return;
        event.preventDefault();
        event.stopPropagation();
        dragged = false;
      };
      ol.addEventListener('click', swallow, true);

      return () => {
        alive = false;
        draggable?.kill();
        ol.removeEventListener('click', swallow, true);
        items.forEach(item => gsap.set(item, { clearProps: 'all' }));
      };
    });
    // Am Desktop hebt sich das Heft unter der Maus vom Tisch ab: es steigt,
    // kippt leicht schief, wirft einen tieferen Schatten und neigt sich mit
    // dem Zeiger (Ansage 22.10.2026: „auf Desktop ne passende Hover-
    // Animation"). Animiert wird der Link im Heft, nicht das <li> — das
    // gehört dem Austeilen in HubMotion.
    mm.add('(min-width: 768px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
      const covers = Array.from(ol.querySelectorAll<HTMLElement>(':scope > li > a'));
      const tilts = [-1.6, 1.3, -1.1, 1.5];
      const rest = 'drop-shadow(0px 0px 0px rgba(21, 18, 14, 0))';
      gsap.set(covers, { transformPerspective: 900, transformOrigin: '50% 60%', filter: rest });
      const off = covers.map((cover, i) => {
        const tiltX = gsap.quickTo(cover, 'rotationX', { duration: 0.5, ease: 'power3.out' });
        const tiltY = gsap.quickTo(cover, 'rotationY', { duration: 0.5, ease: 'power3.out' });
        const enter = () => gsap.to(cover, {
          y: -14, scale: 1.035, rotation: tilts[i % tilts.length],
          filter: 'drop-shadow(0px 22px 24px rgba(21, 18, 14, 0.32))',
          duration: 0.45, ease: 'power3.out', overwrite: 'auto',
        });
        const move = (event: PointerEvent) => {
          const box = cover.getBoundingClientRect();
          tiltY(((event.clientX - box.left) / box.width - 0.5) * 10);
          tiltX(-((event.clientY - box.top) / box.height - 0.5) * 8);
        };
        const leave = () => {
          tiltX(0);
          tiltY(0);
          gsap.to(cover, {
            y: 0, scale: 1, rotation: 0, filter: rest,
            duration: 0.8, ease: 'elastic.out(1, 0.55)', overwrite: 'auto',
          });
        };
        cover.addEventListener('pointerenter', enter);
        cover.addEventListener('pointermove', move);
        cover.addEventListener('pointerleave', leave);
        return () => {
          cover.removeEventListener('pointerenter', enter);
          cover.removeEventListener('pointermove', move);
          cover.removeEventListener('pointerleave', leave);
        };
      });
      return () => {
        off.forEach(fn => fn());
        gsap.set(covers, { clearProps: 'all' });
      };
    });
    return () => mm.revert();
  }, [count]);

  // Ein neues oberstes Heft: die darüber fliegen nacheinander zur Seite weg
  // und schieben sich hinten wieder unter den Stapel — ein Wisch blättert
  // eins weiter, der Fokus blättert bis zu seinem Heft durch.
  useEffect(() => {
    const ol = coversRef.current;
    const from = shown.current;
    shown.current = selected;
    if (!ol || !window.matchMedia(MOBILE).matches) return;
    const items = Array.from(ol.children) as HTMLElement[];
    if (from === selected) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const steps = depthOf(selected, from, count);
    const dir = flickDir.current;
    flickDir.current = -1;
    if (reduced) {
      items.forEach((item, i) => gsap.set(item, pose(depthOf(i, selected, count), count)));
      return;
    }
    const tl = gsap.timeline();
    for (let step = 0; step < steps; step++) {
      const top = (from + step) % count;
      const at = step * 0.16;
      const card = items[top];
      tl.set(card, { zIndex: count + 1 }, at)
        .to(card, {
        x: dir * ol.clientWidth * 1.15, y: -30, rotation: dir * 24,
        duration: 0.32, ease: 'power2.in',
      }, at)
        .set(card, { zIndex: 0 }, at + 0.32)
        .to(card, { ...POSES[POSES.length - 1], duration: 0.55, ease: 'power3.out' }, at + 0.32);
      items.forEach((item, i) => {
        if (i === top) return;
        tl.to(item, { ...pose(depthOf(i, (top + 1) % count, count), count), duration: 0.5, ease: 'power3.out' }, at + 0.12);
      });
    }
    // Zum Schluss liegt jedes Heft genau auf seinem Platz — beim Durchblättern
    // überlagern sich sonst die Wege einzelner Hefte.
    const end = tl.duration();
    items.forEach((item, i) => tl.to(item, { ...pose(depthOf(i, selected, count), count), duration: 0.35, ease: 'power2.out' }, end - 0.2));
    return () => { tl.progress(1).kill(); };
  }, [selected, count]);

  if (!count) return null;
  const en = locale === 'en';
  return (
    <section className={styles.section} data-hub-magazine="" aria-labelledby="home-magazine-title">
      <div className={styles.header}>
        <h2 id="home-magazine-title">{en ? <>On the<br />plate.</> : <>Auf dem<br />Teller.</>}</h2>
        <div className={styles.intro}>
          <p className={styles.kicker}>{en ? 'THE EAT THIS MAGAZINE' : 'DAS EAT THIS MAGAZIN'}</p>
          <p>{en ? 'Stories from Berlin’s food scene.' : 'Geschichten aus Berlins Food-Szene.'}</p>
          <Link href="/news" className={`hv-btn ${styles.desktopLink}`}>{en ? 'More magazines' : 'Weitere Magazine'}</Link>
        </div>
      </div>
      <ol ref={coversRef} className={styles.covers} aria-label={en ? 'Magazine' : 'Magazin'}>
        {list.map((a, index) => (
          <li key={a.slug} data-selected={index === selected} onFocus={() => setSelected(index)}>
            <MagazineLink href={`/news/${a.slug}`} className={styles.cover}>
              <MagazineCover title={a.title} image={a.image} issue={a.issue} date={a.date} locale={locale} cover={a.cover}
                sizes="(max-width: 767px) 80vw, 23vw" widths={[480, 800, 1200]} />
            </MagazineLink>
          </li>
        ))}
      </ol>
      <Link href="/news" className={`hv-btn ${styles.mobileLink}`}>{en ? 'More magazines' : 'Weitere Magazine'}</Link>
    </section>
  );
}
