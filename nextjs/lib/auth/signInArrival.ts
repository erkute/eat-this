'use client';

/**
 * Was nach einer Anmeldung gesagt wird — an EINER Stelle entschieden.
 *
 * Vorher hing das an zwei Bedingungen, die beide den Hauptweg verfehlten:
 *
 *   Die Einblendung „Starter Pack eingelöst" (SignInReward) hing an einem
 *   Zustandswechsel IM SELBEN Dokument (MapSection: erst kein `uid`, dann
 *   einer). Den gibt es nur beim Google-Popup. Der Magic-Link lädt über
 *   /welcome hart neu, der Google-Redirect-Ausweichweg ebenso — dort meldet
 *   Firebase den Nutzer beim ersten Auflösen, es gibt kein „vorher
 *   abgemeldet". Beide Wege, also alles außer dem Desktop-Popup, kamen
 *   wortlos an. Dazu grüßte die Einblendung jeden Wiederkehrer mit einem
 *   Pack, das er längst hat.
 *
 *   Der Toast „Du bist angemeldet" hing am offenen Login-Modal (BridgeAuth) —
 *   nach einem Seitenwechsel ist keins mehr offen.
 *
 * Der verlässliche Auslöser ist die Vergabe selbst: `/api/starter-pack`
 * antwortet `granted: true` GENAU EINMAL pro Konto, egal über welchen Weg die
 * Anmeldung lief und auf welcher Seite sie herauskommt. Daran hängt die
 * Einblendung jetzt — und der Toast ist das, was gesagt wird, wenn kein Pack
 * kommt (Wiederkehrer). Nie beides.
 */

type Listener = () => void;

/** Eine Pack-Abfrage läuft: der Toast wartet ihre Antwort ab. */
let checkPending = false;
/** In diesem Seitenleben wurde ein Pack gemeldet — dann schweigt der Toast. */
let packAnnounced = false;
/** Die Meldung kam, bevor jemand zuhörte; der erste Abonnent bekommt sie. */
let grantedLatched = false;
const listeners = new Set<Listener>();
/** Der Toast, den `announceSignIn` zurückgestellt hat, bis die Abfrage steht. */
let heldFallback: Listener | null = null;

/** Vor dem Aufruf von `/api/starter-pack`. */
export function startStarterPackCheck(): void {
  checkPending = true;
}

/** Nach der Antwort — auch nach einem Netzwerkfehler, sonst wartet der
 *  zurückgestellte Toast für immer. */
export function finishStarterPackCheck(granted: boolean): void {
  checkPending = false;
  if (granted) {
    packAnnounced = true;
    heldFallback = null;
    if (listeners.size === 0) {
      grantedLatched = true;
      return;
    }
    for (const listener of listeners) listener();
    return;
  }
  const fallback = heldFallback;
  heldFallback = null;
  fallback?.();
}

/**
 * „Hier ist gerade eine Anmeldung durchgegangen — sag das, falls kein Pack
 * kommt." Läuft die Abfrage noch, wartet die Zeile auf ihr Ergebnis.
 */
export function announceSignIn(fallback: Listener): void {
  if (packAnnounced) return;
  if (checkPending) {
    heldFallback = fallback;
    return;
  }
  fallback();
}

export function subscribeStarterPackGranted(listener: Listener): () => void {
  listeners.add(listener);
  if (grantedLatched) {
    grantedLatched = false;
    listener();
  }
  return () => {
    listeners.delete(listener);
  };
}
