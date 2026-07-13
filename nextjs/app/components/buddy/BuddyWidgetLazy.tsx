'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from '@/i18n/navigation'
import { BUDDY_ASK_EVENT } from '@/lib/buddy/homeStage'

// BuddyWidget pulls in the whole chat machinery (~108 KB: streaming, message
// rendering, the buddy hooks). Preload its chunk when Home is idle, but don't
// mount those hooks until the user actually asks Remy something.
const loadBuddyWidget = () => import('./BuddyWidget')
const BuddyWidget = dynamic(loadBuddyWidget, { ssr: false })

export default function BuddyWidgetLazy() {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const [mount, setMount] = useState(false)

  useEffect(() => {
    if (!isHome || mount) return

    // homeStage keeps an early ask until the dynamic widget has installed its
    // own listener, so a cold chunk load cannot lose the first question.
    const onAsk = () => setMount(true)
    window.addEventListener(BUDDY_ASK_EVENT, onAsk)

    // Safari historically lacks requestIdleCallback — guard at runtime even
    // though lib.dom types it as present, and fall back to a short timeout.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => void loadBuddyWidget(), { timeout: 3000 })
      return () => {
        window.removeEventListener(BUDDY_ASK_EVENT, onAsk)
        window.cancelIdleCallback(id)
      }
    }
    const t = setTimeout(() => void loadBuddyWidget(), 1500)
    return () => {
      window.removeEventListener(BUDDY_ASK_EVENT, onAsk)
      clearTimeout(t)
    }
  }, [isHome, mount])

  return isHome && mount ? <BuddyWidget /> : null
}
