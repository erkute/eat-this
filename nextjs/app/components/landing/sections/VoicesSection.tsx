import { CSSProperties } from 'react'
import styles from './VoicesSection.module.css'

interface Props {
  locale: 'de' | 'en'
}

// Static community quotes — kept inline (no CMS) on purpose. Three voices,
// hand-picked rotation. No attribution: avoids the fake-name trap and lets
// each quote speak for itself.
const VOICES: { de: string; en: string }[] = [
  {
    de: 'Ich finde schneller gute Restaurants in der Nähe als über TikTok oder Instagram.',
    en: 'I find good restaurants nearby faster than on TikTok or Instagram.',
  },
  {
    de: 'Ich benutze inzwischen fast nur noch Eat This, wenn ich essen gehe.',
    en: 'I pretty much only use Eat This when I go out to eat now.',
  },
  {
    de: 'Das hätte ich mir für Berlin schon vor Jahren gewünscht.',
    en: 'I’ve been wishing for this in Berlin for years.',
  },
]

// Alternating rest-state tilt — trading-card scatter, mirrored on mobile too
// so the stack reads as "thrown on a table", not "alignment grid".
const TILTS = [-2, 1.5, -1.2]

export default function VoicesSection({ locale }: Props) {
  const t = locale === 'de'
    ? { eyebrow: 'Community', l1: 'Berliner',  l2: 'lieben es.' }
    : { eyebrow: 'Community', l1: 'Berliners', l2: 'love it.' }

  return (
    <section className={styles.section} aria-labelledby="voices-header">
      <div className={styles.inner}>
        <header className={styles.masthead}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h2 id="voices-header" className={styles.wordmark}>
            {t.l1}<br />{t.l2}
          </h2>
        </header>

        <ul className={styles.cards}>
          {VOICES.map((v, i) => (
            <li
              key={i}
              className={styles.card}
              style={{ ['--tilt' as string]: `${TILTS[i]}deg` } as CSSProperties}
            >
              <span className={styles.mark} aria-hidden="true">&ldquo;</span>
              <p className={styles.quote}>{locale === 'de' ? v.de : v.en}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
