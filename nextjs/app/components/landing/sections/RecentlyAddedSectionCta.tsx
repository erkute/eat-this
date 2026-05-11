'use client'

import { useLoginModal } from '@/lib/auth'

interface Props {
  label: string
  className?: string
}

export default function RecentlyAddedSectionCta({ label, className }: Props) {
  const { open: openLogin } = useLoginModal()
  return (
    <button type="button" className={className} onClick={openLogin}>
      {label}
    </button>
  )
}
