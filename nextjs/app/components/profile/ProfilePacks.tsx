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

// Booster packs as an editorial menu list: All Berlin gets its own fan card,
// then the Welcome Pack and category packs follow below.
export default function ProfilePacks({ uid }: { uid: string }) {
  const t = useTranslations('profile');
  const owned = useOwnedEntitlements(uid);
  const ownedSet = owned ?? new Set<string>();
  const allBerlin = CATALOG['all-berlin'];
  const allBerlinOwned = ownedSet.has('all-berlin');
  const boosters = allPackIds()
    .map((id) => CATALOG[id])
    .filter((p): p is NonNullable<typeof p> => !!p && p.type === 'category');

  const allBerlinInner = (
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
        <span className={styles.packStatus}>
          {allBerlinOwned ? t('packStatusOwned') : t('packStatusLocked')}
        </span>
      </span>
    </>
  );

  return (
    <>
      <div className={styles.secHead}>
        <h3>{t('packsHeading')}</h3>
      </div>
      {allBerlinOwned ? (
        <div className={`${styles.pack} ${styles.allBerlinPack}`}>
          {allBerlinInner}
        </div>
      ) : (
        <Link
          href={`/pack/${packUrlSlug(allBerlin)}`}
          className={`${styles.pack} ${styles.packBuy} ${styles.allBerlinPack}`}
        >
          {allBerlinInner}
        </Link>
      )}
      <div className={styles.packs}>
        <div className={styles.pack}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={WELCOME_ART} alt="" />
          <span className={styles.packName}>Welcome Pack</span>
          <span className={styles.dots} />
          <span className={styles.packStatus}>{t('packStatusOwned')}</span>
        </div>
        {boosters.map((p) => {
          const isOwned = allBerlinOwned || ownedSet.has(p.packId);
          const art = p.slug ? (categoryArt(p.slug) ?? ALL_BERLIN_ART) : ALL_BERLIN_ART;
          const inner = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={art} alt="" />
              <span className={styles.packName}>{p.displayName}</span>
              <span className={styles.dots} />
              <span className={styles.packStatus}>
                {isOwned ? t('packStatusOwned') : t('packStatusLocked')}
              </span>
            </>
          );
          // Owned → static row; not-yet-owned → link into the pack's buy page.
          return isOwned ? (
            <div key={p.packId} className={styles.pack}>
              {inner}
            </div>
          ) : (
            <Link
              key={p.packId}
              href={`/pack/${packUrlSlug(p)}`}
              className={`${styles.pack} ${styles.packBuy}`}
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </>
  );
}
