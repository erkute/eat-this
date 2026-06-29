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
  const secondary = rest.slice(0, 2);
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
        <span className="hv-link">{locale === 'en' ? 'Magazine' : 'Magazin'} →</span>
      </div>
      <div className={styles.grid}>
        <Link href={`/news/${lead.slug}`} className={styles.lead}>
          <span className={`hv-photo ${styles.leadPhoto}`}>
            {lead.image && (
              <Image src={lead.image} alt="" fill sizes="(max-width:760px) 92vw, 58vw" />
            )}
          </span>
          {lead.kicker && <span className="hv-sub">{lead.kicker}</span>}
          <span className="hv-cap">{lead.title}</span>
        </Link>
        <div className={styles.secondary}>
          {secondary.map((a) => (
            <Link key={a.slug} href={`/news/${a.slug}`} className={styles.secItem}>
              <span className={`hv-photo ${styles.secPhoto}`}>
                {a.image && (
                  <Image src={a.image} alt="" fill sizes="(max-width:760px) 92vw, 30vw" />
                )}
              </span>
              <span className="hv-cap">{a.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
