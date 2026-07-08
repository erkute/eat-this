'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useOwnedEntitlements } from '@/lib/firebase/useOwnedEntitlements';
import { CATALOG, allPackIds } from '@/lib/stripe-catalog';
import { packUrlSlug } from '@/lib/pack/packDetail';
import { categoryArt } from '@/lib/categoryArt';
import styles from './ProfileSlim.module.css';

const WELCOME_ART = '/pics/booster/booster_free.webp';
const ALL_BERLIN_ART = '/pics/booster/booster.webp';

// Opened packs stay grouped above unopened packs; locked cards keep only the
// button clickable so the card still reads as a collected-object slot.
export default function ProfilePacks({ uid }: { uid: string }) {
  const t = useTranslations('profile');
  const owned = useOwnedEntitlements(uid);
  const ownedSet = owned ?? new Set<string>();
  const allBerlinOwned = ownedSet.has('all-berlin');
  const boosters = allPackIds()
    .map((id) => CATALOG[id])
    .filter((p): p is NonNullable<typeof p> => !!p && p.type === 'category');

  const openedBoosters = boosters.filter((p) => allBerlinOwned || ownedSet.has(p.packId));
  const lockedBoosters = boosters.filter((p) => !allBerlinOwned && !ownedSet.has(p.packId));

  return (
    <>
      <div className={styles.secHead}>
        <h3>{t('packsHeading')}</h3>
      </div>
      <div className={styles.packs}>
        <div className={`${styles.pack} ${styles.packOwned}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={WELCOME_ART} alt="" />
          <span className={styles.packName}>Welcome Pack</span>
          <span className={styles.dots} />
          <span className={styles.packStatus}>{t('packStatusOwned')}</span>
        </div>
        {openedBoosters.map((p) => {
          const art = p.slug ? (categoryArt(p.slug) ?? ALL_BERLIN_ART) : ALL_BERLIN_ART;
          return (
            <div key={p.packId} className={`${styles.pack} ${styles.packOwned}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={art} alt="" />
              <span className={styles.packName}>{p.displayName}</span>
              <span className={styles.dots} />
              <span className={styles.packStatus}>{t('packStatusOwned')}</span>
            </div>
          );
        })}
      </div>
      {lockedBoosters.length > 0 && (
        <div className={`${styles.packs} ${styles.lockedPacks}`}>
          {lockedBoosters.map((p) => {
            const art = p.slug ? (categoryArt(p.slug) ?? ALL_BERLIN_ART) : ALL_BERLIN_ART;
            return (
              <div key={p.packId} className={`${styles.pack} ${styles.packLocked}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={art} alt="" />
                <span className={styles.packName}>{p.displayName}</span>
                <Link href={`/pack/${packUrlSlug(p)}`} className={styles.packButton}>
                  {t('packStatusLocked')}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
