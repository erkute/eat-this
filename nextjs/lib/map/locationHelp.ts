import { notify, type Notice } from '@/lib/notice';

/**
 * Ein blockierter Standort — und der Weg zurück.
 *
 * Hat jemand „Nicht erlauben" getippt, darf die Seite nie wieder selbst
 * fragen; kein Knopf öffnet den Dialog erneut. Also zweierlei:
 *
 *   1. Die Meldung „Blockiert" trägt „So geht's": die zwei, drei Schritte
 *      für genau dieses Gerät, statt eines „im Browser erlauben", bei dem
 *      niemand weiß, wo das steckt.
 *   2. `watchLocationUnblock` merkt, wenn die Freigabe zurückkommt — der
 *      Browser meldet die Änderung, und beim Zurückkehren aus den
 *      Einstellungen fragen wir nach —, damit es ohne erneuten Tipp
 *      weitergeht.
 *
 * Die iPhone-Wege sind am 24.09.2026 im Simulator (iOS 27, Safari) auf
 * localhost UND eatthisdot.com abgelaufen, mit drei Befunden:
 *
 *   - Ein „Nicht erlauben" der WEBSITE merkt sich Safari nur bis zum
 *     Neuladen; danach fragt es wieder. Neu laden + nochmal tippen reicht.
 *   - Hat iOS Safari SELBST den Standort verweigert (die allererste Frage
 *     kommt von iOS, nicht von der Seite), hilft nur Einstellungen →
 *     Datenschutz & Sicherheit → Ortungsdienste → Safari — und selbst nach
 *     der Freigabe bleibt die offene Seite blockiert, bis sie neu lädt.
 *   - Nach der ZWEITEN Ablehnung fragt Safari nicht mehr — auch nicht nach
 *     Neuladen, Löschen der Website-Daten oder Beenden der App. Dann hilft
 *     nur Einstellungen → Apps → Safari → Standort → „Erlauben" (gilt für
 *     alle Websites; zurück auf „Fragen", und die Sperre ist wieder da).
 *     Wie lange Safari sich das merkt, ist im Simulator nicht messbar.
 *   - Im Seitenmenü (≡ → Website-Einstellungen) gibt es in keinem dieser
 *     Fälle einen Punkt „Standort".
 *
 * Chrome und andere Browser auf dem iPhone sind NICHT abgelaufen (im
 * Simulator nicht installiert); ihre Schritte folgen dem Systemweg.
 *
 * Darum trägt die Anleitung „Neu laden". Nach dem Laden fragt die Seite
 * nicht von selbst — sie fragt nie beim Laden, auch hier nicht —, der
 * nächste Tipp tut es. `watchLocationUnblock` hilft dort, wo der Browser
 * eine Freigabe sofort wirken lässt (Chrome).
 */

export type LocationPlatform =
  | 'ios-safari'
  | 'ios-chrome'
  | 'ios-other'
  | 'android-chrome'
  | 'android-other'
  | 'desktop-chrome'
  | 'desktop-safari'
  | 'desktop-firefox'
  | 'other';

