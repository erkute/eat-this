'use client'

import { useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { normalizeName } from '@/lib/normalizeName'
import type { HubDistrict } from '@/lib/home/getHomeData'
import styles from './HubBezirke.module.css'

interface Props {
  districts: HubDistrict[]
}

// One always-dark block that merges "Bezirk der Woche" + browse-by-district.
// Every district panel is rendered into the SSR HTML (inactive ones `hidden`)
// so all /bezirk/[slug] and /restaurant/[slug] links stay crawlable; only the
// active panel mounts its <Image>s to keep image requests to four at a time.
export default function HubBezirke({ districts }: Props) {
  const t = useTranslations('hub.bezirke')
  const [active, setActive] = useState(0)
  if (districts.length === 0) return null

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = e.key === 'ArrowRight' ? (i + 1) % districts.length : (i - 1 + districts.length) % districts.length
    setActive(next)
    const sibling = e.currentTarget.parentElement?.children[next] as HTMLElement | undefined
    sibling?.focus()
  }

  return (
    <section className={styles.section} data-hub-bezirke="">
      <div className={styles.inner}>
        <p className={styles.kicker}>{t('kicker')}</p>
        <h2 className={styles.heading}>{t('title')}</h2>
        <p className={styles.lead}>{t('lead')}</p>

        <div className={styles.tabs} role="tablist" aria-label={t('title')}>
          {districts.map((d, i) => (
            <button
              key={d.slug}
              type="button"
              role="tab"
              id={`bz-tab-${d.slug}`}
              aria-selected={i === active}
              aria-label={d.isFeature ? `${d.name} (${t('featBadge')})` : d.name}
              aria-controls={`bz-panel-${d.slug}`}
              tabIndex={i === active ? 0 : -1}
              className={`${styles.tab} homeCta homeCtaSmall ${d.isFeature ? styles.feat : ''} ${i === active ? styles.active : ''}`}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {d.isFeature && <span className={styles.featBadge} aria-hidden="true">{t('featBadge')}</span>}
              {d.name}
            </button>
          ))}
        </div>

        {districts.map((d, i) => (
          <div
            key={d.slug}
            role="tabpanel"
            id={`bz-panel-${d.slug}`}
            aria-labelledby={`bz-tab-${d.slug}`}
            hidden={i !== active}
            className={styles.panel}
          >
            <h3 className={styles.panelName}>{d.name}</h3>
            {d.tagline && <p className={styles.panelTag}>{d.tagline}</p>}
            <div className={styles.grid}>
              {d.spots.map((s) => (
                <Link key={s.slug} href={`/restaurant/${s.slug}`} className={styles.tile}>
                  {i === active && s.image && (
                    <Image
                      src={s.image}
                      alt={normalizeName(s.name)}
                      fill
                      sizes="(max-width: 720px) 50vw, 260px"
                      className={styles.tileImg}
                    />
                  )}
                  <div className={styles.tileBody}>
                    {s.category && <p className={styles.tileCat}>{s.category}</p>}
                    <h4 className={styles.tileName}>{normalizeName(s.name)}</h4>
                  </div>
                </Link>
              ))}
            </div>
            <div className={styles.foot}>
              <Link href={`/bezirk/${d.slug}`} className={`${styles.cta} homeCta homeCtaPrimary`}>
                {t('cta', { name: d.name })}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
