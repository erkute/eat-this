'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useOwnedEntitlements } from '@/lib/firebase/useOwnedEntitlements';
import { CATALOG, allPackIds } from '@/lib/stripe-catalog';
import styles from './ProfileSlim.module.css';

// All Booster packs as chips: the Welcome Pack (gift) plus every catalog pack,
// with owned ones solid and not-yet-owned ones as muted outlines — so the user
// sees the full set and what's still missing. Nudge to the booster index unless
// they already own at least one paid pack.
export default function ProfilePacks({ uid }: { uid: string }) {
  const t = useTranslations('profile');
  const owned = useOwnedEntitlements(uid);
  const ownedSet = owned ?? new Set<string>();
  const boosters = allPackIds()
    .map((id) => CATALOG[id])
    .filter((p): p is NonNullable<typeof p> => !!p);
  const hasBought = boosters.some((p) => ownedSet.has(p.packId));

  return (
    <>
      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>{t('packsHeading')}</h2>
      </div>
      <div className={styles.packs}>
        <span className={`${styles.pck} ${styles.pckGift}`}>Welcome Pack</span>
        {boosters.map((p) => (
          <span
            key={p.packId}
            className={`${styles.pck} ${ownedSet.has(p.packId) ? '' : styles.pckLocked}`}
          >
            {p.displayName}
          </span>
        ))}
      </div>
      {!hasBought && (
        <div className={styles.packHint}>
          <p className={styles.packLine}>{t('packsLine')}</p>
          <Link href="/#hub-allberlin" className={styles.packCta}>
            {t('packsCta')}
          </Link>
        </div>
      )}
    </>
  );
}
