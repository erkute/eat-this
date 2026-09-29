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
            <span className="hv-mk" aria-hidden="true" />
            FAQ
          </h2>
        </div>
        <div className={styles.list}>
          {/* Die erste Frage („Was ist Eat This?") klappt von selbst auf,
              sobald die Liste ins Bild kommt (HubMotion, `armFaqOpen`): wer
              bis hier scrollt, sieht, dass sich die Zeilen öffnen lassen
              (Ansage 29.09.2026 — in Bewegung, nicht schon offen). */}
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
