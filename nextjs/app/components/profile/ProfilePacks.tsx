'use client';

import { Link } from '@/i18n/navigation';
import { useOwnedEntitlements } from '@/lib/firebase/useOwnedEntitlements';
import { CATALOG } from '@/lib/stripe-catalog';
import styles from './ProfileSlim.module.css';

// Owned packs as chips. Welcome Pack (gift) is always present; bought packs
// resolve their display name from the Stripe catalog. When nothing beyond the
// welcome pack is owned, nudge toward the booster index.
export default function ProfilePacks({ uid }: { uid: string }) {
  const owned = useOwnedEntitlements(uid);
  const names = (owned ? [...owned] : [])
    .map((id) => CATALOG[id]?.displayName)
    .filter((n): n is string => !!n);
  const onlyWelcome = names.length === 0;

  return (
    <>
      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>Meine Packs</h2>
      </div>
      <div className={styles.packs}>
        <span className={`${styles.pck} ${styles.pckGift}`}>Welcome Pack</span>
        {names.map((n) => (
          <span key={n} className={styles.pck}>{n}</span>
        ))}
      </div>
      {onlyWelcome && (
        <div className={styles.packHint}>
          <p className={styles.packLine}>Mehr Map, mehr Karten — Pack für Pack.</p>
          <Link href="/home#hub-packs" className={styles.packCta}>Booster Packs ansehen →</Link>
        </div>
      )}
    </>
  );
}
