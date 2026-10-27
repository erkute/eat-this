import styles from './BuddyAvatar.module.css';

// Remy's moods. 'talking' and 'happy' keep the neutral base and only change
// the mouth; 'thinking' and 'greeting' swap the whole base frame.
export type BuddyMood = 'idle' | 'talking' | 'thinking' | 'happy' | 'greeting';

// O-mouth ('thinking') and the closed smile ('greeting') share the base
// framing, so swapping the whole frame doesn't move the head.
const BASE_SRC: Record<BuddyMood, string> = {
  idle: '/buddy/buddy.webp?v=feinripp',
  talking: '/buddy/buddy.webp?v=feinripp',
  thinking: '/buddy/buddy-think.webp?v=feinripp',
  happy: '/buddy/buddy.webp?v=feinripp',
  greeting: '/buddy/buddy-smile.webp?v=feinripp',
};

// Mouth shapes cut from the open/laugh/think drawings and registered onto
// the base face (empty, open, wide, O). The open and laugh drawings are
// framed ~9 % larger than the base, so laying them over it whole showed
// shoulders and outline twice.
const MOUTHS_SRC = '/buddy/buddy-mouths.webp?v=1';

export function BuddyAvatarFallback({
  mood,
  size = 56,
  breathe = true,
}: {
  mood: BuddyMood;
  size?: number;
  /** Off in the 56px header, where the swell reads as jitter. */
  breathe?: boolean;
}) {
  return (
    <div
      className={styles.wrap}
      data-mood={mood}
      data-breathe={breathe ? undefined : 'off'}
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      <div className={styles.stage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.face} src={BASE_SRC[mood]} alt="" width={size} height={size} />
        <span className={styles.mouth}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.mouths} src={MOUTHS_SRC} alt="" />
        </span>
      </div>
    </div>
  );
}

export default function BuddyAvatar(props: { mood: BuddyMood; size?: number; breathe?: boolean }) {
  return <BuddyAvatarFallback {...props} />;
}
