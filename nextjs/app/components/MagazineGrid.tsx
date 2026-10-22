'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Link } from '@/i18n/navigation';
import type { HubArticle } from '@/lib/home/getHomeData';
import MagazineCover from './MagazineCover';
import MagazineLink from './MagazineLink';
import styles from './MagazineGrid.module.css';

export default function MagazineGrid({ articles, locale }: { articles: HubArticle[]; locale: 'de' | 'en' }) {
  const [selected, setSelected] = useState(0);
  const coversRef = useRef<HTMLOListElement>(null);
  const shown = useRef(0);
  // Am Telefon liegt ein Heft da; das gewählte schiebt sich aus der Richtung
  // seiner Vorschau auf den Platz, leicht schief, wie hingelegt.
  useEffect(() => {
    const from = shown.current;
    shown.current = selected;
    if (from === selected || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cover = coversRef.current?.children[selected];
    if (!cover) return;
    const side = selected > from ? 1 : -1;
    const tween = gsap.fromTo(cover, { x: 60 * side, rotation: 5 * side }, {
      x: 0, rotation: 0, duration: 0.55, ease: 'power3.out', clearProps: 'transform',
    });
    return () => { tween.kill(); gsap.set(cover, { clearProps: 'transform' }); };
  }, [selected]);
  const list = articles.slice(0, 4);
  if (!list.length) return null;
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
          <li key={a.slug} data-selected={index === selected}>
            <MagazineLink href={`/news/${a.slug}`} className={styles.cover}>
              <MagazineCover title={a.title} image={a.image} issue={a.issue} date={a.date} locale={locale} cover={a.cover}
                sizes="(max-width: 767px) 80vw, 23vw" widths={[480, 800, 1200]} />
            </MagazineLink>
          </li>
        ))}
      </ol>
      <div className={styles.thumbnails} role="group" aria-label={en ? 'Choose a magazine' : 'Magazin auswählen'}>
        {list.map((a, index) => (
          <button key={a.slug} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}
            aria-label={`${en ? 'Issue' : 'Ausgabe'} ${a.issue}: ${a.title}`}>
            <MagazineCover title={a.title} image={a.image} issue={a.issue} date={a.date} locale={locale} cover={a.cover} sizes="70px" widths={[180]} />
          </button>
        ))}
      </div>
      <Link href="/news" className={`hv-btn ${styles.mobileLink}`}>{en ? 'More magazines' : 'Weitere Magazine'}</Link>
    </section>
  );
}
