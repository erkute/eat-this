import type { CSSProperties } from 'react';
import { categoryArt, categoryTile } from '@/lib/categoryArt';
import Image from './SiteImage';
import CategoryPackLink from './CategoryPackLink';
import styles from './CategoryGallery.module.css';

/** Direct category links: the pack is the choice, including on touch screens.
 *  Farbblöcke (Ansage 22.10.2026): jedes Pack auf einer Fläche in seiner
 *  eigenen Farbe, der Name gross unten links. */
export default function CategoryGallery({ items, locale }: {
  items: { slug: string; label: string }[];
  locale: 'de' | 'en';
}) {
  const de = locale === 'de';
  return (
    <section className={styles.gallery} aria-labelledby="category-title">
      <header className={styles.header}>
        <p className={styles.kicker}>{de ? 'Kategorien' : 'Categories'}</p>
        <h1 id="category-title">{de ? 'Was darf’s sein?' : 'What are you craving?'}</h1>
        <p>{de ? 'Berlins beste Adressen. Worauf hast du Lust?' : 'Berlin’s best spots. What are you in the mood for?'}</p>
      </header>
      <nav aria-label={de ? 'Alle Kategorien' : 'All categories'}>
        <ul className={styles.packs}>
          {items.map((item, index) => {
            const art = categoryArt(item.slug);
            const tone = categoryTile(item.slug);
            return (
              <li
                key={item.slug}
                className={tone?.ink ? styles.inkText : undefined}
                style={tone ? ({ '--tile': tone.tile } as CSSProperties) : undefined}
              >
                <CategoryPackLink slug={item.slug}>
                  <span className={styles.stage}>
                    {art && <Image src={art} alt="" width={550} height={813}
                      sizes="(max-width: 767px) 30vw, 240px" priority={index < 3} />}
                  </span>
                  <span className={styles.label}>{item.label}</span>
                </CategoryPackLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}
