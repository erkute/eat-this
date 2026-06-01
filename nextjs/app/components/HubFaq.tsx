import { getLandingFaqs } from '@/lib/landing/faqs'
import styles from './HubFaq.module.css'

interface Props {
  locale: 'de' | 'en'
}

export default function HubFaq({ locale }: Props) {
  const faqs = getLandingFaqs(locale)
  if (faqs.length === 0) return null
  return (
    <section className={styles.section} data-hub-faq="">
      <h2 className={styles.heading}>FAQ</h2>
      <div className={styles.list}>
        {faqs.map((f) => (
          <details key={f.q} className={styles.item}>
            <summary className={styles.question}>{f.q}</summary>
            <p className={styles.answer}>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
