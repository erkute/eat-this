/**
 * Wie viele Karten die Liste zunächst rendert. Sichtbar sind nie mehr als eine
 * Handvoll Zeilen — auf dem Telefon liegt die Liste hinter dem Sheet, auf dem
 * Desktop in einer schmalen Spalte —, gerendert wurden trotzdem alle. Auf der
 * Produktionskarte waren das 68 Karten mit rund 1600 DOM-Knoten, und die kosten
 * doppelt: einmal im SSR-HTML (480 kB) und einmal bei der Hydration.
 * Nachgeladen wird 600px bevor die letzte Zeile ins Bild kommt.
 *
 * Eigenes Modul statt eines Exports aus `RestaurantList`: die Kartenseite baut
 * ihr ItemList-JSON-LD auf dem Server aus genau diesem Fenster, und Exporte
 * einer `'use client'`-Datei kommen dort als Client-Referenz an, nicht als Zahl.
 */
export const INITIAL_LIST_ROWS = 12;
export const LIST_ROWS_PER_BATCH = 24;
