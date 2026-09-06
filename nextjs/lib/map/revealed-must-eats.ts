// nextjs/lib/map/revealed-must-eats.ts
//
// Welche Must-Eat-Karten ohne Konto offen liegen.
//
// Consumers: nextjs/app/api/map-data/route.ts,
//            nextjs/lib/map/server-initial-map-data.ts,
//            nextjs/lib/map/visible-restaurants.server.ts

import type { MapMustEat } from '@/lib/types';

/**
 * Das Schaufenster.
 *
 * Bis zum 06.09.2026 war die Karte selbst gestaffelt: 100 Spots ohne Konto,
 * 150 mit, der Rest gegen Geld. Das ist weg — jeder Spot, jede Story, jeder
 * Tipp liegt offen, weil dieselben Texte ohnehin indexiert auf den
 * Restaurant-Seiten stehen und die Sperre nur den ersten Eindruck kostete.
 *
 * Gestaffelt sind jetzt nur noch die KARTEN, und zwar auf drei Wegen:
 * verdienen (vor Ort, 50 m), geschenkt bekommen (Spot des Tages, Einladung)
 * oder kaufen (Pack). Diese Handvoll hier ist keiner davon: sie liegt für
 * jeden offen, damit überhaupt zu sehen ist, was eine Karte IST.
 *
 * Die Zahl ist eine Verkaufsentscheidung, kein technischer Wert: sie bemisst,
 * wie viel des Stapels ein Fremder gratis sieht. Bei 26 Karten sind zehn
 * reichlich (38 %); wächst der Stapel auf die geplanten 100+, wird daraus ein
 * Schaufenster von 10 %.
 */
export const REVEALED_TARGET = 10;

/**
 * Die öffentlich aufgedeckten Karten — höchstens eine pro Spot.
 *
 * Ein Lokal mit zwei Karten behält die zweite verdeckt: sonst ist an einem
 * Spot nichts mehr zu holen, und genau das Holen ist der Grund, hinzugehen.
 *
 * `revealedForAnon` aus Sanity ist die redaktionelle Entscheidung und kommt
 * zuerst; fehlt Kuratierung, füllt eine stabile `_id`-Ordnung auf. Stabil ist
 * hier das Wesentliche — wer gestern eine Karte offen sah, darf sie heute
 * nicht verdeckt vorfinden.
 */
export function composeRevealedMustEats(all: MapMustEat[]): Set<string> {
  const out = new Set<string>();
  const usedRestaurants = new Set<string>();
  const take = (m: MapMustEat) => {
    if (out.size >= REVEALED_TARGET) return;
    if (usedRestaurants.has(m.restaurant._id)) return;
    usedRestaurants.add(m.restaurant._id);
    out.add(m._id);
  };
  for (const m of all) if (m.revealedForAnon) take(m);
  const fallbackPool = all.filter((m) => !out.has(m._id)).sort((a, b) => a._id.localeCompare(b._id));
  for (const m of fallbackPool) take(m);
  return out;
}
