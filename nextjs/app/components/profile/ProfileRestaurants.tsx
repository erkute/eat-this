'use client';

import { useFavorites } from '@/lib/map/useFavorites';
import styles from './ProfileRestaurants.module.css';

interface Props {
  uid: string;
}

export default function ProfileRestaurants({ uid }: Props) {
  const { favorites, loading, toggle } = useFavorites(uid);

  if (loading) {
    return (
      <div className={styles.placeholder}>
        <div className={styles.spinner} aria-hidden="true" />
      </div>
    );
  }
  if (favorites.length === 0) {
    return (
      <p className={styles.empty}>
        Du hast noch keine Restaurants gespeichert. Tippe auf das Herz an einer Map-Karte.
      </p>
    );
  }
  return (
    <div className={styles.grid}>
      {favorites.map((f) => (
        <div key={f.restaurantId} className={styles.card}>
          {f.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.photo} alt="" className={styles.img} loading="lazy" />
          ) : (
            <div className={styles.imgPlaceholder} aria-hidden="true">🍽</div>
          )}
          <button
            type="button"
            className={styles.remove}
            aria-label={`${f.name} entfernen`}
            onClick={() => toggle({ _id: f.restaurantId, name: f.name, photo: f.photo, district: f.district })}
          >
            ×
          </button>
          <div className={styles.overlay}>
            <span className={styles.name}>{f.name}</span>
            {f.district && <span className={styles.district}>{f.district}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
