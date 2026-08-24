/* Shared SVG icon set for the map detail panels. Both RestaurantDetail and
   MustEatDetailMobile pull from the same inventory so close/walk/transit/car/
   lock/unlock stay visually identical across surfaces. */

export function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// Dezenter Galerie-Chevron (kein Pfeil mit Schaft): der Pager neben der Karte
// soll zurücktreten wie in Bild-Galerien üblich — dünner Winkel, sonst nichts.
export function PagerArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 5l-7 7 7 7" />
    </svg>
  );
}

// Heart — outline when empty, filled when hearted. A "heart" is a saved spot
// (see docs/specs/2026-06-09-hearts-design.md); this replaced the bookmark on
// the detail surfaces so the icon matches the public "geherzt von N" wording.
export function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}
