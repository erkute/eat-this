'use client';
import { STARTER_PARAM } from './loginContinueUrl';

/**
 * Die verdeckte Karte, die ein Gast angetippt hat, bevor der Login dazwischenkam.
 *
 * Die Anmelde-Tafel auf der Karte verspricht: „20 Must Eats — diese ist
 * dabei." Damit das stimmt, muss die Karte den Weg zum Konto überleben und
 * beim Einlösen des Starter Packs (POST /api/starter-pack) mitfahren, wo sie
 * garantiert in die offene Hälfte kommt.
 *
 * Zwei Träger, aus demselben Grund wie beim Herz (lib/map/pendingHeart.ts):
 *   sessionStorage — Google. Das Popup bleibt im selben Dokument.
 *   ?starter=<id>  — Magic-Link. Der Link öffnet routinemäßig in einem
 *     anderen Browser (Mail-App → Chrome); dort ist der sessionStorage leer,
 *     nur die Continue-URL überlebt den Posteingang.
 *
 * Der Merker verfällt nach zehn Minuten: wer das Modal wegklickt und später
 * über das Burger-Menü kommt, bekommt sein Pack wie jeder andere — zufällig.
 */

const STORAGE_KEY = 'eatthis_pending_starter_card';
const PENDING_TTL_MS = 10 * 60 * 1000;

export function rememberPendingStarterCard(mustEatId: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: mustEatId, at: Date.now() }));
  } catch {
    /* private mode — der URL-Träger deckt den Mail-Weg trotzdem ab */
  }
}

function takeFromStorage(): string | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { id?: unknown; at?: unknown };
    if (typeof parsed.id !== 'string' || !parsed.id) return null;
    if (typeof parsed.at !== 'number' || Date.now() - parsed.at > PENDING_TTL_MS) return null;
    return parsed.id;
  } catch {
    return null;
  }
}

/* Der Marker verlässt die Adresszeile, sobald er gelesen ist — ein geteilter
   Link soll dem Empfänger keine fremde Absicht unterschieben. */
function takeFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const id = params.get(STARTER_PARAM);
  if (!id) return null;
  params.delete(STARTER_PARAM);
  const query = params.toString();
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}`
  );
  return id;
}

/** Holt die gemerkte Karte ab und räumt beide Träger. Null, wenn keine da ist. */
export function takePendingStarterCard(): string | null {
  if (typeof window === 'undefined') return null;
  return takeFromUrl() ?? takeFromStorage();
}
