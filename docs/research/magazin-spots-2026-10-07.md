# Magazin ↔ Spot-Bestand: redaktioneller Abgleich

Stand: 7. Oktober 2026. Rein lesend; keine CMS- oder App-Änderungen.

## Umfang und Grenzen

Primärquelle: Sanity `ehwjnjr2/production`, live über API ohne CDN gelesen. Vollständiger Snapshot: `/tmp/eat-this-spot-audit-data.json`. Authentifizierte `raw`-Abfrage für Drafts: `/tmp/eat-this-spot-audit-drafts.json`. Alle 252 veröffentlichten Restaurant-Dokumente inklusive DE/EN-Beschreibungen, Kategorien, Status, 32 Must-Eat-Zuordnungen und 27 veröffentlichte Artikel mit DE/EN-Kartenreferenzen wurden in den strukturellen Abgleich einbezogen. Das ist ein vollständiger Bestandsabgleich, **keine aktuelle Vor-Ort-Verifikation sämtlicher 252 Betriebe**. Ausgewählte starke Empfehlungen wurden gegen offizielle Websites geprüft.

- 252 veröffentlichte Spots; 249 nach CMS geöffnet, 3 vorübergehend geschlossen (Kuma Ramen Mitte, SORI Ramen, The Barn Nordbahnhof). Kein Bestandseintrag dauerhaft geschlossen markiert.
- 27 veröffentlichte Artikel; 3 weitere ausschließlich als Draft: chinesische Nudeln, griechisch, Knödel. 7 Restaurant-Drafts, alle mit veröffentlichtem Gegenstück; keine zusätzlichen draft-only Restaurants.
- 121 verschiedene Spots mit Artikelkarte; 131 ohne Artikelkarte. DE/EN-Referenzmengen stimmen bei allen 27 Artikeln überein. Keine gebrochenen Restaurant-/Must-Eat-Zuordnungen gefunden.
- 32 Must-Eats bei 28 Restaurants. 6 Must-Eat-Restaurants ohne Artikelkarte: BUBAR, EIVGI’S, Romeo’s Sandwiches, SWORD MASTER NOODLE, Zur Bratpfanne, Saveur de Bánh Mì Schöneberg. Letzteres ist als Filiale textlich bereits mitgemeint.
- Filialen sind eigene Dokumente. Nicht abgedeckte Dokumente bedeuten weder vergessene Marken noch die Notwendigkeit, Artikel auf 252 Adressen aufzublähen. Persönliche Texte und Porträts sollen selektiv bleiben.

## Wichtigste sachliche Korrektur

