import type { MapMustEat } from '@/lib/types';

/**
 * Die Karten des Spots des Tages — das tägliche Geschenk.
 *
 * Es liegt für jeden offen, auch ohne Konto, und es ist flüchtig: nichts wird
 * gespeichert, die Aufrufer rechnen es pro Anfrage aus `today` neu. Morgen
 * tritt der nächste Spot an die Stelle, und die Karte von heute fällt still
 * zurück auf ihren Kartenrücken.
 *
 * Bis zum 06.09.2026 hob diese Funktion zusätzlich den Spot selbst aus der
 * gesperrten Liste — der Teil ist weg, weil kein Spot mehr gesperrt ist. Übrig
 * bleibt der Teil, der immer der eigentliche war: die Karte dreht sich um.
 */
export function spotOfDayMustEatIds(spotId: string | null, all: MapMustEat[]): Set<string> {
  if (!spotId) return new Set();
  return new Set(all.filter((m) => m.restaurant._id === spotId).map((m) => m._id));
}
