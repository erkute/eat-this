'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// BuddyWidget pulls in the whole chat machinery (~108 KB: streaming, message
// rendering, the buddy hooks) but it is only needed after the user engages
// Remy from the home hub. Code-split it (ssr: false) and defer the mount to
// idle so it stays off the critical path.
const BuddyWidget = dynamic(() => import('./BuddyWidget'), { ssr: false })

export default function BuddyWidgetLazy() {
  const [mount, setMount] = useState(false)

  useEffect(() => {
    // Safari historically lacks requestIdleCallback — guard at runtime even
    // though lib.dom types it as present, and fall back to a short timeout.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setMount(true), { timeout: 3000 })
      return () => window.cancelIdleCallback(id)
    }
    const t = setTimeout(() => setMount(true), 1500)
    return () => clearTimeout(t)
  }, [])

  return mount ? <BuddyWidget /> : null
}
