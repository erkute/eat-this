import styles from './SiteNav.module.css'

export default function SiteNav() {
  return (
    <nav className={styles.nav}>
      <a href="/" className={styles.logo}>
        EAT THIS
      </a>
    </nav>
  )
}
