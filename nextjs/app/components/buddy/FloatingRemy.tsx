'use client';
// nextjs/app/components/buddy/FloatingRemy.tsx
//
// Persistent floating Remy launcher — a yellow 52-px circle fixed to
// bottom-right. Only shown on the home route ("/") to stay consistent with
// BuddyWidget's own home-only guard.
//
// Opens Remy by dispatching BUDDY_ASK_EVENT (no question), which BuddyWidget
// already listens for and uses to setOpen(true).
import { usePathname } from '@/i18n/navigation';
import { dispatchBuddyAsk } from '@/lib/buddy/homeStage';
import styles from './FloatingRemy.module.css';

export default function FloatingRemy() {
  const pathname = usePathname();
  // Only visible on the home route — mirrors BuddyWidget's guard.
  if ((pathname ?? '/') !== '/') return null;

  return (
    <button
      type="button"
      className={styles.fab}
      aria-label="Frag Remy / Ask Remy"
      onClick={() => dispatchBuddyAsk({})}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.face}
        src="/buddy/buddy.webp"
        alt=""
        aria-hidden="true"
        width={40}
        height={40}
      />
    </button>
  );
}
