import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import styles from './HubDishPoster.module.css'

const dishes = [
  {
    key: 'gazzo',
    restaurant: 'Gazzo',
    dish: 'Aubergine Pizza',
    note: 'Soft middle, crisp edge.',
    image: '/pics/home-dishes/gazzo-aubergine.webp',
    href: '/map?r=gazzo',
  },
  {
    key: 'bubar',
    restaurant: 'Bubar',
    dish: 'Galette',
    note: 'Butter, egg, crisp corners.',
    image: '/pics/home-dishes/bubar-galette-print.webp',
    href: '/map?r=bubar-crepes-und-galettes',
  },
  {
    key: 'grilledCheese',
    restaurant: 'Aera',
    dish: 'Grilled Cheese',
    note: 'Pickle, tray, crunch.',
    image: '/pics/home-dishes/grilled-cheese-print.webp',
    href: '/map?r=aera',
  },
  {
    key: 'allin',
    restaurant: 'All In',
    dish: 'Single Burger',
    note: 'Fast joy, no drama.',
    image: '/pics/home-dishes/allin-single-burger.webp',
    href: '/map?r=all-in',
  },
  {
    key: 'sardinen',
    restaurant: 'Sardinen Bar',
    dish: 'Sardinen',
    note: 'Spoons, oil, wine mood.',
    image: '/pics/home-dishes/sardinen-print.webp',
    href: '/map?r=sardinen-bar',
  },
  {
    key: 'rinderschaufel',
    restaurant: 'Schüsseldienst',
    dish: 'Rinderschaufel',
    note: 'Slow heat, bright plate.',
    image: '/pics/home-dishes/rinderschaufel-print.webp',
    href: '/map?r=schuesseldienst',
  },
] as const

export default function HubDishPoster() {
  const t = useTranslations('hub.dishPoster')

  return (
    <section className={styles.section} data-hub-dish-poster="">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <h2 className={styles.title}>{t('title')}</h2>
        </div>

        <div className={styles.stage} aria-label={t('title')}>
          <ul className={styles.dishes} role="list">
            {dishes.map((item, index) => (
              <li key={item.key} className={`${styles.item} ${styles[`item${index + 1}`]}`}>
                <Link href={item.href} rel="nofollow" className={styles.dishLink}>
                  <span className={styles.photoFrame}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={`${item.restaurant}: ${item.dish}`} loading="lazy" />
                  </span>
                  <span className={styles.label}>
                    <strong>{item.dish}</strong>
                    <span>{item.restaurant}</span>
                    <em>{item.note}</em>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
