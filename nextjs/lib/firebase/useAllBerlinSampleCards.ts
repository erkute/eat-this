'use client'
import { useEffect, useState } from 'react'
import { client as sanity } from '@/lib/sanity'

// One representative mustEat image per category, used as the 9-card
// fan when a user purchases all-berlin. Cached at module level — the
// answer rarely changes and a redundant fetch on rerender wastes round-trips.
let cached: string[] | null = null

export function useAllBerlinSampleCards(active: boolean): string[] | null {
  const [cards, setCards] = useState<string[] | null>(cached)
  useEffect(() => {
    if (!active || cached) return
    let alive = true
    sanity.fetch<string[]>(`
      *[_type == "category"]{
        "img": *[_type == "mustEat"
                 && defined(image.asset)
                 && defined(restaurantRef._ref)
                 && restaurantRef->isOpen != false
                 && ^._id in restaurantRef->categories[defined(@->_id)]->_id
               ][0].image.asset->url + "?w=600&auto=format&q=80"
      }.img
    `).then((rows) => {
      if (!alive) return
      const imgs = (rows ?? []).filter(Boolean)
      cached = imgs
      setCards(imgs)
    }).catch(() => { if (alive) setCards([]) })
    return () => { alive = false }
  }, [active])
  return cards
}
