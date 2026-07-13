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

export default function BuddyAvatar({ mood, size = 56 }: { mood: BuddyMood; size?: number }) {
  return <BuddyAvatarFallback mood={mood} size={size} />
}
