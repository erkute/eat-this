import type { UserLocation } from './useUserLocation'
import type { UserLocationError } from './useUserLocation'

interface LocationStatusInput {
  locale: string
  location: UserLocation | null
  locationError: UserLocationError | null
  locateLoading: boolean
}

interface LocationStatus {
  copy: string | null
  isError: boolean
}

export function getLocationStatus({
  locale,
  location,
  locationError,
  locateLoading,
}: LocationStatusInput): LocationStatus {
  const isEnglish = locale === 'en'

  if (location) {
    return { copy: null, isError: false }
  }

  if (locateLoading) {
    return { copy: isEnglish ? 'Finding you' : 'Standort wird gesucht', isError: false }
  }

  if (!locationError) {
    return { copy: null, isError: false }
  }

  return {
    copy:
      locationError === 'denied'
        ? isEnglish ? 'Location blocked' : 'Standort blockiert'
        : isEnglish ? 'Location not found' : 'Standort nicht gefunden',
    isError: true,
  }
}
