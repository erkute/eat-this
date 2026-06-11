'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// BuddyWidget pulls in the whole chat machinery (~108 KB: streaming, message
// rendering, the buddy hooks) but nothing it renders is needed for first paint
// — the corner launcher only matters once the page is interactive. Code-split
// it (ssr: false) and defer the mount to idle so it stays off the critical
// path. The home-stage handshake (buddy:stage) is unaffected: the "Frag Remy"
// section is the 4th hub block (below the fold), so its visible:true fires on
// scroll long after this has mounted; at load the launcher's default (shown)
// already matches the stage's below-fold visible:false.
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
