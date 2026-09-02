/* Shared SVG icon set for the map detail panels. Both RestaurantDetail and
   MustEatDetailMobile pull from the same inventory so close/walk/transit/car/
   lock/unlock stay visually identical across surfaces. */

/**
 * Die Lupe der Kartensuche.
 *
 * Von Hand geführt, nicht konstruiert: Providence ist eine Pinselschrift, an
 * der nichts rund und nichts gerade ist — ein exakter `<circle>` daneben las
 * sich wie ein Fremdkörper aus einem anderen Baukasten. Der Ring ist deshalb
 * ein Pfad mit ungleichen Kontrollpunkten, der am Schluss ein Stück über seinen
 * Anfang hinausläuft (so macht eine Hand ihn zu), und der Griff hat einen
 * leichten Bauch. Strichstärke, Kippung und Halo kommen aus `.mapSearchIcon`.
 *
 * Eine Komponente, weil die Lupe an ZWEI Stellen steht — im eingeklappten
 * Knopf und in der ausgeklappten Suchleiste. Als kopiertes Markup waren die
 * beiden am 01.09.2026 prompt auseinandergelaufen.
 */
export function SearchGlassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {/* Der Ring in ZWEI Bögen mit verschiedener Strichstärke: ein Pinsel
          drückt im Abstrich stärker auf als im Aufstrich, und genau das
          unterscheidet eine gezeichnete Form von einer konstruierten.

          Die beiden überlappen an BEIDEN Enden großzügig — der dicke Bogen
          läuft rund 270°, der dünne schließt den Rest und fährt links wieder
          ein Stück an ihm hoch. Stießen sie nur aneinander, saß dort eine
          Kerbe; so entsteht stattdessen die Verdickung, die eine Hand
          hinterlässt, wenn sie den Kreis zumacht. */}
      <path
        d="M5.6 13.2C4.4 10 6.2 6.4 9.5 5.2c3.3-1.2 6.9.7 7.6 4 .6 3.1-1.4 6.2-4.5 7.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M13.6 16.3c-3.2.9-6.7-.6-7.9-3.4-.5-1.1-.6-2.3-.5-3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* Der Griff ist der dickste und längste Strich der Zeichnung —
          dieselbe Logik wie beim Burger daneben, dessen drei Balken 19, 22 und
          15px messen. Ein leichter Bauch, damit er nicht wie ein Lineal liegt.
          Er setzt INNERHALB des Rings an, sonst klafft an der Naht ein Spalt. */}
      <path
        d="M14.2 14.8c2 1.8 4.1 3.9 6.3 6.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

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

// Standort-Pin für den „Standort freigeben"-Chip der verdeckten Must-Eat-Karte.
export function PinIcon() {
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
      <path d="M12 21.5c-4.3-4.4-6.5-8.1-6.5-11A6.5 6.5 0 0 1 18.5 10.5c0 2.9-2.2 6.6-6.5 11z" />
      <circle cx="12" cy="10.3" r="2.3" />
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
