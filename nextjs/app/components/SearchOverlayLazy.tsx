'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const SearchOverlay = dynamic(() => import('./SearchOverlay'), { ssr: false })

export default function SearchOverlayLazy() {
  const [mount, setMount] = useState(false)
  const [openRequestId, setOpenRequestId] = useState(0)

  useEffect(() => {
    const open = () => {
      setMount(true)
      setOpenRequestId((id) => id + 1)
    }

    const trigger = document.getElementById('burgerSearchTrigger')
    trigger?.addEventListener('click', open)
    document.addEventListener('eatthis:open-search', open)

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setMount(true), { timeout: 3500 })
      return () => {
        window.cancelIdleCallback(id)
        trigger?.removeEventListener('click', open)
        document.removeEventListener('eatthis:open-search', open)
      }
    }

    const timeout = window.setTimeout(() => setMount(true), 2000)
    return () => {
      window.clearTimeout(timeout)
      trigger?.removeEventListener('click', open)
      document.removeEventListener('eatthis:open-search', open)
    }
  }, [])

  return mount ? <SearchOverlay openRequestId={openRequestId} /> : null
}
