/**
 * Jede Meldung der zentralen Info-Karte (NotificationToast), mit ihren Worten.
 *
 * Aufrufer nennen die Lage, nicht den Text: `notify('spotSaved', locale)`.
 * Bis zum 24.09.2026 kam jede Meldung als freier Satz an und wurde in der
 * Karte über Stichworte einsortiert — „Konnte nicht gespeichert werden."
 * enthielt „gespeichert" und lief dadurch als grüne Bestätigung „Spot
 * gespeichert" durch, und Remys eigener Satz ging im Standort-Stichwort unter.
 * Ein fester Katalog kann das nicht mehr.
 *
 * Bewusst NICHT im Katalog (24.09.2026 gestrichen), weil die Seite es selbst
 * schon sagt: „Standort sitzt" (die Liste sortiert sich um), „Wir suchen dich"
 * auf der Startseite (der Knopf zeigt es), „Spot entfernt" (das Herz leert
 * sich), „Karte wird geladen" (die Map kommt mit Server-Daten), „Du bist
 * drin" und „Abgemeldet" (der Wartescreen davor sagt beides schon).
 */

export type NoticeKind =
  | 'locating'
  | 'locationBlocked'
  | 'locationNotFound'
  | 'locationHowTo'
  | 'remyLocation'
  | 'mapDataError'
  | 'mapDataStale'
  | 'spotSavedFirst'
  | 'spotSaved'
  | 'actionFailed'
  | 'inviteCard';

export interface Notice {
  /** Rot statt Gelb am Kicker — nur für „kaputt". */
  tone?: 'error';
  eyebrow: string;
  title: string;
  detail?: string;
  /** Nummerierte Schritte unter dem Titel — nur die Anleitung zum Freigeben
   *  des Standorts braucht sie (lib/map/locationHelp.ts). */
  steps?: string[];
  /** Der gelbe Knopf, der die Meldung beantwortet (z. B. „Nochmal"). */
  action?: { label: string; onClick: () => void };
  /** „Alles klar". Gesetzt heißt: die Meldung wartet auf eine Antwort. */
  onDismiss?: () => void;
  /** Millisekunden bis zum Selbstabgang; 0 lässt sie stehen. */
  duration?: number;
}

declare global {
  interface Window {
    /**
     * Zeigt eine Karte. Der Rückgabewert nimmt GENAU DIESE Karte wieder weg
     * und lässt eine inzwischen nachgerückte in Ruhe. `null` räumt
     * bedingungslos.
     */
    showNotice?: (notice: Notice | null) => (() => void) | void;
  }
}

type Copy = Pick<Notice, 'tone' | 'eyebrow' | 'title' | 'detail'>;

const COPY: Record<NoticeKind, { de: Copy; en: Copy }> = {
  locating: {
    de: {
      eyebrow: 'Standort',
      title: 'Wir suchen dich',
      detail: 'Einen Moment – die Map sucht deine Position.',
    },
    en: {
      eyebrow: 'Location',
      title: 'Looking for you',
      detail: 'One moment – the map is finding your position.',
    },
  },
  locationBlocked: {
    de: { eyebrow: 'Standort', title: 'Blockiert', detail: 'Im Browser erlauben, dann nochmal tippen.' },
    en: { eyebrow: 'Location', title: 'Blocked', detail: 'Allow it in your browser, then tap again.' },
  },
  locationNotFound: {
    de: {
      eyebrow: 'Standort',
      title: 'Nicht gefunden',
      detail: 'Nochmal versuchen oder Bezirk manuell wählen.',
    },
    en: {
      eyebrow: 'Location',
      title: 'Not found',
      detail: 'Try once more or choose a district manually.',
    },
  },
  /* Die Schritte kommen je nach Geraet aus lib/map/locationHelp.ts. */
  locationHowTo: {
    de: { eyebrow: 'Standort', title: 'So gibst du ihn frei' },
    en: { eyebrow: 'Location', title: 'How to turn it on' },
  },
  remyLocation: {
    de: { eyebrow: 'Standort', title: 'Nicht gefunden', detail: 'Sag Remy einfach deinen Bezirk.' },
    en: { eyebrow: 'Location', title: 'Not found', detail: 'Just tell Remy your district.' },
  },
  mapDataError: {
    de: {
      tone: 'error',
      eyebrow: 'Karte',
      title: 'Nicht geladen',
      detail: 'Prüf deine Verbindung und versuch es nochmal.',
    },
    en: {
      tone: 'error',
      eyebrow: 'Map',
      title: 'Not loaded',
      detail: 'Check your connection and try again.',
    },
  },
  mapDataStale: {
    de: { eyebrow: 'Karte', title: 'Nicht aktuell', detail: 'Du siehst ältere Kartendaten.' },
    en: { eyebrow: 'Map', title: 'Not current', detail: 'You are looking at older map data.' },
  },
  /* Zwei Fassungen (24.09.2026): der erste Spot sagt, wo er landet — die Map
     markiert gespeicherte Spots nicht, man findet sie im Profil. Ab dem
     zweiten reicht ein Nicken; wer speichert, weiss dann, wohin. */
  spotSavedFirst: {
    de: {
      eyebrow: 'Spot',
      title: 'Gespeichert',
      detail: 'Dein erster Spot. Du findest ihn in deinem Profil.',
    },
    en: {
      eyebrow: 'Spot',
      title: 'Saved',
      detail: "Your first spot. You'll find it in your profile.",
    },
  },
  spotSaved: {
    de: { eyebrow: 'Spot', title: 'Gespeichert', detail: 'Noch einer für deine Liste.' },
    en: { eyebrow: 'Spot', title: 'Saved', detail: 'One more for your list.' },
  },
  actionFailed: {
    de: {
      tone: 'error',
      eyebrow: 'Kurz hakt es',
      title: 'Hat nicht geklappt',
      detail: 'Bitte gleich nochmal versuchen.',
    },
    en: {
      tone: 'error',
      eyebrow: 'Heads up',
      title: 'Something went wrong',
      detail: 'Please try again in a moment.',
    },
  },
  inviteCard: {
    de: {
      eyebrow: 'Einladung',
      title: 'Eine neue Karte im Deck',
      detail: 'Jemand ist über deinen Link gestartet.',
    },
    en: {
      eyebrow: 'Invite',
      title: 'A new card in your deck',
      detail: 'Someone joined through your link.',
    },
  },
};

function noticeCopy(kind: NoticeKind, locale: string): Copy {
  return COPY[kind][locale === 'en' ? 'en' : 'de'];
}

/** Zeigt die Meldung `kind`; der Rückgabewert räumt genau sie wieder ab. */
export function notify(
  kind: NoticeKind,
  locale: string,
  options: Pick<Notice, 'action' | 'onDismiss' | 'duration' | 'steps'> = {}
): (() => void) | void {
  if (typeof window === 'undefined') return;
  return window.showNotice?.({ ...noticeCopy(kind, locale), ...options });
}
