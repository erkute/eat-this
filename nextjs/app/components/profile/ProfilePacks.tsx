'use client';

import { useTranslations } from 'next-intl';
import { useOwnedEntitlements } from '@/lib/firebase/useOwnedEntitlements';
import { CATALOG, allPackIds } from '@/lib/stripe-catalog';
import { categoryArt } from '@/lib/categoryArt';
import styles from './ProfileSlim.module.css';

const WELCOME_ART = '/pics/booster/booster_free.webp';
const ALL_BERLIN_ART = '/pics/booster/booster.webp';

function euro(amountCents: number): string {
  return `${(amountCents / 100).toFixed(2).replace('.', ',')} €`;
}

// Booster packs as an editorial menu list: the Welcome Pack (always owned) plus
// every catalog pack. Owned rows read full-strength with a "dabei/owned" status;
// not-yet-owned rows are dimmed and show their price as a dotted-leader entry.
export default function ProfilePacks({ uid }: { uid: string }) {
  const t = useTranslations('profile');
  const owned = useOwnedEntitlements(uid);
  const ownedSet = owned ?? new Set<string>();
  const boosters = allPackIds()
    .map((id) => CATALOG[id])
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <>
      <div className={styles.secHead}>
        <h3>{t('packsHeading')}</h3>
      </div>
      <div className={styles.packs}>
        <div className={styles.pack}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={WELCOME_ART} alt="" />
          <span className={styles.packName}>Welcome Pack</span>
          <span className={styles.dots} />
          <span className={styles.packStatus}>{t('packStatusOwned')}</span>
        </div>
        {boosters.map((p) => {
          const isOwned = ownedSet.has(p.packId);
          const art = p.slug ? (categoryArt(p.slug) ?? ALL_BERLIN_ART) : ALL_BERLIN_ART;
          return (
            <div key={p.packId} className={`${styles.pack} ${isOwned ? '' : styles.packOff}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={art} alt="" />
              <span className={styles.packName}>{p.displayName}</span>
              <span className={styles.dots} />
              <span className={styles.packStatus}>
                {isOwned ? t('packStatusOwned') : euro(p.amountCents)}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
