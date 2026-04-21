import Link from 'next/link'
import styles from './SiteNav.module.css'

export default function SiteNav() {
  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        EAT THIS
      </Link>
    </nav>
  )
}
