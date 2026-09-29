import { getLandingFaqs } from '@/lib/landing/faqs';
import styles from './HubFaq.module.css';

interface Props {
  locale: 'de' | 'en';
}

export default function HubFaq({ locale }: Props) {
  const faqs = getLandingFaqs(locale);
  if (faqs.length === 0) return null;
  return (
    <section className={`homeV2 hv-section hv-wrap ${styles.section}`}>
      <div className={styles.board}>
        <div className="hv-head">
          <h2 className="hv-title">
            <span className="hv-mk" aria-hidden="true" />
            FAQ
          </h2>
        </div>
        <div className={styles.list}>
          {/* Die erste Frage („Was ist Eat This?") steht offen: wer bis hier
              scrollt, sieht gleich, dass sich die Zeilen aufklappen lassen,
              und liest die Antwort, die am meisten fragt (Ansage 29.09.2026). */}
          {faqs.map((f, i) => (
            <details key={f.q} className={styles.item} open={i === 0}>
              <summary className={styles.question}>{f.q}</summary>
              <p className={styles.answer}>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
