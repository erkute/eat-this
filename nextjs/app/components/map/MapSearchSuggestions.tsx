import { useEffect, useRef } from 'react';
import type { MapRestaurant } from '@/lib/types';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { spotNameWithoutDistrict } from '@/lib/home/spotNameWithoutDistrict';
import styles from './MapControls.module.css';

/**
 * Vorschläge unter dem Suchfeld. Tippen filtert die Liste nicht mehr: hier
 * stehen die passenden Spots, ein Tipp öffnet einen davon, und erst Enter
 * bzw. „Suchen" filtert Liste und Karte (Betreiber, 29.09.2026).
 *
 * Hier stehen alle Treffer, die Vorschläge scrollen (suggestSpots).
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
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLUListElement | null>(null);

  /* Am Telefon zog ein Wischen über die Vorschläge die Map bzw. die Liste
     dahinter mit, die Vorschläge selbst standen still (Betreiber,
     27.10.2026). Zwei Gründe: Die Höhe rechnete nicht mit der Tastatur, die
     Liste reichte unter sie und passte nach `max-height` trotzdem ganz
     hinein — es gab nichts zu scrollen. Und wo nichts scrollt, greift
     `overscroll-behavior` nicht, die Geste geht an die Seite.

     Deshalb misst die Höhe am sichtbaren Ausschnitt (visualViewport, in px —
     `vh` ändert Chrome auf iOS beim Scrollen), und eine Geste, die die Liste
     nicht mehr bewegen kann, bleibt hier liegen. */
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const vv = window.visualViewport;
    const measure = () =>
      sheet.style.setProperty('--map-search-room', `${Math.round(vv?.height ?? window.innerHeight)}px`);
    measure();
    vv?.addEventListener('resize', measure);
    window.addEventListener('resize', measure);

    let lastY = 0;
    const onTouchStart = (e: TouchEvent) => {
      lastY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? lastY;
      const dy = y - lastY;
      lastY = y;
      if (!e.cancelable || e.touches.length > 1) return;
      const list = scrollRef.current;
      const inList = list && e.target instanceof Node && list.contains(e.target);
      const canScroll =
        inList &&
        (dy > 0
          ? list.scrollTop > 0
          : dy < 0
            ? list.scrollTop + list.clientHeight < list.scrollHeight - 1
            : true);
      if (!canScroll) e.preventDefault();
    };
    sheet.addEventListener('touchstart', onTouchStart, { passive: true });
    sheet.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      vv?.removeEventListener('resize', measure);
      window.removeEventListener('resize', measure);
      sheet.removeEventListener('touchstart', onTouchStart);
      sheet.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <div
      ref={sheetRef}
      className={styles.mapSearchSuggestions}
      data-map-search-suggestions=""
      /* The map underneath takes pointer-downs as the start of a pan, and a
         tap on the map closes what is open (MapSectionBody's search form
         stops them the same way). */
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {spots.length ? (
        <ul
          ref={scrollRef}
          className={styles.mapSearchSuggestionList}
          role="listbox"
          aria-label={locale === 'en' ? 'Suggestions' : 'Vorschläge'}
        >
          {spots.map((r) => {
            const district = r.bezirk?.name ?? r.district ?? null;
            const cuisine = r.cuisineType ? localizedCuisine(r.cuisineType, locale) : null;
            const meta = [district, cuisine].filter(Boolean).join(' · ');
            // Der Bezirk steht darunter schon: „AERA Charlottenburg" heisst
            // hier nur „AERA" (31 Spots tragen ihn im Namen, Review 29.09.2026).
            const name = district
              ? spotNameWithoutDistrict(r.name, r.district ?? r.bezirk?.name)
              : r.name;
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
                  <span className={styles.mapSearchSuggestionName}>{name}</span>
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
