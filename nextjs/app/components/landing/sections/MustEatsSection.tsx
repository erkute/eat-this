import Image from 'next/image'
import FanCards from '../FanCards'
import styles from './MustEatsSection.module.css'

interface Props {
  headline: string
  body: string
  ctaLabel?: string
  ctaHref?: string
  locale?: 'de' | 'en'
}

// Editorial caption + 3-bullet breakdown - invented copy that explains
// the Must-Eat mechanic to someone seeing it for the first time. Pairs
// with the phone screenshot so the abstract card metaphor lands visually.
const SHOWCASE = {
  de: {
    eyebrow: 'Must Eats',
    title: 'Zugedeckt, bis du da bist',
    intro: 'Jede Must-Eat-Karte verbirgt ein Gericht, das wir besonders empfehlen. Sichtbar wird sie erst, wenn du dem Spot nahe kommst.',
    bullets: [
      'Zugedeckte Karte für ausgewählte Gerichte',
      'Aufdeckbar ab 50 m Entfernung',
      'Direkt mit dem Spot auf der Map verknüpft',
    ],
  },
  en: {
    eyebrow: 'Must Eats',
    title: 'Covered until you arrive',
    intro: 'Every Must-Eat card hides a dish we especially recommend. It only reveals itself when you’re close to the spot in person.',
    bullets: [
      'Covered card for selected dishes',
      'Unlocks within 50 m of the spot',
      'Wired directly to the spot on the map',
    ],
  },
}

export default function MustEatsSection({ headline, body, locale = 'de' }: Props) {
  const sc = locale === 'de' ? SHOWCASE.de : SHOWCASE.en
  // Section title overrides the CMS headline - section now leads with the
  // bigger promise ("more than restaurant picks"), then the Must Eat
  // mechanic is unpacked below with the phone explainer.
  const sectionTitle = locale === 'de'
    ? 'Mehr als nur Restaurant-Empfehlungen'
    : 'More than just restaurant picks'
  void headline

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 className={styles.h2}>{sectionTitle}</h2>
          <p className={styles.body}>{body}</p>
        </div>

        {/* FanCards row sits up top now so the must-eat artwork hits the
            reader before the explainer block. */}
        <div className={styles.fanWrap}>
          <FanCards />
        </div>

        {/* Explainer sits BETWEEN FanCards and phoneRow so the page
            alternates image -> text -> image rather than stacking two
            visual blocks on top of each other. */}
        <div className={styles.showcase}>
          <div className={styles.explainer}>
            <span className={styles.eyebrow}>{sc.eyebrow}</span>
            <h3 className={styles.explainerTitle}>{sc.title}</h3>
            <p className={styles.explainerIntro}>{sc.intro}</p>
            <ul className={styles.explainerBullets}>
              {sc.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>
          <div className={styles.phoneRow}>
            <Image
              src="/pics/map-teaser/map_musteat.webp"
              alt=""
              width={596}
              height={1227}
              className={styles.phone}
              sizes="(max-width: 768px) 60vw, 280px"
            />
            <Image
              src="/pics/map-teaser/map_musteat_liste.png"
              alt=""
              width={596}
              height={1227}
              className={`${styles.phone} ${styles.phoneSecondary}`}
              sizes="(max-width: 768px) 60vw, 280px"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
