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

/* Das X als zwei Pinselstriche (Ansage 22.10.2026: „sieht nicht gezeichnet
   aus"): gefüllte Formen statt Linien, die Breite wechselt, die Enden laufen
   aus und zittern leicht — der erste Strich kräftiger als der zweite. Erzeugt
   mit einem kleinen Pinsel-Skript (Mittellinie + Breitenverlauf); die Farbe
   kommt aus `currentColor`, eine Strichstärke gibt es nicht mehr. */
const CLOSE_BRUSH =
  'M4.7 6.2 L5.1 7.1 L5.6 7.9 L6.2 8.7 L6.9 9.3 L7.7 9.9 L8.4 10.4 L9.1 11.2 L9.8 11.8 L10.6 12.5 L11.2 13.3 L12.0 14.0 L12.7 14.8 L13.5 15.5 L14.3 16.4 L15.2 17.1 L16.1 17.8 L17.2 18.5 L18.4 19.0 L19.3 18.2 L18.8 16.9 L18.2 15.8 L17.5 14.8 L16.8 13.9 L15.9 13.1 L15.1 12.3 L14.3 11.6 L13.5 10.8 L12.7 10.2 L12.0 9.5 L11.3 8.8 L10.5 8.2 L9.8 7.5 L9.1 6.8 L8.4 6.2 L7.6 5.7 L6.7 5.3 L5.7 5.0Z M17.8 4.8 L17.0 5.4 L16.2 6.0 L15.4 6.6 L14.8 7.3 L14.1 8.0 L13.3 8.6 L12.7 9.4 L12.0 10.1 L11.3 10.8 L10.7 11.6 L10.0 12.4 L9.2 13.1 L8.5 13.8 L7.8 14.6 L7.1 15.5 L6.5 16.4 L6.0 17.5 L5.5 18.6 L6.1 19.1 L7.1 18.4 L8.1 17.8 L9.0 17.1 L9.8 16.4 L10.4 15.6 L11.1 14.8 L11.8 14.1 L12.5 13.3 L13.2 12.6 L13.9 11.9 L14.5 11.2 L15.3 10.5 L15.9 9.8 L16.6 9.1 L17.3 8.4 L17.9 7.6 L18.4 6.8 L19.0 6.0Z';

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <path d={CLOSE_BRUSH} />
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
// Gezeichnet wie von Hand, passend zur Providence (07.10.2026): die Bögen
// leicht ungleich, die Spitze ein Stück rechts der Mitte — statt des
// geometrischen Herzens aus zwei Kreisbögen. Dieselbe Form zeichnet sich auf
// der Spot-Seite selbst (HeartDraw).
export const HEART_PATH =
  'M12.1 6.5C10.8 4 7.5 3 5.1 4.4 2.5 5.9 2.2 9.4 3.9 12c1.9 3 5.1 5.7 8.3 8.7 3-2.8 6.3-5.6 8-8.6 1.6-2.8 1.3-6.1-1.2-7.6-2.4-1.4-5.6-.6-6.9 2z';

/* Die Kontur als ein Pinselstrich in einem Zug, der an der Kerbe über
   seinen Anfang hinausläuft (Ansage 22.10.2026). Gefüllt liegt derselbe
   Strich über der Fläche, damit auch das volle Herz einen gezeichneten Rand
   hat. HEART_PATH bleibt die Fläche (und die Form, die HeartDraw zeichnet). */
