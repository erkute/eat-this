# Karten statt Spots — Monetarisierung und Anmeldemodell

**Status:** Gebaut (PR #724 und Folgearbeit), auf `staging` noch nicht gemergt.
**Stand:** 06.09.2026. Zahlen in diesem Dokument gelten für den Stapel von
25 lebenden Karten an diesem Tag; die Konstanten im Code sind gegen den
geplanten Stapel von 100+ gerechnet und dort jeweils kommentiert.

---

## 1. Warum der Umbau

Bis zum 06.09.2026 war die Map gestaffelt: 100 Spots ohne Konto, 150 mit,
der Rest gegen Geld. Gemessen an Produktion am selben Tag:

| Befund                                      | Wert                              |
| ------------------------------------------- | --------------------------------- |
| Stripe-Käufe seit Start                     | 4, von 2 Konten, rund 12 € brutto |
| Konten                                      | 56                                |
| Rote (gesperrte) Pins für Erstbesucher      | 315 von 465 (68 %)                |
| Spot per Anmeldung freigeschaltet           | 5 Leute                           |
| Besucher, die über Restaurant-Seiten kommen | 43 %                              |

Die Paywall schützte nichts: Story, Tipp und Adresse jedes Spots stehen
indexiert auf seiner Restaurant-Seite. Gesperrt war nur die Kartenebene, und
sie sperrte ausgerechnet den stärksten Anmeldemoment aus — wer vor einem Laden
stand, dessen Spot nicht auf der eigenen Map lag, konnte die Karte nicht
aufdecken (`/api/must-eat-reveal` prüfte die Sichtbarkeit).

## 2. Das Modell

**Die Spots sind frei.** Jeder sieht alle Spots mit Story, Tipp und Adresse.
Gestaffelt sind nur noch die Must-Eat-Karten — das einzige Material, das nicht
ohnehin frei im Netz steht (Firestore und Storage hinter dem Entitlement-Gate).

| Stufe      | Sieht vom Stapel                          | Davon offen                       |
| ---------- | ----------------------------------------- | --------------------------------- |
| ohne Konto | alle Karten, als Rücken (seit 07.09.2026) | 5 (Schaufenster) + Spot des Tages |
| mit Konto  | 5 + 20 Karten (Starter Pack)              | 5 + 10, die anderen 10 verdeckt   |
| gekauft    | die Karten des Packs, bzw. alles          | alles                             |

„Sichtbar" heißt „liegt im Stapel", nicht „liegt offen": die zehn verdeckten
Karten des Starter Packs stehen mit Nummer und Lokal im Deck und gehen vor Ort
auf. Sie sind der Grund hinzugehen. Was ein Konto nicht sieht, taucht auch am
Spot nicht auf — die Map zeigt einem Konto nur die Karten der eigenen
Oberfläche.

**Gäste sehen alle Rücken** (Betreiber, 07.09.2026: „mehr Anmeldungen, nicht
mehr Verkauf"). Jeder Rücken an einem Spot ist die Frage „was liegt
darunter?", und die Karten-Detailansicht beantwortet sie ohne Konto mit der
Anmelde-Tafel: gratis, 20 Must Eats, diese ist dabei. Die angetippte Karte
reist als Absicht mit (`?starter=<id>` in der Continue-URL des Magic-Links,
sessionStorage für Google, `lib/auth/pendingStarterCard.ts`) und landet
garantiert in der offenen Hälfte des Starter Packs (`placeWantedFirst`).
Derselbe Weg vom Startseiten-Teaser aus. Was ein Rücken preisgibt, ist der
Spot; Gericht, Bild und Beschreibung bleiben auf dem Server.

**Drei Wege zu einer offenen Karte:**

1. **Verdienen** — vor Ort, 50 m, `/api/must-eat-reveal`. Keine
   Sichtbarkeitsprüfung mehr, nur das Ratenlimit. Nur dieser Weg schreibt nach
   `users/{uid}/unlockedMustEats` und **stempelt** die Karte („War da").
2. **Geschenkt** — Spot des Tages (täglich, flüchtig, für jeden), Starter Pack
   (einmal pro Konto), Einladung (eine Karte pro Seite, Obergrenze 15 pro
   Einladendem).
3. **Kaufen** — Kategorie-Pack (2,99 €) oder All Berlin (9,99 €). Kategorie-
   Packs lösen **live** gegen den Katalog auf (`ownsCategoryOf`): eine später
   erscheinende Karte im gekauften Pack kommt mit.

**Gekauft ist nicht abgestempelt.** Die Daten trennten das immer
(`entitlements.mustEatIds` gegen `unlockedMustEats`); seit dem Umbau zeigt es
auch die Anzeige. Der Stempel ist die einzige Auszeichnung, die es nicht zu
kaufen gibt — deshalb hängen auch die **Abzeichen** im Profil an den Stempeln,
nicht an den offenen Karten. Ein frisches Konto trägt fünfzehn offene Karten
und kein Abzeichen.

## 3. Wo die Regeln stehen

| Frage                           | Ort                                                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Was gehört diesem Konto         | `lib/map/visible-restaurants.server.ts` (`composeAccountSurface`) — die eine Ableitung für Map, Profil, geteiltes Deck, Reveal, Referral und Starter Pack |
| Schaufenster-Größe              | `lib/map/revealed-must-eats.ts` (`REVEALED_TARGET = 5`)                                                                                                   |
| Starter Pack                    | `lib/starter-pack.ts` (20 Karten, 10 offen), `app/api/starter-pack/route.ts`                                                                              |
| Einladung                       | `lib/referral/constants.ts`, `app/api/referral/confirm/route.ts`                                                                                          |
| Entitlement-Form                | `lib/firebase/entitlements.ts` (`mustEatIds` offen, `coveredMustEatIds` verdeckt)                                                                         |
| Leeres Pack nicht käuflich      | `/packs`, Pack-Seite, `/api/stripe/checkout` (409 `empty_pack`), `scripts/sync-stripe-catalog.ts`                                                         |
| Nachladen, wenn Karten zufallen | `lib/map/useMapData.ts` — Listener auf `entitlements` und `referralBonuses`, gilt für Map und Profil                                                      |

Auslöser des Starter Packs ist der Auth-Listener in
`ReferralToastListener.tsx`, derselbe, der die Einladung bestätigt. Die Route
ist idempotent über die Doc-ID `starter`; bestehende Konten bekommen ihr Pack
beim nächsten Anmelden.

## 4. Was das Produkt nicht sagt

- **Keine Pack-Größen, kein Pack-Inhalt.** Auf einem Beutel steht die Sorte,
  nicht die Liste. `/pack/<kategorie>` nennt weder Menge noch Karten;
  `/must-eats` nennt zu verdeckten Karten keinen Spot (auch nicht im
  RSC-Payload).
- **Die 20 des Starter Packs steht dagegen in der Copy.** Ein Gratis-Angebot
  ohne Größe ist keins.
- **Kein Stempel auf dem geteilten Deck.** Es zeigt nur Rücken und offene
  Karten; ob ein Rücken „noch nicht" oder „nicht für dich" heißt, bleibt
  von außen ununterscheidbar.
- **Keine Rangliste.** Abzeichen messen gegen die Sammlung, nicht gegen Leute.

## 5. Bewusst nicht gebaut

- **Spot des Tages bleibt mit Konto liegen.** Ließe den Stapel in ~26 Tagen
  gratis zusammenlaufen; konkurriert mit den Packs und mit dem Hingehen.
- **Referral-Karte nur aus dem Unsichtbaren.** Auf dem heutigen Stapel (5 +
  20 = 25) wäre der Pool leer. Die Einladung zieht deshalb aus allem, was noch
  nicht offen liegt — auf einem kleinen Stapel dreht sie damit eine verdeckte
  Starter-Karte um. Mit wachsendem Stapel löst sich das von allein.

## 6. Offen — Betreiber

1. **Stripe-Dashboard.** `scripts/sync-stripe-catalog.ts` zieht
   Produktbeschreibungen und Verkäuflichkeit (leere Packs → Preis inaktiv)
   nach. Trockenlauf per Default, `--apply` schreibt. Braucht den
   Live-Schlüssel per env; **nicht ausgeführt**.
2. **Preise.** Neun Packs zu je 2,99 €, deren Kartenzahl um den Faktor 11
   auseinanderliegt. Price-IDs sind live.
3. **Stapelgröße.** Starter Pack (20) und Einladungs-Obergrenze (15) sind auf
   100+ Karten gerechnet. Auf 25 vergibt das Starter Pack 20 von 22 und lässt
   den Packs zwei. Übergang, bekannt.
