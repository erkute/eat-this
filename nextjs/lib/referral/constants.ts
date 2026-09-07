// Shared, dependency-free referral constants. Imported by BOTH the edge
// middleware and the node API route — keep free of firebase/node imports.

export const REFERRER_COOKIE = 'pending_referrer';

// Karten pro erfolgreicher Einladung — für beide Seiten, eine.
//
// Bis zum 06.09.2026 waren es zehn SPOTS. Die gibt es nicht mehr zu verschenken:
// die Karte ist frei, gestaffelt sind nur noch die Must-Eat-Karten, und von
// denen ist eine ein Geschenk und zehn ein halbes Album. Der Stapel wächst auf
// die geplanten 100+, aber er wächst langsam — diese Zahl muss gegen die
// KLEINSTE Stapelgröße stimmen, nicht gegen die größte.
export const REFERRAL_BONUS_CARDS = 1;

// Cookie Max-Age: 30 days, in seconds.
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

// Plausible-Firebase-uid shape check for the ?ref value.
export const UID_SHAPE = /^[a-zA-Z0-9]{20,40}$/;

// New-account freshness window (ms). Only friend accounts created within this
// window of the confirm call reward the inviter.
//
// Eine Stunde, nicht zehn Minuten: zwischen der Kontoerstellung
// (signInWithEmailLink) und dem Confirm-Aufruf liegt fuer JEDES neue Konto das
// Identitaets-Formular auf /welcome — Name eintippen, Charakter aussuchen. Wer
// sich dabei Zeit laesst oder das Telefon weglegt, war nach zehn Minuten
// draussen, und die Route vergab still nichts. Das Fenster ist nicht der
// Farming-Schutz, das ist MAX_REFERRALS_PER_INVITER; es verhindert nur, dass
// ein LANGE bestehendes Konto nachtraeglich noch jemanden belohnt. Dafuer ist
// eine Stunde genauso eindeutig wie zehn Minuten.
export const ACCOUNT_FRESHNESS_MS = 60 * 60 * 1000;

// Anti-farming cap: max successful referrals an inviter is REWARDED for. Past
// the cap the friend still gets their own welcome card — only the
// inviter-side reward stops.
//
// Die Obergrenze ist gegen den STAPEL zu lesen, nicht für sich: 15 Karten sind
// bei 26 im Stapel über die Hälfte, bei den geplanten 100+ ein Siebtel. Sie
// bleibt bewusst so hoch: fünfzehn echte Einladungen sind mehr wert als
// fünfzehn Karten, und wer sie fälscht, muss dafür fünfzehn frische Konten mit
// verschiedenen Adressen anlegen. Wenn der Stapel wider Erwarten klein bleibt,
// ist DIESE Zahl die Stellschraube — nicht die Belohnung selbst.
export const MAX_REFERRALS_PER_INVITER = 15;
