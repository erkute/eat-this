'use client'

import { useEffect } from 'react'
import { trackEventOnce } from '@/lib/analytics'

interface Props {
  transactionId: string
  packId: string
  packName: string
  amountCents: number
}

export default function CheckoutSuccessAnalytics({ transactionId, packId, packName, amountCents }: Props) {
  useEffect(() => {
    trackEventOnce(`purchase_${transactionId}`, 'purchase', {
      transaction_id: transactionId,
      currency: 'EUR',
      value: amountCents / 100,
      item_id: packId,
      item_name: packName,
    })
  }, [transactionId, packId, packName, amountCents])

  return null
}