**Klinke ist kein rein veganes Restaurant.** Die offizielle Abendkarte August 2026 enthält Fleisch- und Fischgerichte. Im CMS lautet die Küchenart „Vegan“, der Vegan-Artikel spricht pauschal von vier veganen Adressen. Klinke entweder als Restaurant mit veganen Optionen kennzeichnen oder durch GEMELLO/Bonvivant/VEG’D ersetzen; die deutsche Küche ist die deutlich passendere thematische Einordnung. [Offizielle Karte](https://klinkeberlin.com/karte/), [Menübild](https://klinkeberlin.com/wp-content/uploads/2026/08/Klinke_Abendkarte_08-26_deutsch-back-265x375.png).

## Bewertung aller veröffentlichten Artikel

A = wichtige passende Ergänzung mit überprüfter offizieller Begründung. B = redaktionell sinnvoller Bestandskandidat, konkretes Angebot/Standort noch primär zu verifizieren. C = externe Verifikation derzeit fehlgeschlagen. Empfehlungen sind redaktionelle Urteile, keine objektive Rangliste.

| Artikel | Kandidaten / Entscheidung | Begründung |
|---|---|---|
| [Französisch essen in Berlin: 5 Adressen](https://www.eatthisdot.com/news/franzoesische-restaurants-berlin) | BUBAR (A), Jolie Bistrot (B) | BUBAR ergänzt bretonische Galettes und Markt-Handwerk statt eines sechsten ähnlichen Abend-Bistros; eigener Must-Eat fehlt bisher überall. Jolie ist bereits im Prenzlauer-Berg-Artikel, passt als Sharing-Bistrot. Bei unverändertem Abend-Fokus BUBAR als Tages-Abstecher kennzeichnen. |
| [Deutsche Küche in Berlin: 6 Adressen](https://www.eatthisdot.com/news/deutsche-restaurants-berlin) | Klinke (A), Engelbecken (B) | Klinke passt mit deutscher Sharing-Küche und aktueller Karte hierher, nicht als rein veganes Restaurant. Engelbecken ist bereits im Charlottenburg-Guide und ergänzt die alpine Linie; Österreich-Bezug ehrlich benennen. Curry Baude/Zur Bratpfanne wären eigene Imbiss-Rubrik, nicht Pflicht-Ergänzungen in einem Wirtshaus-Guide. |
| [Die besten Bäckereien in Berlin – und was du dort bestellst](https://www.eatthisdot.com/news/beste-baeckereien-berlin) | Crapulix (B), KEIT (A), FREA Bakery (A für Bäckerei) | Crapulix hat einen eigenen Artikel und Must-Eat, fehlt aber in der breiten Bäckerei-Auswahl. KEIT ergänzt Friedrichshain und lokalen Sauerteig; FREA eine weitere eigenständige Backstube. Nicht alle Filialen von AERA/Gorilla/Sironi aufnehmen. FREA vegan erst mit aktueller Karte bestätigen. |
| [Döner in Berlin: Wo ich hingehe](https://www.eatthisdot.com/news/drei-doener-berlin) | Keine zwingende Ergänzung | Persönlicher Text mit bewusst drei eigenen Adressen. Hasir Kreuzberg/Imren Neukölln sind weitere Filialen, keine redaktionell nötigen zusätzlichen Tipps. Doppelreferenzen Hasir und Uludağ durch Must-Eat plus Spotkarte sind kein vierter/fünfter Betrieb. |
| [Burger in Berlin: 6 Buden für verschiedene Lebenslagen](https://www.eatthisdot.com/news/beste-burger-berlin) | The Bun Society (C), Smash’d Eatery (B) | Eigenständige Burger-Kandidaten im Bestand; kein Muss für bereits ausgewogene Sechser-Auswahl. The Bun Society offizielle Seite beim Abruf 502, daher keine aktuelle Verifikation. otto nicht automatisch ergänzen, weil ein Burger-Tag eine ständig verfügbare Burger-Karte nicht belegt. |
| [Kaffee in Berlin: 15 Cafés und Röstereien](https://www.eatthisdot.com/news/beste-cafes-berlin) | Warawul (B), Isla (B) | Warawul ergänzt eine andere Rösterei, statt weitere Five-Elephant-/Bonanza-/Barn-Filialen. Rösterei offiziell bestätigt; konkreten Café-Betrieb am Sanity-Standort vor Einbau abgleichen. Isla als eigenständiges Neuköllner Konzept aus Bestand. Aktueller Artikel nennt bereits 15 Adressen, daher eher tauschen/Untergruppe schaffen. |
| [Cocktails in Berlin: 6 Bars für den Abend](https://www.eatthisdot.com/news/beste-cocktailbars-berlin) | Wax On (B), TiER (B), Stagger Lee (B) | Drei echte Bar-Lücken im Inventar, nicht automatisch alle aufnehmen. Wax On als stärkster Recherchenkandidat; keine externe Bestenlisten-Platzierung behaupten, da hier nicht verifiziert. Stagger Lee ergänzt klassisches Cocktail-Profil. |
| [Eis in Berlin: 8 Adressen von Waffel bis Softeis](https://www.eatthisdot.com/news/beste-eisdielen-berlin) | Duo (B), Early Bird Gelato (B) | Beide eigenständige Eisdielen-Marken fehlen; wichtiger als sämtliche Hokey-Pokey-/Jones-Filialen. Nicht blind vergrößern: der Artikel hat bereits acht unterschiedliche Formate inkl. Restaurant-Softeis. |
| [Italienisch essen in Berlin: 6 Adressen jenseits der Pizza](https://www.eatthisdot.com/news/beste-italiener-berlin) | Der Goldene Hahn (B), Ponte 2.0 (B) | Goldener Hahn ist im CMS nur Bar, kann aber Restaurant-Thema verfehlen; Konzept/Karte prüfen. Ponte ergänzt Schöneberg. Pizzerien sind bewusst ausgeschlossen und deshalb keine Pflicht-Lücken. |
| [Japanisch essen in Berlin: 5 Adressen](https://www.eatthisdot.com/news/beste-japanische-restaurants-berlin) | Heno Heno (A), NOVEMBER (B) | Heno Heno bietet offiziell Udon, Soba, Reisgerichte und erweitert die eher abendliche Auswahl um Alltagsküche. NOVEMBER bereits Brunch/Fine-Dining/Prenzlauer Berg; passt nach Konzeptabgleich. Kuma und SORI sind im CMS vorübergehend geschlossen: nicht ergänzen. |
| [Die 5 besten Pizzerien in Berlin – von Sauerteig bis NY-Slice](https://www.eatthisdot.com/news/beste-pizzerien-berlin) | Standard Serious Pizza (A), Malafemmena / Stranero (B) | Standard ist sogar schon im Mitte-Guide, fehlt aber im Pizza-Guide. Eine Filiale repräsentiert die Marke; vier Filialen sind kein vierfacher redaktioneller Gewinn. Malafemmena erschließt Friedenau, Stranero Wedding. |
| [Weinbars in Berlin: 9 Adressen](https://www.eatthisdot.com/news/beste-weinbars-berlin) | SWAY (B), sabon (B), barlevain (B) | Alle sind eigenständige Bestandskandidaten. SWAY/sabon sind bisher gar nicht verknüpft; barlevain ergänzt Schöneberg. Keine zehnte Adresse nur wegen einer Zahl: Auswahl nach tatsächlichem Weinbar- statt Restaurantprofil. |
| [Brunch in Berlin: 8 Adressen für den Vormittag](https://www.eatthisdot.com/news/bester-brunch-berlin) | Bonvivant (A), Kitten Deli (B) | Bonvivant bestätigt aktuell veganen Brunch Freitag bis Sonntag und ist in anderen Artikeln bereits vertreten. Kitten Deli ergänzt levantinischen Ansatz. Jolie vorerst nicht: CMS nennt Wochenend-Frühstück, offizielle Seite aktuell nur Abendzeiten. |
| [Crapulix: Handgemachte Croissants und Canelés in Steglitz](https://www.eatthisdot.com/news/crapulix-croissant-steglitz) | Keine Ergänzung | Einzelporträt. Sinnvoll sind Querverweis und Aufnahme in Bäckerei-Guide, nicht fremde Lokale in das Porträt. |
| [Die besten Donuts in Berlin – und wo du sie findest](https://www.eatthisdot.com/news/donuts-berlin) | Keine neue Bestandsadresse nötig | Brammibal’s und Atelier Dough sind die einschlägigen Kandidaten. Atelier erscheint zweimal als Karte (Must-Eat und Spot). Zweite Karte ggf. UI-redaktionell prüfen; keine neue dritte Adresse erfinden. |
| [Essen und Trinken in Schöneberg – 9 Adressen von acht Uhr morgens bis vier Uhr nachts](https://www.eatthisdot.com/news/essen-trinken-schoeneberg) | EIVGI’S (B), Sardinen Bar (B), Bubar nicht hier | EIVGI’S hat Must-Eat und bisher keine Magazin-Verbindung; guter Mittagstisch statt weiterer Coffee-Shop. Sardinen Bar ergänzt Fisch und Wein. Saveur Schöneberg als praktischer Link möglich, Markenbeschreibung schon im Vietnam-Guide. BUBAR gehört nach Charlottenburg. |
| [Besondere Küche in Berlin: 7 Adressen](https://www.eatthisdot.com/news/fine-dining-berlin) | CODA (A), Nobelhart & Schmutzig (A), Rutz (A), Bonvivant (A) | Vier starke konzeptionelle Lücken: Dessert-Technik, radikale Regionalität, großes Natur-Menü, veganes Dinner. Nicht alles zwangsläufig anhängen; entweder Guide wirklich Fine Dining oder bewusst zugängliche besondere Abende benennen. Der aktuelle Titel „Besondere Küche“ kaschiert die Scope-Frage, während slug Fine Dining verspricht. |
| [Kolo Coffee: Wo ich jetzt meinen Kaffee trinke](https://www.eatthisdot.com/news/kolo-coffee-berlin) | Keine Ergänzung | Einzelporträt. Kaffee-Guide verlinken; keine fremden Cafés zum Auffüllen. |
| [Date in Berlin: Joseph-Roth-Diele und VOLK](https://www.eatthisdot.com/news/restaurant-date-berlin) | Keine zwingende Ergänzung | Bewusstes Doppelporträt Joseph-Roth-Diele/VOLK. Weitere date-spot-Tags rechtfertigen keine Erweiterung; besser Titel offenlegen, welche zwei unterschiedlichen Abende gemeint sind. |
| [Essen in Charlottenburg: 5 Adressen](https://www.eatthisdot.com/news/restaurants-charlottenburg) | BUBAR (A), Heno Heno (A), Bostich (B) | BUBAR ist eigener Must-Eat, fehlt im Magazin und erweitert Tageszeit/Budget. Heno Heno bringt Alltagsküche. Paris Bar und 893 bereits stark: nicht noch ausschließlich große Dinner-Adressen ergänzen. |
| [Essen in Kreuzberg: 7 Adressen](https://www.eatthisdot.com/news/restaurants-kreuzberg) | Romeo’s Sandwiches (B), Klinke (A), NaNum (B) | Romeo’s ist eigener Must-Eat ohne Magazin-Einbindung und liefert einen Tages-/Sandwich-Stopp. Klinke deckt neue deutsche Küche, NaNum koreanischen Schwerpunkt; beide sind bereits anderswo beschrieben. Nicht alle 56 Kreuzberg-Spots in den Guide schreiben. |
| [Essen gehen in Mitte – die 10 besten Adressen zwischen Torstraße und Weinbergspark](https://www.eatthisdot.com/news/restaurants-mitte) | Trio (B), Ça Va Sàigòn (A), FREA Bakery (A) | Trio ergänzt Wirtshaus zum stark Café-/Pizza-lastigen Guide. Ça Va ist Option für Sandwich-Kontrast, FREA Bäckerei; SOFI/Saveur bereits vertreten, daher auswählen. Das geografische Titelversprechen Torstraße/Weinbergspark passt nicht sauber zu Freundschaft an der Mittelstraße. |
| [Essen in Neukölln: 8 Adressen](https://www.eatthisdot.com/news/restaurants-neukoelln) | Caligari (B), jaja (B), Warawul (B) | Caligari als Pasta ergänzt die bestehende Auswahl; jaja als Weinabend optional. Der Teaser „Abend“ passt nicht zu Kitten Deli als Tages-Deli. Warawul nur bei Tages-Guide und Bestätigung konkreter Café-Adresse; keine reine Rösterei als Abendrestaurant verkaufen. |
| [Essen in Prenzlauer Berg: 8 Adressen](https://www.eatthisdot.com/news/restaurants-prenzlauer-berg) | SWORD MASTER NOODLE (B), Sasaya (B) | SWORD MASTER hat Must-Eat ohne Magazin-Anbindung und ergänzt koreanische messergeschnittene Nudeln. Sasaya eine Alternative zur bereits vertretenen japanischen NOVEMBER-Linie. Nicht zusätzlich sämtliche Pizzerien auffüllen. |
| [Türkisch essen in Berlin: 4 Adressen](https://www.eatthisdot.com/news/tuerkische-restaurants-berlin) | Keine zwingende neue Marke | Bestand bringt zusätzlich nur Hasir Kreuzberg und Imren Neukölln: Filialen der enthaltenen Marken. Lieber in den passenden Abschnitten als alternative Standorte erwähnen; Vielfalt der türkischen Küche benötigt gegebenenfalls Recherche außerhalb des derzeitigen Bestands. |
| [Vegan essen in Berlin: 4 Adressen](https://www.eatthisdot.com/news/vegane-restaurants-berlin) | GEMELLO (A), Bonvivant (A), VEG’D (A); Klinke ersetzen oder präzisieren | Diese drei sind primär als vegan bestätigt und bereits in anderen Guides. Klinke bietet explizit Fleisch/Fisch, ist also falsch als rein vegan etikettiert. FREA (B vegan / A Bäckerei) und Al Catzone (B) als weitere Kandidaten. Vegetarische Cookies Cream/Kitten Deli nicht pauschal vegan nennen. |
| [Vietnamesisch essen: Madame Ngo und Saveur de Bánh Mì](https://www.eatthisdot.com/news/vietnamesische-restaurants-berlin) | Ça Va Sàigòn (A) | Klarste echte zusätzliche Marke im Bestand. Offizielle Karte bestätigt zwei Bánh-Mì-Varianten (Rind/Betel sowie vegan/Seitan), Ackerstraße 144. Weitere Saveur-Filialen werden bereits textlich mit vier Kiezen genannt; fehlende Einzelkarten sind deshalb keine inhaltlich vergessenen Marken. |

## Draft-Artikel

- **Chinesische Nudeln: LIU und Wen Cheng**: Bestand referenziert LIU und Wen Cheng 1; weitere Wen-Cheng-Filialen sind keine zwingend neuen Empfehlungen. SWORD MASTER ist koreanisch und passt nicht ohne Erweiterung des Themas. FúFú als möglicher weiterer chinesischer Restaurant-Kandidat, aber Nudel-Angebot erst verifizieren.
- **Griechisch: 3 Adressen**: Philomeni’s, File Asto und File Asto Taverna; zwei Filialen derselben Marke. Im vorhandenen griechischen Bestand keine weitere eigenständige Marke gefunden. Titel sollte die Auswahl nicht größer erscheinen lassen, als sie ist.
- **Knödel: Österelli und Knödelwirtschaft**: zwei explizite Spezialisten. Ottenthal/Engelbecken als optionale Ergänzungen nur nach aktuellem Knödel-Kartenbeleg, kein Automatismus wegen Austrian-Tag.

## Offiziell geprüfte Quellen und Befunde

| Betrieb | Primärquelle | Belastbarer Befund / Grenze |
|---|---|---|
| GEMELLO | [Website](https://www.gemello.berlin/) | Pflanzliche hausgemachte Fleisch-/Milchalternativen, Lettestraße 6A, laufende Öffnungszeiten. Vegan-Guide-Lücke. |
| Bonvivant | [Website](https://bonvivant.berlin/en/welcome.htm) | Explizit veganer Brunch und veganes Dinner. Geeignet für vegan, Brunch, besondere Küche. |
| VEG’D | [Website](https://www.vegd.eu/) | Explizit vegane Burger, vier Berliner Standorte. Bestehenden Friedrichshain-Datensatz nutzen. |
| BUBAR | [Website](https://bubar.eu/) | Bretonische Crêpes/Galettes, Markt Karl-August-Platz Mittwoch/Samstag. Keine Abend-Restaurant-Erwartung erzeugen. |
| Ça Va Sàigòn | [Website und Menü](https://www.cavasaigon.de/) | Bánh Mì Rind/Betel und vegan/Seitan, Ackerstraße 144. Sanity-Einordnung Café verdeckt Vietnam-Relevanz. |
| Heno Heno | [Menü](https://www.henoheno.de/speisen.html) | Udon, Soba, Don-Gerichte. Gute Alltags-Ergänzung im Japan-/Charlottenburg-Guide. |
| Standard | [Standorte](https://www.standard-berlin.de/) | Vier Standorte aktiv gelistet, Pizza-Konzept. Eine repräsentative Filiale genügt. |
| CODA | [Website](https://coda-berlin.com/) | Dessert-Technik als eigenständiges Fine-Dining-Konzept. Öffnungszeiten auf Website intern widersprüchlich (Mi–Sa und Di–Sa), daher nicht ungeprüft übernehmen. |
| Nobelhart & Schmutzig | [Website](https://nobelhartundschmutzig.com/en/) | Regionaler Produzenten-Fokus, großer gemeinsamer Tresen. Ebenfalls widersprüchliche Tage im Footer; keine fixen Tage übernehmen. |
| Rutz | [Website und Menü](https://rutz-restaurant.de/) | Aktuelles Inspirationsmenü Natur & Aromen, auch vegetarisch. Teures längeres Menü: redaktionellen Scope beachten. |
| KEIT | [Website](https://www.keit.berlin/) | Handwerkliche Sauerteigbrote mit Zutaten aus Berliner Umland. |
| FREA Bakery | [Website](https://www.freabakery.de/) | Gartenstraße 9, Croissants/Sauerteig, 8–17 Uhr. CMS nennt bis 15 Uhr; aktuell falsch. Vegan im CMS beschrieben, Homepage aktuell ohne diese Aussage: Menü noch prüfen. |
| Jolie | [Website](https://jolie-berlin.com/) | Wörther Straße 35, nur Abendzeiten gelistet; CMS behauptet Wochenend-Frühstück. Frühstück nicht ohne weitere Bestätigung empfehlen. Bistrot-Konzept aus Sanity. |
| Engelbecken | [Website](https://www.engelbecken.de/) | Aktiver Standort Charlottenburg, Karte mit Datum 06.10.26 verlinkt. Bildkarte hier nicht lesbar abgerufen, deshalb konkrete Speisen nur CMS-Stand. |
| Warawul | [Website](https://warawul.coffee/) | Berliner Specialty-Rösterei bestätigt. Nicht ausreichend als Beleg für Öffnungszeiten des konkreten Neuköllner Cafés. |
| Klinke | [Abendkarte](https://klinkeberlin.com/karte/) | Fleisch, Fisch und Gemüse auf derselben Karte. Rein-Vegan-Etikett widerlegt. |
| The Bun Society / Wax On | offizielle Website aus Bestand bzw. Suchversuch | Abruf fehlgeschlagen; daraus folgt keine Schließung. Kandidaten erst extern verifizieren. |

## Datenqualität im vollständigen Bestand

Vorhandene read-only Skripte `lint:content -- --json` und `content:backlog -- --json --limit 252` ausgeführt, keine Places-/AI-Aufrufe. Ergebnisse `/tmp/eat-this-spot-content-lint.json` und `/tmp/eat-this-spot-content-backlog.json`.

- Content-Lint (249 im CMS offene Spots): 55 fehlende Tipps, 19 dünne Beschreibungen, 5 ohne Website/Instagram, 4 fehlende Küchenarten, 1 fehlende Galerie-Alt-Beschreibung, 1 ohne Kategorie. Keine gefundenen Öffnungszeiten-Parserfehler. Keine zusätzlichen Link-HEAD-Checks durchgeführt.
- Vollständiger Bestand: DE/EN-Beschreibungen und DE/EN-Kurzbeschreibungen bei allen 252 vorhanden. Vorhandensein ist kein Beleg fehlerfreier Übersetzung. 108 ohne Tags, 47 ohne Website, 252 ohne `lastReviewed`. Dadurch lässt sich die redaktionelle Besuchs-/Verifikationsfrische nicht belegen.
- 132 offene Restaurants mit Galerie, 117 ohne Galerie; alle 117 haben Places-ID, aber kein kostenpflichtiger Abruf durchgeführt.
- Status-Schutz: die drei vorübergehend geschlossenen Spots sind in keinem veröffentlichten Artikel per Karte referenziert.
- Taxonomie ist stellenweise grob: Ça Va als Café trotz Bánh Mì, CODA/Berta als Bar trotz Dinner, Klinke als Vegan trotz gemischter Karte. Nicht nur Tags nutzen, sondern Beschreibung/Karte.

### Einzelne Lint-Fundstellen

- `al-catzone-pizzeria` — description-thin: description nur 254 Zeichen
- `al-catzone-pizzeria` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `arturo` — description-thin: description nur 175 Zeichen
- `arturo` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `barkinkitchen` — cuisine-type-missing: cuisineType fehlt → schwächt Suche und strukturierte Detailseiten-Fakten
- `barkinkitchen` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `burgermeister-schlesisches-tor` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `ca-va-saigon-banh-mi` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `cafe-frieda` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `cafe-schroeder` — no-external-presence: weder website noch instagramHandle gepflegt
- `der-goldene-hahn` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `duo-sicilian-ice-cream` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `early-bird-gelato` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `eivgi-s-orientalische-hausmannskost` — description-thin: description nur 220 Zeichen
- `eivgi-s-orientalische-hausmannskost` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `fufu-bistro` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `fukagawa-ramen-p-berg` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `fukagawa-ramen-p-berg` — gallery-alt-missing: 2 Galerie-Bilder ohne Alt-Text
- `fukagawa-ramen-xberg` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `garten-mitte` — description-thin: description nur 283 Zeichen
- `garten-mitte` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `goldies` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `green-door-bar` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `heno-heno` — description-thin: description nur 328 Zeichen
- `heno-heno` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `imren-grill` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `imren-grill` — no-external-presence: weder website noch instagramHandle gepflegt
- `isla` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `juicery-berlin` — description-thin: description nur 281 Zeichen
- `larb-koi` — description-thin: description nur 260 Zeichen
- `larb-koi` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `larb-koi` — no-external-presence: weder website noch instagramHandle gepflegt
- `lovebirds-contemporary-pizza` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `lucy-kantine` — description-thin: description nur 144 Zeichen
- `lucy-kantine` — cuisine-type-missing: cuisineType fehlt → schwächt Suche und strukturierte Detailseiten-Fakten
- `lucy-kantine` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `lucy-kantine` — categories-missing: keine Kategorie → fehlt auf allen Kategorie-Hubs und in Category-Entitlements
- `luzii-berlin` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `madame-ngo-une-brasserie-hanoi` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `magma` — description-thin: description nur 190 Zeichen
- `magma` — cuisine-type-missing: cuisineType fehlt → schwächt Suche und strukturierte Detailseiten-Fakten
- `magma` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `mater-pizzeria-verace-in-berlin` — description-thin: description nur 235 Zeichen
- `mater-pizzeria-verace-in-berlin` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `mikrokosmos-the-restaurant` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `mine` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `mogg` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `nathanja-heinrich-cafe-bar-neukoelln` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `oka-onigiri` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `ottenthal-restaurant-weinhandlung` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `pamela` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `polin` — description-thin: description nur 242 Zeichen
- `polin` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `ponte-2-0-ristorante-italiano` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `que-asian-latino-contemporary` — description-thin: description nur 297 Zeichen
- `que-asian-latino-contemporary` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `restaurant-horvath` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `rram` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `sabon` — description-thin: description nur 251 Zeichen
- `sabon` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `sabon` — no-external-presence: weder website noch instagramHandle gepflegt
- `saint-farah` — cuisine-type-missing: cuisineType fehlt → schwächt Suche und strukturierte Detailseiten-Fakten
- `saint-farah` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `sironi-il-pane-di-milano` — description-thin: description nur 238 Zeichen
- `sironi-il-pane-di-milano` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `spaccanapoli-nr-12` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `speiselokal-tulus-lotrek` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `stagger-lee` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `standard-serious-pizza-charlottenburg` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `stranero` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `sword-master-noodle` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `the-bun-society` — description-thin: description nur 233 Zeichen
- `the-bun-society` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `the-rad-natural-wine-bar-cafe` — description-thin: description nur 334 Zeichen
- `the-rad-natural-wine-bar-cafe` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `theke` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `tier` — description-thin: description nur 273 Zeichen
- `tier` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `velvet` — description-thin: description nur 289 Zeichen
- `velvet` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `warawul-coffee` — description-thin: description nur 315 Zeichen
- `warawul-coffee` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `wax-on-bar` — tip-missing: Insider-Tipp fehlt im Map-Popup
- `wax-on-bar` — no-external-presence: weder website noch instagramHandle gepflegt
- `zur-bratpfanne` — tip-missing: Insider-Tipp fehlt im Map-Popup

## Vollständiges Inventar und Abdeckung

Alle 252 veröffentlichten Restaurants. „Text“ bedeutet automatischer exakter Namensfund im DE-Text ohne Karte und ist nur Suchhilfe; Filial-/Kurzformen sind nicht vollständig erkennbar. Artikelspalte listet die Slugs. Nicht verknüpft = redaktionell prüfen, nicht automatisch hinzufügen.

| Spot | Kiez / Küche | Must-Eats | Artikelkarten | Status |
|---|---|---:|---|---|
| 893 Ryōtei | Charlottenburg / Japanese | 0 | beste-japanische-restaurants-berlin, fine-dining-berlin, restaurants-charlottenburg | offen laut CMS |
| AERA Charlottenburg | Charlottenburg / Bakery | 1 | beste-baeckereien-berlin | offen laut CMS |
| AERA Mitte | Mitte / Bakery | 0 | — | offen laut CMS |
| aerde restaurant | Kreuzberg / European | 0 | fine-dining-berlin | offen laut CMS |
| AKKURAT Café | Kreuzberg / Café | 0 | beste-cafes-berlin | offen laut CMS |
| Al Catzone - Pizzeria | Kreuzberg / Vegan | 0 | — | offen laut CMS |
| Albatross Bäckerei | Kreuzberg / Bakery | 0 | beste-baeckereien-berlin | offen laut CMS |
| ALL IN. | Prenzlauer Berg / Burgers | 1 | beste-burger-berlin | offen laut CMS |
| Almi Bistro | Prenzlauer Berg / European | 0 | — | offen laut CMS |
| Alt Berliner Wirtshaus Henne | Kreuzberg / German | 0 | deutsche-restaurants-berlin, restaurants-kreuzberg | offen laut CMS |
| amatō | Prenzlauer Berg / Café | 0 | beste-eisdielen-berlin | offen laut CMS |
| Anima | Friedrichshain / Bar | 0 | beste-cocktailbars-berlin | offen laut CMS |
| Ari's | Kreuzberg / Peruvian | 0 | beste-burger-berlin | offen laut CMS |
| Arturo | Neukölln / Bar | 0 | — | offen laut CMS |
| Atelier Dough | Kreuzberg / Bakery | 1 | beste-baeckereien-berlin, donuts-berlin | offen laut CMS |
| AVIV 030 | Neukölln / Israeli | 0 | restaurants-neukoelln | offen laut CMS |
| Bar Basta | Mitte / European | 2 | bester-brunch-berlin, restaurants-mitte | offen laut CMS |
| Bari | Neukölln / Bar | 0 | restaurants-neukoelln; Text: beste-cafes-berlin | offen laut CMS |
| Barkin'Kitchen | Kreuzberg / fehlt | 0 | — | offen laut CMS |
| barlevain | Schöneberg / Israeli | 0 | — | offen laut CMS |
| Barra | Neukölln / European | 0 | fine-dining-berlin, restaurants-neukoelln | offen laut CMS |
| BEN RAHIM Berlin | Mitte / Café | 0 | beste-cafes-berlin | offen laut CMS |
| Bergmanns | Kreuzberg / German | 0 | bester-brunch-berlin | offen laut CMS |
| Berta Restaurant | Kreuzberg / Bar | 0 | — | offen laut CMS |
| Bertie | Prenzlauer Berg / American | 0 | — | offen laut CMS |
| Beuster | Neukölln / Bar | 0 | bester-brunch-berlin | offen laut CMS |
| Bistro Gri Gri | Kreuzberg / French | 0 | franzoesische-restaurants-berlin, restaurants-kreuzberg | offen laut CMS |
| Boii Boii | Kreuzberg / Thai | 0 | restaurants-kreuzberg | offen laut CMS |
| Bonanza Coffee Heroes | Prenzlauer Berg / Café | 0 | beste-cafes-berlin | offen laut CMS |
| Bonanza Coffee Mitte | Mitte / Café | 0 | — | offen laut CMS |
| Bonanza Coffee Roasters | Kreuzberg / Café | 0 | — | offen laut CMS |
| Bonanza Coffee Roasters Gendarmenmarkt | Mitte / Café | 0 | — | offen laut CMS |
| Bonvivant Cocktail Bistro | Schöneberg / Vegan | 0 | beste-cocktailbars-berlin, essen-trinken-schoeneberg | offen laut CMS |
| Borchardt | Mitte / German | 0 | deutsche-restaurants-berlin | offen laut CMS |
| Bostich | Charlottenburg / French | 0 | franzoesische-restaurants-berlin | offen laut CMS |
| Bottega Seppel | Charlottenburg / Wine Bar | 0 | beste-weinbars-berlin | offen laut CMS |
| Boutique de LA MAISON | Kreuzberg / Bakery | 0 | — | offen laut CMS |
| Brammibal's Donuts | Neukölln / Vegan | 0 | donuts-berlin, vegane-restaurants-berlin | offen laut CMS |
| Brasserie Colette Tim Raue | Schöneberg / French | 0 | franzoesische-restaurants-berlin | offen laut CMS |
| BRLO Brwhouse | Kreuzberg / Bar | 0 | — | offen laut CMS |
| BRLO Charlottenburg | Charlottenburg / Bar | 0 | — | offen laut CMS |
| Bubar Crepes und Galettes | Charlottenburg / French | 1 | — | offen laut CMS |
| Burgermeister Schlesisches Tor | Kreuzberg / Burgers | 0 | beste-burger-berlin | offen laut CMS |
| Bursa Uludağ Kebapçısı | Schöneberg / Turkish | 1 | drei-doener-berlin, tuerkische-restaurants-berlin | offen laut CMS |
| Café Frieda | Prenzlauer Berg / Café | 0 | beste-burger-berlin | offen laut CMS |
| Café Komine | Schöneberg / Café | 0 | — | offen laut CMS |
| Café Schroeder | Mitte / Café | 0 | — | offen laut CMS |
| Caligari | Neukölln / Italian | 0 | beste-italiener-berlin | offen laut CMS |
| Capvin Rosenhöfe | Mitte / Italian | 0 | — | offen laut CMS |
| Chipperfield Kantine | Mitte / Café | 0 | — | offen laut CMS |
| Coccodrillo | Mitte / Italian | 0 | beste-italiener-berlin | offen laut CMS |
| Cocolo Ramen Mitte | Mitte / Japanese | 1 | beste-japanische-restaurants-berlin | offen laut CMS |
| CODA Dessert Dining | Neukölln / Bar | 0 | restaurants-neukoelln | offen laut CMS |
| Comedor | Charlottenburg / Mexican | 0 | restaurants-charlottenburg | offen laut CMS |
| Common | Neukölln / Café | 0 | beste-baeckereien-berlin | offen laut CMS |
| Companion Tea & Coffee | Neukölln / Café | 0 | beste-cafes-berlin | offen laut CMS |
| Concierge Coffee Schöneberg | Schöneberg / Café | 0 | beste-cafes-berlin | offen laut CMS |
| Cookies Cream | Mitte / Fine Dining | 0 | — | offen laut CMS |
| Crackers | Mitte / Fine Dining | 0 | — | offen laut CMS |
| Crapulix | Steglitz / Bakery | 1 | crapulix-croissant-steglitz | offen laut CMS |
| Curry Baude | Wedding / German / Fast Food | 0 | — | offen laut CMS |
| Der Fischladen | Prenzlauer Berg / Seafood | 0 | — | offen laut CMS |
| Der Goldene Hahn | Kreuzberg / Bar | 0 | — | offen laut CMS |
| Diener Tattersall | Charlottenburg / German | 0 | deutsche-restaurants-berlin | offen laut CMS |
| Distrikt | Mitte / Café | 0 | beste-cafes-berlin, bester-brunch-berlin, restaurants-mitte | offen laut CMS |
| DoubleEye | Schöneberg / Café | 0 | beste-cafes-berlin, essen-trinken-schoeneberg | offen laut CMS |
| Duo - Sicilian Ice Cream | Kreuzberg / Ice Cream | 0 | — | offen laut CMS |
| Early Bird Gelato | Prenzlauer Berg / Ice Cream | 0 | — | offen laut CMS |
| EIVGI'S | Schöneberg / Middle Eastern | 1 | — | offen laut CMS |
| Engelbecken | Charlottenburg / German | 0 | restaurants-charlottenburg | offen laut CMS |
| Estelle | Prenzlauer Berg / Wine Bar | 0 | beste-weinbars-berlin; Text: franzoesische-restaurants-berlin, deutsche-restaurants-berlin, drei-doener-berlin, beste-burger-berlin, beste-cafes-berlin, beste-cocktailbars-berlin, beste-italiener-berlin, beste-japanische-restaurants-berlin, bester-brunch-berlin, crapulix-croissant-steglitz, restaurants-kreuzberg, restaurants-neukoelln, tuerkische-restaurants-berlin, vegane-restaurants-berlin | offen laut CMS |
| FABELEI Cocktailbar | Schöneberg / Bar | 0 | beste-cocktailbars-berlin, essen-trinken-schoeneberg | offen laut CMS |
| Father Carpenter | Mitte / Café | 0 | bester-brunch-berlin | offen laut CMS |
| Feed the Pony | Neukölln / European | 0 | restaurants-neukoelln | offen laut CMS |
| File Asto | Prenzlauer Berg / Greek | 0 | — | offen laut CMS |
| File Asto Taverna | Kreuzberg / Greek | 0 | — | offen laut CMS |
| Five Elephant Kreuzberg | Kreuzberg / Café | 0 | beste-cafes-berlin | offen laut CMS |
| Five Elephant Mitte | Mitte / Café | 0 | — | offen laut CMS |
| Five Elephant Neue Nationalgalerie | Schöneberg / Café | 0 | beste-cafes-berlin | offen laut CMS |
| Five Elephant Prenzlauer Berg | Prenzlauer Berg / Café | 0 | — | offen laut CMS |
| Five Elephant Schwedter | Prenzlauer Berg / Café | 0 | — | offen laut CMS |
| FREA Bakery | Mitte / Bakery | 0 | — | offen laut CMS |
| Freundschaft | Mitte / Bar | 0 | beste-weinbars-berlin, restaurants-mitte | offen laut CMS |
| Frühstück 3000 | Schöneberg / Café | 0 | bester-brunch-berlin, essen-trinken-schoeneberg | offen laut CMS |
| Frühstück 3000 Kreuzberg | Kreuzberg / Café | 0 | — | offen laut CMS |
| Fukagawa Ramen P-Berg | Prenzlauer Berg / Japanese | 0 | — | offen laut CMS |
| Fukagawa Ramen XBerg | Kreuzberg / Japanese / Ramen | 0 | — | offen laut CMS |
| FunkyFisch | Charlottenburg / Seafood | 0 | — | offen laut CMS |
| FúFú Bistro 福·山里小馆 | Charlottenburg / Chinese | 0 | — | offen laut CMS |
| Garten Mitte | Mitte / Café | 0 | — | offen laut CMS |
| Gazzo | Neukölln / Italian | 1 | beste-eisdielen-berlin, beste-pizzerien-berlin, restaurants-neukoelln | offen laut CMS |
| GEMELLO | Prenzlauer Berg / Italian | 1 | beste-pizzerien-berlin, restaurants-prenzlauer-berg | offen laut CMS |
| goldies | Kreuzberg / Burgers | 0 | beste-burger-berlin | offen laut CMS |
| Gorilla Bäckerei Neukölln | Neukölln / Bakery | 0 | — | offen laut CMS |
| Gorilla Bäckerei Schöneberg | Schöneberg / Bakery | 0 | beste-baeckereien-berlin, essen-trinken-schoeneberg | offen laut CMS |
| Green Door Bar | Schöneberg / Bar | 0 | beste-cocktailbars-berlin | offen laut CMS |
| Grill Royal | Mitte / Steakhouse | 0 | — | offen laut CMS |
| Hasir | Schöneberg / Turkish | 1 | drei-doener-berlin, tuerkische-restaurants-berlin | offen laut CMS |
| Hasir Kreuzberg | Kreuzberg / Turkish | 0 | — | offen laut CMS |
| Heno Heno | Charlottenburg / Japanese | 0 | — | offen laut CMS |
| Hokey Pokey Mitte | Mitte / Ice Cream | 0 | — | offen laut CMS |
| Hokey Pokey Oderberger | Prenzlauer Berg / Ice Cream | 0 | — | offen laut CMS |
| Hokey Pokey Pankow | Pankow / Ice Cream | 0 | — | offen laut CMS |
| Hokey Pokey Stargarder | Prenzlauer Berg / Ice Cream | 1 | beste-eisdielen-berlin | offen laut CMS |
| IL CALICE | Charlottenburg / Italian | 0 | beste-italiener-berlin | offen laut CMS |
| Imren Grill | Neukölln / Turkish | 0 | — | offen laut CMS |
| Imren Grill & Restaurant | Schöneberg / Turkish | 0 | drei-doener-berlin, tuerkische-restaurants-berlin | offen laut CMS |
| Isla | Neukölln / Coffee | 0 | —; Text: restaurant-date-berlin | offen laut CMS |
| ITA Bistro | Prenzlauer Berg / Italian | 0 | restaurants-prenzlauer-berg | offen laut CMS |
| jaja | Neukölln / Wine Bar | 0 | beste-weinbars-berlin | offen laut CMS |
| JOHANN Bäckerei | Schöneberg / Bakery | 0 | beste-baeckereien-berlin | offen laut CMS |
| Jolie Bistrot | Prenzlauer Berg / French | 0 | restaurants-prenzlauer-berg | offen laut CMS |
| Jones Ice Cream | Schöneberg / Ice Cream | 2 | beste-eisdielen-berlin, essen-trinken-schoeneberg | offen laut CMS |
| Jones ice cream Eberswalder | Prenzlauer Berg / Ice Cream | 0 | — | offen laut CMS |
| Joseph-Roth-Diele Gaststätte | Schöneberg / German | 0 | deutsche-restaurants-berlin, restaurant-date-berlin | offen laut CMS |
| Juicery Berlin | Prenzlauer Berg / Café | 0 | — | offen laut CMS |
| Jules Geisberg | Schöneberg / Café | 1 | beste-cafes-berlin, essen-trinken-schoeneberg | offen laut CMS |
| Julius | Wedding / Wine Bar | 0 | — | offen laut CMS |
| Jungbluth | Steglitz / German | 0 | deutsche-restaurants-berlin | offen laut CMS |
| JÓMO Restaurant | Prenzlauer Berg / European | 0 | — | offen laut CMS |
| KaDeWe - Die Sechste | Schöneberg / Fine Dining | 0 | — | offen laut CMS |
| Kanal61 | Kreuzberg / European | 0 | restaurants-kreuzberg | offen laut CMS |
| KEIT Friedrichshain | Friedrichshain / Bakery | 0 | — | offen laut CMS |
| KINK Bar & Restaurant | Mitte / Bar | 0 | — | offen laut CMS |
| Kitten Deli | Neukölln / Bakery | 1 | restaurants-neukoelln | offen laut CMS |
| Klinke | Kreuzberg / Vegan | 0 | vegane-restaurants-berlin | offen laut CMS |
| Knödelwirtschaft SÜD | Neukölln / Austrian | 1 | restaurants-neukoelln | offen laut CMS |
| Kolo Coffee | Mitte / Coffee | 0 | beste-cafes-berlin, kolo-coffee-berlin, restaurants-mitte | offen laut CMS |
| Kuchi Kant | Charlottenburg / Japanese | 0 | restaurants-charlottenburg | offen laut CMS |
| Kuma Ramen Eatery | Mitte / Japanese / Ramen | 0 | — | vorübergehend geschlossen |
| Kuréme | Kreuzberg / Korean | 0 | beste-eisdielen-berlin | offen laut CMS |
| LA MAISON | Kreuzberg / Café | 0 | —; Text: beste-baeckereien-berlin | offen laut CMS |
| LA MAISON Neukölln | Neukölln / Bakery | 0 | beste-baeckereien-berlin | offen laut CMS |
| LA MAISON Pop-up Helmholtzplatz | Prenzlauer Berg / Bakery | 0 | — | offen laut CMS |
| La Miche | Schöneberg / Bakery | 0 | beste-baeckereien-berlin | offen laut CMS |
| Larb Koi | Friedrichshain / Thai | 0 | — | offen laut CMS |
| Le Balto | Neukölln / Wine Bar | 0 | beste-weinbars-berlin | offen laut CMS |
| Le Duc Salon | Charlottenburg / Japanese | 0 | — | offen laut CMS |
| LIU 成都味道 | Mitte / Chinese | 0 | — | offen laut CMS |
| LOTTA Tagesbar | Charlottenburg / Café | 0 | — | offen laut CMS |
| Lovebirds | Mitte / Italian / Pizza | 0 | — | offen laut CMS |
| LUCY Kantine | Neukölln / fehlt | 0 | — | offen laut CMS |
| Luzii Berlin | Mitte / German | 0 | — | offen laut CMS |
| Madame Ngo une Brasserie Hanoi | Charlottenburg / Vietnamese | 0 | vietnamesische-restaurants-berlin | offen laut CMS |
| Magma | Kreuzberg / fehlt | 0 | — | offen laut CMS |
| Malafemmena | Friedenau / Italian | 0 | — | offen laut CMS |
| Mamida | Prenzlauer Berg / Italian | 0 | — | offen laut CMS |
| Mater | Neukölln / Italian / Pizza | 0 | —; Text: beste-weinbars-berlin | offen laut CMS |
| Material | Prenzlauer Berg / Café | 0 | beste-weinbars-berlin | offen laut CMS |
| Mikrokosmos. The Restaurant | Kreuzberg / Peruvian | 0 | — | offen laut CMS |
| Mine | Charlottenburg / Italian | 0 | beste-italiener-berlin | offen laut CMS |
| Mogg | Neukölln / Burgers | 0 | — | offen laut CMS |
| NaNum | Kreuzberg / Korean | 0 | fine-dining-berlin | offen laut CMS |
| Nathanja & Heinrich | Neukölln / Bar | 0 | — | offen laut CMS |
| Nea Pizza 1889 | Kreuzberg / Italian | 0 | — | offen laut CMS |
| Nobelhart & Schmutzig | Kreuzberg / Fine Dining | 0 | restaurants-kreuzberg | offen laut CMS |
| NOVEMBER Brasserie | Prenzlauer Berg / Japanese | 0 | bester-brunch-berlin, fine-dining-berlin, restaurants-prenzlauer-berg | offen laut CMS |
| OKA Onigiri | Mitte / Japanese | 0 | — | offen laut CMS |
| onette | Schöneberg / Wine Bar | 0 | — | offen laut CMS |
| ORA Restaurant & Wine Bar | Kreuzberg / Wine Bar | 0 | beste-weinbars-berlin | offen laut CMS |
| Oslo Kaffebar | Mitte / Café | 0 | beste-cafes-berlin | offen laut CMS |
| Osmans Töchter | Prenzlauer Berg / Turkish | 0 | restaurants-prenzlauer-berg, tuerkische-restaurants-berlin | offen laut CMS |
| Ottenthal Restaurant & Weinhandlung | Charlottenburg / Austrian | 0 | — | offen laut CMS |
| otto | Prenzlauer Berg / European | 0 | restaurants-prenzlauer-berg | offen laut CMS |
| Oukan | Mitte / Vegan | 0 | fine-dining-berlin, restaurants-mitte, vegane-restaurants-berlin | offen laut CMS |
| Pamela | Mitte / Italian | 0 | — | offen laut CMS |
| Paris Bar | Charlottenburg / French | 0 | franzoesische-restaurants-berlin, restaurants-charlottenburg | offen laut CMS |
| Philomeni's Greek Delicious | Charlottenburg / Greek | 0 | — | offen laut CMS |
| Pinci | Mitte / Italian | 0 | beste-italiener-berlin | offen laut CMS |
| Pluto | Prenzlauer Berg / Wine Bar | 0 | beste-weinbars-berlin | offen laut CMS |
| POLIN | Steglitz / Italian / Pizza | 0 | — | offen laut CMS |
| Ponte 2.0 - Ristorante Italiano | Schöneberg / Italian | 0 | — | offen laut CMS |
| Que - asian latino contemporary | Prenzlauer Berg / Fusion | 0 | — | offen laut CMS |
| Restaurant Horváth | Kreuzberg / Fine Dining | 0 | — | offen laut CMS |
| Romeo's Sandwiches | Kreuzberg / Café | 1 | — | offen laut CMS |
| Rram | Mitte / Thai | 0 | — | offen laut CMS |
| Rutz | Mitte / Fine Dining | 0 | — | offen laut CMS |
| sabon | Prenzlauer Berg / Wine Bar | 0 | — | offen laut CMS |
| Saint Farah | Mitte / fehlt | 0 | — | offen laut CMS |
| SAN | Mitte / Japanese | 0 | beste-japanische-restaurants-berlin; Text: franzoesische-restaurants-berlin, beste-baeckereien-berlin, beste-cafes-berlin, beste-italiener-berlin, beste-pizzerien-berlin, bester-brunch-berlin, crapulix-croissant-steglitz, essen-trinken-schoeneberg, fine-dining-berlin, restaurants-mitte, vietnamesische-restaurants-berlin | offen laut CMS |
| Sardinen Bar | Schöneberg / Wine Bar | 1 | beste-weinbars-berlin | offen laut CMS |
| Sasaya | Prenzlauer Berg / Japanese | 0 | beste-japanische-restaurants-berlin | offen laut CMS |
| Saveur de Bánh Mì Charlottenburg | Charlottenburg / Vietnamese | 0 | — | offen laut CMS |
| Saveur de Bánh Mì Kreuzberg | Kreuzberg / Vietnamese | 0 | — | offen laut CMS |
| Saveur de Bánh Mì Mitte | Mitte / Vietnamese | 0 | restaurants-mitte, vietnamesische-restaurants-berlin | offen laut CMS |
| Saveur de Bánh Mì Schöneberg | Schöneberg / Vietnamese | 1 | — | offen laut CMS |
| Schmidt Z & KO | Friedenau / European | 0 | — | offen laut CMS |
| Schüsseldienst | Schöneberg / European | 1 | essen-trinken-schoeneberg | offen laut CMS |
| Sironi | Kreuzberg / Bakery | 0 | — | offen laut CMS |
| Sironi - Il pane di Milano | Prenzlauer Berg / Bakery | 0 | — | offen laut CMS |
| Sironi – La Pizza | Schöneberg / Italian | 0 | — | offen laut CMS |
| Slice Society | Mitte / Italian | 1 | beste-pizzerien-berlin, restaurants-mitte | offen laut CMS |
| Smash’d Eatery x Forn SimSim | Prenzlauer Berg / Middle Eastern | 0 | — | offen laut CMS |
| SOFI | Mitte / Bakery | 2 | beste-baeckereien-berlin, restaurants-mitte | offen laut CMS |
| Soi & Co. Plant-Based Cafe | Mitte / Café | 0 | vegane-restaurants-berlin | offen laut CMS |
| soopoollim | Mitte / Korean | 0 | — | offen laut CMS |
| SORI Ramen | Prenzlauer Berg / Japanese | 0 | — | vorübergehend geschlossen |
| Sotto | Wedding / Italian / Pizza | 0 | — | offen laut CMS |
| Spaccanapoli Nr. 12 | Friedrichshain / Italian | 0 | — | offen laut CMS |
| Speiselokal tulus lotrek | Kreuzberg / Fine Dining | 0 | — | offen laut CMS |
| Spumante | Kreuzberg / Bar | 0 | beste-eisdielen-berlin | offen laut CMS |
| St. Bart | Kreuzberg / Bar | 0 | restaurants-kreuzberg | offen laut CMS |
| Stagger Lee | Schöneberg / Bar | 0 | — | offen laut CMS |
| Standard Serious Pizza | Prenzlauer Berg / Italian | 0 | —; Text: restaurants-mitte | offen laut CMS |
| Standard Serious Pizza Charlottenburg | Charlottenburg / Italian | 0 | — | offen laut CMS |
| Standard Serious Pizza Kreuzberg | Kreuzberg / Italian | 0 | — | offen laut CMS |
| Standard Serious Pizza Mitte | Mitte / Italian | 0 | restaurants-mitte | offen laut CMS |
| Sticks'n'Sushi | Schöneberg / Japanese | 0 | — | offen laut CMS |
| stoke | Kreuzberg / Japanese | 0 | beste-japanische-restaurants-berlin, fine-dining-berlin | offen laut CMS |
| Stranero | Wedding / Italian / Pizza | 0 | — | offen laut CMS |
| SWAY | Neukölln / Wine Bar | 0 | — | offen laut CMS |
| SWORD MASTER NOODLE | Prenzlauer Berg / Korean | 1 | — | offen laut CMS |
| Tacos el Rey | Kreuzberg / Mexican | 1 | restaurants-kreuzberg | offen laut CMS |
| Taktil | Neukölln / Bakery | 0 | beste-baeckereien-berlin | offen laut CMS |
| The Barn Café Checkpoint Charlie | Kreuzberg / Café | 0 | — | offen laut CMS |
| The Barn Café Hackescher Markt | Mitte / Café | 0 | — | offen laut CMS |
| The Barn Café Ku'damm | Charlottenburg / Café | 0 | — | offen laut CMS |
| The Barn Café Mitte | Mitte / Café | 0 | beste-cafes-berlin | offen laut CMS |
| The Barn Café Neukölln | Neukölln / Café | 0 | — | offen laut CMS |
| The Barn Café Nordbahnhof | Mitte / Café | 0 | — | vorübergehend geschlossen |
| The Barn Café Potsdamer Platz | Schöneberg / Café | 0 | — | offen laut CMS |
| The Barn Café Rosenthaler Platz | Mitte / Café | 0 | — | offen laut CMS |
| The Barn Café Schönhauser Allee | Prenzlauer Berg / Café | 0 | — | offen laut CMS |
| The Barn Café Sony Center | Schöneberg / Café | 0 | — | offen laut CMS |
| The Bun Society | Kreuzberg / Burgers | 0 | — | offen laut CMS |
| The Grain | Prenzlauer Berg / Italian | 0 | beste-pizzerien-berlin, restaurants-prenzlauer-berg | offen laut CMS |
| The Rad - Natural Wine Bar & Cafe | Neukölln / Wine Bar | 0 | — | offen laut CMS |
| Theke | Wedding / European | 0 | —; Text: franzoesische-restaurants-berlin, deutsche-restaurants-berlin, beste-cafes-berlin, beste-eisdielen-berlin, beste-italiener-berlin, beste-japanische-restaurants-berlin, beste-pizzerien-berlin, beste-weinbars-berlin, essen-trinken-schoeneberg, fine-dining-berlin, restaurant-date-berlin, restaurants-charlottenburg, restaurants-mitte, restaurants-neukoelln | offen laut CMS |
| TiER | Neukölln / Bar | 0 | —; Text: beste-baeckereien-berlin, beste-burger-berlin, beste-cafes-berlin, beste-cocktailbars-berlin, beste-eisdielen-berlin, beste-italiener-berlin, beste-japanische-restaurants-berlin, beste-pizzerien-berlin, beste-weinbars-berlin, bester-brunch-berlin, crapulix-croissant-steglitz, essen-trinken-schoeneberg, fine-dining-berlin, kolo-coffee-berlin, restaurant-date-berlin, restaurants-charlottenburg, restaurants-kreuzberg, restaurants-mitte, restaurants-neukoelln, restaurants-prenzlauer-berg, tuerkische-restaurants-berlin, vegane-restaurants-berlin | offen laut CMS |
| Trattoria Breda | Kreuzberg / Italian | 0 | beste-italiener-berlin | offen laut CMS |
| Tribeca Ice Cream | Prenzlauer Berg / Ice Cream | 0 | beste-eisdielen-berlin | offen laut CMS |
| Tribeca Ice Cream Friedrichshain | Friedrichshain / Ice Cream | 0 | — | offen laut CMS |
| Trio | Mitte / German | 2 | deutsche-restaurants-berlin; Text: bester-brunch-berlin, essen-trinken-schoeneberg | offen laut CMS |
| Vanille & Marille Steglitz | Steglitz / Ice Cream | 0 | beste-eisdielen-berlin | offen laut CMS |
| VEG'D Friedrichshain | Friedrichshain / Vegan | 0 | beste-burger-berlin | offen laut CMS |
| Velvet | Neukölln / Bar | 0 | beste-cocktailbars-berlin | offen laut CMS |
| Venue Breakfast | Steglitz / Bakery | 0 | bester-brunch-berlin | offen laut CMS |
| Venue Breakfast Neukölln | Neukölln / Coffee | 0 | — | offen laut CMS |
| Victoria Bar | Schöneberg / Bar | 0 | beste-cocktailbars-berlin, essen-trinken-schoeneberg | offen laut CMS |
| VOLK | Mitte / French | 0 | franzoesische-restaurants-berlin, restaurant-date-berlin; Text: beste-japanische-restaurants-berlin | offen laut CMS |
| W Pizza Mitte | Mitte / Italian | 0 | beste-pizzerien-berlin, restaurants-mitte | offen laut CMS |
| Warawul Coffee | Neukölln / Café | 0 | — | offen laut CMS |
| Wax On Bar | Neukölln / Bar | 0 | — | offen laut CMS |
| Wen Cheng 1 | Prenzlauer Berg / Chinese | 1 | restaurants-prenzlauer-berg | offen laut CMS |
| Wen Cheng 2 | Prenzlauer Berg / Chinese | 0 | — | offen laut CMS |
| Wen Cheng Görlitzer | Kreuzberg / Chinese | 0 | — | offen laut CMS |
| westberlin | Kreuzberg / Café | 0 | beste-cafes-berlin | offen laut CMS |
| WIM Kaffee | Prenzlauer Berg / Café | 0 | beste-cafes-berlin | offen laut CMS |
| YAFO | Kreuzberg / Mediterranean | 0 | — | offen laut CMS |
| Zur Bratpfanne | Steglitz / German / Fast Food | 1 | — | offen laut CMS |
| Ça va Saigon Bánh Mì | Mitte / Café | 0 | — | offen laut CMS |
| Österelli | Charlottenburg / Austrian | 0 | — | offen laut CMS |

## Quellenzugriff

Sanity veröffentlichte Daten: [Content-Lake API](https://ehwjnjr2.api.sanity.io/v2026-01-01/data/query/production). GROQ: `*[_type in ["restaurant","mustEat","newsArticle","category"]]`. Drafts per authentifiziertem Sanity-Connector, Perspektive `raw`, Filter `_id in path("drafts.**")`. Quellen-Snapshot und Inventar-JSON liegen im /tmp-Verzeichnis. Keine Daten veröffentlicht, keine Bilder in das Produkt übernommen.
