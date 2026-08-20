# Kategorie-Ranking — Analyse & Vorschlag

**Status:** Vorschlag, nicht gebaut. Entscheidung offen.
**Anlass:** `/kategorie/*` steht auf Pos. 8–13 für Bestenlisten-Queries und holt
keine Klicks. Die Liste ist alphabetisch (`order(name asc)` in
`restaurantsByCategoryQuery`) und beginnt mit „136 Berlin Restaurant", „1811",
„3 Minutes sur Mer".

---

## 1. Befund: Es gibt kein Qualitätssignal in den Daten

Vor dem Entwurf stand die Frage, welche Signale überhaupt tragen. Gemessen am
Live-Dataset (`ehwjnjr2/production`, 340 offene Restaurants, davon 205 in
`lunch`) am 20.08.2026:

| Signal | Abdeckung (alle) | Trennschärfe | Befund |
| --- | ---: | --- | --- |
| `tip` | 338/340 | **keine** | beim Import generiert |
| `shortDescription` | 340/340 | **keine** | beim Import generiert |
| `description` | 340/340 | **keine** | generiert, Länge 536–650 Zeichen |
| `photo` | 340/340 | **keine** | — |
| Herzen (Firestore) | 12 Herzen / 10 Spots / 46 User | **keine** | s. u. |
| `lastReviewed` | 0/340 | **keine** | Feld existiert, nie gepflegt |
| Google-Rating | — | — | **existiert nicht** im Schema |
| `gallery` | 215/340 | schwach | Bildverfügbarkeit ≠ Qualität |
| Must-Eats | 20 Spots | winzig, aber echt | handgemacht |
| `featured` | 14 Spots | winzig, aber echt | meint „Landingpage", nicht „bester" |
| `tierAnon` | 19 Spots | winzig | semantisch belegt (Paywall-Tiering) |
| `whatToOrder` | 16 Spots | winzig, aber echt | laut Schema „Redaktionell" |
| Artikel-Erwähnung | 29 Spots | klein, aber echt | echte redaktionelle Prüfung |

### 1.1 Der redaktionelle Content ist keiner

`tip`, `shortDescription` und `description` werden beim Import von einem
Generator geschrieben (`lib/admin/import-restaurant.server.ts` →
`scripts/generate-de-descriptions`). Deshalb haben sie 100 % Abdeckung und
deshalb sind die Beschreibungen alle ungefähr gleich lang — die Streuung ist ein
Artefakt des Generators, kein Maß für Pflege.

**Konsequenz für `pickShowcase()`:** Dessen Content-Stufe (`tip` +2,
`shortDescription` +2, `photo` +1) ist heute faktisch wirkungslos — **204 von
205 Lunch-Spots erreichen die volle Punktzahl.** Was die Funktion real tut, ist
ausschließlich die erste Stufe: fünf Ziffern-Namen nach hinten schieben. Als
Vorbild für ein Ranking taugt sie damit nicht; als Vorlage für den
Ziffern-Fix (§ 3.3) schon.

### 1.2 Herzen tragen nicht — und liegen am falschen Ort

Firestore (`restaurants/{sanityId}.heartCount`, via Admin SDK server-seitig
lesbar) enthält **12 Herzen auf 10 Restaurants bei 46 Usern.** Ein Ranking über
340 Spots an einem Signal, das 10 davon berührt, ist die alphabetische Liste mit
zehn zufälligen Spots obendrauf.

Dazu zwei strukturelle Gründe, das Signal auch später nicht als primäre
Sortierung zu nehmen:

- **Rückkopplung.** Was oben steht, wird geherzt; was geherzt wird, steht oben.
  Ohne Korrektiv zementiert das die erste zufällige Reihenfolge.
- **SSG-Bruch.** Die Seite ist statisch mit `revalidate=3600`. Ein
  Firestore-Read im Build koppelt neun Kategorie-Seiten an eine zweite
  Datenquelle mit eigener Latenz und lässt die Reihenfolge zwischen Builds
  driften — genau das, was hier nicht passieren darf.

### 1.3 Was tatsächlich von Hand angefasst wurde

Vereinigungsmenge aus `featured`, `tierAnon`, `whatToOrder`, Must-Eat,
Artikel-Erwähnung und `homeWeek`: **32 von 205 Lunch-Spots.** Das ist die
ehrliche Kuratierungsfläche — und ein brauchbarer Vorschlagskorb für die
Redaktion (§ 3.4), aber keine Rangfolge.

