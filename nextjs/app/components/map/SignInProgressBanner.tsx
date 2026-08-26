'use client';
import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import styles from './SignInProgressBanner.module.css';

/** How long the finished message stays before it slides back out. Long enough
 *  to be read on arrival, short enough not to sit on the map. */
const DONE_VISIBLE_MS = 4500;
/** Must match the bannerOut keyframe — the element stays mounted while it
 *  slides back out, otherwise it would simply vanish. */
const LEAVE_MS = 260;

const copy = {
  de: {
    working: 'Du wirst angemeldet — deine Spots werden freigeschaltet',
    doneCounted: (n: number) => `Fertig. ${n} neue Spots liegen jetzt auf deiner Map.`,
    donePlain: 'Fertig. Du bist angemeldet.',
  },
  en: {
    working: 'Signing you in — unlocking your spots',
    doneCounted: (n: number) => `Done. ${n} new spots are on your map now.`,
    donePlain: "Done. You're signed in.",
  },
} as const;

interface Props {
  /** A sign-up claim is in flight — see useSignupSpotClaim. */
  working: boolean;
  /** Spots the viewer can open right now. Sampled when the wait starts and
   *  again when it ends, so the finished message can say what it was worth. */
  openSpotCount: number;
}

/**
 * What is happening, said out loud.
 *
 * Coming back from the magic link, the reader lands on a map that looks exactly
 * like the one they left — same grey dots, same sheet — and for a second or two
 * nothing announces that they are being signed in or that spots are being
 * handed over. The only feedback was a line inside the Starter Pack card, which
 * is not where anyone is looking at that moment: "es kommt nix" (user,
 * 2026-08-26).
 *
 * Two states, both about the reader rather than the machinery: the wait, and
 * what the wait bought. The count is the honest version of the second one — an
 * account is worth roughly fifty spots, and naming the number is a better
 * reward than "erfolgreich angemeldet".
 *
 * Fixed and above the sheet on purpose: on a phone the detail sheet is the
 * whole screen, so anything rendered inside the map layer would be covered by
 * the very sheet the reader is waiting on.
 *
 * Movement is translate, not opacity — project rule for appear/disappear on
 * brand surfaces.
 */
export default function SignInProgressBanner({ working, openSpotCount }: Props) {
  const locale = useLocale();
  const t = copy[locale === routing.defaultLocale ? 'de' : 'en'];

  const [phase, setPhase] = useState<'idle' | 'working' | 'done' | 'leaving'>('idle');
  const [gained, setGained] = useState(0);
  /* The count as it stood when the wait began. Kept in state rather than a ref
     so the finished render has it — a ref updated in the same effect would
     already hold the new value by the time it is read. */
  const [countAtStart, setCountAtStart] = useState<number | null>(null);

  useEffect(() => {
    if (working) {
      setPhase((current) => (current === 'working' ? current : 'working'));
      setCountAtStart((current) => (current === null ? openSpotCount : current));
      return;
    }
    // Only a wait that actually ran gets a finished message; the banner must
    // not appear for a reader who simply opened the map.
    setPhase((current) => (current === 'working' ? 'done' : current));
    setGained(countAtStart === null ? 0 : Math.max(0, openSpotCount - countAtStart));
  }, [working, openSpotCount, countAtStart]);

  useEffect(() => {
    if (phase === 'done') {
      const id = window.setTimeout(() => setPhase('leaving'), DONE_VISIBLE_MS);
      return () => window.clearTimeout(id);
    }
    if (phase === 'leaving') {
      const id = window.setTimeout(() => setPhase('idle'), LEAVE_MS);
      return () => window.clearTimeout(id);
    }
  }, [phase]);

  if (phase === 'idle') return null;
  const done = phase !== 'working';

  return (
    <div
      className={`${styles.banner}${done ? ` ${styles.bannerDone}` : ''}${
        phase === 'leaving' ? ` ${styles.bannerLeaving}` : ''
      }`}
      role="status"
      aria-live="polite"
    >
      <span>{done ? (gained > 0 ? t.doneCounted(gained) : t.donePlain) : t.working}</span>
      {!done && (
        <span className={styles.dots} aria-hidden="true">
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </span>
      )}
    </div>
  );
}
