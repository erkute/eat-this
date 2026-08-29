import type { UserLocation } from './useUserLocation';
import type { UserLocationError } from './useUserLocation';

interface LocationStatusInput {
  locale: string;
  location: UserLocation | null;
  locationError: UserLocationError | null;
  locateLoading: boolean;
}

export interface LocationStatus {
  copy: string | null;
  isError: boolean;
  canRetry: boolean;
}

/* Thresholds the "searching" notice is gated on (see useDeferredStatus). A
   cached GPS fix resolves in tens of ms, so binding the copy straight to the
   loading flag flashed it for ~25 ms — visible, unreadable. Only show it if
   the wait is actually perceptible, then hold it long enough to read.
   Die Mindeststandzeit haengt an der zentralen Info-Karte: die faehrt in
   340 ms auf, bei den frueheren 600 ms war sie fertig aufgeklappt und ging
   schon wieder zu. */
export const LOCATING_SHOW_DELAY_MS = 350;
export const LOCATING_MIN_VISIBLE_MS = 1200;

/** How long an error notice stays up before retiring itself. */
export const LOCATION_ERROR_VISIBLE_MS = 6000;

export function getLocatingCopy(locale: string): string {
  return locale === 'en' ? 'Finding you' : 'Standort wird gesucht';
}

export interface LocationNoticeCopy {
  eyebrow: string;
  title: string;
  detail: string;
}

/**
 * Dieselbe Lage, aber in der Form, die die zentrale Info-Karte braucht:
 * Augenbraue, kurzer Titel, Detailzeile — statt eines Satzes.
 *
 * `getLocationStatus` liefert weiter den Satz; den braucht HubNearby, wo die
 * Meldung als Fliesstext in einer Zeile steht. In der Karte las derselbe Satz
 * unter der Augenbraue als „STANDORT — STANDORT NICHT GEFUNDEN". Die Worte
 * sind absichtlich dieselben wie im Toast (NotificationToast.buildToastCopy):
 * eine Lage, eine Formulierung.
 */
export function getLocationNoticeCopy(
  locale: string,
  locationError: UserLocationError | null,
  locating: boolean
): LocationNoticeCopy | null {
  const english = locale === 'en';

  if (locating) {
    return english
      ? {
          eyebrow: 'Location',
          title: 'Looking for you',
          detail: 'One moment — the map is finding your position.',
        }
      : {
          eyebrow: 'Standort',
          title: 'Wir suchen dich',
          detail: 'Einen Moment — die Map sucht deine Position.',
        };
  }

  if (!locationError) return null;

  if (locationError === 'denied') {
    return english
      ? {
          eyebrow: 'Location',
          title: 'Blocked',
          detail: 'Allow it in your browser, then tap again.',
        }
      : {
          eyebrow: 'Standort',
          title: 'Blockiert',
          detail: 'Im Browser erlauben, dann nochmal tippen.',
        };
  }

  return english
    ? {
        eyebrow: 'Location',
        title: 'Not found',
        detail: 'Try once more or choose a district manually.',
      }
    : {
        eyebrow: 'Standort',
        title: 'Nicht gefunden',
        detail: 'Nochmal versuchen oder Bezirk manuell wählen.',
      };
}

export function getLocationStatus({
  locale,
  location,
  locationError,
  locateLoading,
}: LocationStatusInput): LocationStatus {
  const isEnglish = locale === 'en';

  if (location) {
    return { copy: null, isError: false, canRetry: false };
  }

  if (locateLoading) {
    return { copy: getLocatingCopy(locale), isError: false, canRetry: false };
  }

  if (!locationError) {
    return { copy: null, isError: false, canRetry: false };
  }

  return {
    copy:
      locationError === 'denied'
        ? isEnglish
          ? 'Blocked. Allow in browser settings.'
          : 'Blockiert. Im Browser erlauben.'
        : isEnglish
          ? 'Location not found'
          : 'Standort nicht gefunden',
    isError: true,
    canRetry: locationError !== 'denied',
  };
}
