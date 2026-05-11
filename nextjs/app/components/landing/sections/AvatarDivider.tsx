import Image from 'next/image'
import styles from './AvatarDivider.module.css'

/**
 * Decorative three-avatar strip between two sections. Static - no scroll
 * motion. Decorative only (aria-hidden, no pointer events).
 */
export default function AvatarDivider() {
  return (
    <div className={styles.dividerWrap} aria-hidden="true">
      <div className={styles.row}>
        <Image
          src="/pics/avatar1.png"
          alt=""
          width={120}
          height={150}
          className={styles.avatar}
        />
        <Image
          src="/pics/avatar2.png"
          alt=""
          width={120}
          height={180}
          className={styles.avatar}
        />
        <Image
          src="/pics/avatar3.png"
          alt=""
          width={120}
          height={150}
          className={styles.avatar}
        />
      </div>
    </div>
  )
}
