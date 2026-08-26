'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import type { ClaimOutcome } from '@/lib/map/claimSignupSpot';
import styles from './SignInReward.module.css';

/** How long the result stays before it slides back out. The countdown bar in
 *  the button drains over exactly this, so the reader can see it coming rather
 *  than have it vanish mid-sentence. */
const DONE_VISIBLE_MS = 5000;
/** Must match the leaving keyframes — the card stays mounted while it goes. */
const LEAVE_MS = 240;

const copy = {
  de: {
    working: 'Einen Moment',
    workingBody: 'Wir schalten deine Spots frei',
    kicker: 'Starter Pack eingelöst',
    headline: 'Deine Map ist gewachsen',
    countLabel: (n: number) => (n === 1 ? 'neuer Spot' : 'neue Spots'),
    grantedSpot: 'Dein Spot ist dabei',
    packAlt: 'Eat This Starter Pack',
    donePlain: 'Du bist angemeldet',
    donePlainBody: 'Deine Map ist auf dem neuesten Stand.',
    spentHead: 'Angemeldet',
    spentHeadline: 'Dieser Spot bleibt zu',
    spentBody: 'Deinen Gratis-Spot hattest du schon eingelöst — dieser hier gehört zu einem Pack.',
    action: 'Weiter zur Map',
  },
  en: {
    working: 'One moment',
    workingBody: 'Unlocking your spots',
    kicker: 'Starter Pack claimed',
    headline: 'Your map just grew',
    countLabel: (n: number) => (n === 1 ? 'new spot' : 'new spots'),
    grantedSpot: 'Your spot is in there',
    packAlt: 'Eat This Starter Pack',
    donePlain: "You're signed in",
    donePlainBody: 'Your map is up to date.',
    spentHead: 'Signed in',
    spentHeadline: 'This spot stays shut',
    spentBody: 'You already used your free spot — this one belongs to a pack.',
    action: 'Back to the map',
  },
} as const;

interface Props {
  /** A sign-up claim is in flight — see useSignupSpotClaim. */
  working: boolean;
  /** How the claim went, once decided. */
  outcome: ClaimOutcome | null;
  /** Spots the viewer can open right now — the "after" side of the count. */
  openSpotCount: number;
  /** Spots the last ANONYMOUS payload showed — the "before" side. Sampling
   *  "before" when the wait began was a race: if the signed refetch landed
   *  first, the sample was already the signed tier, and ~51 new spots showed
   *  as "1 neuer Spot" (user, 2026-08-26). The anon payload is unambiguous —
   *  it does not depend on which response lands when. Null when no anonymous
   *  view was ever loaded (e.g. a cache-seeded signed session); the sampled
   *  value then remains the fallback. */
  baselineCount: number | null;
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
export default function SignInReward({ working, outcome, openSpotCount, baselineCount }: Props) {
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
    const before = baselineCount ?? countAtStart;
    setGained(before === null ? 0 : Math.max(0, openSpotCount - before));
  }, [working, openSpotCount, countAtStart, baselineCount]);

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
      <div className={`${styles.panel}${leaving ? ` ${styles.panelLeaving}` : ''}`}>
        {/* Das Objekt, das der Leser gerade eingelöst hat — dasselbe Pack, das
            ihm das gesperrte Sheet angeboten hat. Es überlappt die Oberkante,
            damit das Panel wie etwas aussieht, das gerade ankommt. */}
        <span className={styles.pack} aria-hidden="true">
          <Image
            className={styles.packImg}
            src="/pics/booster/booster_free.webp"
            alt=""
            fill
            sizes="92px"
          />
        </span>

        {!done && (
          <>
            <span className={styles.kicker}>{t.working}</span>
            <p className={styles.headline}>{t.workingBody}</p>
            <span className={styles.dots} aria-hidden="true">
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </span>
          </>
        )}

        {done && outcome === 'spent' && (
          <>
            <span className={styles.kicker}>{t.spentHead}</span>
            <p className={styles.headline}>{t.spentHeadline}</p>
            <p className={styles.body}>{t.spentBody}</p>
          </>
        )}

        {done && outcome !== 'spent' && gained > 0 && (
          <>
            <span className={styles.kicker}>{t.kicker}</span>
            <p className={styles.headline}>{t.headline}</p>
            <span className={styles.count}>{gained}</span>
            <span className={styles.countLabel}>{t.countLabel(gained)}</span>
            {outcome === 'granted' && <span className={styles.spotLine}>{t.grantedSpot}</span>}
          </>
        )}

        {done && outcome !== 'spent' && gained === 0 && (
          <>
            <span className={styles.kicker}>{t.kicker}</span>
            <p className={styles.headline}>{t.donePlain}</p>
            <p className={styles.body}>{t.donePlainBody}</p>
          </>
        )}

        {done && (
          <div className={styles.actionWrap}>
            <button type="button" className={styles.action} onClick={() => setPhase('leaving')}>
              {t.action}
            </button>
            {/* Läuft genau so lange wie die Meldung steht — eine Zahl, zwei
                Orte, deshalb aus derselben Konstante. */}
            <span
              className={styles.countdown}
              style={{ animationDuration: `${DONE_VISIBLE_MS}ms` }}
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    </div>
  );
}
