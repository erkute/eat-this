import styles from './HeroBulletsSlab.module.css'

interface Props {
  locale?: 'de' | 'en'
}

const BULLETS = {
  de: ['200+ kuratierte Spots', 'Inklusive Must Eats', 'Laufend aktualisiert'],
  en: ['200+ curated spots', 'Must Eats included', 'Updated regularly'],
}

export default function HeroBulletsSlab({ locale = 'de' }: Props) {
  const items = locale === 'de' ? BULLETS.de : BULLETS.en
  return (
    <section className={styles.slab}>
      <ul className={styles.list}>
        {items.map((label) => (
          <li key={label} className={styles.item}>
            <CheckIcon />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CheckIcon() {
  return (
    <svg
      className={styles.check}
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 9.5l3 3L14 5.5"
        stroke="#E32831"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
