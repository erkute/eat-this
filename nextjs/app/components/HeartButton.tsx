'use client';
import { useAuth } from '@/lib/auth';
import { useFavorites } from '@/lib/map/useFavorites';
import { useHeartCount } from '@/lib/map/useHeartCount';
import { heartCountShort, heartLabel } from '@/lib/map/heartLabel';
import { HeartIcon } from '@/app/components/map/icons';
import styles from './HeartButton.module.css';

interface HeartButtonProps {
  restaurantId: string;
  name: string;
  slug?: string;
  photo?: string;
  district?: string;
  locale: string;
}

// Personal "heart this spot" toggle for the SEO restaurant page (a client
// island on an otherwise-static page). A heart IS a saved spot — reuses
// useFavorites, so the same toggle drives the map detail too, and hearting here
// bumps the public count that rides right next to the heart (live via
// useHeartCount, hidden below 1). One heart on the photo, not two: the separate
// count badge in the opposite corner meant hearting a spot made a second heart
// appear — same merge the map detail sheet already does.
// Anon tap opens the shared login modal (handled inside useFavorites).
// See docs/specs/2026-06-09-hearts-design.md.
export default function HeartButton({
  restaurantId,
  name,
  slug,
  photo,
  district,
  locale,
}: HeartButtonProps) {
  const de = locale !== 'en';
  const { favoriteIds, toggle } = useFavorites(useAuth().user?.uid ?? null);
  const { count } = useHeartCount(restaurantId);
  const hearted = favoriteIds.has(restaurantId);
  // The number next to the glyph is only visual — inside a labelled button it
  // never reaches a screen reader, so the full phrase rides in the label.
  const countLabel = heartLabel(count, locale);

  return (
    <div className={styles.row}>
      <button
        type="button"
        className={hearted ? `${styles.btn} ${styles.btnActive}` : styles.btn}
        aria-pressed={hearted}
        aria-label={
          (hearted
            ? de
              ? 'Herz entfernen'
              : 'Remove heart'
            : de
              ? 'Spot herzen'
              : 'Heart this spot') + (countLabel ? `, ${countLabel}` : '')
        }
        onClick={() => {
          void toggle({ _id: restaurantId, name, slug, photo, district });
        }}
      >
        <HeartIcon filled={hearted} />
        {count >= 1 && <span className={styles.count}>{heartCountShort(count, locale)}</span>}
      </button>
    </div>
  );
}
