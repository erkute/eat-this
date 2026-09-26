/* Die drei Fassungen der Karte, wie sie MapSection unterscheidet:
   - Telefon (≤767.98px): Liste und Detail sind fensterscrollender Inhalt im
     Dokumentfluss, damit die Zeilen durch die iOS-URL-Leiste schimmern (siehe
     den In-Flow-Block in MapSheet.module.css). Muss zu PHONE_MAX in
     useBottomSheet.ts passen.
   - Sheet (≤1023.98px, Telefon und Tablet): die Liste liegt als Sheet ÜBER
     der Karte, statt als Panel neben ihr.
   - Tablet (768–1023.98px): die Sheet ist eine Zieh-Sheet.
   Außerhalb des Browsers ist keine davon aktiv. */
const PHONE_QUERY = '(max-width: 767.98px)';
const SHEET_QUERY = '(max-width: 1023.98px)';
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023.98px)';

const matches = (query: string) =>
  typeof window !== 'undefined' && window.matchMedia(query).matches;

export const isPhoneViewport = (): boolean => matches(PHONE_QUERY);
export const isSheetViewport = (): boolean => matches(SHEET_QUERY);
export const isTabletViewport = (): boolean => matches(TABLET_QUERY);
