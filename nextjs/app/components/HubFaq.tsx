import { getLandingFaqs } from '@/lib/landing/faqs';
import styles from './HubFaq.module.css';

interface Props {
  locale: 'de' | 'en';
}

export default function HubFaq({ locale }: Props) {
  const faqs = getLandingFaqs(locale);
  if (faqs.length === 0) return null;
  return (
    <section className={`homeV2 hv-section hv-wrap ${styles.section}`} data-hub-faq="">
      <div className={styles.board}>
        <div className="hv-head">
          <h2 className="hv-title">
            {locale === 'de' ? 'Noch Fragen?' : 'Any questions?'}
          </h2>
        </div>
        <div className={styles.list}>
          {faqs.map((f) => (
            <details key={f.q} className={styles.item}>
              <summary className={styles.question}>{f.q}</summary>
              <p className={styles.answer}>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
