import styles from './StatementSection.module.css'

interface Props {
  headline: string
  body: string
}

export default function StatementSection({ headline, body }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.h2}>{headline}</h2>
        <p className={styles.body}>{body}</p>
      </div>
    </section>
  )
}
