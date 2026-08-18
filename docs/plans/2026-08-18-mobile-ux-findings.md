# Mobile-UX-Fund 2026-08-18 — offene Punkte

Aus einem Nutzer-Walkthrough am 375×812-Viewport (lokaler Dev-Server, DE):
Startseite → Map → Filter → Suche → Restaurant-Detail → Must Eats → Packs.
Rolle: hungrig, 20–40, sucht abends in Berlin was zu essen.

**Erledigt** (PR #337 → staging, PR #338 → main): Order-Block-Overflow,
Drop-Cap-Balken, Zurück-Geste auf der Map. Nicht mehr anfassen.

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

### 1.2 Kein Weg zum Restaurant auf der Detailseite

`/restaurant/<slug>` hat exakt drei Links: 2× `/map?r=…` und Instagram. Kein
Route-/Maps-Link, keine Telefonnummer, keine Website, keine Reservierung, kein
Teilen. Adresse ist reiner Text, nicht antippbar.

Das Map-Sheet **hat** „Maps" und „Teilen" — die Vollseite, auf der Google-Besucher
landen, ist also die schlechtere Variante. Umgekehrt fehlt dem Sheet der
„Was bestellen?"-Block, den die Seite hat. Zwei Oberflächen, zwei Datensätze.

Vorschlag: Sticky Action-Bar unten `[Route] [Anrufen] [Teilen]`, und beide
Detailansichten auf eine gemeinsame Datenquelle ziehen.

### 1.3 „Um dich herum" ist nicht um dich herum

`app/components/HubNearby.tsx:15` — ohne Standortfreigabe fällt die Komponente
still auf `MITTE = { lat: 52.52, lng: 13.405 }` zurück, behält aber die
Überschrift „UM DICH HERUM" und zeigt „8 Min · Mitte". Wer in Neukölln sitzt,
liest eine falsche Gehzeit.

Fix: vor der Freigabe „Rund um Mitte" titeln und die Gehzeiten weglassen.

### 1.4 Pins überlappen, kein Clustering

Bei Default-Zoom gemessen: 15 sichtbare Marker, **8 Paare unter 40px Abstand** bei
44px Markergröße. Ein Teil der Pins ist nicht antippbar. Dazu sind alle Pins
identisch („EAT THIS"-Tütchen) — die Karte sagt nichts darüber, was wo ist.

Fix: Clustering ab Zoomstufe X, plus Differenzierung nach Kategorie
(Icon oder Farbe).

---

## P2 — Vertrauen und Konversion

### 2.1 Packs sagen nicht, wie viele Spots drin sind

`/pack/breakfast` listet 5 Einträge, davon 2 „Verdeckt", dann „+ Und mehr".
Für 2,99 € kauft man blind. Das ist der eine fehlende Satz zwischen Interesse
und Kauf: „**47 Spots + 12 Must Eats**" prominent auf jede Pack-Karte.

Nebenbei: Platz 01 und 02 sind beide „AERA" (Mitte + Charlottenburg), das lässt
den Pack dünner wirken als er ist.

### 2.2 Ersparnis des Bundles unsichtbar

9 × 2,99 € = 26,91 € gegen All Berlin 20 €. Rund 26 % Ersparnis, steht nirgends.

### 2.3 Free-Tier vs. Bezirk-Seiten widersprechen sich

Map frei: **29 Spots gesamt**. Startseite wirbt mit „MITTE 77 Spots",
„KREUZBERG 57 Spots" — und `/bezirk/kreuzberg` liefert tatsächlich 57 klickbare
Restaurants, gratis. `/restaurant/buya-ramen-factory` ist frei lesbar, während
die Map-Suche nach „Ramen" nichts findet.

Das Geschäftsmodell (Liste frei, Map kostet) ist in Ordnung — es wird nur
nirgends erklärt, und die Suche wirkt dadurch kaputt statt limitiert.

### 2.4 Gesperrte Spots verstecken statt zeigen

Ausgegraute Pins/Karten mit Schloss verkaufen; eine leere Karte frustriert nur.
Hängt eng an 1.1 und 2.3.

### 2.5 Küche-Filter greift kaum

Gemessene freie Treffer: Pizza 4, Kaffee 3, Burger 1, Sushi/Ramen/vegan 0.
Ein „Burgers"-Filter mit einem Ergebnis lässt das Produkt kleiner wirken als es
ist. Free-Tier auf ~5 Spots pro Küche anheben wäre die einfache Variante.

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

## Repo-Hygiene am Rande

Fünf Dateien sind schon auf `HEAD` nicht prettier-konform:
`MapSection.tsx`, `map/RestaurantDetail.tsx`, `restaurant/[slug]/page.tsx`,
`RestaurantDetail.module.css`, `MapDetails.module.css`. Der PostToolUse-Hook
formatiert nur, was über Edit/Write läuft. Falls aufräumen: eigener Commit,
sonst begräbt das jeden inhaltlichen Diff.
