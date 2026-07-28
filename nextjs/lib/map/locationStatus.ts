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

/* Thresholds the "searching" toast is gated on (see useDeferredStatus). A
   cached GPS fix resolves in tens of ms, so binding the copy straight to the
   loading flag flashed it for ~25 ms — visible, unreadable. Only show it if
   the wait is actually perceptible, then hold it long enough to read. */
export const LOCATING_SHOW_DELAY_MS = 350;
export const LOCATING_MIN_VISIBLE_MS = 600;

/** How long an error notice stays up before retiring itself. */
export const LOCATION_ERROR_VISIBLE_MS = 6000;

export function getLocatingCopy(locale: string): string {
  return locale === 'en' ? 'Finding you' : 'Standort wird gesucht';
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
