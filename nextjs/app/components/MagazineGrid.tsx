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
  const [lead, ...rest] = articles;
  const list = rest.slice(0, 5);
  return (
    <section
      className="homeV2 hv-section hv-wrap"
      aria-label={locale === 'en' ? 'Magazine' : 'Magazin'}
    >
      <div className="hv-head">
        <h2 className="hv-title">
          <span className="hv-mk" aria-hidden="true" />
          {locale === 'en' ? 'On the plate' : 'Auf den Teller'}
        </h2>
        <Link href="/news" className="hv-link">
          {locale === 'en' ? 'Magazine' : 'Magazin'} →
        </Link>
      </div>

      <div className={styles.grid}>
        {/* Lead story */}
        <Link href={`/news/${lead.slug}`} className={styles.lead}>
          <span className={`hv-photo ${styles.leadPhoto}`}>
            {lead.image && (
              <Image src={lead.image} alt="" fill sizes="(max-width:760px) 92vw, 56vw" />
            )}
          </span>
          {lead.kicker && <span className={styles.kicker}>{lead.kicker}</span>}
          <span className={styles.leadTitle}>{lead.title}</span>
        </Link>

        {/* Headline list */}
        {list.length > 0 && (
          <ul className={styles.list}>
            {list.map((a) => (
              <li key={a.slug}>
                <Link href={`/news/${a.slug}`} className={styles.row}>
                  <span className={`hv-photo ${styles.rowThumb}`}>
                    {a.image && <Image src={a.image} alt="" fill sizes="120px" />}
                  </span>
                  <span className={styles.rowText}>
                    {a.kicker && <span className={styles.kicker}>{a.kicker}</span>}
                    <span className={styles.rowTitle}>{a.title}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
