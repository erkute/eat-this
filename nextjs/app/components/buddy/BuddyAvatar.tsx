'use client'
import { useEffect, useState } from 'react'
import styles from './BuddyAvatar.module.css'

// Real mascot image with a subtle transform-based "talking" motion. True
// mouth lip-sync needs the mouth as a separate layer (Rive path below); this
// flat PNG gives a lively nod while streaming.
export function BuddyAvatarFallback({ isTalking }: { isTalking: boolean }) {
  return (
    <div className={styles.wrap} data-talking={isTalking ? 'true' : 'false'} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.face} src="/buddy/buddy.webp" alt="" width={56} height={56} />
    </div>
  )
}

// Public component: tries Rive if a .riv asset is configured, else falls back.
// RIVE SWAP (Task 13): set NEXT_PUBLIC_BUDDY_RIVE_SRC to the published .riv URL.
export default function BuddyAvatar({ isTalking }: { isTalking: boolean }) {
  const src = process.env.NEXT_PUBLIC_BUDDY_RIVE_SRC
  const [Rive, setRive] = useState<null | typeof import('@rive-app/react-canvas')>(null)

  useEffect(() => {
    if (!src) return
    let active = true
    import('@rive-app/react-canvas').then((mod) => active && setRive(mod))
    return () => {
      active = false
    }
  }, [src])

  if (src && Rive) {
    return <RiveAvatar mod={Rive} src={src} isTalking={isTalking} />
  }
  return <BuddyAvatarFallback isTalking={isTalking} />
}

function RiveAvatar({
  mod,
  src,
  isTalking,
}: {
  mod: typeof import('@rive-app/react-canvas')
  src: string
  isTalking: boolean
}) {
  const { useRive, useStateMachineInput } = mod
  const STATE_MACHINE = 'Buddy'
  const { rive, RiveComponent } = useRive({ src, stateMachines: STATE_MACHINE, autoplay: true })
  const talking = useStateMachineInput(rive, STATE_MACHINE, 'isTalking')
  useEffect(() => {
    if (talking) talking.value = isTalking
  }, [talking, isTalking])
  return <RiveComponent style={{ width: 56, height: 56 }} />
}
