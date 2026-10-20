'use client';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { HubArticle } from '@/lib/home/getHomeData';
import MagazineCover from './MagazineCover';
import MagazineLink from './MagazineLink';
import styles from './MagazineGrid.module.css';

export default function MagazineGrid({ articles, locale }: { articles: HubArticle[]; locale: 'de' | 'en' }) {
  const [selected, setSelected] = useState(0);
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
      <ol className={styles.covers} aria-label={en ? 'Magazine' : 'Magazin'}>
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
