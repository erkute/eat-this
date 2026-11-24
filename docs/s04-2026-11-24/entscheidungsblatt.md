# Eat This Angebot Begriffe und Stimme

Stand: 24.11.2026. Entscheidungsvorlage für P1, P2, P3, P4, P5, P7, W2, W3 und W4. Die Vorschläge ändern noch keine Anwendung. Produktantworten sind ausstehend; Schweigen gilt nicht als Entscheidung.

## Basis und belegte Produktlogik

Eigene Arbeitskopie: `claude/s04-angebot-begriffe-stimme`, Basis `70a06a83bdcfcd3b06cc28d2348c48dec76d7232`, Basis frisch abgefragtes `origin/staging`. Remote-main: `aa156ce26bbcd29c9cb16f7227b552465b621366`, Release [#1415](https://github.com/erkute/eat-this/pull/1415). Beide haben identischen Dateistand (`git diff origin/staging..origin/main` leer). Die historische Planbasis bleibt damit gültig. Lokaler Hauptbranch und fremde URL-Änderungen wurden nicht verwendet oder geändert.

Am 24.11.2026 lesend bestätigt: App-Hosting-Check am tatsächlichen Main-SHA erfolgreich; Produktions-Rollout `rollout-2026-11-23-002` SUCCEEDED, Build `build-2026-11-23-002` READY mit exakt diesem Quell-SHA. S04 ist nicht veröffentlicht.

| Zusage | Codebeleg und Grenze |
| --- | --- |
| Kostenlose Map ohne Konto | `app/components/HubHeroCopy.tsx`, `lib/landing/faqs.ts`, öffentliche Map-Daten. Keine neue Zugangsschranke vorgeschlagen. |
| Starter einmal 20 | `lib/starter-pack.ts`: STARTER_PACK_CARDS = 20. `app/api/starter-pack/route.ts`: einmal pro Konto durch Entitlement-ID starter und atomisches create; auch bestehende Konten ohne bisherige Vergabe sind berechtigt. |
| Bereits offene Karten zählen nicht mit | Route bildet Pool aus noch verdeckten IDs; `lib/referral/pools.ts` sampleN nimmt min(20, Restbestand). Weniger als 20 möglich, auch null. Deshalb keine bedingungslose Zusage von 20 für jedes Konto. |
| Wunschkarte innerhalb der 20 | placeWantedFirst nimmt die übergebene gültige, noch verdeckte Karte zuerst. Bereits offene/unbekannte Karten werden ignoriert. Bei schon eingelöstem Starter keine erneute Wunschkartenvergabe. Übergabe: Login-Intent, ReferralToastListener. |
| Kostenlos vor Ort aufdecken | `app/api/must-eat-reveal/route.ts` akzeptiert angemeldete Konten ohne Kauf- oder Standortprüfung, Standardlimits 10/min und 15/Tag. Widerrufsprüfung in `lib/firebase/bearerAuth.ts`. Keine Server-Ortsbindung behaupten. |
| Browser prüft 50 m | `app/components/map/useMustEatDetailState.ts`: UNLOCK_RADIUS_METERS = 50. Gast tippt, kurzer Shake, direkter Starter-Login; Reduced Motion öffnet sofort. Kein automatisches Erklär-Onboarding ergänzen. |
| Preise im Code | `lib/stripe-catalog.ts`: neun Kategorie-Packs je 299 Cent, All Berlin 999 Cent. Einmalzahlung. Keine Live-Stripe-Produktprüfung durchgeführt. |
| Später ergänzte Karten | `lib/firebase/entitlements.ts`: gekaufte Kategorie wird gegen aktuellen Katalog aufgelöst, All Berlin deckt alles ab. Zahlen müssen als aktueller Bestand bezeichnet werden. |
| Öffentliche Karten | `lib/map/revealed-must-eats.ts`: Ziel 10; explizite Sanity-Auswahl hat Vorrang. Keine aktuelle Sanity-Bestandszahl abgefragt. |
| Belohnung | `lib/referral/constants.ts`: eine Karte je erfolgreicher Einladung je Seite, aus verfügbaren verdeckten Karten. Keine Änderung vorgeschlagen. |

Pfade in der Tabelle gelten relativ zu `nextjs/`. `docs/must-eat-karten.md` wurde gelesen: Karte = ein Must Eat an einem Spot, keine eigenen Karten pro Filiale.

## Konkrete Texte

| Einsatz | DE | EN |
| --- | --- | --- |
| Hero A empfohlen | Markenslogan „We tell you what to eat“ bleibt. Zusatz: „Restaurants, Cafés und Bars in Berlin. Entdecke die Spots auf der kostenlosen Map und ihre Must Eats als Sammelkarten.“ Knopf: „Zur Map“. | Keep “We tell you what to eat”. Add: “Restaurants, cafés and bars in Berlin. Explore the spots on the free map and discover their Must Eats as collectible cards.” Button: “Explore the map”. |
| Hero B | Hauptzeile statt Markenslogan: „Was du wo in Berlin essen solltest.“ Zusatz und Knopf wie A. | Headline replacing the slogan: “What to eat and where in Berlin.” Explanation and button as in A. |
| Starter | „Dein Starter Pack.“ „Melde dich an und erhalte einmalig bis zu 20 kostenlose Must-Eat-Karten. Bereits offene Karten zählen nicht mit.“ | “Your Starter Pack.” “Sign in and get up to 20 free Must Eat cards, once per account. Cards already revealed to you don’t count towards your pack.” |
| Angetippte Karte | „Entdecke dein Starter Pack.“ „Wenn du dein Starter Pack zum ersten Mal erhältst und diese Karte noch verdeckt ist, deckst du sie dabei kostenlos auf.“ | “Discover your Starter Pack.” “If you’re getting your Starter Pack for the first time and this card is still hidden, your pack reveals it for free.” |
| Herz | „Für später merken.“ „Melde dich an, um diesen Spot in deinen Favoriten zu speichern.“ | “Save it for later.” “Sign in to save this spot to your favourites.” |
| Gemeinsamer Einstieg | „Neu hier? Deine Anmeldung legt dein Konto an. Schon dabei? Du kommst zurück in dein Konto. Ohne Passwort.“ | “New here? Signing in creates your account. Already joined? You’ll return to your account. No password needed.” |
| Starter auf Spot-Seite | „Dein Einstieg: einmalig bis zu 20 kostenlose Must-Eat-Karten mit deinem Konto.“ Link: „Must Eats auf der Map ansehen“. | “Get started with up to 20 free Must Eat cards, once per account.” Link: “View Must Eats on the map”. |
| Freiwilliger Pack-Hinweis bei Entfernung | „Vor Ort kannst du diese Karte mit deinem Konto kostenlos aufdecken. Lieber vorher wissen, was du bestellst? Entdecke die Booster Packs.“ Link: „Packs ansehen“. | “At the spot, you can reveal this card for free with your account. Want to know what to order before you go? Explore the Booster Packs.” Link: “View packs”. |

Der bedingte Kartentext passt zum gemeinsamen Einstieg vor der Anmeldung. Eine verbindliche Zusage setzt die erste Starter-Vergabe und eine gültige, noch verdeckte Wunschkarte voraus. Herz-Anlass zuerst über Favoriten erklären; Starter dort höchstens als nachgeordnete Ergänzung. Der gemeinsame Einstieg bleibt passwortlos ohne künstliche Aufteilung in Registrierung und Login.

Die Hero-Erklärung muss serverseitig sofort sichtbar sein. Offener statischer Fächer und Remy bleiben bestehen. Keine neue Animation oder Abhängigkeit von Auth-Hydrierung.

## Kleine Begriffsliste

| Bedeutung | DE | EN |
| --- | --- | --- |
| Gemeinsamer Kontoeinstieg | Anmelden | Sign in |
| Zugang und Einstellungen | Konto | Account |
| Gesammelte Karten | Sammlung | Collection |
| Konkrete Gerichtsempfehlung | Must Eat | Must Eat |
| Sammelobjekt | Must-Eat-Karte | Must Eat card |
| Einzelne verdeckte Karte öffnen | Aufdecken | Reveal |
| Bezahlter Vorgang | Pack kaufen | Buy pack |
| Kostenloser einmaliger Einstieg | Starter Pack | Starter Pack |
| Bezahltes Komfortangebot | Booster Pack | Booster Pack |
| Restaurant, Café oder Bar | Spot | Spot |

„Freischalten / Unlock“ nicht zugleich für Anmeldung, einzelne Karten und Kauf verwenden. „Deck“ als sichtbare Sammlungsbezeichnung würde durch „Sammlung / Collection“ ersetzt, interne Bezeichner bleiben davon unabhängig.

## Getrennte Produktentscheidungen

| Nr. | Konkrete Varianten | Empfehlung | Antwort |
| --- | --- | --- | --- |
| D1 Hero P1 | A Markenslogan plus Erklärung; B lokalisierte Hauptzeile. Beide Hauptknöpfe führen zur Map. | A | OFFEN |
| D2 Einstieg P3 P4 | Obige Texte und Begriffsliste; alternativ Begriffe übernehmen und Texte überarbeiten. Belohnung unverändert. | Obige Grundlage | OFFEN |
| D3 Pack-Zahlen P2 | Gesamtzahl plus Aufteilung; nur Gesamtzahl; weiterhin keine Zahlen. | Gesamt plus Aufteilung | OFFEN |
| D4 Preislogik P2 W3 | Beträge unverändert, Preis sofort sichtbar, Kauf erst nach Kontoprüfung; keine anteilige Gutschrift. Alternative: Darstellung offen lassen. | Beträge beibehalten, Preis sofort zeigen | OFFEN |
| D5 Absender P7 | Neutral; ich/I; wir/we. | Neutral mit direkter Du-Ansprache | OFFEN |
| D6 Entfernung W4 | Freiwilligen Pack-Hinweis ergänzen; nur kostenloser Vor-Ort-Hinweis; offen lassen. | Freiwilliger Hinweis mit kostenloser Alternative zuerst | OFFEN |
| D7 Spot-Angebot W2 | Starter-Text ergänzen und Map-Weg behalten; direkten Login später gesondert prüfen; offen lassen. | Text plus bestehender Map-Weg | OFFEN |

D3 ändert eine bisher ausdrücklich geltende Produktaussage. Kommentare in `app/[locale]/pack/[slug]/page.tsx`, `app/[locale]/packs/page.tsx` und `lib/pack/packDetail.ts` sagen „Das Produkt nennt seine Zahlen nicht“. Das ist kein bloßes technisches Versäumnis. Eine Freigabe müsste auch diese Kommentare im selben Umsetzungsschritt aktualisieren.

D3 Textvariante: „{gesamt} Karten enthalten · {offen} für dich bereits offen · {neu} werden zusätzlich aufgedeckt.“ / “{total} cards included · {revealed} already revealed to you · {new} more will be revealed.” Platzhalter sind keine aktuellen Bestandswerte. Gezählt werden unterschiedliche Karten-IDs im aktuell gültigen Pack, nicht Spot-Anzahl oder mehrere Filialdarstellungen. Bereits offen umfasst öffentliche Karten, Starter, Einladungen, eigene Aufdeckungen und Käufe. Für Gäste keine persönliche Zahl behaupten; Aufteilung erst nach Kontoprüfung. Bei null zusätzlich offenen Karten transparent bleiben; dadurch entfällt nicht der Wert später hinzukommender Karten.

D4 aktueller Mangel: PackBuyButton ersetzt bei `owned === null` sein komplettes Label samt Preis durch „…“. Vorschlag: separater Preis aus dem Katalog sofort im Server-HTML, Kontoprüfung sperrt nur den Kauf. Kategorie-Preise auch im Katalog sichtbar machen. Kauf bleibt fester Packpreis unabhängig von Überschneidungen. Vollständig besessenes Pack führt weiterhin zur Map. Kein Nachweis, dass diese Darstellung Käufe verursacht oder verhindert hat.

D5 konkrete Stimmvarianten:

| Stimme | DE | EN |
| --- | --- | --- |
| Persönlich | Intro: „Wo ich essen gehe.“ FAQ: „Ich gehe gern essen und wähle die Spots aus, die mich überzeugen.“ Navigation: „Über mich“. | “Where I eat.” FAQ: “I love going out to eat and choose the spots that win me over.” Navigation: “About me”. |
| Kollektiv | Intro: „Wo wir essen gehen.“ FAQ: „Wir gehen gern essen und wählen die Spots aus, die uns überzeugen.“ Navigation: „Über uns“. | “Where we eat.” FAQ: “We love going out to eat and choose the spots that win us over.” Navigation: “About us”. |
| Neutral | Intro: „Gute Adressen in Berlin.“ FAQ: „Eat This sammelt ausgewählte Restaurants, Cafés und Bars in Berlin.“ Persönliche Seite weiter „Über mich“. | “Good places to eat in Berlin.” FAQ: “Eat This brings together selected restaurants, cafés and bars in Berlin.” Personal page remains “About me”. |

Ich/Wir erst nach bestätigter tatsächlicher Absenderschaft verwenden. Die aktuelle Kombination aus „Über mich“, „Wir sind Foodies“ und „Wo wir essen gehen“ wird durch die Markenentscheidung geklärt.

D6 betrifft angemeldete Konten im bekannten Entfernungszustand über 50 m; fehlender oder verweigerter Standort ist ein eigener Zustand. Gastkarten behalten ihren direkten Starter-Login. Mobile und Desktop getrennt prüfen. Ein Pack darf kein zwingender nächster Schritt werden.

D7 aktueller MustEatTeaserSection-Link bleibt `/map?me=<id>`; verdeckte Karten wackeln kurz, Reduced Motion navigiert sofort. Direkter Login und Teilen sind keine stillschweigend beschlossenen Erweiterungen.

## Redaktionelle Rolle des Insider Tipps

„Insider-Tipp / Insider tip“ ist ein praktischer Hinweis zum Besuch, etwa zur Bestellung, zum Ablauf oder zum passenden Anlass. Die Must-Eat-Karte empfiehlt ein bestimmtes Gericht. Beide können sich ergänzen und unterschiedliche Gerichte nennen. Eine Korrektur braucht eine inhaltliche Prüfung je Spot; keine automatische Gleichsetzung oder Übernahme geschützter Kartentexte.

Die Spot-Seite rendert `tip / tipEn` aus Sanity unabhängig von den Karten. Die historische Stichprobe aus drei Spots ist keine Vollprüfung. Keine neuen Sanity-Entwürfe oder Veröffentlichungen angelegt.

## Prüfungen und Befundstatus

Am 24.11.2026: AGENTS.md vollständig gelesen, Arbeitskopien und fremde Änderungen geprüft, Remote-main über GitHub gelesen, Check-Runs und Firebase-Rollout samt Build-SHA geprüft. Vier vorhandene lokale Vitest-Suiten ausgeführt: **4 Dateien, 43 Tests bestanden**. Umfang: Starter-Helfer, Starter-API, Reveal-API, useMustEatDetailState. Tests nutzen Mocks; kein neuer Emulator- oder Live-Browsertest.

S04 war eine Produktprüfung mit Textentwürfen. Typecheck, lint, CSS-Audit, knip, Build, Browser-Abnahme und Performancevergleich wurden deshalb nicht neu ausgeführt. Keine neue Aussage zu Verständlichkeit, Kaufwirkung, Feld-Vitals oder Stripe-Funktion. S02 bleibt laut Auftrag lokal und unveröffentlicht; S03 abgeschlossen, Feldurteil weiterhin offen.

| Befund | Stand und abhängige Fortsetzung |
| --- | --- |
| P1 | DE-/EN-Varianten liegen vor; D1 offen. Umsetzung und Verständlichkeit im Browser stehen aus. |
| P2 | Preiswartephase und absichtlicher Zahlenverzicht bestätigt; D3 und D4 offen. |
| P3 | Unterschiedliche Anlass-Texte vorgelegt; Vergabe inklusive Wunschkarte lokal mit vorhandenen Tests belegt; D2 offen. |
| P4 | Begriffsliste und gemeinsamer passwortloser Einstieg vorgelegt; D2 offen. |
| P5 | Tipprolle beschrieben; kein pauschaler Inhaltsfehler belegt. Redaktionelle Einzelprüfung bleibt separat. |
| P7 | Drei Absenderstimmen konkretisiert; D5 offen. |
| W2 | Starter-Angebot und bestehender Map-Pfad konkretisiert; D7 offen. |
| W3 | Nur Angebotsdarstellung geklärt; D3/D4 offen. Keine aktuellen Kaufzahlen abgefragt, keine Ursache oder Stripe-Störung behauptet. |
| W4 | Freiwilliger Hinweis mit kostenloser Alternative vorgelegt; D6 offen. Server- und Browser-Regeln bleiben verbindlich. |

Die sieben Entscheidungen wurden in diesem Chat als getrennte Fragen gestellt. Bis zu einer Antwort bleiben alle OFFEN. Nur die jeweils abhängige Umsetzung wartet darauf.
