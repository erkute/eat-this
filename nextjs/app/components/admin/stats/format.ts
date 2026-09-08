/**
 * Beschriftung und Zahlenformat des Zahlenbretts — an einer Stelle, damit
 * „Konto angelegt" auf jedem Bericht dasselbe Ereignis meint.
 */

import type { Delta } from '@/lib/admin/stats.server';

export const NUMBER = new Intl.NumberFormat('de-DE');
const EURO = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export function percent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits).replace('.', ',')} %`;
}

export function euro(cents: number): string {
  return EURO.format(cents / 100);
}

/** Position mit einer Stelle, „—" ohne Daten. */
export function position(value: number): string {
  return value > 0 ? value.toFixed(1).replace('.', ',') : '—';
}

export function decimal(value: number, digits = 1): string {
  return value.toFixed(digits).replace('.', ',');
}

export const WEEKDAYS = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
];
export const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** Tagesbeschriftung „28.08." — der Verlauf braucht kein Jahr. */
export function shortDay(day: string): string {
  const [, month, date] = day.split('-');
  return month && date ? `${date}.${month}.` : day;
}

/** „28.08.2026" */
export function longDay(day: string): string {
  const [year, month, date] = day.split('-');
  return year && month && date ? `${date}.${month}.${year}` : day;
}

export function weekdayName(day: string): string {
  return WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()] ?? '';
}

/** „Montag, 07.09." */
export function dayTitle(day: string): string {
  return `${weekdayName(day)}, ${shortDay(day)}`;
}

/** Richtung einer Veraenderung — fuer Farbe und Pfeil. */
export function direction(delta: Delta | null | undefined): 'up' | 'down' | 'flat' | null {
  if (!delta || delta.change === null) return null;
  if (Math.abs(delta.change) < 0.005) return 'flat';
  return delta.change > 0 ? 'up' : 'down';
}

export const EVENT_LABELS: Record<string, string> = {
  visitors: 'Besucher',
  map_opened: 'Karte geöffnet',
  map_view_toggle: 'Kartenansicht gewechselt',
  map_location_invite_shown: 'Standort gefragt',
  map_location_invite_accepted: 'Standort erlaubt',
  restaurant_opened: 'Spot geöffnet',
  restaurant_maps_clicked: 'Route geklickt',
  restaurant_menu_clicked: 'Speisekarte geklickt',
  restaurant_reservation_clicked: 'Reservierung geklickt',
  must_eat_opened: 'Must-Eat-Karte geöffnet',
  must_eat_reveal_attempt: 'Karte angetippt (alle Ausgänge)',
  must_eat_reveal_login_required: 'Rücken getippt ohne Konto',
  must_eat_reveal_location_requested: 'Standort angefragt',
  must_eat_reveal_location_missing: 'Getippt ohne Standort',
  must_eat_reveal_too_far: 'Getippt, zu weit weg',
  must_eat_reveal_unlocked: 'Vor Ort aufgedeckt',
  must_eat_reveal_failed: 'Aufdecken gescheitert',
  login_view: 'Anmeldeformular gesehen',
  login_start: 'Anmeldung begonnen',
  login_start_google: 'Anmeldung: Google',
  login_start_email_link: 'Anmeldung: Magic Link',
  login_start_home_covered_card: 'Anmeldung von verdeckter Karte (Start)',
  login_start_starter_pack_banner: 'Anmeldung von Starter-Pack-Tafel',
  login_start_starter_pack_existing_user: 'Anmeldung: „hab schon ein Konto"',
  login_link_sent: 'Magic Link verschickt',
  login: 'Angemeldet (bestehendes Konto)',
  sign_up: 'Konto angelegt',
  signed_in: 'Angemeldet oder Konto angelegt',
  starter_pack_granted: 'Starter Pack erhalten',
  packs_page: 'Pack-Übersicht gesehen',
  pack_page: 'Pack-Seite gesehen',
  // GA-Ecommerce-Name: feuert je Pack-Angebot, sobald es im Bild ist.
  view_item: 'Pack-Angebot gesehen',
  begin_checkout: 'Kauf begonnen',
  checkout_already_owned: 'Kauf: schon im Besitz',
  checkout_error: 'Kauf: Fehler',
  purchase: 'Gekauft',
  share: 'Geteilt',
  consent_gate_shown: 'Cookie-Dialog gezeigt',
  consent_accepted: 'Cookies zugestimmt',
  consent_declined: 'Cookies abgelehnt',
  // Die Spot-Paywall fiel am 06.09.2026 — diese Ereignisse feuert kein Code
  // mehr, aber die Tage davor tragen sie noch. Beschriftet, nicht verschwiegen.
  locked_spot_opened: 'Gesperrter Spot geöffnet (bis 06.09.2026)',
  locked_spot_pack_clicked: 'Gesperrter Spot: Pack geklickt (bis 06.09.2026)',
  locked_spot_login_start: 'Gesperrter Spot: Anmeldung (bis 06.09.2026)',
};

export function labelFor(key: string): string {
  return EVENT_LABELS[key] ?? key;
}

export const DEVICE_LABELS: Record<string, string> = {
  MOBILE: 'Telefon',
  DESKTOP: 'Desktop',
  TABLET: 'Tablet',
};

/** Google liefert ISO-3166-1 alpha-3 in Kleinbuchstaben. Die häufigen
 *  ausgeschrieben, der Rest als Kürzel. */
const COUNTRY_NAMES: Record<string, string> = {
  deu: 'Deutschland',
  aut: 'Österreich',
  che: 'Schweiz',
  usa: 'USA',
  gbr: 'Großbritannien',
  fra: 'Frankreich',
  ita: 'Italien',
  esp: 'Spanien',
  nld: 'Niederlande',
  pol: 'Polen',
  tur: 'Türkei',
  dnk: 'Dänemark',
  swe: 'Schweden',
  nor: 'Norwegen',
  fin: 'Finnland',
  bel: 'Belgien',
  cze: 'Tschechien',
  irl: 'Irland',
  can: 'Kanada',
  aus: 'Australien',
  isr: 'Israel',
  ind: 'Indien',
  bra: 'Brasilien',
  jpn: 'Japan',
  kor: 'Südkorea',
  prt: 'Portugal',
  grc: 'Griechenland',
  hun: 'Ungarn',
  rou: 'Rumänien',
  ukr: 'Ukraine',
  rus: 'Russland',
  chn: 'China',
  mex: 'Mexiko',
  arg: 'Argentinien',
  zaf: 'Südafrika',
  are: 'VAE',
  sgp: 'Singapur',
  nzl: 'Neuseeland',
  lux: 'Luxemburg',
  hrv: 'Kroatien',
  zzz: 'Unbekannt',
};

export function countryName(code: string): string {
  return COUNTRY_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}
