'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useOwnedEntitlements } from '@/lib/firebase/useOwnedEntitlements';
import { CATALOG, allPackIds } from '@/lib/stripe-catalog';
import { categoryArt } from '@/lib/categoryArt';
import styles from './Profile.module.css';

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
      width={96}
      height={139}
      sizes="(max-width: 760px) 72px, 96px"
      loading="lazy"
    />
  );
}

/**
 * Was diesem Konto gehoert — eine Trophaeenreihe, kein Laden.
 *
 * Hier standen elf Packs, zehn davon mit schwarzem „Öffnen"-Kaufknopf: der
 * lauteste und farbigste Block der Seite zeigte zu neunzig Prozent fremdes
 * Inventar. Der Besitz gehoert ins Profil, der Laden nicht — was noch fehlt,
 * steht als EINE Zeile darunter und fuehrt nach /packs.
 *
 * `fullCatalog` kommt von oben und nicht aus useOwnedEntitlements: der Hook
 * liest nur users/<uid>/entitlements und kennt damit weder den Admin-Zugang
 * noch dessen Quelle (ADMIN_EMAILS plus verifizierte Adresse, server-only).
 * Auf einem Admin-Konto stand deshalb „466 von 466 Spots auf deiner Map" und
 * gleich darunter zehn verschlossene Packs.
 */
export default function ProfilePacks({ uid, fullCatalog }: { uid: string; fullCatalog: boolean }) {
  const t = useTranslations('profile');
  const owned = useOwnedEntitlements(uid);

  const head = (
    <div className={`hv-head ${styles.head}`}>
      <h2 className="hv-title">{t('packsHeading')}</h2>
    </div>
  );

  if (owned === null) {
    return (
      <>
        {head}
        <div className={styles.dataNotice} role="status" aria-live="polite">
          <p>{t('dataLoading')}</p>
        </div>
      </>
    );
  }

  const allOpen = fullCatalog || owned.has('all-berlin');
  const boosters = allPackIds()
    .map((id) => CATALOG[id])
    .filter((p): p is NonNullable<typeof p> => !!p && p.type === 'category');

  const opened = boosters.filter((p) => allOpen || owned.has(p.packId));
  const remaining = boosters.length - opened.length;

  return (
    <>
      {head}
      <ul className={styles.trophies}>
        {/* Das Welcome Pack hat jedes Konto — es eroeffnet die Reihe. */}
        <li className={styles.trophy}>
          <PackArt src={WELCOME_ART} />
          <span className={styles.trophyName}>Welcome Pack</span>
        </li>
        {opened.map((p) => (
          <li key={p.packId} className={styles.trophy}>
            <PackArt src={p.slug ? (categoryArt(p.slug) ?? ALL_BERLIN_ART) : ALL_BERLIN_ART} />
            <span className={styles.trophyName}>{p.displayName}</span>
          </li>
        ))}
      </ul>
      {/* Ein Knopf statt zehn Kaufkarten. Wer alles hat, sieht ihn nicht --
          dass er ueberhaupt dasteht, ist die Auskunft „es gibt noch mehr".
          Ohne Zahl: „Noch 9 Packs offen" hiess gemeint „neun stehen noch
          aus", las sich ueber einer Reihe GEOEFFNETER Packs aber als „neun
          sind offen" -- also genau verkehrt herum. Und eine Zahl kann falsch
          werden, waehrend der Weg zum Sortiment immer stimmt. */}
      {remaining > 0 && (
        <Link href="/packs" className={styles.packsMore}>
          {t('packsMore')}
        </Link>
      )}
    </>
  );
}
