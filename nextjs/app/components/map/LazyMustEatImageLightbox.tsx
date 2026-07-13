'use client'

import dynamic from 'next/dynamic'
import type { MustEatImageLightboxProps } from './MustEatImageLightbox'

const MustEatImageLightbox = dynamic(
  () => import('./MustEatImageLightbox'),
  { ssr: false },
)

interface Props extends MustEatImageLightboxProps {
  /**
   * Keep the lazy component mounted through its fly-back. The heavy motion
   * chunk is requested only when an opening starts, while `onExitComplete`
   * remains responsible for ending this active phase.
   */
  active: boolean
}

export default function LazyMustEatImageLightbox({ active, ...props }: Props) {
  return active ? <MustEatImageLightbox {...props} /> : null
}
