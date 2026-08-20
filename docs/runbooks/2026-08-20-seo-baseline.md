# SEO baseline — 2026-08-20

Eingefrorener Zustand **vor** dem Deploy vom 20.08.2026 (`0474f6c6`, PR #381).
Ohne diese Zahlen ist der Effekt der Änderung in drei Wochen nicht nachweisbar,
weil die Search Console immer nur ein gleitendes Fenster zeigt.

Quelle: Search Console, Property `sc-domain:eatthisdot.com`, Zeitraum
**2026-07-23 bis 2026-08-20** (28 Tage), `searchType=WEB`, Daten inkl. der
letzten, noch nicht finalen Tage (`data_state=all`).

## Was deployt wurde und was es bewirken soll

Zwei Änderungen, beide gegen dieselbe Ursache — die Seite stand in den
Suchergebnissen gegen sich selbst:

1. **Deutsche Kategorie-Seiten sprechen deutsch** (`176d29ab`). H1/H2, Quick
   Facts und FAQ sagten „Lunch" statt „Mittagessen"; für Google war die DE-Seite
   ein zweites englisches Duplikat. Gilt für alle neun Kategorien.
2. **Bäckerei-Dublette aufgelöst** (`df775d0a`). `/guides/beste-baeckereien-berlin`
   und `/news/beste-baeckereien-berlin` waren zwei selbst-kanonische Seiten über
   dieselben sieben Bäckereien. Guide entfernt, URL 308 auf den Artikel.

**Hypothese:** Die deutschen Kategorie-Seiten steigen von Position 25-46 in den
Bereich ihrer englischen Zwillinge (10-18), und die Bäckerei-Impressionen des
Guides wandern auf den Artikel, statt gegen ihn zu laufen.

**Frühestens messbar ab ca. 2026-09-10** (Google muss neu crawlen). Vergleich
gegen exakt diesen Zeitraum ziehen, nicht gegen „die letzten 28 Tage".

## Gesamt

| | 28 d |
| --- | ---: |
| Impressionen | 33.392 |
| Klicks | 166 |
| CTR | 0,50 % |
| Ø-Position | 12,0 |

Trend im Fenster: Impressionen steigend (946/Tag Ende Juli → ~1.400/Tag Mitte
August), Klicks flach bei ~6/Tag.

## Kategorie-Seiten — die eigentliche Messgröße

| Seite | Klicks | Impr. | Position |
| --- | ---: | ---: | ---: |
| `/en/kategorie/lunch` | 16 | 1.660 | 10,0 |
| `/kategorie/lunch` | 5 | 1.009 | 17,8 |
| `/kategorie/coffee` | 1 | 640 | 45,7 |
| `/kategorie/fine-dining` | 0 | 392 | 39,4 |
| `/en/kategorie/coffee` | 0 | 250 | 15,4 |
| `/en/kategorie/fine-dining` | 1 | 193 | 14,6 |
| `/kategorie/breakfast` | 0 | 185 | 43,9 |
| `/en/kategorie/breakfast` | 0 | 146 | 13,3 |
| `/kategorie/dinner` | 0 | 139 | 14,4 |
| `/en/kategorie/dinner` | 0 | 94 | 10,2 |
| `/kategorie/pizza` | 0 | 81 | 25,7 |
| `/kategorie/sweets` | 0 | 81 | 36,8 |
| `/kategorie/fast-food` | 0 | 78 | 19,9 |
| `/en/kategorie/drinks` | 0 | 63 | 13,9 |
| `/en/kategorie/pizza` | 1 | 27 | 17,7 |
| `/en/kategorie/sweets` | 0 | 25 | 12,8 |
| `/en/kategorie/fast-food` | 0 | 13 | 15,8 |
| `/kategorie/drinks` | 0 | 1 | 12,0 |

Muster: **EN steht durchweg vor DE** — coffee 15,4 vs. 45,7, fine-dining 14,6
vs. 39,4, breakfast 13,3 vs. 43,9. Genau das soll die Änderung drehen.

Achtung bei der Auswertung: Ein Teil der DE/EN-Differenz ist ein
Mittelwert-Artefakt, kein Rankingnachteil. Die DE-Seiten sammeln einen tiefen
Longtail aus Café-Eigennamen auf Position 40-80 (`acid cafe berlin` 58,
`barachel café` 60,7, `betty n caty` 69), die EN-Seiten bekommen die
Kopfbegriffe. Beim Nachmessen deshalb **nicht nur die Ø-Position** vergleichen,
sondern die Position auf den deutschen Kopfbegriffen: „berlin mittagessen",
„business lunch berlin", „kaffee berlin", „bestes frühstück berlin".

## Bäckerei-Dublette — direkter Vorher-Zustand

| Seite | Klicks | Impr. | Position |
| --- | ---: | ---: | ---: |
| `/en/news/beste-baeckereien-berlin` | 5 | 988 | 10,2 |
| `/news/beste-baeckereien-berlin` | 1 | 201 | 23,7 |
| `/en/guides/beste-baeckereien-berlin` (entfernt) | 0 | 148 | 34,8 |
| `/guides/beste-baeckereien-berlin` (entfernt) | 0 | 1 | 11,0 |

**149 Impressionen** lagen auf den Guide-URLs, ohne einen einzigen Klick. Sie
sollten auf den Artikel übergehen. Direkter Vergleich derselben Queries:

| Query | Guide | Artikel |
| --- | ---: | ---: |
| best bakery berlin | 47,2 | 21,8 |
| best bakery in berlin | 50,0 | 18,4 |
| bakery berlin | 52,8 | 35,0 |
| bakeries berlin | 55,0 | 24,0 |
| beste bäckerei berlin | 69,0 | 13,5 |

## Bezirks-Seiten (unverändert, als Kontrollgruppe)

| Seite | Klicks | Impr. | Position |
| --- | ---: | ---: | ---: |
| `/bezirk/mitte` | 6 | 2.038 | 18,5 |
| `/en/bezirk/schoeneberg` | 4 | 429 | 10,7 |
| `/en/bezirk/charlottenburg` | 0 | 177 | 16,9 |
| `/en/bezirk/prenzlauer-berg` | 0 | 68 | 5,4 |
| `/en/bezirk/kreuzberg` | 0 | 22 | 7,5 |
| `/en/bezirk/moabit` | 0 | 20 | 22,4 |
| `/bezirk/friedrichshain` | 0 | 16 | 9,8 |
| `/en/bezirk/lichtenberg` | 0 | 15 | 10,2 |
| übrige 22 Bezirks-URLs | 0 | je ≤ 12 | — |

An diesen Seiten wurde nichts geändert. Bewegen sie sich im selben Zeitraum
mit, war der Effekt nicht die Kategorie-Änderung, sondern etwas Domainweites.

## Weitere Änderungen im selben Fenster

Sauber wäre eine Änderung pro Messfenster. Tatsächlich liegen zwei weitere
drin, beide am selben Tag:

**`17e63b65` — News-Sitemap entfernt.** `/news-sitemap.xml` war seit der
Einreichung in der Search Console als „Has errors" markiert: Eine
Google-News-Sitemap listet Artikel der letzten zwei Tage, die Seite hat sieben
Artikel und der neueste ist vom 17. Juni — der Feed war strukturell leer.
Route, `robots.ts`-Eintrag und Testerwartung sind weg, alle sieben Artikel
bleiben über `sitemap.xml` indexiert.

Erwarteter Einfluss auf dieses Experiment: **keiner.** Eine leere Sitemap trägt
keine Rankingsignale bei, und die betroffenen Artikel standen ohnehin schon in
`sitemap.xml`. Trotzdem hier notiert, damit in drei Wochen niemand rätselt,
warum sich der Sitemaps-Bericht geändert hat.

Vermeintlich offener Punkt, nachgeprüft am 20.08.: **In der Search Console ist
nichts zu löschen.** Die API listet für die Property genau eine eingereichte
Sitemap:

```
https://www.eatthisdot.com/sitemap.xml
Valid · 381 URLs · 0 Fehler · zuletzt geladen 2026-08-18 04:08
```

`/news-sitemap.xml` steht dort nicht. Die Commit-Beschreibung von `17e63b65`
kündigt eine manuelle Löschung an — die ist gegenstandslos.

Einschränkung: Die API liefert nur **eingereichte** Sitemaps. Falls Google
`/news-sitemap.xml` seinerzeit nur über `robots.txt` gefunden hat, kann sie im
Web-Interface unter *Indexierung → Sitemaps* trotzdem auftauchen. Solche
Einträge lassen sich ohnehin nicht manuell entfernen; sie verschwinden, sobald
Google die neue `robots.txt` liest — und die nennt seit dem 20.08. nur noch
`sitemap.xml`.

**`719ef943` — deutsche Öffnungszeiten-FAQ.** Die FAQ auf den
Restaurant-Detailseiten baute ihre Antwort aus den rohen Sanity-Strings, die
deutsche Seite sagte also „Geöffnet Mon-Tue closed, Wed-Fri 17:00-21:00". Das
ist nicht nur Fließtext, sondern der Antworttext eines `FAQPage`-Eintrags und
landet im JSON-LD — Google las die englische Fassung mit. `summarizeHours`
nimmt jetzt die Locale entgegen.

Betrifft **Restaurant-Detailseiten**, nicht die Kategorie-Seiten. Die primäre
Hypothese dieses Runbooks wird dadurch nicht verwässert — die Kontrollgruppe
(Bezirks-Seiten) bleibt ebenfalls unberührt. Beim Auswerten aber im Kopf
behalten: Bewegen sich im selben Zeitraum die Restaurant-Detailseiten, ist das
diese Änderung und nicht die der Kategorie-Seiten.

## Reproduzieren

Über den GenieSEO-MCP, Property `sc-domain:eatthisdot.com`:

```
get_performance_overview          days=28
get_advanced_search_analytics     dimensions=page   sort_by=impressions
                                  filter: page contains "/kategorie/"
get_advanced_search_analytics     dimensions=query  sort_by=impressions
get_search_by_page_query          page_url=<einzelne Seite>
```

Für den Vergleich `start_date=2026-07-23`, `end_date=2026-08-20` gegen den
gleich langen Zeitraum nach dem Crawl setzen.

## Was hier bewusst nicht drinsteht

Serverseitige Trafficzahlen aus Cloud Logging. Sie sind zu ~83 % Bot und für
diesen Vergleich unbrauchbar; die Referrer-Zählung überschätzt Suchklicks um
etwa Faktor 3. Für alles Suchbezogene ist die Search Console die Referenz.
