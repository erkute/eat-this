'use client';
import { useCallback, useEffect, useState } from 'react';
import type { UserLocation, UserLocationError } from './useUserLocation';
import type { SheetView } from './useMapSheet';
import {
  getLocatingCopy,
  getLocationStatus,
  LOCATING_MIN_VISIBLE_MS,
  LOCATING_SHOW_DELAY_MS,
  LOCATION_ERROR_VISIBLE_MS,
  type LocationStatus,
} from '@/lib/map/locationStatus';
import { useLocationInvite } from '@/lib/map/useLocationInvite';
import { useLocationWelcome } from '@/lib/map/useLocationWelcome';
import { useExplorationSettled } from '@/lib/map/useExplorationSettled';
import { notify, type NoticeKind } from '@/lib/notice';
import { locationBlockedOptions } from '@/lib/map/locationHelp';
import { useDeferredStatus } from '@/lib/map/useDeferredStatus';
import { trackEvent, trackEventOnce } from '@/lib/analytics';


interface Options {
  locale: string;
  isActive: boolean;
  sheetView: SheetView;
  location: UserLocation | null;
  locationError: UserLocationError | null;
  locateLoading: boolean;
  mapDataLoading: boolean;
  mapDataError: string | null;
  onLocateMe: () => void;
}

/** One owner for the invitation, delayed locating notice, retries and dismissal. */
export function useMapLocationFeedback({ locale, isActive, sheetView, location,
  locationError, locateLoading, mapDataLoading, mapDataError, onLocateMe }: Options) {
  const rawLocationStatus = getLocationStatus({
    locale,
    location,
    locationError,
    locateLoading,
    whileLocated: true,
  });
  // Delay locating feedback; errors remain immediate.
  const isLocating = Boolean(rawLocationStatus.copy) && !rawLocationStatus.isError;
  const locatingVisible =
    useDeferredStatus(isLocating, LOCATING_SHOW_DELAY_MS, LOCATING_MIN_VISIBLE_MS) &&
    !rawLocationStatus.isError;
  /* An error arriving mid-hold wins immediately (the && above), so the stale
     "searching" copy can't sit on top of it for a frame. */
  const locationStatus: LocationStatus = locatingVisible
    ? { copy: getLocatingCopy(locale), isError: false, canRetry: false }
    : isLocating
      ? { copy: null, isError: false, canRetry: false }
      : rawLocationStatus;

  /* A first visit with the location question still open: the map asks once,
     through the info card (useLocationWelcome), never over a detail. That is
     also the funnel step — a visitor who already answered has nothing to
     decide, and counting them would pad the denominator; neither would one
     who never touched the map and so was never asked. */
  const invited = useLocationInvite(location !== null);
  // Invite only after the visitor has explored the map or list and let go.
  const explored = useExplorationSettled();
  const isRealInvite =
    invited && explored && isActive && !locationError && !locateLoading && sheetView !== 'detail';
  const locationStatusKey = locationStatus.copy
    ? `${locationStatus.copy}:${locationStatus.isError ? 'error' : 'ok'}:${locatingVisible ? 'loading' : 'idle'}`
    : null;
  const [dismissedLocationStatusKey, setDismissedLocationStatusKey] = useState<string | null>(null);
  const showLocationStatus = Boolean(
    sheetView !== 'detail' &&
    locationStatus.copy &&
    locationStatusKey !== dismissedLocationStatusKey
  );
  /* The denominator for map_location_invite_accepted. Consent-free: trackEvent
     counts the NAME through /api/count for everyone and only the params need a
     consent grant, so "labelled vs. pressed" stays readable even though most
     visitors never accept cookies. Once per session — a re-render would
     inflate it past any use. */
  useEffect(() => {
    if (!isRealInvite) return;
    trackEventOnce('map_location_invite', 'map_location_invite_shown');
  }, [isRealInvite]);

  // Transient errors retire automatically; blocked-permission help stays available.
  useEffect(() => {
    /* Blockiert bleibt stehen: die Meldung traegt „So geht's", und wer die
       Schritte sucht, braucht laenger als eine Frist (locationHelp). */
    if (!showLocationStatus || !locationStatus.isError || !locationStatusKey) return;
    if (locationError === 'denied') return;
    const id = window.setTimeout(
      () => setDismissedLocationStatusKey(locationStatusKey),
      LOCATION_ERROR_VISIBLE_MS
    );
    return () => window.clearTimeout(id);
  }, [showLocationStatus, locationStatus.isError, locationStatusKey, locationError]);
  const handleLocationRetry = useCallback(() => {
    setDismissedLocationStatusKey(null);
    onLocateMe();
  }, [onLocateMe]);
  // Every deliberate retry clears dismissal, even if the error repeats.
  const handleLocateMe = useCallback(() => {
    if (isRealInvite) trackEvent('map_location_invite_accepted');
    setDismissedLocationStatusKey(null);
    onLocateMe();
  }, [isRealInvite, onLocateMe]);
  useLocationWelcome(isRealInvite && !mapDataLoading && !mapDataError, locale, handleLocateMe);

  const handleDismissLocationStatus = useCallback(() => {
    if (locationStatusKey) setDismissedLocationStatusKey(locationStatusKey);
  }, [locationStatusKey]);

  // This hook owns dismissal; the shared notice therefore has no timeout.
  const noticeKind: NoticeKind | null =
    showLocationStatus && !mapDataLoading && !mapDataError
      ? locatingVisible
        ? 'locating'
        : locationError === 'denied'
          ? 'locationBlocked'
          : locationError
            ? 'locationNotFound'
            : null
      : null;
  const noticeIsError = locationStatus.isError;
  const noticeCanRetry = locationStatus.canRetry;
  useEffect(() => {
    if (!noticeKind) return;
    /* Der Rueckgabewert raeumt genau diese Meldung ab und laesst eine
       inzwischen nachgerueckte stehen. Nur die Fehler tragen Knoepfe und
       liegen damit als Layer ueber der Karte; das Suchen geht von allein,
       sobald der Standort da ist. */
    if (noticeKind === 'locationBlocked') {
      return notify(
        noticeKind,
        locale,
        locationBlockedOptions(locale, handleDismissLocationStatus)
      );
    }
    return notify(noticeKind, locale, {
      action: noticeCanRetry
        ? { label: locale === 'en' ? 'Retry' : 'Nochmal', onClick: handleLocationRetry }
        : undefined,
      onDismiss: noticeIsError ? handleDismissLocationStatus : undefined,
      duration: 0,
    });
  }, [
    noticeKind,
    noticeIsError,
    noticeCanRetry,
    locale,
    handleLocationRetry,
    handleDismissLocationStatus,
  ]);

  return handleLocateMe;
}
