'use client'

import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { useTranslation } from '@/lib/i18n'
import { buildReferralLink } from '@/lib/referral/link'
import styles from './ProfileReferralCard.module.css'

export default function ProfileReferralCard() {
  const { lang } = useTranslation()
  const [uid, setUid] = useState<string | null>(() => auth.currentUser?.uid ?? null)

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), [])

  if (!uid) return null
  const en = lang === 'en'
  const link = buildReferralLink(uid)

  const onShare = async () => {
    const shareData = {
      title: 'Eat This',
      text: en ? 'Join me on Eat This' : 'Komm zu Eat This',
      url: link,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
        return
      }
    } catch {
      // user cancelled or share failed — fall through to copy
    }
    try {
      await navigator.clipboard.writeText(link)
      window.showNotification?.(en ? 'Link copied!' : 'Link kopiert!')
    } catch {
      // clipboard unavailable — nothing else to do
    }
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{en ? 'Invite a friend' : 'Lad jemanden ein'}</h3>
      <p className={styles.sub}>
        {en
          ? 'Share your link — you both unlock more spots.'
          : 'Teil deinen Link — ihr schaltet beide mehr Spots frei.'}
      </p>
      <button type="button" className={styles.btn} onClick={onShare}>
        {en ? 'Share invite' : 'Einladung teilen'}
      </button>
    </div>
  )
}
