'use client'
import { useEffect, useState } from 'react'
import styles from './BuddyAvatar.module.css'

// Remy's moods. 'talking' uses the neutral base plus a hard-cut teeth overlay
// for a 2-frame mouth flap; the other moods just swap the base frame.
export type BuddyMood = 'idle' | 'talking' | 'thinking' | 'happy' | 'greeting'

// neutral / teeth-open / big-laugh share identical framing (no head jump).
// O-mouth ('thinking') and the closed smile ('greeting') were drawn at a
// slightly different zoom — the head sits a touch differently, which reads as
// an intentional pose change between moods rather than a glitch.
const BASE_SRC: Record<BuddyMood, string> = {
  idle: '/buddy/buddy.webp',
  talking: '/buddy/buddy.webp',
  thinking: '/buddy/buddy-think.webp',
  happy: '/buddy/buddy-laugh.webp',
  greeting: '/buddy/buddy-smile.webp',
}

export function BuddyAvatarFallback({ mood, size = 56 }: { mood: BuddyMood; size?: number }) {
  return (
    <div className={styles.wrap} data-mood={mood} aria-hidden="true" style={{ width: size, height: size }}>
      {/* Base frame for the current mood. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.face} src={BASE_SRC[mood]} alt="" width={size} height={size} />
      {/* Teeth overlay — hard-cuts on/off only while talking so just the mouth
          moves (the head stays put). Hidden in every other mood. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.faceOpen} src="/buddy/buddy-open.webp" alt="" width={size} height={size} />
    </div>
  )
}

// Public component: tries Rive if a .riv asset is configured, else falls back.
// RIVE SWAP (Task 13): set NEXT_PUBLIC_BUDDY_RIVE_SRC to the published .riv URL.
export default function BuddyAvatar({ mood, size = 56 }: { mood: BuddyMood; size?: number }) {
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
    return <RiveAvatar mod={Rive} src={src} mood={mood} size={size} />
  }
  return <BuddyAvatarFallback mood={mood} size={size} />
}

function RiveAvatar({
  mod,
  src,
  mood,
  size,
}: {
  mod: typeof import('@rive-app/react-canvas')
  src: string
  mood: BuddyMood
  size: number
}) {
  const { useRive, useStateMachineInput } = mod
  const STATE_MACHINE = 'Buddy'
  const { rive, RiveComponent } = useRive({ src, stateMachines: STATE_MACHINE, autoplay: true })
  const talking = useStateMachineInput(rive, STATE_MACHINE, 'isTalking')
  useEffect(() => {
    if (talking) talking.value = mood === 'talking'
  }, [talking, mood])
  return <RiveComponent style={{ width: size, height: size }} />
}
