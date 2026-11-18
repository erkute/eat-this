/**
 * Wie viele Karten die Liste zunächst rendert. Sichtbar sind nie mehr als eine
 * Handvoll Zeilen (am Telefon hinter dem Sheet, am Desktop in einer schmalen
 * Spalte); alle zu rendern kostete doppelt, im SSR-HTML und bei der Hydration.
 * Nachgeladen wird mit demselben Vorlauf wie die Fotos (PHOTO_LEAD_PX in
 * RestaurantList).
 *
 * Eigenes Modul statt eines Exports aus `RestaurantList`: die Kartenseite baut
 * ihr ItemList-JSON-LD auf dem Server aus genau diesem Fenster, und Exporte
 * einer `'use client'`-Datei kommen dort als Client-Referenz an, nicht als
 * Zahl.
 */
export const INITIAL_LIST_ROWS = 12;
export const LIST_ROWS_PER_BATCH = 24;
