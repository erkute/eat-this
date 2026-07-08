import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { HubArticle } from '@/lib/home/getHomeData';
import styles from './MagazineGrid.module.css';

interface Props {
  articles: HubArticle[];
  locale: 'de' | 'en';
}

export default function MagazineGrid({ articles, locale }: Props) {
  if (!articles.length) return null;
  const list = articles.slice(0, 6);
  const labels = {
    read: locale === 'en' ? 'Read' : 'Lesen',
    all: locale === 'en' ? 'All stories' : 'Alle Stories',
    kicker: locale === 'en' ? 'Magazine' : 'Magazin',
  };
  return (
    <section
      className={`homeV2 hv-section hv-wrap ${styles.section}`}
      aria-label={locale === 'en' ? 'Magazine' : 'Magazin'}
    >
      <div className={`hv-head ${styles.head}`}>
        <span className={styles.eyebrow}>{labels.kicker}</span>
        <h2 className="hv-title">{locale === 'en' ? 'On the plate' : 'Auf den Teller'}</h2>
        <Link href="/news" className={styles.allLink}>
          {labels.all}
        </Link>
      </div>

      <ul className={styles.grid} role="list">
        {list.map((a) => (
          <li key={a.slug}>
            <Link href={`/news/${a.slug}`} className={styles.card}>
              <span className={`hv-photo ${styles.photo}`}>
                {a.image && <Image src={a.image} alt="" fill sizes="(max-width:760px) 92vw, 33vw" />}
              </span>
              <span className={styles.text}>
                {a.kicker && <span className={styles.kicker}>{a.kicker}</span>}
                <span className={styles.title}>{a.title}</span>
                <span className={styles.readButton}>{labels.read}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
