import { isStaging } from '@/lib/env'
import styles from './StagingBanner.module.css'

export function StagingBanner() {
  if (!isStaging) return null
  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span className={styles.label}>STAGING</span>
      <span className={styles.sep}>—</span>
      <span className={styles.text}>not production</span>
      <a className={styles.prodLink} href="https://www.eatthisdot.com">go to prod →</a>
    </div>
  )
}
