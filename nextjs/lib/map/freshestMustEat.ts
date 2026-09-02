import type { MapMustEat } from '@/lib/types';

/**
 * Der Datensatz aus der aktuellen Payload für ein bereits geöffnetes Must Eat —
 * oder das Geöffnete selbst, wenn die Payload es nicht (mehr) führt.
 *
 * Ein geöffnetes Must Eat ist ein Snapshot: `selectedMustEat` hält das Objekt,
 * das beim Öffnen gerade da war. Beim Deep-Link (?me=) ist das der Stand des
 * ersten Effekt-Durchlaufs — SSR-Anon-View oder localStorage-Seed, und beide
 * führen verdeckte Karten gestrippt, ohne Gericht und Bild
 * (stripCoveredMustEats, metadataOnly). Kam danach die angemeldete Payload,
 * drehte `isUnlocked` zwar auf offen, das Objekt blieb aber der Stummel:
 * „Verdeckt" als Gericht, Kartenrücken als Bild, im offenen Layout — bis zum
 * Reload (User, 02.09.2026, Admin-Konto von der Startseite aus).
 */
export function freshestMustEat(mustEats: readonly MapMustEat[], selected: MapMustEat): MapMustEat {
  return mustEats.find((m) => m._id === selected._id) ?? selected;
}
