'use client';

import Image from '@/app/components/SiteImage';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useOwnedEntitlements } from '@/lib/firebase/useOwnedEntitlements';
import { CATALOG, allPackIds } from '@/lib/stripe-catalog';
import { categoryArt } from '@/lib/categoryArt';
import styles from './Profile.module.css';

const PACK_ART_VERSION = '1';
const WELCOME_ART = '/pics/home/starter-pack-front.webp?v=20261030';
const ALL_BERLIN_ART = '/pics/booster/booster.webp?v=20261030';

function versionedPackArt(src: string): string {
  return src.includes('?v=') ? src : `${src}?v=${PACK_ART_VERSION}`;
}

function PackArt({ src }: { src: string }) {
  return (
    <Image
      src={versionedPackArt(src)}
      alt=""
      width={160}
      height={src === WELCOME_ART ? 253 : 232}
      sizes="160px"
      loading="lazy"
    />
  );
}

/**
 * Was diesem Konto gehört, vorn; was noch fehlt, ausgegraut dahinter, jedes
 * Pack mit dem Weg in den Laden (/packs). Das Profil zeigt Besitz, der Laden
 * liegt eine Seite weiter.
 *
 * `fullCatalog` kommt von oben und nicht aus useOwnedEntitlements: der Hook
 * liest nur users/<uid>/entitlements und kennt damit weder den Admin-Zugang
 * noch dessen Quelle (ADMIN_EMAILS plus verifizierte Adresse, server-only).
 * Ein Admin-Konto stünde sonst mit allen Spots auf der Map da und zehn
 * verschlossenen Packs darunter.
 */
export default function ProfilePacks({ uid, fullCatalog }: { uid: string; fullCatalog: boolean }) {
  const owned = useOwnedEntitlements(uid);
  return <ProfilePacksContent owned={owned} fullCatalog={fullCatalog} />;
}

function ProfilePacksContent({
  owned,
  fullCatalog,
}: {
  owned: ReadonlySet<string> | null;
  fullCatalog: boolean;
}) {
  const t = useTranslations('profile');

  if (owned === null) {
    return (
      <div className={styles.dataNotice} role="status" aria-live="polite">
        <p>{t('dataLoading')}</p>
      </div>
    );
  }

  const allOpen = fullCatalog || owned.has('all-berlin');
  const boosters = allPackIds()
    .map((id) => CATALOG[id])
    .filter((p): p is NonNullable<typeof p> => !!p && p.type === 'category');

  const isOpen = (p: (typeof boosters)[number]) => allOpen || owned.has(p.packId);
  /* Erst alles, was dem Konto gehört, dann die übrigen — ausgegraut. Wer sie
     sieht, sieht, was noch fehlt; ein Tipp führt in den Laden. */
  const sorted = [...boosters.filter(isOpen), ...boosters.filter((p) => !isOpen(p))];
  const remaining = boosters.length - boosters.filter(isOpen).length;
  const artOf = (p: (typeof boosters)[number]) =>
    p.slug ? (categoryArt(p.slug) ?? ALL_BERLIN_ART) : ALL_BERLIN_ART;
  const lockedArt = boosters.filter((p) => !isOpen(p)).map((p) => artOf(p));

  return (
    <>
      <ul className={styles.trophies}>
        {/* Das Welcome Pack hat jedes Konto — es eroeffnet die Reihe. */}
        <li className={styles.trophy}>
          <PackArt src={WELCOME_ART} />
          <span className={`et-label-title et-label-tape ${styles.trophyName}`}>
            {t('starterPack')}
          </span>
        </li>
        {sorted.map((p) =>
          isOpen(p) ? (
            <li key={p.packId} className={styles.trophy}>
              <PackArt src={artOf(p)} />
              <span className={`et-label-title et-label-tape ${styles.trophyName}`}>
                {p.displayName}
              </span>
            </li>
          ) : (
            <li key={p.packId} className={`${styles.trophy} ${styles.trophyLocked}`}>
              <Link
                href="/packs"
                className={styles.trophyLink}
                aria-label={t('packLockedLabel', { name: p.displayName })}
              >
                <PackArt src={artOf(p)} />
                <span className={`et-label ${styles.trophyName}`}>{p.displayName}</span>
              </Link>
            </li>
          )
        )}
      </ul>
      {remaining > 0 && (
        <div className={`${styles.invite} ${styles.packsCta}`} data-red-sheet>
          <span className={styles.inviteFan} aria-hidden="true">
            {lockedArt.slice(0, 3).map((src) => (
              <Image
                key={src}
                src={versionedPackArt(src)}
                alt=""
                width={76}
                height={110}
                sizes="76px"
                loading="lazy"
              />
            ))}
          </span>
          <div className={styles.inviteCopy}>
            <h2 className={styles.inviteTitle}>{t('packsMoreTitle')}</h2>
            <p className={styles.inviteLine}>{t('packsMoreLine')}</p>
          </div>
          <div className={styles.inviteAction}>
            <Link href="/packs" className="et-btn et-btn-lg">
              {t('packsMore')}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
