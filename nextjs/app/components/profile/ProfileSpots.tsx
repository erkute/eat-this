'use client';

import { Link } from '@/i18n/navigation';
import { useFavorites } from '@/lib/map/useFavorites';
import { normalizeName } from '@/lib/normalizeName';
import styles from './ProfileSlim.module.css';

// Saved spots (Firestore favorites) as full-image cards → tap opens the map.
// Each card carries a remove button so spots can be un-saved here too (not
// only via the map's bookmark toggle).
export default function ProfileSpots({ uid }: { uid: string }) {
  const { favorites, loading, toggle } = useFavorites(uid);

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
        <div key={f.restaurantId} className={styles.spotCardWrap}>
          <Link
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
          <button
            type="button"
            className={styles.spotRemove}
            aria-label={`${normalizeName(f.name)} aus Gespeicherten entfernen`}
            onClick={() => void toggle({ _id: f.restaurantId, name: f.name, slug: f.slug, photo: f.photo, district: f.district })}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