const HEART_BRUSH =
  'M12.9 6.7 L12.7 6.0 L12.4 5.4 L12.0 4.8 L11.5 4.3 L11.0 3.9 L10.4 3.6 L9.8 3.3 L9.2 3.0 L8.6 2.8 L8.0 2.6 L7.3 2.6 L6.7 2.7 L6.0 2.8 L5.4 2.9 L4.8 3.2 L4.3 3.5 L3.7 3.9 L3.2 4.4 L2.7 4.8 L2.3 5.4 L2.1 6.0 L1.8 6.6 L1.7 7.2 L1.6 7.8 L1.4 8.5 L1.5 9.2 L1.6 9.8 L1.8 10.5 L2.0 11.1 L2.2 11.8 L2.4 12.5 L2.8 13.1 L3.2 13.7 L3.6 14.3 L4.1 14.9 L4.6 15.4 L5.1 16.1 L5.6 16.6 L6.0 17.2 L6.5 17.8 L7.1 18.3 L7.7 18.8 L8.3 19.3 L8.9 19.7 L9.5 20.2 L10.1 20.7 L10.6 21.3 L12.1 21.9 L13.5 21.1 L14.0 20.6 L14.6 20.1 L15.2 19.6 L15.8 19.0 L16.4 18.5 L16.9 17.9 L17.5 17.4 L18.0 16.8 L18.6 16.3 L19.0 15.7 L19.5 15.1 L20.0 14.5 L20.3 13.9 L20.8 13.3 L21.1 12.7 L21.4 12.0 L21.6 11.4 L21.8 10.7 L21.9 10.1 L22.1 9.5 L22.1 8.8 L22.1 8.2 L22.1 7.6 L22.0 6.9 L21.8 6.4 L21.5 5.8 L21.2 5.3 L20.8 4.8 L20.3 4.4 L19.9 3.9 L19.3 3.6 L18.8 3.3 L18.2 3.1 L17.6 2.9 L17.0 2.9 L16.4 2.9 L15.8 3.0 L15.2 3.1 L14.6 3.3 L14.0 3.6 L13.5 3.9 L13.0 4.4 L12.6 4.9 L12.1 5.4 L11.8 6.0 L11.4 6.7 L11.0 7.3 L12.2 7.9 L12.5 7.2 L12.8 6.7 L13.2 6.2 L13.6 5.8 L14.0 5.5 L14.4 5.3 L14.8 5.1 L15.2 4.9 L15.6 4.9 L16.0 4.8 L16.4 4.8 L16.8 4.8 L17.2 4.9 L17.6 5.0 L17.9 5.2 L18.3 5.4 L18.6 5.6 L18.9 5.9 L19.2 6.2 L19.4 6.5 L19.6 6.8 L19.7 7.1 L19.8 7.5 L19.9 7.9 L20.0 8.3 L20.0 8.8 L19.9 9.2 L19.9 9.7 L19.8 10.1 L19.6 10.6 L19.3 11.1 L19.1 11.5 L18.7 12.1 L18.4 12.6 L18.0 13.1 L17.6 13.6 L17.2 14.2 L16.7 14.7 L16.3 15.2 L15.8 15.7 L15.3 16.3 L14.7 16.8 L14.2 17.3 L13.6 17.8 L13.1 18.4 L12.5 18.9 L11.9 19.4 L12.1 19.7 L12.5 19.3 L11.9 18.8 L11.4 18.2 L10.9 17.7 L10.3 17.1 L9.8 16.6 L9.3 16.0 L8.8 15.5 L8.3 15.0 L7.8 14.5 L7.3 14.0 L6.8 13.6 L6.4 13.0 L6.0 12.5 L5.6 12.0 L5.2 11.5 L4.9 11.1 L4.6 10.7 L4.3 10.2 L4.2 9.8 L4.1 9.3 L4.0 8.9 L4.0 8.5 L3.9 8.0 L3.9 7.6 L4.0 7.2 L4.1 6.8 L4.3 6.5 L4.5 6.1 L4.7 5.8 L5.0 5.5 L5.4 5.3 L5.7 5.1 L6.1 5.0 L6.5 4.8 L6.9 4.8 L7.3 4.8 L7.7 4.8 L8.2 4.8 L8.6 4.9 L9.1 5.1 L9.5 5.2 L9.9 5.5 L10.3 5.8 L10.6 6.1 L11.0 6.4 L11.3 6.8 L11.7 7.3Z';

export function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      {filled && <path d={HEART_PATH} />}
      <path d={HEART_BRUSH} />
    </svg>
  );
}
