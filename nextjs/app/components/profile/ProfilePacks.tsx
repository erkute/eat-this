'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useOwnedEntitlements } from '@/lib/firebase/useOwnedEntitlements';
import { CATALOG, allPackIds } from '@/lib/stripe-catalog';
import { packUrlSlug } from '@/lib/pack/packDetail';
import { categoryArt } from '@/lib/categoryArt';
import styles from './ProfileSlim.module.css';

const PACK_ART_VERSION = '1';
const WELCOME_ART = '/pics/booster/booster_free.webp';
const ALL_BERLIN_ART = '/pics/booster/booster.webp';

function versionedPackArt(src: string): string {
  return `${src}${src.includes('?') ? '&' : '?'}v=${PACK_ART_VERSION}`;
}

function PackArt({ src }: { src: string }) {
  return (
    <Image
      src={versionedPackArt(src)}
      alt=""
      width={166}
      height={190}
      sizes="(max-width: 760px) 136px, 166px"
      loading="lazy"
    />
  );
}

// Opened packs stay grouped above unopened packs; locked cards link as a whole
// so the pack art is tappable too.
export default function ProfilePacks({ uid }: { uid: string }) {
  const t = useTranslations('profile');
  const owned = useOwnedEntitlements(uid);
  if (owned === null) {
    return (
      <>
        <div className={styles.secHead}>
          <h3>{t('packsHeading')}</h3>
        </div>
        <div className={styles.dataNotice} role="status" aria-live="polite">
          <p>{t('dataLoading')}</p>
        </div>
      </>
    );
  }

  const ownedSet = owned;
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
          <PackArt src={WELCOME_ART} />
          <span className={styles.packName}>Welcome Pack</span>
          <span className={styles.dots} />
          <span className={styles.packStatus}>{t('packStatusOwned')}</span>
        </div>
        {openedBoosters.map((p) => {
          const art = p.slug ? (categoryArt(p.slug) ?? ALL_BERLIN_ART) : ALL_BERLIN_ART;
          return (
            <div key={p.packId} className={`${styles.pack} ${styles.packOwned}`}>
              <PackArt src={art} />
              <span className={styles.packName}>{p.displayName}</span>
              <span className={styles.dots} />
              <span className={styles.packStatus}>{t('packStatusOwned')}</span>
            </div>
          );
        })}
        {lockedBoosters.map((p) => {
          const art = p.slug ? (categoryArt(p.slug) ?? ALL_BERLIN_ART) : ALL_BERLIN_ART;
          return (
            <Link
              key={p.packId}
              href={`/pack/${packUrlSlug(p)}`}
              className={`${styles.pack} ${styles.packLocked}`}
            >
              <PackArt src={art} />
              <span className={styles.packName}>{p.displayName}</span>
              <span className={styles.packButton}>
                {t('packStatusLocked')}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
