import styles from './TrustBar.module.css'

interface Props {
  text: string
}

export default function TrustBar({ text }: Props) {
  return (
    <aside className={styles.bar} aria-label="Site quick-facts">
      <span className={styles.text}>{text}</span>
    </aside>
  )
}
