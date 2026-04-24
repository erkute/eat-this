'use client'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

interface BezirkFilterProps {
  bezirke: string[]
  active: string | null
  onChange: (bezirk: string | null) => void
}

export default function BezirkFilter({ bezirke, active, onChange }: BezirkFilterProps) {
  const { t } = useTranslation()
  return (
    <select
      className={`${styles.select} ${active ? styles.selectActive : ''}`}
      value={active ?? ''}
      onChange={e => onChange(e.target.value || null)}
      aria-label="Bezirk"
    >
      <option value="">{t('map.allBezirke')}</option>
      {bezirke.map(name => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
  )
}
