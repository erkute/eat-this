'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { onSnapshot, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuth } from '@/lib/auth'
import { usePackCards } from '@/lib/firebase/usePackCards'
import { useAllBerlinSampleCards } from '@/lib/firebase/useAllBerlinSampleCards'
import { routing } from '@/i18n/routing'
import PackOpenChoreography, { warmUpOnboardingAudio } from '../PackOpenChoreography'

const POLL_TIMEOUT_MS = 4_000
const HARD_TIMEOUT_MS = 10_000
// Reveal animation only shows the first 5 cards — the user already gets
// all 20 unlocks on the map, so a 20-card fly-through is dwell-time with
// no payoff. 5 lands the moment and gets them onto the map faster.
const REVEAL_CARD_COUNT = 5

type Phase = 'waiting' | 'opening' | 'done' | 'error'

export default function PurchasePackOpen() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const locale = useLocale()
  const search = useSearchParams()

  const sessionId = search.get('session_id')
  const packId    = search.get('pack') ?? ''

  const [phase, setPhase]            = useState<Phase>('waiting')
  const [entitlementCards, setCards] = useState<string[] | null>(null)
  const [triggerOpen, setTriggerOpen] = useState(false)

  const isAllBerlin = packId === 'all-berlin'
  const allBerlinSample = useAllBerlinSampleCards(isAllBerlin && phase !== 'waiting')
  // Extract the category slug from packId ('category-pizza' → 'pizza',
  // 'category-fast-food' → 'fast-food'). Drives the booster artwork
  // (.packImage background) inside PackOpenChoreography. Null for
  // all-berlin → falls back to the CSS default booster1.webp.
  const categorySlug = packId.startsWith('category-')
    ? packId.slice('category-'.length)
    : null

  // Subscribe to the entitlement doc — written by the Stripe webhook
  // after a successful purchase. The choreography starts as soon as
  // the doc lands.
  useEffect(() => {
    if (!user || !packId) return
    const ref = doc(db, 'users', user.uid, 'entitlements', packId)
    let fired = false
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return
      if (fired) return
      fired = true
      const data = snap.data() as { mustEatIds?: string[] }
      if (isAllBerlin) {
        setCards([])
      } else {
        setCards((data.mustEatIds ?? []).slice(0, 20))
      }
      setPhase('opening')
    })
    return () => unsub()
  }, [user, packId, isAllBerlin])

  // Resolve mustEatIds → images for category packs (only the first 5 —
  // see REVEAL_CARD_COUNT). Full 20 stay in entitlementCards in case
  // a downstream consumer needs the complete set.
  const revealIds = entitlementCards && !isAllBerlin
    ? entitlementCards.slice(0, REVEAL_CARD_COUNT)
    : null
  const packCardsState = usePackCards(revealIds)
  const categoryImages = packCardsState.status === 'ready' ? packCardsState.images : null

  const finalCards: string[] | null = isAllBerlin
    ? allBerlinSample?.slice(0, REVEAL_CARD_COUNT) ?? null
    : categoryImages

  // Trigger choreography once we have images.
  useEffect(() => {
    if (phase === 'opening' && finalCards && finalCards.length > 0 && !triggerOpen) {
      warmUpOnboardingAudio()
      setTriggerOpen(true)
    }
  }, [phase, finalCards, triggerOpen])

  // Fallback fulfill after POLL_TIMEOUT_MS in case the webhook is slow.
  useEffect(() => {
    if (phase !== 'waiting' || !user || !sessionId) return
    const t = setTimeout(async () => {
      try {
        const token = await user.getIdToken()
        const res = await fetch('/api/stripe/fulfill', {
          method:  'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body:    JSON.stringify({ session_id: sessionId }),
        })
        if (!res.ok && res.status !== 202) setPhase('error')
      } catch {
        // Network blip — hard timeout will catch it.
      }
    }, POLL_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [phase, user, sessionId])

  // Hard timeout
  useEffect(() => {
    if (phase !== 'waiting') return
    const t = setTimeout(() => setPhase('error'), HARD_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [phase])

  // Auth + param guards — replace() must run in an effect, not during render.
  useEffect(() => {
    if (loading) return
    if (!user) {
      const loginHref = locale === routing.defaultLocale ? '/login' : `/${locale}/login`
      router.replace(loginHref)
      return
    }
    if (!sessionId || !packId) {
      const profileHref = locale === routing.defaultLocale ? '/profile' : `/${locale}/profile`
      router.replace(profileHref)
    }
  }, [loading, user, sessionId, packId, locale, router])

  function onRevealComplete() {
    // Land on the map tab, not the start tab — that's where the unlocked
    // spots actually appear. The SPA-route `/map` flips data-active-page
    // and triggers useInitialFit on the now-expanded restaurant set.
    const mapHref = locale === routing.defaultLocale ? '/map' : `/${locale}/map`
    router.replace(mapHref)
  }

  if (loading) return null
  if (!user) return null
  if (!sessionId || !packId) return null

  if (phase === 'error') {
    return (
      <div style={{ padding: '24px', maxWidth: '480px', margin: '40px auto', textAlign: 'center' }}>
        <h2>Wir konnten deinen Kauf nicht sofort bestätigen</h2>
        <p>Schau in 1 Min in deinem Profil unter Booster vorbei. Falls dein Pack nicht auftaucht, kontaktiere uns: <a href="mailto:support@eatthisdot.com">support@eatthisdot.com</a></p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {phase === 'waiting' ? (
        <p>Bezahlung wird verarbeitet …</p>
      ) : (
        finalCards && (
          <PackOpenChoreography
            cards={finalCards}
            triggerOpen={triggerOpen}
            category={categorySlug}
            onRevealComplete={onRevealComplete}
          />
        )
      )}
    </div>
  )
}
