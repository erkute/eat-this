// Shared, dependency-free referral constants. Imported by BOTH the edge
// middleware and the node API route — keep free of firebase/node imports.

export const REFERRER_COOKIE = 'pending_referrer';

// Karten pro erfolgreicher Einladung, für beide Seiten: eine.
//
// Die Karte ist frei, gestaffelt sind nur die Must-Eat-Karten, und von denen
// ist eine ein Geschenk und zehn ein halbes Album. Der Stapel wächst, aber er
// wächst langsam; diese Zahl muss gegen die kleinste Stapelgröße stimmen, nicht
// gegen die größte.
export const REFERRAL_BONUS_CARDS = 1;

// Cookie Max-Age: 30 days, in seconds.
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

// Plausible-Firebase-uid shape check for the ?ref value.
export const UID_SHAPE = /^[a-zA-Z0-9]{20,40}$/;

// New-account freshness window (ms). Only friend accounts created within this
// window of the confirm call reward the inviter.
//
// Eine Stunde, nicht zehn Minuten: Zwischen der Kontoerstellung
// (signInWithEmailLink) und dem Confirm-Aufruf liegt für ein neues Konto die
// Namensabfrage der Tour. Wer dabei das Telefon weglegt, wäre nach zehn Minuten
// draußen, und die Route vergäbe still nichts. Das Fenster ist nicht der
// Farming-Schutz, das ist MAX_REFERRALS_PER_INVITER; es verhindert nur, dass
// ein lange bestehendes Konto nachträglich noch jemanden belohnt. Dafür ist
// eine Stunde genauso eindeutig wie zehn Minuten.
export const ACCOUNT_FRESHNESS_MS = 60 * 60 * 1000;

// Anti-farming cap: max successful referrals an inviter is rewarded for. Past
// the cap the friend still gets their own welcome card; only the inviter-side
// reward stops.
//
// Die Obergrenze ist gegen den Stapel zu lesen, nicht für sich. Sie bleibt
// bewusst hoch: fünfzehn echte Einladungen sind mehr wert als fünfzehn Karten,
// und wer sie fälscht, braucht fünfzehn frische Konten mit verschiedenen
// Adressen. Bleibt der Stapel klein, ist diese Zahl die Stellschraube, nicht
// die Belohnung selbst.
export const MAX_REFERRALS_PER_INVITER = 15;
