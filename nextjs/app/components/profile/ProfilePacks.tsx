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
const ALL_BERLIN_GRID = [
  ['breakfast', 'fine-dining', 'pizza'],
  ['coffee', 'drinks', 'lunch'],
  ['dinner', 'sweets', 'fast-food'],
] as const;

// Opened packs stay grouped above unopened packs; locked cards keep only the
// button clickable so the card still reads as a collected-object slot.
export default function ProfilePacks({ uid }: { uid: string }) {
  const t = useTranslations('profile');
  const owned = useOwnedEntitlements(uid);
  const ownedSet = owned ?? new Set<string>();
  const allBerlin = CATALOG['all-berlin'];
  const allBerlinOwned = ownedSet.has('all-berlin');
  const boosters = allPackIds()
    .map((id) => CATALOG[id])
    .filter((p): p is NonNullable<typeof p> => !!p && p.type === 'category');

  const allBerlinInner = (locked: boolean) => (
    <>
      <span className={styles.allBerlinArt} aria-hidden="true">
        <span className={styles.allBerlinStack}>
          {ALL_BERLIN_GRID.map((row, index) => (
            <span
              key={row.join('-')}
              className={`${styles.allBerlinRow} ${
                index === 0
                  ? styles.allBerlinRowTop
                  : index === 1
                    ? styles.allBerlinRowMid
                    : styles.allBerlinRowBottom
              }`}
            >
              {row.map((slug) => {
                const src = categoryArt(slug);
                return src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={slug} src={src} alt="" loading="lazy" />
                ) : null;
              })}
            </span>
          ))}
        </span>
      </span>
      <span className={styles.allBerlinCopy}>
        <span className={styles.packName}>{allBerlin.displayName}</span>
        {locked ? (
          <Link href={`/pack/${packUrlSlug(allBerlin)}`} className={styles.packButton}>
            {t('packStatusLocked')}
          </Link>
        ) : (
          <span className={styles.packStatus}>{t('packStatusOwned')}</span>
        )}
      </span>
    </>
  );

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
      {allBerlinOwned && (
        <div className={`${styles.packs} ${styles.allBerlinPacks}`}>
          <div className={`${styles.pack} ${styles.packOwned} ${styles.allBerlinPack}`}>
            {allBerlinInner(false)}
          </div>
        </div>
      )}
      {(!allBerlinOwned || lockedBoosters.length > 0) && (
        <div className={`${styles.packs} ${styles.lockedPacks}`}>
          {!allBerlinOwned && (
            <div className={`${styles.pack} ${styles.packLocked} ${styles.allBerlinPack}`}>
              {allBerlinInner(true)}
            </div>
          )}
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
