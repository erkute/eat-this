import { CSSProperties } from 'react'
import styles from './CitiesSection.module.css'

interface Props {
  locale: 'de' | 'en'
}

const CITIES: { name: string; tilt: number }[] = [
  { name: 'Istanbul',  tilt: -2.5 },
  { name: 'Amsterdam', tilt:  1.8 },
  { name: 'Tokyo',     tilt: -1.5 },
]

const CONTACT_EMAIL = 'support@eatthisdot.com'

export default function CitiesSection({ locale }: Props) {
  const t = locale === 'de'
    ? {
        eyebrow: 'Next Up',
        l1:      'Berlin',
        l2:      '& beyond.',
        body:    'Berlin ist unser Zuhause, aber wir haben noch viel Hunger. Während wir Berlin aktuell halten, bereiten wir im Hintergrund schon die nächsten Maps vor.',
        ctaIntro:'Du willst Eat This in deiner Stadt?',
        ctaLabel:'Schreib uns →',
        soon:    'Soon',
      }
    : {
        eyebrow: 'Next Up',
        l1:      'Berlin',
        l2:      '& beyond.',
        body:    'Berlin is home, but we’re still hungry. While we keep Berlin sharp, the next maps are already in the works in the background.',
        ctaIntro:'Want Eat This in your city?',
        ctaLabel:'Write us →',
        soon:    'Soon',
      }

  const subject = locale === 'de'
    ? 'Eat This in meiner Stadt'
    : 'Eat This in my city'
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`

  return (
    <section className={styles.section} aria-labelledby="cities-header">
      <div className={styles.inner}>
        <header className={styles.masthead}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h2 id="cities-header" className={styles.wordmark}>
            {t.l1}<br />{t.l2}
          </h2>
          <p className={styles.body}>{t.body}</p>
        </header>

        <ul className={styles.stamps} aria-label="Upcoming cities">
          {CITIES.map((c) => (
            <li
              key={c.name}
              className={styles.stamp}
              style={{ ['--tilt' as string]: `${c.tilt}deg` } as CSSProperties}
            >
              <span className={styles.stampSoon} aria-hidden="true">{t.soon}</span>
              <span className={styles.stampCity}>{c.name}</span>
            </li>
          ))}
        </ul>

        <div className={styles.ctaWrap}>
          <p className={styles.ctaIntro}>{t.ctaIntro}</p>
          <a className={styles.cta} href={mailto}>
            <span>{t.ctaLabel}</span>
          </a>
        </div>
      </div>
    </section>
  )
}
