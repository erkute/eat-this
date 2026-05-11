import styles from './ReviewsSection.module.css'

interface Props {
  locale: 'de' | 'en'
}

// Placeholder reviews. Replace with real testimonials once the beta has
// users - the layout below stays the same, only the strings change.
const REVIEWS = [
  {
    rating: 5,
    quoteDe: 'Endlich eine Map, die mir hilft. Nicht tausend Restaurants, sondern die richtigen.',
    quoteEn: 'Finally a map that helps. Not a thousand restaurants, the right ones.',
    nameDe: 'Yara K.',
    nameEn: 'Yara K.',
    roleDe: 'Beta-Testerin',
    roleEn: 'Beta tester',
  },
  {
    rating: 5,
    quoteDe: 'Über die Must Eats habe ich Spots entdeckt, die nicht mal Berliner kannten.',
    quoteEn: 'Through the Must Eats I’ve found spots even Berlin natives didn’t know about.',
    nameDe: 'Selin O.',
    nameEn: 'Selin O.',
    roleDe: 'Beta-Testerin',
    roleEn: 'Beta tester',
  },
  {
    rating: 5,
    quoteDe: 'Genau die Sachen, die man sich wünscht. Macht einen riesigen Unterschied.',
    quoteEn: 'Exactly the picks you want. Makes a huge difference.',
    nameDe: 'Jonas B.',
    nameEn: 'Jonas B.',
    roleDe: 'Beta-Tester',
    roleEn: 'Beta tester',
  },
]

export default function ReviewsSection({ locale }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.eyebrow}>{locale === 'de' ? 'Stimmen aus der Beta' : 'From the beta'}</span>
          <h2 className={styles.h2}>
            {locale === 'de' ? 'Berliner lieben es' : 'Berliners love it'}
          </h2>
        </div>
        <ul className={styles.grid}>
          {REVIEWS.map((r, i) => (
            <li key={i} className={styles.card}>
              <Stars rating={r.rating} />
              <blockquote className={styles.quote}>
                {locale === 'de' ? r.quoteDe : r.quoteEn}
              </blockquote>
              <div className={styles.attribution}>
                <span className={styles.name}>{locale === 'de' ? r.nameDe : r.nameEn}</span>
                <span className={styles.role}>{locale === 'de' ? r.roleDe : r.roleEn}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className={styles.stars} aria-label={`${rating}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill={i < rating ? 'currentColor' : 'none'} aria-hidden="true">
          <path
            d="M7 1l1.85 3.92L13 5.6l-3 3.06L10.7 13 7 10.92 3.3 13 4 8.66 1 5.6l4.15-.68L7 1z"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  )
}