export function detectLocationPlatform(userAgent: string, maxTouchPoints = 0): LocationPlatform {
  const ua = userAgent;
  /* iPadOS meldet sich als Mac — nur die Touch-Punkte verraten es. */
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  if (ios) {
    if (/CriOS/.test(ua)) return 'ios-chrome';
    if (/FxiOS|EdgiOS|OPiOS/.test(ua)) return 'ios-other';
    return 'ios-safari';
  }
  if (/Android/.test(ua)) {
    return /Chrome\//.test(ua) && !/SamsungBrowser|EdgA|OPR|Firefox/.test(ua)
      ? 'android-chrome'
      : 'android-other';
  }
  if (/Firefox\//.test(ua)) return 'desktop-firefox';
  if (/Chrome\/|Chromium\/|Edg\//.test(ua)) return 'desktop-chrome';
  if (/Safari\//.test(ua) && /Macintosh/.test(ua)) return 'desktop-safari';
  return 'other';
}

/* Die iPhone-Fassung: erst der haeufigste Fall (eine Ablehnung, Neuladen
   reicht), dann der Systemweg. Safari bekommt dazwischen den globalen
   Schalter fuer die zweite Ablehnung. */
const IOS_RELOAD = {
  de: 'Tippe auf „Neu laden“, dann nochmal auf den Standort. Fragt dein iPhone, wähle „Erlauben“.',
  en: 'Tap “Reload”, then tap the location again. If your iPhone asks, choose “Allow”.',
};

function iosSystemStep(browser: { de: string; en: string }) {
  return {
    de: `Immer noch blockiert: Einstellungen → Datenschutz & Sicherheit → Ortungsdienste → ${browser.de} → „Beim Verwenden der App“.`,
    en: `Still blocked: Settings → Privacy & Security → Location Services → ${browser.en} → “While Using the App”.`,
  };
}

const STEPS: Record<LocationPlatform, { de: string[]; en: string[] }> = {
  'ios-safari': {
    de: [
      IOS_RELOAD.de,
      'Fragt es nicht: Einstellungen → Apps → Safari → Standort → „Erlauben“ (gilt für alle Websites).',
      iosSystemStep({ de: 'Safari', en: 'Safari' }).de,
    ],
    en: [
      IOS_RELOAD.en,
      'No question? Settings → Apps → Safari → Location → “Allow” (applies to all websites).',
      iosSystemStep({ de: 'Safari', en: 'Safari' }).en,
    ],
  },
  'ios-chrome': {
    de: [IOS_RELOAD.de, iosSystemStep({ de: 'Chrome', en: 'Chrome' }).de],
    en: [IOS_RELOAD.en, iosSystemStep({ de: 'Chrome', en: 'Chrome' }).en],
  },
  'ios-other': {
    de: [IOS_RELOAD.de, iosSystemStep({ de: 'dein Browser', en: 'your browser' }).de],
    en: [IOS_RELOAD.en, iosSystemStep({ de: 'dein Browser', en: 'your browser' }).en],
  },
  'android-chrome': {
    de: [
      'Tippe links neben der Adresse auf das Symbol.',
      'Berechtigungen → Standort einschalten.',
      'Klappt das nicht: Einstellungen → Apps → Chrome → Berechtigungen → Standort.',
    ],
    en: [
      'Tap the icon to the left of the address.',
      'Permissions → turn on Location.',
      'Still blocked? Settings → Apps → Chrome → Permissions → Location.',
    ],
  },
  'android-other': {
    de: [
      'Öffne die Website-Einstellungen deines Browsers.',
      'Erlaube dort den Standort für diese Seite.',
    ],
    en: ["Open your browser's site settings.", 'Allow location for this site there.'],
  },
  'desktop-chrome': {
    de: ['Klick links neben der Adresse auf das Symbol.', 'Standort einschalten.'],
    en: ['Click the icon to the left of the address.', 'Turn on Location.'],
  },
  'desktop-safari': {
    de: ['Safari → Einstellungen → Websites → Standort.', 'Für diese Seite „Erlauben“ wählen.'],
    en: ['Safari → Settings → Websites → Location.', 'Choose “Allow” for this site.'],
  },
  'desktop-firefox': {
    de: ['Klick links neben der Adresse auf das Symbol.', 'Bei Standort die Blockierung aufheben.'],
    en: ['Click the icon to the left of the address.', 'Clear the block next to Location.'],
  },
  other: {
    de: ['Öffne die Einstellungen deines Browsers.', 'Erlaube dort den Standort für diese Seite.'],
    en: ["Open your browser's settings.", 'Allow location for this site there.'],
  },
};

export function locationHowToSteps(platform: LocationPlatform, locale: string): string[] {
  return STEPS[platform][locale === 'en' ? 'en' : 'de'];
}

function currentPlatform(): LocationPlatform {
  if (typeof navigator === 'undefined') return 'other';
  return detectLocationPlatform(navigator.userAgent, navigator.maxTouchPoints);
}

/**
 * Was die Meldung „Blockiert" mitbekommt, überall gleich (Map, Startseite,
 * Must-Eat-Karte): „So geht's" öffnet die Anleitung, und sie wartet auf eine
 * Antwort, statt nach ein paar Sekunden zu verschwinden — wer die Schritte
 * sucht, braucht länger als eine Frist.
 */
export function locationBlockedOptions(
  locale: string,
  onDismiss: () => void = () => {}
): Pick<Notice, 'action' | 'onDismiss' | 'duration'> {
  return {
    action: {
      label: locale === 'en' ? 'How to' : 'So geht’s',
      onClick: () => {
        /* Wo der Browser die Freigabe sofort wirken laesst (Chrome, auch auf
           Android), holt die Map den Standort selbst (useUserLocation) — dann
           hat sich die Anleitung erledigt und geht mit. Gemessen in echtem
           Chrome: ohne das blieb sie ueber der schon geortenen Karte stehen. */
        let stopWatching = () => {};
        const release = notify('locationHowTo', locale, {
          steps: locationHowToSteps(currentPlatform(), locale),
          /* Ohne Neuladen bleibt Safari blockiert, auch nach der Freigabe in
             den Einstellungen — der Knopf erspart das Suchen des Reload-Pfeils. */
          action: {
            label: locale === 'en' ? 'Reload' : 'Neu laden',
            onClick: () => window.location.reload(),
          },
          onDismiss: () => stopWatching(),
          duration: 0,
        });
        stopWatching = watchLocationUnblock((state) => {
          if (state !== 'granted') return;
          stopWatching();
          release?.();
        });
      },
    },
    onDismiss,
    duration: 0,
  };
}

/**
 * Meldet, sobald ein verweigerter Standort wieder zu haben ist: `granted`
 * (freigegeben) oder `prompt` (wieder auf „fragen" gestellt — dann darf die
 * nächste Geste den Dialog öffnen). Zwei Quellen, weil nicht jeder Browser die
 * Änderung selbst meldet: das `change`-Ereignis des Permissions-API und der
 * Moment, in dem die Seite wieder sichtbar wird (Rückkehr aus den
 * Einstellungen). Gibt die Aufräumfunktion zurück.
 */
export function watchLocationUnblock(
  onUnblocked: (state: 'granted' | 'prompt') => void
): () => void {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return () => {};
  if (!navigator.permissions?.query) return () => {};
  let active = true;
  let status: PermissionStatus | null = null;
  const report = (state: PermissionState) => {
    if (!active) return;
    if (state === 'granted' || state === 'prompt') onUnblocked(state);
  };
  const onChange = () => {
    if (status) report(status.state);
  };
  const query = () => navigator.permissions.query({ name: 'geolocation' });
  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    query()
      .then((result) => report(result.state))
      .catch(() => {});
  };
  query()
    .then((result) => {
      if (!active) return;
      status = result;
      result.addEventListener('change', onChange);
    })
    .catch(() => {});
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    active = false;
    status?.removeEventListener('change', onChange);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
