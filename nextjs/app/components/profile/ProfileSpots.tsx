'use client';

import { Link } from '@/i18n/navigation';
import { useFavorites } from '@/lib/map/useFavorites';
import { normalizeName } from '@/lib/normalizeName';
import styles from './ProfileSlim.module.css';

// Saved spots (Firestore favorites) as full-image cards → tap opens the map.
// Read-only; un-saving happens on the map's bookmark toggle.
export default function ProfileSpots({ uid }: { uid: string }) {
  const { favorites, loading } = useFavorites(uid);

  if (loading) return null;

  if (favorites.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyLine}>
          Noch nichts gespeichert. Tipp auf der Map einen Spot an und drück Bookmark — er landet hier.
        </p>
        <Link href="/map" className={styles.emptyCta}>Zur Map →</Link>
      </div>
    );
  }

  return (
    <div className={styles.spotsCards}>
      {favorites.map((f) => (
        <Link
          key={f.restaurantId}
          href={f.slug ? `/map?r=${encodeURIComponent(f.slug)}` : '/map'}
          className={styles.spotCard}
          rel="nofollow"
        >
          {f.photo && (
            <div className={styles.spotImg} style={{ backgroundImage: `url(${f.photo})` }} />
          )}
          <div className={styles.spotBody}>
            <h3 className={styles.spotName}>{normalizeName(f.name)}</h3>
            {f.district && <div className={styles.spotMeta}>{f.district}</div>}
          </div>
        </Link>
      ))}
    </div>
  );
}
