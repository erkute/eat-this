'use client'

import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/lib/auth'
import { useOwnedEntitlements } from '@/lib/firebase/useOwnedEntitlements'
import { getPack } from '@/lib/stripe-catalog'
import { categoryArt } from '@/lib/categoryArt'
import styles from './HubDeineWelt.module.css'

const CARD_BACK = '/pics/card-back.webp'

export default function HubDeineWelt() {
  const { user, loading } = useAuth()
  const owned = useOwnedEntitlements(user?.uid ?? null)

  // Logged-out (and the SSR / first-paint pass, where auth is still loading)
  // render nothing → no hydration mismatch and the hero stays the first block.
  if (loading || !user) return null

  const firstName = (user.displayName ?? '').split(' ')[0] || null

  // First owned CATEGORY pack → resolve its real category slug via the catalog
  // (packId 'category-fastfood' maps to slug 'fast-food', not 'fastfood').
  const ownedPackId = owned ? ([...owned].find((id) => id.startsWith('category-')) ?? null) : null
  const ownedPack = ownedPackId ? getPack(ownedPackId) : null
  const ownedSlug = ownedPack?.slug ?? null
  const packArt = ownedSlug ? categoryArt(ownedSlug) : null

  return (
    <section className={styles.section} data-hub-deinewelt="">
      <span className={styles.badge}>Logged-in</span>
      <header className={styles.hi}>
        {firstName && <p className={styles.kicker}>{firstName}</p>}
        <h2 className={styles.name}>
          Heute auf <span className={styles.em}>deiner</span> Map.
        </h2>
      </header>

      <div className={styles.cards} aria-hidden="true">
        <span className={styles.card} style={{ backgroundImage: `url(${CARD_BACK})` }} />
        <span className={styles.card} style={{ backgroundImage: `url(${CARD_BACK})` }} />
        <span className={styles.card} style={{ backgroundImage: `url(${CARD_BACK})` }} />
      </div>
      <p className={styles.cap}>Must Eats warten · noch nicht aufgedeckt</p>

      {packArt && ownedSlug && ownedPack && (
        <div className={styles.pack}>
          <Image src={packArt} alt="" width={84} height={130} className={styles.packArt} />
          <div className={styles.packBody}>
            <h3 className={styles.packName}>{ownedPack.displayName}</h3>
            <p className={styles.packProgress}>Schon ein paar aufgedeckt. Weiter geht&apos;s.</p>
            <Link href={`/map?cat=${ownedSlug}`} rel="nofollow" className={styles.packCta}>
              Auf die Map →
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
