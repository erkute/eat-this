import FanCards from '../FanCards'
import VorOrtReveal from './VorOrtReveal'
import styles from './MustEatsSection.module.css'

interface Props {
  headline: string
  body: string
  ctaLabel?: string
  ctaHref?: string
  locale?: 'de' | 'en'
}

export default function MustEatsSection({ headline, body, locale = 'de' }: Props) {
  const sectionEyebrow = locale === 'de' ? 'Must Eats' : 'Must Eats'
  const sectionTitle = locale === 'de'
    ? 'Kuratiert bis auf den Teller'
    : 'Curated down to the plate'
  const sectionBody = locale === 'de'
    ? 'Eat This zeigt dir die besten Orte Berlins und liefert dir für ausgewählte Spots das passende Must Eat gleich mit.'
    : 'Eat This shows you the best spots in Berlin and, for selected ones, drops in the matching Must Eat too.'
  const tipLabel = locale === 'de' ? 'Vor Ort' : 'On site'
  const tipBody = locale === 'de'
    ? 'Manche Must Eats decken sich erst auf, wenn du direkt am Spot stehst.'
    : 'Some Must Eats only reveal when you’re right at the spot in person.'
  void headline
  void body

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.sectionEyebrow}>{sectionEyebrow}</span>
          <h2 className={styles.h2}>{sectionTitle}</h2>
          <p className={styles.body}>{sectionBody}</p>
        </div>

        <div className={styles.fanWrap}>
          <FanCards />
        </div>

        <div className={styles.tip}>
          {/* The card-back is the actual locked-state asset from the
              app — same vintage cross-stitch card the user sees on the
              map until they reveal it on site. Idle wiggle invites the
              tap; click triggers a stronger shake + opens login. */}
          <VorOrtReveal ariaLabel={locale === 'de' ? 'Must Eat Karte vibrieren lassen' : 'Wiggle Must Eat card'} />
          <div className={styles.tipText}>
            <span className={styles.tipLabel}>{tipLabel}</span>
            <p className={styles.tipBody}>{tipBody}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
