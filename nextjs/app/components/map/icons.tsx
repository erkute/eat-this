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

/* Das X in der Machart von Lupe, Burger und Fadenkreuz (Ansage 22.10.2026:
   „passt nicht zu Burger, Suche und Standort"): zwei kräftige Striche mit
   runden Enden, leicht gebogen und ungleich lang, der erste stärker — wie die
   zwei Bögen der Lupe. Kein Zittern, keine Pinselränder. */
export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true">
      <path d="M5.8 5.9c4.3 3.6 8.4 7.6 12.4 12.3" strokeWidth="3.6" />
      <path d="M18.1 6.4c-4.1 3.5-8 7.5-11.8 11.6" strokeWidth="2.8" />
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

/* Das Herz wie der Ring der Lupe: zwei Bögen mit runden Enden, links der
   kräftigere Abstrich, rechts ein dünnerer Aufstrich, die sich an Kerbe und
   Spitze treffen (Ansage 22.10.2026). Gefüllt liegt die Fläche darunter. */
const HEART_LEFT = 'M12.2 7.4C11 4.3 7.5 3.1 5 4.6 2.5 6.1 2.3 9.6 4 12.2c1.9 2.9 4.9 5.5 8.1 8.2';
const HEART_RIGHT = 'M12 20.4c3-2.7 6-5.4 7.6-8.4 1.6-2.7 1.3-6-1.1-7.4-2.4-1.4-5.4-.5-6.3 2.8';

export function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true">
      {filled && <path d={HEART_PATH} fill="currentColor" stroke="none" />}
      <path d={HEART_LEFT} strokeWidth="3.3" />
      <path d={HEART_RIGHT} strokeWidth="2.6" />
    </svg>
  );
}
