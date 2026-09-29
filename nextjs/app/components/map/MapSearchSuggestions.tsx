import type { MapRestaurant } from '@/lib/types';
import { abbreviateBezirk } from '@/lib/map';
import { localizedCuisine } from '@/lib/cuisineLabels';
import styles from './MapControls.module.css';

/**
 * Vorschläge unter dem Suchfeld. Tippen filtert die Liste nicht mehr: hier
 * stehen die passenden Spots, ein Tipp öffnet einen davon, und erst Enter
 * bzw. „Suchen" filtert Liste und Karte (Betreiber, 29.09.2026).
 */
export default function MapSearchSuggestions({
  spots,
  locale,
  onPick,
}: {
  spots: MapRestaurant[];
  locale: 'de' | 'en';
  onPick: (r: MapRestaurant) => void;
}) {
  return (
    <div
      className={styles.mapSearchSuggestions}
      data-map-search-suggestions=""
      /* The map underneath takes pointer-downs as the start of a pan, and a
         tap on the map closes what is open (MapSectionBody's search form
         stops them the same way). */
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {spots.length ? (
        <ul role="listbox" aria-label={locale === 'en' ? 'Suggestions' : 'Vorschläge'}>
          {spots.map((r) => {
            const district = abbreviateBezirk(r.bezirk?.name ?? r.district ?? null);
            const cuisine = r.cuisineType ? localizedCuisine(r.cuisineType, locale) : null;
            const meta = [district, cuisine].filter(Boolean).join(' · ');
            return (
              <li key={r._id} role="option" aria-selected={false}>
                <button
                  type="button"
                  className={styles.mapSearchSuggestion}
                  /* Keeps the field's focus until the tap has landed: a blur
                     first let iOS drop the keyboard and move the list under
                     the finger. */
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPick(r)}
                >
                  <span className={styles.mapSearchSuggestionName}>{r.name}</span>
                  {meta && <span className={styles.mapSearchSuggestionMeta}>{meta}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.mapSearchSuggestionNone}>
          {locale === 'en' ? 'No spot found' : 'Kein Spot gefunden'}
        </p>
      )}
    </div>
  );
}
