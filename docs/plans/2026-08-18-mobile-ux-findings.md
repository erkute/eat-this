# Mobile-UX-Fund 2026-08-18 — offene Punkte

Aus einem Nutzer-Walkthrough am 375×812-Viewport (lokaler Dev-Server, DE):
Startseite → Map → Filter → Suche → Restaurant-Detail → Must Eats → Packs.
Rolle: hungrig, 20–40, sucht abends in Berlin was zu essen.

**Erledigt** (PR #337 → staging, PR #338 → main): Order-Block-Overflow,
Drop-Cap-Balken, Zurück-Geste auf der Map. Nicht mehr anfassen.

**Auf `staging`**, gemerged und CI grün, **nicht auf Produktion**: 1.1 Empty
State (PR #347), 1.2 Aktionen auf der Detailseite (PR #348), 2.4 gesperrte Spots
als Punkte (PR #351), 2.3 Free-Tier erklärt (PR #352), gesperrter Punkt öffnet
das Sheet (PR #353), 1.4 Clustering (PR #354), 1.3 „Rund um Mitte" (PR #359),
2.1 Pack-Inhalt als Zahl (PR #360), 2.2 Bundle-Ersparnis (PR #362), 2.5
kuratierte Spots ohne Must Eat (PR #365), toter-Key-Sweep (PR #366).

**Auf `staging`**, gemerged und CI grün, **nicht auf Produktion**: 1.1 Empty
State (PR #347), 1.2 Aktionen auf der Detailseite (PR #348), 2.4 gesperrte Spots
als Punkte (PR #351), 2.3 Free-Tier erklärt (PR #352), gesperrter Punkt öffnet
das Sheet (PR #353), 1.4 Clustering (PR #354), 1.3 „Rund um Mitte" (PR #359),
2.1 Pack-Inhalt als Zahl (PR #360), 2.2 Bundle-Ersparnis (PR #362), 2.5
kuratierte Spots ohne Must Eat (PR #365), toter-Key-Sweep (PR #366).

**Rollout und Smoke, Stand 2026-08-19 11:06 — gilt bis einschließlich 2.1**
(Commit `73087a33`): `rollout succeeded` und `smoke-tested`. Build
`build-2026-08-19-008` steht auf `READY`, sein `source.codebase.hash` ist
identisch mit dem damaligen Branch-Tip. Geprüft: alle Kernrouten 200, 410 für
dauerhaft geschlossene Spots, Basic-Auth-Gate hält (ohne Auth, falsches Passwort
und falscher User je 401), `x-robots-tag: noindex, nofollow`, CSP als
Report-Only, `robots.txt` mit `Disallow: /`, kein `pk_live_`, und die
Firebase-Boundary lädt die Staging-Config statt der Produktions-Config. Auf der
Startseite steht „Rund um Mitte" ohne Gehzeiten (1.3), auf `/packs` die
Spot-Zahlen (2.1).

**Rollout, Stand 2026-08-19 13:52 lokal — deckt 2.2, 2.5 und den Key-Sweep**
(Commit `55496ced`): `rollout succeeded`. `build-2026-08-19-012` steht auf
`READY`, sein `source.codebase.hash` ist
`55496ced158e3b9d7fa69f4d0b0635968c7ecf5d` und damit identisch mit
`origin/staging`. Negative Checks ohne Zugangsdaten: Staging antwortet 401 mit
`WWW-Authenticate: Basic realm="Staging"` **und** `x-robots-tag: noindex,
nofollow`, Produktion 200 ohne diesen Header.

**`smoke-tested` gilt für diese drei aber NICHT** — der funktionale Smoke hinter
dem Basic-Auth-Gate steht aus, er braucht die Zugangsdaten aus
`docs/runbooks/2026-05-27-staging-backend-setup.md`. Nicht mit dem Rollout
verwechseln: der ist bewiesen, das Verhalten der Seite ist es nicht.

**Die Falle war wieder die Warteschlange, exakt wie im Skill beschrieben.** Zwei
Merges lösten zwei Rollouts aus, die seriell liefen. Der Backend-Zeitstempel las
sich dabei doppelt irreführend: er zeigte `11:48:34` in **Lokalzeit**, also
09:48 UTC — der Rollout von #362, zwei Stunden alt — während die Merges bei
13:38 und 13:43 lokal lagen. Wer den Zeitstempel für UTC hält, liest ihn als
vier Minuten in der Zukunft und hält den Deploy für erledigt. Erst
`rollouts:list` zeigte beide als `QUEUED`; 011 wurde um 13:47 fertig, 012 erst
um 13:51. Zwischen erstem und letztem `SUCCEEDED` lagen vier Minuten, in denen
der Backend-Zeitstempel schon frisch war und trotzdem den falschen Commit meinte.

Mehrere davon haben Reste hinterlassen — siehe die Notizen unter dem jeweiligen
Punkt.

Alles Folgende ist offen. Reihenfolge = mein Vorschlag nach Wirkung pro Aufwand,
nicht bindend.

---

## P1 — kostet direkt Nutzer

### 1.1 Kein Empty State bei null Treffern

Suche „Ramen" / „Sushi" / „vegan" auf der Map → leere Fläche plus Paywall-Anzeige.
Kein „0 Treffer", keine Erklärung. Der Nutzer kann nicht unterscheiden zwischen
„gibt's nicht", „ist gesperrt" und „kaputt". Die Anzeige suggeriert außerdem, der
Kauf bringe Ramen — was beim Burger-Fall (1 von 1 frei) nicht stimmen muss.

Es gibt bereits `app/components/map/MapListEmpty.tsx` — der greift hier nicht.
Erst klären warum, dann: Empty State mit Zahl, z. B. „Keine freien Treffer für
‚Ramen'. 3 Ramen-Spots stecken im Dinner-Pack."

**Erledigt in PR #347.** Der Grund war das Gate
`restaurants.length === 0 && lockedRestaurants.length === 0` in
`RestaurantList.tsx` — „Ramen" ist 0 frei / 3 gesperrt, also war die zweite
Hälfte falsch und der Block blieb genau im erklärungsbedürftigen Fall aus. Die
Zahl kommt jetzt ungekappt aus `useMapFilters` (`lockedMatchCount`); die auf 20
Zeilen gekappte Teaser-Liste hatte keinen Konsumenten mehr und ist entfallen.

Offen bleibt: **die Kartenfläche selbst ist weiter leer** — das ist 2.4.

### 1.2 Kein Weg zum Restaurant auf der Detailseite

`/restaurant/<slug>` hat exakt drei Links: 2× `/map?r=…` und Instagram. Kein
Route-/Maps-Link, keine Telefonnummer, keine Website, keine Reservierung, kein
Teilen. Adresse ist reiner Text, nicht antippbar.

Das Map-Sheet **hat** „Maps" und „Teilen" — die Vollseite, auf der Google-Besucher
landen, ist also die schlechtere Variante. Umgekehrt fehlt dem Sheet der
„Was bestellen?"-Block, den die Seite hat. Zwei Oberflächen, zwei Datensätze.

Vorschlag: Sticky Action-Bar unten `[Route] [Anrufen] [Teilen]`, und beide
Detailansichten auf eine gemeinsame Datenquelle ziehen.

**Erledigt in PR #348**, ohne Sticky Bar: Route/Anrufen/Teilen sind in die
bestehende `.acts`-Reihe gewandert, die Adresse ist der Route-Link. Gemessen
vorher: 0 `tel:`, 0 Teilen, 0 Route — die drei `google.com/maps`-Links auf der
Seite waren Foto-Credits. Teilen liegt jetzt einmal in
`app/components/ShareButton.tsx`, beide Oberflächen benutzen es.

Was davon offen bleibt:

- **Die zwei GROQ-Projektionen sind weiter getrennt.** `restaurantBySlugQuery`
  und `restaurantMapDetailQuery` waren auseinandergelaufen — `phone` gab es nur
  im Sheet, deshalb konnte die Seite gar keinen Anrufen-Button füllen. In #348
  wurde nur `phone` ergänzt; die Überlappung, auf die das UI baut, hält jetzt
  `lib/__tests__/restaurantContactFields.test.ts` fest. Eine gemeinsame
  Projektion wäre die eigentliche Lösung.
- **Der „Was bestellen?"-Block fehlt dem Sheet weiterhin.** Unberührt.
- **Datenlücke, nicht Code-Lücke:** `Anrufen` erscheint auf 11 von 26 freien
  Spots (42 %), `Reservieren` auf **keinem** — kein einziges freies Restaurant
  hat aktuell eine `reservationUrl`. Der Code-Pfad existiert.

### 1.3 „Um dich herum" ist nicht um dich herum

`app/components/HubNearby.tsx:15` — ohne Standortfreigabe fällt die Komponente
still auf `MITTE = { lat: 52.52, lng: 13.405 }` zurück, behält aber die
Überschrift „UM DICH HERUM" und zeigt „8 Min · Mitte". Wer in Neukölln sitzt,
liest eine falsche Gehzeit.

Fix: vor der Freigabe „Rund um Mitte" titeln und die Gehzeiten weglassen.

**Erledigt in PR #359**, genau so.

Der Punkt, der beim Messen die Lösung entschieden hat: **eine abgelehnte
Freigabe und eine nie gestellte Frage sind auf dem Hub nicht unterscheidbar.**
`UserLocationProvider` startet den stillen Request nur, wenn die Permission
schon erteilt ist — eine Ablehnung löst also nie einen Request aus und setzt nie
einen Error. Beim Laden sieht sie exakt aus wie ein Erstbesuch. `location ===
null` ist die einzige ehrliche Trennlinie; ein neuer Zustand war nicht nötig,
`lib/map/locationStatus.ts` bleibt unangetastet.

Die Sortierung nach Distanz zu Mitte ist geblieben — „am nächsten an Mitte" ist
eine echte Ordnung, sie war nur falsch beschriftet.

Mitgezogen: die Subline sagte „Mitte · nächste Spots auf der Map" und war damit
die einzige Stelle, die Mitte nannte. Mit der neuen Überschrift stand „Mitte"
sechsmal auf dem Schirm, also zeigt sie jetzt auf den STANDORT-Button daneben
(„Tipp auf Standort für Gehzeiten von dir aus.") — was gleichzeitig die Antwort
auf „wo sind die Gehzeiten hin?" ist.

`hub.nearby.title` existierte und wurde von niemandem gelesen, während die
Komponente den String hartcodierte; er hält jetzt die Live-Kopie, `titleFallback`
daneben.

Nebenbei gefunden, nicht angefasst — **tote Übersetzungs-Keys** im Schnitt von
#357: `hub.nearby.location`, `errDenied`, `errRetry`, `mustEatsTitle`,
`mustEatsSub`, `more` sowie `deineWelt.nearbyLive` / `nearbyFallback`. Kein
Konsument. `deineWelt.nearbyFallback` war ironischerweise schon „Rund um Mitte".

**Erledigt in PR #366** — nachgeprüft ist das Loch größer und anders geschnitten
als diese Notiz annahm, in drei Richtungen.

**`hub.deineWelt` ist komplett tot, nicht nur zwei Keys daraus**: 83 Keys pro
Locale, 166 insgesamt. Kein `useTranslations('hub.deineWelt')`, kein gepunkteter
Zugriff, kein dynamischer Namespace, der ihn erreichen könnte. Die vier
Key-Namen, die anderswo auftauchen, gehören nicht hierher — `profileTitle` und
`toMap` kommen aus dem `profile`-Namespace, `actionsLabel` aus einem lokalen
Copy-Objekt in `NotFoundContent.tsx`, `newMeta` hat gar keinen Konsumenten. Der
Konsument verschwand in `61d1d092` „Refactor map and spot data flow", die
Strings blieben liegen.

**`hub.nearby.location` war nicht tot, sondern übersehen** — dieselbe Falle wie
oben bei `hub.nearby.title`: der Key existierte ungelesen, während die
Komponente `locale === 'en' ? 'Locate' : 'Standort'` hartcodierte, ein
Locale-Ternary in einer Datei mit Übersetzungstabelle. Der Key trägt jetzt die
Live-Kopie. Gerendertes Ergebnis unverändert, gegen den laufenden Dev-Server
geprüft: DE „Standort", EN „Locate", kein `MISSING_MESSAGE` auf `/` oder `/en`.

**Die Falle beim Löschen war der bloße Name.** `mustEatsTitle` gab es zweimal —
in `hub.nearby` (tot) und in `hub.deineWelt`; `location` und `more` treffen als
Namen hundertfach im Repo (`window.location`, `${more} weitere Spots`). Ein
Grep-und-Löschen hätte danebengegriffen, die Löschung lief deshalb pro Block.

Unterm Strich −178 Zeilen in `translations.ts`; beide `nearby`-Blöcke tragen
jetzt exakt die 7 Keys, die `HubNearby` liest, symmetrisch über DE/EN.

Mitgenommen für die Hygiene-Notiz unten: `HubNearby.tsx` ist schon auf `HEAD`
nicht prettier-konform — ein sechstes File, das dort noch nicht steht.

### 1.4 Pins überlappen, kein Clustering

Bei Default-Zoom gemessen: 15 sichtbare Marker, **8 Paare unter 40px Abstand** bei
44px Markergröße. Ein Teil der Pins ist nicht antippbar. Dazu sind alle Pins
identisch („EAT THIS"-Tütchen) — die Karte sagt nichts darüber, was wo ist.

Fix: Clustering ab Zoomstufe X, plus Differenzierung nach Kategorie
(Icon oder Farbe).

**Clustering erledigt in PR #354**, die Differenzierung nicht.

Nachgemessen wurde im sichtbaren Kartenstreifen (0–585px, was das Sheet
übriglässt), nicht im ganzen Viewport — darunter lagen 10 freie Pins, 5 Paare
unter 40px, und **79 Marker bekamen auf ihrem eigenen Mittelpunkt keinen
Treffer**. Zwei davon waren freie Pins: „Slice Society" verlor seinen an Hokey
Pokey Mitte, „Bar Basta" an SOFI. Die 194 gesperrten Punkte aus #351 lagen als
130 sichtbare Punkte mit 90 Überlappungen darunter — deshalb trägt das
Clustering beide Sorten. Nachher: 0 freie Paare unter 40px (dichtestes 52px bei
48px Radius), 0 überlappende Punkte, kein freier Marker verliert seinen
Mittelpunkt.

Zwei Dinge, die dabei herauskamen:

- **MapLibre stapelt Marker nach DOM-Reihenfolge, und das ist die
  MOUNT-Reihenfolge, nicht die des React-Baums.** Jeder Marker hängt sich beim
  Mounten selbst an den Canvas-Container. Ein Punkt, den ein Zoomwechsel neu
  erzeugt, landet also hinter schon vorhandenen Pins und malt über sie. Bei z13
  beobachtet: ein „2 Spots"-Cluster von einem gesperrten Punkt verdeckt. Die in
  #351 dokumentierte Regel „Punkte zuerst rendern" hielt nur für den ersten
  Paint. Freie Marker haben jetzt ein eigenes z-index-Band
  (`.markerRootFree`) — dieselbe Mechanik, die der aktive Pin schon hatte.
- **Die Projektionskonstante wurde gegen die laufende Karte geprüft, nicht
  angenommen.** Bei z12 sagt die 512px-Kachel-Formel für den Datensatz eine
  Ausdehnung von 7779×7259px voraus, das DOM misst 7778×7237.

Offen bleibt: **alle Pins sehen gleich aus.** Die Karte sagt weiterhin nichts
darüber, was wo ist. Eigene Änderung (Icon oder Farbe pro Kategorie).

---

## P2 — Vertrauen und Konversion

### 2.1 Packs sagen nicht, wie viele Spots drin sind

`/pack/breakfast` listet 5 Einträge, davon 2 „Verdeckt", dann „+ Und mehr".
Für 2,99 € kauft man blind. Das ist der eine fehlende Satz zwischen Interesse
und Kauf: „**47 Spots + 12 Must Eats**" prominent auf jede Pack-Karte.

Nebenbei: Platz 01 und 02 sind beide „AERA" (Mitte + Charlottenburg), das lässt
den Pack dünner wirken als er ist.

**Erledigt in PR #360**, beide Hälften.

Die geschätzten „47 Spots + 12 Must Eats" waren zu niedrig bzw. zu hoch — die
echten Zahlen: breakfast 52/6, coffee 50/2, dinner 224/8, drinks 68/2, fast-food
9/4, fine-dining 34/0, lunch 204/7, pizza 20/3, sweets 33/9, All Berlin 339/22.
Ein 52-Spot-Pack verkaufte sich über fünf Teaser-Zeilen und ein „Und mehr".

Die Zeile steht jetzt auf jeder `/packs`-Kachel und in beiden Pack-Heros, und
die letzte Teaser-Zeile zählt, was sie zurückhält („+ 47 weitere Spots" statt
„Und mehr"). Packs ohne Must Eat (fine-dining) sagen nur die Spots, statt eine
Null zu bewerben.

**Die Falle war die Zählung, nicht die Anzeige.** Die Zahl ist ein Versprechen,
das ein Käufer nachzählen kann, also muss `packContentsQuery` dieselbe Population
zählen, die die Map rendert (`isOpen != false`, wie `mapRestaurantsQuery`), unter
der Regel, die sie freischaltet — ein Kategorie-Pack öffnet **jedes** Restaurant,
das die Kategorie trägt, nicht nur seine primäre (`isRestaurantVisible`). Must
Eats erben das `isOpen` ihres Restaurants, weil `composeVisibleRestaurants` nur
Must Eats zeigt, deren Restaurant auf der Map liegt: ohne den Filter meldet
breakfast **7**, wo der Käufer 6 findet, und sweets 10 statt 9.
`lib/__tests__/packContentsQuery.test.ts` hält die drei Invarianten fest, im
Schnitt von `restaurantContactFields.test.ts`. Geprüft und unkritisch: alle
gezählten Restaurants haben `lat`/`lng`, es ist kein Spot dabei, der nie einen
Pin zeichnet.

Zur AERA-Doppelung: die Liste ist alphabetisch, also stehen die Filialen einer
Kette nebeneinander. `buildPackTeaser` zeigt jetzt einen Eintrag pro Name — die
Filialen bleiben im Pack und bleiben gezählt, nur der Teaser dedupliziert.
Breakfast vorher → nachher: `AERA, AERA, AKKURAT Café` → `AERA, AKKURAT Café,
Albatross Bäckerei`.

### 2.2 Ersparnis des Bundles unsichtbar

9 × 2,99 € = 26,91 € gegen All Berlin 20 €. Rund 26 % Ersparnis, steht nirgends.

**In PR #362** (offen, CI grün). Eine Zeile unter allen drei
All-Berlin-CTAs — `/packs`-Hero, `/pack/all-berlin` und der Upsell-Block auf
jeder Kategorie-Pack-Seite, also dort, wo jemand kurz davor ist, 2,99 € für einen
von neun zu zahlen: „Einzeln 26,91 € · du sparst 6,91 € (25 %)".

Zwei Entscheidungen, die nicht selbsterklärend sind:

- **Der Prozentsatz ist abgerundet, nicht kaufmännisch gerundet.** Der echte Wert
  ist 25,68 %. Gerundet wären es die 26 % aus diesem Fund, aber ein zu groß
  angegebener Rabatt ist der eine Fehler, den man nicht verteidigen kann, wenn
  jemand nachrechnet. Die Euro-Zahl trägt ohnehin das Gewicht und ist exakt.
- **Nichts ist hartcodiert.** `bundleSavings()` summiert die Kategorie-Packs aus
  `CATALOG` und zieht All Berlin ab, damit ein zehnter Pack oder eine
  Preisänderung keine veraltete Behauptung neben einem Kaufen-Button stehen
  lässt. Ein Test prüft das Abrunden explizit.

Ruhige Typo statt eines zweiten gelben Badges — die Zeile aus 2.1 hält auf
denselben Seiten schon die Betonung.

### 2.3 Free-Tier vs. Bezirk-Seiten widersprechen sich

Map frei: **29 Spots gesamt**. Startseite wirbt mit „MITTE 77 Spots",
„KREUZBERG 57 Spots" — und `/bezirk/kreuzberg` liefert tatsächlich 57 klickbare
Restaurants, gratis. `/restaurant/buya-ramen-factory` ist frei lesbar, während
die Map-Suche nach „Ramen" nichts findet.

Das Geschäftsmodell (Liste frei, Map kostet) ist in Ordnung — es wird nur
nirgends erklärt, und die Suche wirkt dadurch kaputt statt limitiert.

**Erledigt in PR #352.** Der gesperrte Empty State sagt jetzt, dass sich jeder
Spot in seiner Bezirk-Liste frei lesen lässt, und verlinkt `/bezirk`. Gemessen
vorher: Kreuzberg 2 frei auf der Map gegen 57 klickbare Restaurants auf der
Bezirk-Seite, Mitte 5 gegen 77 — und `/bezirk/kreuzberg` enthielt **null**
Treffer für gesperrt/locked/booster/pack/freischalt, also keinerlei Hinweis auf
das Modell. Der Satz fehlt bewusst, wenn gar nichts matcht („Qwertzuiop"): dann
gibt es auch nichts anderswo zu lesen.

Nicht angefasst: das dauerhafte All-Berlin-Banner, das erscheint, wenn es freie
Treffer _gibt_. Derselbe Satz könnte dort stehen.

### 2.4 Gesperrte Spots verstecken statt zeigen

Ausgegraute Pins/Karten mit Schloss verkaufen; eine leere Karte frustriert nur.
Hängt eng an 1.1 und 2.3.

**Erledigt in PR #351**, mit einem Nachzug in **PR #353**.

Gesperrte Spots sind **11px-Punkte, keine Pins**. Der Grund ist gemessen: bei
Default-Zoom liegen 15 freie Spots im Bild und **194 gesperrte im selben
Ausschnitt**. Als 44px-Pins wäre das ein geschlossener Teppich, in dem die
freien Spots verschwinden — das Gegenteil des Zwecks. Als Punkte lesen sie sich
als Dichte, und die gelben Pins bleiben das Einzige, was aussieht, als öffne es
einen Spot. Die Trefferzahl der Punkte deckt sich exakt mit der Zahl im Empty
State (1.1): „Ramen" zeichnet genau die 3 Punkte, die das Sheet zählt.

Bewusste Ausnahme: die Punkte bekommen **28px** Trefferfläche statt 44px. 194
überlappende 44px-Ziele würden den freien Pins die Taps klauen.

**PR #353** hat dann die Navigation korrigiert: ein Punkt öffnete
`/pack/all-berlin` direkt und warf dafür Kartenposition, Filter und Suche weg —
bei einem Tap, der meistens „was ist das?" heißt und bei 28px-Zielen oft
danebengeht. Jetzt öffnet er das Sheet (kein dritter Sheet-Typ, ein gesperrter
Spot benutzt `selectedRestaurant`) mit zwei Wegen: ganz Berlin holen, oder den
Spot frei lesen. Dabei fiel auf, dass die „Selektion außerhalb des sichtbaren
Sets"-Rückfalloption gesperrten Spots den gelben Pin gab — sie also als frei
auswies, während das Sheet das Gegenteil sagte.

Offen bleibt an diesem Punkt nichts; die Überlappung der Punkte untereinander
war ein eigener Fund und ist in 1.4 erledigt.

### 2.5 Küche-Filter greift kaum

Gemessene freie Treffer: Pizza 4, Kaffee 3, Burger 1, Sushi/Ramen/vegan 0.
Ein „Burgers"-Filter mit einem Ergebnis lässt das Produkt kleiner wirken als es
ist. Free-Tier auf ~5 Spots pro Küche anheben wäre die einfache Variante.

**Der Vorschlag oben war nicht ausführbar — halb erledigt in PR #365.**

Das Free-Tier war keine Auswahl, sondern der komplette Vorrat. Gemessen gegen
Produktion: **23 Must-Eat-Dokumente auf 20 Restaurants**, bei 339 im Katalog
(`isOpen != false`). `composeAnonRestaurants` ließ nur Spots mit mindestens
einem Must Eat zu, also war das Anon-Tier **exakt diese 20**.
`TIER_TARGETS.ANON = 20` deckelte damit nichts — es gab keinen 21. Kandidaten,
und **den Wert hochzudrehen hätte null geändert**. „~5 Spots pro Küche" hätte
Must Eats auf rund 130 Restaurants gebraucht, die keins haben.

Der Code-Fund lag daneben: 19 Spots sind in Sanity `tierAnon`-geflaggt, **7
erreichten die Map nie**, weil ihnen ein Must Eat fehlte — und es waren genau
die, die die Küchen-Lücke schließen (NOVEMBER Brasserie war der einzige freie
Japaner, Tacos el Rey der einzige Mexikaner, AVIV 030 der einzige Israeli). Die
redaktionelle Absicht stand schon im Datensatz und wurde vom Code weggeworfen.

**Die Begründung der Constraint trug schon vorher nicht mehr.** Der Kommentar
sagte, jeder freie Spot müsse ein Must Eat tragen, damit er eine Karte zeigen
kann. Gemessen: **alle 8 free-surface-Spots auf der anonymen Map haben null Must
Eats** — Curry Baude, Bari, La Miche, Hokey Pokey Mitte, der Weinlobbyist und
drei weitere. Kolo Coffee ist sogar geflaggt, flog vorne raus und kam hinten
über free-surface wieder rein. `composeSignedRestaurants` hatte die Regel nie.

Jetzt sticht die Kuratierung, und `TIER_TARGETS.ANON` behält seine Bedeutung als
Budget für Spots, die eine Karte zeigen **können**: der Fill füllt die
kuratierten Kartenträger auf, statt mit der Kuratierung um dieselben Slots zu
konkurrieren. Sonst hätte das Ehren eines Flags die Map ein Must Eat gekostet.
Vorher → nachher: Anon-Tier 20 → 27 bei **unveränderten 20 Kartenträgern**, frei
gesamt 28 → 34, Küchen mit mindestens einem freien Spot 15 → 18 von 33,
geflaggt-aber-nicht-frei 7 → 0.

Offen bleibt die lange Fahne, und die ist **redaktionell, nicht technisch**: 15
Küchen haben weiterhin null freie Spots, weil in ihnen kein einziges Restaurant
ein Must Eat trägt. Für das Anon-Tier strukturell unerreichbar sind damit
23 der 33 Küchen — darunter German (21 Spots im Katalog), Japanese (20), Vegan
(5), Korean, Thai, Indian, Greek, Middle Eastern. Solange 23 Must Eats auf 339
Restaurants kommen, ist jede Tier-Zahl die falsche Schraube.

Die Küchen-Auswahl selbst ist übrigens nie leer: `cuisineNames` in
`useMapFilters` wird aus dem **sichtbaren** Set gebaut, jeder Eintrag im Picker
hat also mindestens einen Treffer. „Sushi/Ramen/vegan 0" aus der Messung oben
waren Sucheingaben, keine Filter-Einträge — und Sushi und Ramen sind gar keine
`cuisineType`-Werte, sondern stecken unter Japanese.

---

## P3 — Sprache und Daten

Alles aus Sanity, nicht aus `lib/i18n/translations.ts` — braucht ein
Anzeige-Mapping plus Aufräumen im Datensatz.

### 3.1 Küche-Liste komplett englisch auf der DE-Seite

Bakery, Bar, Burgers, Café, Chinese, Coffee, European, Fine Dining, French,
German / Fast Food, Ice Cream, Italian, Turkish, Vietnamese, Wine Bar.
Ebenso die Tags auf Detailseiten: „JAPANESE", „BAKERY", „VIETNAMESE".

### 3.2 Taxonomie unsauber

- „Café" und „Coffee" nebeneinander
- „Lunch" ist eine Tageszeit, keine Küche
- „German / Fast Food" ist zwei Dinge in einem Label
- Es fehlen: Asiatisch, Sushi, Ramen, Thai, Indisch, Mexikanisch, Levantinisch
  und **vegan/vegetarisch** — für 20–40 in Berlin kein Nice-to-have

### 3.3 Öffnungszeiten in zwei Sprachen

Detailseite „Mon-Fri", Map-Sheet „MO–FR". Gleiche Daten, zwei Darstellungen.

### 3.4 Ein Produkt, zwei Namen

`/packs` zeigt „BREAKFAST", `/pack/breakfast` zeigt „Frühstück Pack".

### 3.5 Tippfehler im Hero-Asset

Die Must-Eat-Karte sagt **„CROSSAINT"** statt Croissant. Das Motiv steht auf der
Startseite, auf `/must-eats` und im Onboarding-Modal.

### 3.6 Must-Eat-Kartentexte englisch

„A classic, buttery croissant crafted by hand with premium ingredients",
„Juicy meat, fresh salad, and toasted pita" — in die Grafik eingebrannt, d. h.
Asset-Neubau, nicht nur Textänderung.

---

## P4 — Navigation und Liste

### 4.1 Filter stehen nicht in der URL

Filter „Burgers" gesetzt → URL bleibt `/map`. Nicht teilbar, nicht bookmarkbar,
Zurück macht den Filter nicht rückgängig. (Die Detail-URL `?r=` ist seit
PR #337 sauber — die Filter fehlen noch.)

### 4.2 Liste hat nichts mit dem Kartenausschnitt zu tun

Karte zeigt Mitte, erster Listeneintrag ist Hafenküche in **Lichtenberg**.
Keine Distanzsortierung, keine Entfernung auf den Karten, kein „In diesem
Ausschnitt suchen", kein Trefferzähler.

### 4.3 Listenkarten zu groß und zu leer

252px hoch, also 2,5 pro Bildschirm. Zeigen Foto, Name, Bezirk, Kategorie.
Es fehlen: **Entfernung, Preisniveau, und das eine Gericht** — der Claim ist
„We tell you what to eat", genau das sagt die Karte nicht.

### 4.4 Kein Weg in eine Restaurantliste

Weder Startseite noch Burger-Menü haben eine Suche. Menü führt MAP, MUST EATS,
FRAG REMY, AUF DEM TELLER, BOOSTER PACKS, ÜBER UNS — kein Einstieg in die
`/bezirk/*`-Seiten, die frei sind.

### 4.5 Breadcrumb wird abgeschnitten

`/restaurant/buya-ramen-factory` → „BUYA RAMEN FACTOR'".

---

## P5 — Feinschliff

- **Zwei Overlays gestapelt**: `/must-eats` zeigt das Onboarding-Modal über dem
  Cookie-Banner. Zwei Dinge wegklicken vor dem ersten Inhalt.
- **„Verdeckte" Must-Eat-Karten sind komplett leer** — nicht mal Bezirk oder
  Kategorie. Das ist kein Teaser, das ist Tapete. „Neukölln · Pizza" auf der
  Rückseite würde Lust machen.
- **„Deck sie auf der Map auf"** erklärt nicht wie. Dass man vor Ort sein muss,
  steht erst auf `/must-eats`.
- **„WORAUF HAST DU LUST?"** verspricht auf der Startseite einen
  Stimmungsfilter, liefert Produkt-Packs und ein E-Mail-Feld.
- **Remy-Placeholder abgeschnitten**: „…oder frag Remy direk" — der
  Senden-Button überlagert das Feld.
- **Remy-Illustration** nimmt fast eine volle Bildschirmhöhe und ist unten
  angeschnitten.
- **Startseite ist 9,7 Bildschirmhöhen lang** (7895px bei 812px Viewport).
- **„Schon dabei? Einloggen"** ist 20px hoch — der einzige Touch-Target unter
  44px auf der Map, und ausgerechnet der für zahlende Bestandskunden.
  (Sonst sind die Tap-Targets sauber: nur 3 unter 44px insgesamt, zwei davon
  sind Karten-Attribution.)

---

## Was gut war (nicht kaputtmachen)

Cookie-Banner (kurz, Ablehnen/Akzeptieren gleichgewichtig) · „JETZT GEÖFFNET ·
SCHLIESST 18:30" · Preisangabe „10–20 €" · die Redaktionstexte · Vor/Zurück
zwischen Spots im Sheet · Tap-Targets generell · kein horizontaler Overflow.

---

## Nicht verifiziert / Einschränkungen

- Getestet gegen den **lokalen Dev-Server**; die Produktions-URL war in der
  Session blockiert. Performance-Zahlen aus dem Dev-Build wurden bewusst
  weggelassen.
- `POST /api/stripe/checkout` gab lokal 500 (`stripe_error`) zurück —
  vermutlich Config. Die Fehlerbehandlung im UI funktioniert korrekt
  („Da ging was schief. Versuch es nochmal."), also **kein Produktdefekt**.
  Auf Staging/Prod nicht nachgeprüft.
- Der funktionale Smoke der drei gefixten Bugs auf der Staging-URL steht aus
  (Basic-Auth-Gate).
- **Im Browser-Pane scrollen `window.scrollTo` und `scrollIntoView` auf den
  Pack-Seiten nicht** — `window.scrollY` bleibt bei 4, und `computer scroll`
  lief in einen 30-Sekunden-Timeout. Zum Prüfen von Inhalten unterhalb der
  Falte das Viewport hochziehen (`resize_window` auf 375×2500) statt zu scrollen.
  Dieselbe Familie wie das pausierte `requestAnimationFrame`: eine
  Pane-Eigenheit, kein Produktdefekt.

## Repo-Hygiene am Rande

Fünf Dateien sind schon auf `HEAD` nicht prettier-konform:
`MapSection.tsx`, `map/RestaurantDetail.tsx`, `restaurant/[slug]/page.tsx`,
`RestaurantDetail.module.css`, `MapDetails.module.css`. Der PostToolUse-Hook
formatiert nur, was über Edit/Write läuft. Falls aufräumen: eigener Commit,
sonst begräbt das jeden inhaltlichen Diff.
