import { Link } from '@/i18n/navigation';
import { categoryArt } from '@/lib/categoryArt';
import Image from './SiteImage';
import styles from './CategoryGallery.module.css';

/** Direct category links: the pack is the choice, including on touch screens. */
export default function CategoryGallery({ items, locale }: {
  items: { slug: string; label: string }[];
  locale: 'de' | 'en';
}) {
  const de = locale === 'de';
  return (
    <section className={styles.gallery} aria-labelledby="category-title">
      <header className={styles.header}>
        <h1 id="category-title">{de ? 'Was darf’s sein?' : 'What are you craving?'}</h1>
        <p>{de ? 'Berlins beste Adressen. Worauf hast du Lust?' : 'Berlin’s best spots. What are you in the mood for?'}</p>
      </header>
      <nav aria-label={de ? 'Alle Kategorien' : 'All categories'}>
        <ul className={styles.packs}>
          {items.map((item, index) => {
            const art = categoryArt(item.slug);
            return (
              <li key={item.slug}>
                <Link href={`/kategorie/${item.slug}`}>
                  <span className={styles.stage}>
                    {art && <Image src={art} alt="" width={200} height={300}
                      sizes="(max-width: 767px) 110px, 170px" priority={index < 3} />}
                  </span>
                  <span className={styles.label}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}
