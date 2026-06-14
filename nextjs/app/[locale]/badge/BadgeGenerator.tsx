'use client'

import { useMemo, useState } from 'react'
import styles from './Badge.module.css'

type RestaurantOption = { name: string; slug: string }

interface Props {
  restaurants: RestaurantOption[]
  locale: 'de' | 'en'
  siteUrl: string
}

const COPY = {
  de: {
    h1: 'Empfohlen von Eat This',
    intro: 'Dein Restaurant ist bei Eat This empfohlen. Bau dir das Badge auf deine Website (z. B. Footer oder „Presse") und verlinke deine Eat-This-Seite — ein Vertrauenssignal für deine Gäste.',
    pick: 'Restaurant wählen',
    placeholder: 'Restaurant suchen …',
    notFound: 'Nicht gefunden? Schreib uns.',
    previewLabel: 'Vorschau',
    snippetLabel: 'Einbettcode (HTML)',
    copy: 'Code kopieren',
    copied: 'Kopiert ✓',
    hint: 'Den Code an der gewünschten Stelle in deine Website einfügen. Fertig.',
    alt: 'Empfohlen von Eat This',
  },
  en: {
    h1: 'Featured on Eat This',
    intro: 'Your restaurant is featured on Eat This. Add the badge to your website (footer or a “Press” section) and link your Eat This page — a trust signal for your guests.',
    pick: 'Choose restaurant',
    placeholder: 'Search restaurant …',
    notFound: 'Not listed? Get in touch.',
    previewLabel: 'Preview',
    snippetLabel: 'Embed code (HTML)',
    copy: 'Copy code',
    copied: 'Copied ✓',
    hint: 'Paste the code wherever you want it on your site. Done.',
    alt: 'Featured on Eat This',
  },
} as const

export default function BadgeGenerator({ restaurants, locale, siteUrl }: Props) {
  const t = COPY[locale]
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)

  const selected = useMemo(
    () => restaurants.find(r => r.name === query) ?? null,
    [restaurants, query],
  )

  const badgeSrc = `${siteUrl}/api/og/badge${locale === 'en' ? '?lang=en' : ''}`
  const pageBase = locale === 'en' ? `${siteUrl}/en` : siteUrl
  const linkHref = selected ? `${pageBase}/restaurant/${selected.slug}` : ''

  const snippet = selected
    ? `<a href="${linkHref}" target="_blank" rel="noopener">\n  <img src="${badgeSrc}" alt="${t.alt}" width="260" height="75" loading="lazy" style="border:0" />\n</a>`
    : ''

  async function copy() {
    if (!snippet) return
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — user can still select the textarea manually */
    }
  }

  return (
    <main className={styles.wrap}>
      <h1 className={styles.h1}>{t.h1}</h1>
      <p className={styles.intro}>{t.intro}</p>

      <label className={styles.label} htmlFor="restaurant-pick">
        {t.pick}
      </label>
      <input
        id="restaurant-pick"
        className={styles.input}
        list="restaurant-options"
        placeholder={t.placeholder}
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoComplete="off"
      />
      <datalist id="restaurant-options">
        {restaurants.map(r => (
          <option key={r.slug} value={r.name} />
        ))}
      </datalist>

      {selected && (
        <>
          <div className={styles.previewBlock}>
            <span className={styles.label}>{t.previewLabel}</span>
            <a className={styles.previewLink} href={linkHref} target="_blank" rel="noopener">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={badgeSrc} alt={t.alt} width={260} height={75} />
            </a>
          </div>

          <label className={styles.label} htmlFor="snippet">
            {t.snippetLabel}
          </label>
          <textarea id="snippet" className={styles.snippet} readOnly value={snippet} rows={4} />
          <button type="button" className={styles.copyBtn} onClick={copy}>
            {copied ? t.copied : t.copy}
          </button>
          <p className={styles.hint}>{t.hint}</p>
        </>
      )}
    </main>
  )
}