---

## 2. Die eigentliche Diagnose

**Die Seite verspricht Kuratierung und liefert einen Datenbank-Dump.** Unter der
H2 steht wörtlich „Kuratiert vom Eat-This-Team." — darunter kommen 205 Spots in
alphabetischer Reihenfolge, angeführt von einer Zahl. Für eine Query wie „best
restaurants for lunch" ist das der schwächere Treffer gegen jede Redaktions-
Liste mit einer sichtbaren Top 10 und einem Satz Begründung pro Eintrag.

Der Widerspruch ist im Code schon einmal aufgeschlagen: `buildCategoryDescription`
hat die Restaurant-Namen wieder aus dem Meta-Snippet entfernt, mit dem Kommentar,
`restaurants` komme „in Roh-Reihenfolge (nicht ‚die besten zuerst')". Es gibt
also bereits eine Stelle, die auf eine Rangfolge gewartet hätte.

Zur Einordnung der GSC-Zahlen: 0 Klicks auf 395 Impressionen bei Pos. 11 ist
kein auffälliges CTR-Problem — bei Pos. 11 wären ~4 Klicks erwartbar, der
Unterschied zu 0 ist auf dieser Menge Rauschen. **Das Problem ist Position 11,
nicht die CTR auf Position 11.** Der Hebel ist deshalb die Seitenqualität, nicht
der Titel.

---

## 3. Vorschlag: Kuratierte Top 10 + vollständige A–Z-Liste

### 3.1 Warum nicht rechnen

Jede Formel über die Felder aus § 1 erzeugt eine **Reihenfolge, die kuratiert
aussieht und keine ist.** Das ist schlechter als alphabetisch, nicht besser:
Alphabetisch ist ehrlich willkürlich und wird als Verzeichnis gelesen. Ein
Score behauptet „die besten zuerst" und liefert Zufall — der Besuch, der das
merkt, kommt nicht wieder, und es ist genau das Muster, das Googles
Helpful-Content-Systeme als generierte Listen abstrafen.

Es gibt in diesem Datensatz nichts zu rechnen. Also wird gepflegt.

### 3.2 Die Reihenfolge gehört an die Kategorie, nicht ans Restaurant

Ein neues `rank`-Feld am Restaurant löst das Problem nicht: Ein Restaurant hängt
im Schnitt an 2,3 Kategorien und ist Nr. 1 für Lunch und Nr. 7 für Dinner. Eine
Zahl am Restaurant kann das nicht abbilden, und Umsortieren hieße, N Dokumente
zu editieren.

Die Rangfolge ist eine Eigenschaft der **Liste**:

```js
// studio/schemaTypes/category.js
defineField({
  name: 'topSpots',
  title: 'Top-Spots (kuratierte Reihenfolge)',
  type: 'array',
  of: [{type: 'reference', to: [{type: 'restaurant'}]}],
  validation: (r) => r.max(10),
  description:
    'Die besten Spots dieser Kategorie, in Reihenfolge. Per Drag & Drop sortieren. ' +
    'Leer lassen = Seite bleibt rein alphabetisch.',
})
```

Das beantwortet die Stabilitätsfrage vollständig: Die Reihenfolge ist
**gespeichert, nicht berechnet** — sie kann zwischen Builds nicht springen. Kein
Firestore-Read, kein Score, keine Drift. Der Revalidate-Webhook trägt es bereits:
`case 'category'` feuert schon `revalidateTag('category:${slug}')` und
`revalidatePath('/kategorie/${slug}')`, also propagiert ein Umsortieren im Studio
ohne eine Zeile Webhook-Änderung.

**Keine Migration nötig.** Leeres Array → heutiges Verhalten. Der Rollout geht
Kategorie für Kategorie, und eine ungepflegte Kategorie sieht aus wie heute.

### 3.3 Was auf der Seite passiert

- **Oben:** „Die 10 besten Lunch-Spots" — nummeriert, in kuratierter Reihenfolge.
- **Darunter:** „Alle 205 Spots von A–Z" — als das ausgeschildert, was sie ist:
  ein Verzeichnis. Vollständig.

**Die Liste bleibt vollständig und wird nicht paginiert.** Drei Gründe: Die 205
internen Links sind der Weg, auf dem die Restaurant-Detailseiten überhaupt
gecrawlt werden; das `ItemList`-JSON-LD deckt heute alle 205 ab; und Pagination
erzeugt dünne `?page=2`-URLs, die neue Probleme schaffen statt welche zu lösen.
Die Trennung ist visuell, nicht datenseitig.

Das `ItemList`-JSON-LD wird in **exakt der angezeigten Reihenfolge** ausgegeben
(kuratierte 10 auf Position 1–10, danach alphabetisch) — `position` ist eine
Rangbehauptung, und Schema und Seite dürfen sich nicht widersprechen.

**Kleiner Fix ohne Redaktionsaufwand:** Im A–Z-Teil wandern Ziffern-Namen ans
Ende — dieselbe Regel, die `pickShowcase` für Fließtext schon anwendet. Betrifft
5 der 205 Lunch-Spots und sorgt dafür, dass die Liste auch ohne jede Kuratierung
nicht mit „136 Berlin Restaurant" aufmacht.

### 3.4 Redaktionsaufwand: ja, und zwar begrenzt

9 Kategorien × 10 Plätze = **90 Entscheidungen, einmalig.** Realistisch zwei bis
drei Stunden, danach nahe null Pflege (ein Drag & Drop, wenn sich etwas ändert).
Das ist die Antwort auf „braucht es Redaktionsaufwand": Der Weg ohne Aufwand
existiert, er heißt Formel, und er produziert keine Wahrheit.

Damit der erste Durchgang schnell geht, kann das Studio-Feld die 32 handberührten
Spots aus § 1.3 als Vorschlagskorb vorsortieren. Das ist der ehrliche Gebrauch
eines schwachen Signals: **als Vorschlag an einen Menschen, nicht als
öffentliche Reihenfolge.**

### 3.5 Stufe 2 (optional, später)

Ein Ein-Satz-Grund pro Top-Eintrag (`note` am Array-Eintrag). Das wäre der
einzige Text auf der Seite, der nicht generiert ist — inhaltlich der stärkste
Teil des Vorschlags, aber eigener Redaktionsaufwand. Bewusst als zweite Stufe,
damit Stufe 1 nicht daran hängt.

---

## 4. Verworfene Alternativen

| Option | Warum nicht |
| --- | --- |
| Score über `tip`/`shortDescription`/`photo` | Signale sind generiert, 204/205 erreichen Maximalpunktzahl (§ 1.1) |
| Sortierung nach Herzen | 12 Herzen; Rückkopplung; bricht SSG (§ 1.2) |
| `featured` als Rang wiederverwenden | 14 Spots, und es heißt „auf Landingpage zeigen" — zwei Bedeutungen in ein Feld zu legen macht beide unbrauchbar |
| Volle Sortierung aller 205 | Es gibt kein Signal für 205 Ränge; zerstört außerdem die einzige echte Stärke der alphabetischen Liste („ich kenne den Namen und suche ihn") |
| Pagination / Kürzung | Kostet 195 interne Links und erzeugt dünne Paginierungs-URLs (§ 3.3) |
| Mittlere Tier aus Must-Eat/Artikel-Signalen | Erzeugt genau das „sieht kuratiert aus, ist es nicht"-Problem in der Seitenmitte; die 30 Spots überschneiden sich ohnehin stark mit dem, was die Redaktion für die Top 10 zöge |

---

## 5. Timing — Konflikt mit der laufenden Messung

`docs/runbooks/2026-08-20-seo-baseline.md` hält den Zustand vor dem Deploy vom
20.08. fest und rechnet frühestens **ab ca. 10.09.2026** mit Messbarkeit. Das
Runbook beklagt selbst, dass in diesem Fenster schon eine zweite Änderung liegt.
Eine dritte Änderung an derselben Seitengruppe würde die Auswertung endgültig
unlesbar machen.

Der Konflikt löst sich, weil die teure Hälfte des Vorschlags unsichtbar ist:

1. **Jetzt:** Schema-Feld + Studio-UI + die redaktionelle Kuratierung. Passiert
   komplett im Studio, ändert kein Frontend-Byte, ist für Google unsichtbar.
   Das ist auch der Teil mit der längsten Vorlaufzeit, weil Menschen ihn machen.
2. **Nach dem Ablesen der 20.08.-Messung (~10.09.):** Frontend anschalten. Dann
   als saubere, einzelne Änderung mit eigener Baseline.

Die Bezirks-Seiten bleiben als Kontrollgruppe unangetastet — der Vorschlag fasst
`app/[locale]/bezirk/` nicht an. Die 20.08.-Änderungen (`categorySearchTerm`,
`buildCategorySectionHeading`) bleiben ebenfalls unberührt; die neue Sektion
kommt zusätzlich, sie ersetzt nichts.

---

## 6. Offene Entscheidungen für den Auftraggeber

1. **Top 10 oder Top 5?** 10 füllt bei 205 Spots die Seite besser, 5 ist
   schneller kuratiert und behauptet weniger.
2. **Stufe 2 (Begründungstext) gleich mitnehmen** oder erst nach der Messung?
3. **Reihenfolge der Kategorien:** alle neun auf einmal, oder erst `lunch` und
   `coffee` (die beiden mit realem Impressions-Volumen) als Test?

---

## 7. Entscheidung & Umsetzungsstand (20.08.2026)

**Entschieden:** Top 10 · erst `lunch` und `coffee` · Begründungstexte später.

Stufe 1 ist gebaut, **nicht deployt**:

| Datei | Änderung |
| --- | --- |
| `studio/schemaTypes/category.js` | Feld `topSpots` (max. 10, `unique()`) |
| `lib/queries.ts` | `categoryBySlugQuery` projiziert `topSpots` als Slugs, `defined()`-Guard gegen tote Refs |
| `lib/categories.ts` | `CategoryDef.topSpots?: string[]` |
| `lib/kategorie-ranking.ts` | `rankCategoryRestaurants()` — neu, 10 Tests |
| `lib/seo/categoryMeta.ts` | `buildCategoryDirectoryHeading()` — neuer Export, bestehende Funktionen unverändert |
| `app/[locale]/kategorie/[slug]/page.tsx` | zwei Sektionen, `RestaurantGrid` extrahiert, JSON-LD folgt der Anzeigereihenfolge |
| `app/[locale]/kategorie/Kategorie.module.css` | `.rankBadge`, `.rankInline` |

Verifiziert gegen das Live-Dataset (`/kategorie/lunch`, lokal):

- **Ohne Kuratierung** (Stand heute, alle neun Kategorien): eine Sektion, H2
  unverändert, alle 205 Karten. Einziger Unterschied zu vorher — die Liste
  beginnt mit „AVIV 030" statt „136 Berlin Restaurant", Ziffern-Namen stehen
  hinten.
- **Mit zehn testweise injizierten `topSpots`:** Sektion 1 = 10 Karten mit
  Badges 1–10 in kuratierter Reihenfolge, Sektion 2 = „Alle 205 Spots von A–Z"
  mit 195 Karten. Summe 205, kein Spot verloren. JSON-LD: 205 Items, Position
  1–10 = die kuratierten, letzte Position 205.
- `npx tsc --noEmit` sauber, `npm run lint` 0 Fehler, `npm test` 1016 grün.

**Offen, in dieser Reihenfolge:**

1. Redaktion pflegt `topSpots` für `lunch` und `coffee` im Studio (je 10).
   Vorschlagskorb: die 32 handberührten Lunch-Spots aus § 1.3.
2. Schema deployen, damit das Feld im Studio erscheint.
3. **Frühestens nach dem Ablesen der 20.08.-Messung (~10.09.):** Feature-Branch
   → PR nach `staging` → PR nach `main`. Staging ist `noindex` + Basic Auth und
   verfälscht die Messung nicht — dorthin darf jederzeit.

---

## 8. Kuratierung `lunch` + `coffee` (20.08.2026)

Auf Anweisung von mir (Claude) gesetzt, **nicht von der Redaktion**. Bitte
gegenlesen — das Feld ist Drag & Drop, Umsortieren kostet nichts.

### Regel

Kein Geschmacksurteil. Rang = **Summe der handgemachten Marker**, also eine
Ablesung, wo das Team bereits Arbeit investiert hat. Gewichte nach der
Verbindlichkeit des Signals (Quelle: Feldbeschreibungen im Schema):

| Marker | Gewicht | Warum |
| --- | ---: | --- |
| Must-Eat | 5 | das handgemachte Kernasset des Produkts |
| `featured` | 4 | explizite Landingpage-Entscheidung |
| `whatToOrder` | 3 (+1 je Gericht) | Schema: „Redaktionell" |
| Artikel-Erwähnung | 3 | echter redaktioneller Text |
| `tierAnon` | 2 | Auswahl, die das Produkt ohne Login repräsentiert |
| `homeWeek` | 2 | wöchentliche Hub-Kuration |

Tie-Break: Galerie-Umfang, dann Name — deterministisch, springt nicht.

### Ergebnis

**Lunch** — 9 Einträge (32 handberührt von 205): AVIV 030 · Tacos el Rey ·
Gorilla Bäckerei · Kitten Deli · Bursa Uludağ Kebapçısı · Barra · Hasir ·
Romeo's Sandwiches · Schüsseldienst

**Coffee** — 8 Einträge (11 handberührt von 50): Material · amatō · AERA ·
Jules Geisberg · Kuréme · AKKURAT Café · Kolo Coffee · JOHANN Bäckerei

Redaktionell nachgeschärft (20.08.2026): „963" aus Lunch entfernt (Ziffern-Name
als Bestenlisten-Eintrag), Coffee von 10 auf 8 gekürzt — die Plätze 9–10 hingen
an je einem einzelnen schwachen Marker. Beide Spots stehen weiterhin im
A–Z-Verzeichnis, es geht kein interner Link verloren.

### Was offen bleibt

Die Marker messen **redaktionelle Aufmerksamkeit, nicht Qualität**. Ein
großartiger Spot, den nie jemand angefasst hat, taucht nicht auf. Die Listen
sind ein Startpunkt zum Umsortieren, kein Ergebnis — `topSpots` ist Drag & Drop.

### Verifiziert (lokal, gegen Live-Daten)

- `/kategorie/lunch`: Sektion 1 = 9 Karten, Badges 1–9; Sektion 2 = „Alle 205
  Spots von A–Z", 196 Karten. Summe 205, JSON-LD 205 Items. „963" steht wieder
  im Verzeichnis, hinten bei den Ziffern-Namen.
- `/kategorie/coffee`: 8 + 42 = 50. Manzini und Five Elephant zurück im
  Verzeichnis.
- `/kategorie/pizza` (ungepflegt): unverändert eine Sektion, 20 Karten, keine
  Badges — der Fallback greift.

---

## 9. Redaktionelle Korrektur Kaffee + Banner (20.08.2026)

### Kaffee-Bestenliste: vom Auftraggeber gesetzt

Die signalbasierte Liste aus § 8 ist für `coffee` **ersetzt** worden — durch
echte Redaktionsauswahl, nicht durch eine Heuristik:

1. Jules Geisberg · 2. Kolo Coffee · 3. Bonanza Coffee Heroes ·
4. Father Carpenter · 5. Five Elephant Kreuzberg

Geklärt beim Diktat: „Kohlekoffie" = **Kolo Coffee**; bei Bonanza (4 Filialen)
und Five Elephant (5 Filialen) steht **je nur das Stammhaus** in der Liste, nicht
alle Läden — sonst bestünde die Top 5 überwiegend aus zwei Marken. Die übrigen
Filialen und die vorherigen Einträge (Material, amatō, AERA, Kuréme, AKKURAT,
JOHANN) stehen weiterhin im A–Z-Verzeichnis: 5 + 45 = 50, kein Link verloren.

**Damit ist `coffee` die erste Kategorie mit einer echten Kuratierung.** Die
Signal-Heuristik aus § 8 war nur das Gerüst, um der Redaktion das leere Blatt zu
ersparen — sie ist kein Bestandteil des Features.

### Kategorie-Banner entschlackt

- **„Spots ansehen" entfernt.** Der Sprung-Anker im Hero war redundant, die
  Spots stehen ohnehin direkt darunter. Es bleibt ein Button („… auf der Map").
  Nur auf der Kategorie-Seite — die Bezirks-Seite behält ihr „Restaurants
  ansehen" (Kontrollgruppe, § 5).
- **Preisspanne aus den Quick Facts entfernt**, samt `priceSpan()`-Helper. Eine
  Spanne über eine ganze Kategorie („1–100 €") mittelt sich zur Aussagelosigkeit.
  `priceRange` bleibt in den FAQ-Einträgen (Budget-/Fine-Dining-Fragen), wo eine
  Schwelle statt einer Spanne steht.
- Zwei Tests in `__tests__/lib/kategorie-prose.test.ts` prüften bisher genau
  diese Preis-Ausgabe und sind auf die neue Absicht umgestellt (`not.toContain`).

Verifiziert: `npm test` 1019 grün, `npx tsc --noEmit` sauber. Die Ranking-Funktion
gegen Live-Daten gefahren (`coffee` 5+45=50, `lunch` 9+196=205, keine Dubletten
zwischen den Sektionen).

---

## 10. Preis vollständig von der Kategorie-Seite entfernt (20.08.2026)

Nach dem Banner (§ 9) sind auch die beiden preisbasierten FAQ-Einträge raus:

- „Wo gibt es {term} in Berlin für kleines Geld?" (Filter `priceRange.max <= 20`)
- „Welche {subject} in Berlin sind gehoben?" (Filter `priceRange.min >= 40`)

Damit ist `priceRange` in `lib/kategorie-prose.ts` vollständig unbenutzt und der
Import-Pfad sauber. Übrig bleiben drei FAQ-Einträge: Anzahl, Bezirke, bekannte
Adressen. Ein Test (`carries no price statements at all`) hält den Zustand
für DE und EN fest; der obsolete `skips budget entry`-Test ist entfernt.

**Preis bleibt auf den Restaurant-Karten** (`formatPriceLabel`) — das war nicht
Teil der Anweisung und ist dort auch etwas anderes: ein konkreter Wert pro Spot
statt einer über die Kategorie gemittelten Spanne.

### Nebenwirkung, die noch offen ist

Die FAQ war laut Modul-Kommentar dazu da, „unique word count above Google's
thin-content bar" zu heben. Von fünf Einträgen sind drei übrig — der Effekt
schrumpft entsprechend. Falls das Volumen fehlt, wäre ein Ersatz-Eintrag ohne
Preisbezug sinnvoller als die Rückkehr der Preisfragen.

### Widerspruch, der jetzt sichtbar wird

FAQ-Eintrag 3 („Was sind bekannte Adressen …") speist sich weiterhin aus
`pickShowcase()` — und das ist laut § 1.1 faktisch alphabetisch. Seit `coffee`
und `lunch` eine echte `topSpots`-Kuratierung haben, **nennt die FAQ andere
Namen als die Bestenliste darüber**:

| | Bestenliste (kuratiert) | FAQ „bekannte Adressen" (alphabetisch) |
| --- | --- | --- |
| coffee | Jules Geisberg, Kolo Coffee, Bonanza … | AERA, AKKURAT Café, BEN RAHIM … |
| lunch | AVIV 030, Tacos el Rey, Gorilla Bäckerei … | AVIV 030, Agni, Aleppo Supper Club … |

Das ging als `FAQPage`-Schema an Google. **Behoben, siehe § 11.**

---

## 11. FAQ-Highlights folgen der Kuratierung (20.08.2026)

Der Widerspruch aus § 10 ist aufgelöst: FAQ-Eintrag 3 („Was sind bekannte
Adressen …") nennt jetzt die kuratierte Bestenliste statt der
`pickShowcase`-Heuristik.

**Entscheidend ist, *was* übergeben wird.** `buildKategorieFAQEntries` bekommt
nicht die `topSpots`-Slugs, sondern die **fertig aufgelöste Liste**
(`rankCategoryRestaurants().top`), die die Seite ohnehin schon gerendert hat:

```ts
const { top, rest } = rankCategoryRestaurants(restaurants, c.topSpots);
const faqEntries = buildKategorieFAQEntries({ …, curated: top });
```

Damit ist Auseinanderlaufen **strukturell ausgeschlossen** — es gibt nur eine
Liste, nicht zwei Ableitungen derselben Daten. Insbesondere erbt die FAQ
automatisch die `MIN_CURATED`-Schwelle: fällt die Bestenliste weg, fällt auch
die FAQ auf die Heuristik zurück.

- Antwort auf die ersten **5** Namen begrenzt (wie vorher), Reihenfolge = die
  redaktionelle.
- `pickShowcase()` bleibt als Fallback für die sieben ungepflegten Kategorien.
- `showcaseNames()` war danach ohne Aufrufer und ist entfernt.

Verifiziert gegen Live-Daten:

| Kategorie | Bestenliste 1–5 | FAQ | deckungsgleich |
| --- | --- | --- | :-: |
| coffee (5 kuratiert) | Jules Geisberg, Kolo Coffee, Bonanza … | identisch | ✅ |
| lunch (9 kuratiert) | AVIV 030, Tacos el Rey, Gorilla Bäckerei … | identisch | ✅ |
| pizza (0 kuratiert) | — | Capvin Rosenhöfe, Coccodrillo … | Heuristik-Fallback ✅ |

Drei neue Tests halten das fest (kuratierte Quelle, Kappung bei 5, Fallback bei
`undefined` **und** `[]`). `npm test` 1022 grün, `tsc` sauber.
