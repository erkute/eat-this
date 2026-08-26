'use client';
import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import type { ClaimOutcome } from '@/lib/map/claimSignupSpot';
import styles from './SignInReward.module.css';

/** How long the result stays before it slides back out. Generous: it lands on
 *  a page still settling after a full reload, and it carries the one number
 *  the whole sign-up was for. */
const DONE_VISIBLE_MS = 7000;
/** Must match the leaving keyframes — the card stays mounted while it goes. */
const LEAVE_MS = 240;

const copy = {
  de: {
    working: 'Du wirst angemeldet',
    workingBody: 'Wir schalten deine Spots frei.',
    countLabel: (n: number) =>
      n === 1 ? 'neuer Spot auf deiner Map' : 'neue Spots auf deiner Map',
    grantedSpot: 'Dein Spot ist dabei',
    donePlain: 'Du bist angemeldet',
    donePlainBody: 'Deine Map ist auf dem neuesten Stand.',
    spentHead: 'Du bist angemeldet',
    spentBody: 'Deinen Gratis-Spot hattest du schon eingelöst — dieser hier gehört zu einem Pack.',
    action: 'Weiter zur Map',
  },
  en: {
    working: 'Signing you in',
    workingBody: 'Unlocking your spots.',
    countLabel: (n: number) => (n === 1 ? 'new spot on your map' : 'new spots on your map'),
    grantedSpot: 'Your spot is in there',
    donePlain: "You're signed in",
    donePlainBody: 'Your map is up to date.',
    spentHead: "You're signed in",
    spentBody: 'You already used your free spot — this one belongs to a pack.',
    action: 'Back to the map',
  },
} as const;

interface Props {
  /** A sign-up claim is in flight — see useSignupSpotClaim. */
  working: boolean;
  /** How the claim went, once decided. */
  outcome: ClaimOutcome | null;
  /** Spots the viewer can open right now. Sampled when the wait starts and
   *  again when it ends, so the result can say what it was worth. */
  openSpotCount: number;
}

/**
 * What the sign-in was worth, said where it cannot be missed.
 *
 * The first version of this was a strip at the top of the map. It was wrong
 * twice over: it sat under the navbar (z-index 9999) so it was half covered,
 * and even uncovered it was too small for what it carries — "das kann ich gar
 * nicht lesen, dass ich jetzt fünfzig Spots freigeschaltet hab" (user,
 * 2026-08-26). An account roughly doubles what this map shows; that number is
 * the payoff of the whole funnel and belongs in the middle of the screen.
 *
 * Three endings, because the claim has three:
 *
 *   granted → the count, plus a line saying the tapped spot is in there
 *   spent   → why it is not: the account's one free spot was used already,
 *             which the sheet could not know while the reader was signed out
 *   failed  → the count alone, without a claim of something that did not happen
 *
 * The `spent` case is the one this component exists for as much as the count.
 * Left unsaid, a reader who was promised THIS spot and did not get it is
 * looking at a sign-in that silently did nothing.
 *
 * The veil catches no clicks: the map underneath stays usable. This is a
 * message, not a dialog — the button is a courtesy for dismissing it early,
 * not a gate.
 */
export default function SignInReward({ working, outcome, openSpotCount }: Props) {
  const locale = useLocale();
  const t = copy[locale === routing.defaultLocale ? 'de' : 'en'];

  const [phase, setPhase] = useState<'idle' | 'working' | 'done' | 'leaving'>('idle');
  const [gained, setGained] = useState(0);
  /* The count as it stood when the wait began. State, not a ref: a ref updated
     in the same effect would already hold the new value when it is read. */
  const [countAtStart, setCountAtStart] = useState<number | null>(null);

  useEffect(() => {
    if (working) {
      setPhase('working');
      setCountAtStart((current) => (current === null ? openSpotCount : current));
      return;
    }
    // Only a wait that actually ran gets a result; this must not greet a reader
    // who simply opened the map.
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
  const leaving = phase === 'leaving';
  const done = phase !== 'working';

  return (
    <div
      className={`${styles.layer}${leaving ? ` ${styles.layerLeaving}` : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className={`${styles.card}${leaving ? ` ${styles.cardLeaving}` : ''}`}>
        {!done && (
          <>
            <p className={styles.headline}>{t.working}</p>
            <p className={styles.body}>{t.workingBody}</p>
            <span className={styles.dots} aria-hidden="true">
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </span>
          </>
        )}

        {done && outcome === 'spent' && (
          <>
            <p className={styles.headline}>{t.spentHead}</p>
            <p className={styles.body}>{t.spentBody}</p>
          </>
        )}

        {done && outcome !== 'spent' && gained > 0 && (
          <>
            <span className={styles.count}>{gained}</span>
            <span className={styles.countLabel}>{t.countLabel(gained)}</span>
            {outcome === 'granted' && <span className={styles.spotLine}>{t.grantedSpot}</span>}
          </>
        )}

        {done && outcome !== 'spent' && gained === 0 && (
          <>
            <p className={styles.headline}>{t.donePlain}</p>
            <p className={styles.body}>{t.donePlainBody}</p>
          </>
        )}

        {done && (
          <button type="button" className={styles.action} onClick={() => setPhase('leaving')}>
            {t.action}
          </button>
        )}
      </div>
    </div>
  );
}
