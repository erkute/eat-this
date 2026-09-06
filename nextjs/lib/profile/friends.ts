/**
 * Ein Freund, so weit er auf einem fremden Profil stehen darf: Name, Figur,
 * und die uid, damit man auf sein Deck kommt. Sonst nichts — keine E-Mail,
 * keine Zahlen, keine Karten. Was er gesammelt hat, sagt seine eigene
 * Deck-Seite, und die entscheidet das selbst (siehe publicDeck.server.ts).
 *
 * Eigene Datei, kein `server-only`: die Reihe im Profil ist eine
 * Client-Komponente und braucht den Typ. Die Funktion, die ihn füllt, liegt
 * daneben in friends.server.ts und darf nur auf dem Server laufen.
 */
export interface FriendCard {
  uid: string;
  /** Vorname aus dem Anzeigenamen. Null, wenn das Konto keinen gepflegt hat. */
  name: string | null;
  avatar: 1 | 2 | 3;
}
