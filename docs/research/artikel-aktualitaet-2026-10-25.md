# Artikel: Aktualitätsprüfung vom 25. Oktober 2026

Sanity: `ehwjnjr2/production`, 35 veröffentlichte Artikel, beide Sprachfassungen. Arbeitsstand vor Änderungen lokal unter `/tmp/eat-this-freshness-2026-10-25/before.json` gesichert. CMS-Änderungsdaten sind kein externer Aktualitätsbeleg.

Die Prüfung unterscheidet bestätigte Angaben, Widersprüche zur aktuellen Betreiberquelle und offene oder undatierte Angaben. Die Aufnahme aller Artikel in diesen Bericht bedeutet keine vollständige Einzelverifikation aller Tatsachen. Persönliche Besuche bleiben historische Beobachtungen; fehlende Gerichte auf einer neuen Karte widerlegen keinen früheren Besuch.

## Gri Gri: konkrete Korrektur vorbereitet

Primärbeleg: vom Nutzer am 25.10.2026 übermittelte E-Mail von Ronja. Frithjof und Ronan arbeiten schon lange nicht mehr dort; seitdem Konzeptänderung; Betrieb und Gerichtsentwicklung gemeinsam im Team. Die Mail nennt keine aktuellen Gerichte.

Betroffen: Bistro-Guide `13769dff-a12d-45fd-a669-27e746104677`, Kreuzberg-Guide `news-restaurants-kreuzberg`, Spot `d1d3f41f-07fb-4681-96a5-5e7d6cafb61d`, jeweils DE/EN. Vollständige Suche in den exportierten 35 Artikeln plus Spot hat diese drei Dokumente mit den Namen gefunden.

Vorher: „Am Herd steht Frithjof Gernentz … zusammen mit Souschef Ronan Downing.“

Nachher: „Heute führt das Team das Bistro gemeinsam und entwickelt auch die Gerichte zusammen.“

Entfernt: ehemalige Kochstationen, Fine-Dining-Zuschreibung, unbestätigte alte Gerichte, alter Speisetipp und pauschale Öffnungszeit im Beschreibungstext. Ort und historische Einleitung bleiben erhalten. Die vorübergehend kürzere Spot-Beschreibung ist bewusst: ohne aktuelle Karte wird keine Länge mit erfundenen Gerichten aufgefüllt. Die strukturierte Öffnungszeit ist nicht Bestandteil dieser Korrektur und bleibt klärungsbedürftig.

Aktuelles [offizielles Instagram-Profil](https://www.instagram.com/bistro_grigri/) im eingeloggten Chrome gelesen: Paul-Lincke-Ufer 11 bestätigt. Profil nennt Do–Fr 18–21 Uhr, Sa–So 12–21.30 Uhr. Der [Herbst-Beitrag](https://www.instagram.com/bistro_grigri/p/DeJKGHIIGB0/) nennt dagegen Do ab 18 Uhr, Fr–Sa 12–21.30 Uhr, So 12–21 Uhr. Wegen des internen Widerspruchs keine neuen exakten Zeiten übernommen. [Moules-frites-Beitrag vom 9. September](https://www.instagram.com/bistro_grigri/p/DdD9iuHIZlE/) kündigt das Gericht für ein bestimmtes Wochenende an; daraus kein dauerhaftes aktuelles Angebot abgeleitet.

Status nach ausdrücklicher Live-Freigabe: Beide Artikel und der Spot in DE/EN veröffentlicht. Unmittelbar zuvor aktuelle Fassungen unter `/tmp/eat-this-freshness-2026-10-25/before-publish.json` gesichert, Draft-Revisionen gegen den geprüften Vorschau-Stand verglichen, pro Dokument nur die freigegebenen Felder mit Revisionsprüfung atomar übernommen und Draft gelöscht. Sonstige Felder inklusive Bild/Cover unverändert. Die sechs öffentlichen Sprach-URLs zweimal geprüft: genehmigter Teamtext vorhanden, Namen entfernt, Canonicals und DE/EN-hreflang korrekt. `/news` und `/en/news` ebenfalls zweimal HTTP 200. Nachweis: `/tmp/eat-this-freshness-2026-10-25/live-verification.json`. Artikelindex vollständig neu erzeugt (35 Einträge; bytegleich zum bisherigen Index, da Gri-Gri-Abschnitte außerhalb der eingebetteten ersten 1.200 Zeichen liegen). Gri-Gri-Spotvektor separat aus veröffentlichter Kurzbeschreibung/Tipp mit demselben Voyage-Modell aktualisiert, übrige 246 Vektoren unverändert. Index-Formtests: 17 bestanden; Katalogabgleich: Artikel 35/35 und Spots 247/247, keine Lücken. Suchindex-Änderung separat committed; kein App-Code-Deployment erforderlich für die veröffentlichten Sanity-Texte.

Die Erstellung der üblichen, 24 Stunden gültigen Firebase-Artikelvorschauen wurde zunächst durch die automatische Freigabe abgelehnt. Nach ausdrücklicher Zustimmung des Nutzers wurden beide Vorschauen angelegt. Beide Artikel in DE und EN bei 375 × 812 und 1440 × 1000 geprüft (acht Ansichten): Korrekturtext vorhanden, alte Namen im gerenderten Artikeltext entfernt, kein horizontaler Überlauf, Schrift und Umbrüche lesbar. Screenshots unter `/tmp/eat-this-freshness-2026-10-25/`. Vorher `/no-count` geöffnet und vollständig neu geladen: `eatthis_nocount=1` und Ausschluss bestätigt. Die anschließende Veröffentlichung ist oben dokumentiert.

## Weitere konkrete Befunde zur Freigabe

- **Schüsseldienst, zwei Artikel:** Beschriebene Rinderschaufel mit Kartoffel-Lauch-Stampf und Wels entsprechen nicht der derzeit abrufbaren [offiziellen Karte](https://www.schuesseldienst-berlin.de/). Diese nennt Pilz-Polenta mit Mais/Pilzen und Seelachs & Miso. Aktuelle Empfehlung und etwaige historische Besuchsschilderung getrennt behandeln.
- **Bonvivant, Cocktailbars und Schöneberg:** „Die Bar führt Elias Heintz“ ist überholt. [Offizieller Text zur Bar](https://bonvivant.berlin/en/liquid-fine-dining-the-bar-of-bonvivant.htm) nennt Martin Wolf als Barleiter. [Offizieller Beitrag zur alkoholfreien Trinkkultur](https://bonvivant.berlin/de/nuechtern-feiern-alkoholfreie-trinkkultur-berlin.htm) ordnet Elias dem Management zu.
- **Father Carpenter, Brunch:** Herbstkarte vom 23.09.2026 nennt Shakshuka mit Spinat, Aubergine und grünem Tahini; Guide nennt Spinat/Feta. [Offizielle aktuelle PDF](https://cdn.shopify.com/s/files/1/0668/5065/2424/files/260923_Autumn_Menu_Print.pdf?v=1790413920).
- **The Grain, Pizza:** Artikel lässt Donnerstag aus; [offizielle Kontaktseite](https://thegrainberlin.de/de/contact/) nennt Mi–So. Öffnungssatz vorzugsweise entfernen; genaue Zeiten vor Übernahme gegen zweite aktuelle Quelle prüfen.
- **Breda, Italiener-Guide:** „Ab acht“ gegenüber [offizieller Website](https://breda.berlin/) „mehr als acht“ Gäste für Anfrage per E-Mail prüfen; Originalwortlaut und exakte Quelle im Teilbericht.

Die belegten weiteren Abweichungen sind nach ausdrücklicher Nutzerfreigabe in elf Artikeln in DE/EN korrigiert, veröffentlicht und auf allen 22 öffentlichen Sprachseiten geprüft. Der [Korrekturbericht](artikel-korrekturen-2026-10-25.md) dokumentiert jede Änderung, Quellen, Vorschauen und Veröffentlichung.

- **Rutz, Torstraße:** Betrieb nennt Marco Müller Küchendirektor/Executive Chef und Dennis Quetsch Küchenchef; im Artikel Müllers Rolle entsprechend präzisieren. [Originalmeldung](https://rutz-restaurant.de/update-auf-11-inspirationen-fuer-das-berlin-size-menue-im-rutz/).

## Weitere präzise Abweichungen aus Teil B

- **Standard Torstraße, Mitte-Guide:** „Unter der Woche erst ab 17 Uhr“ übergeht Freitag ab 13 Uhr auf der [offiziellen Standortseite](https://www.standard-berlin.de/). Pauschale Zeit vorzugsweise streichen.
- **Micha Schäfer, Kreuzberg-Guide:** [Persönliche Website](https://www.schaefer-micha.com/) nennt Creative Culinary Director nach früherer Head-Chef-Rolle. Präziser Vorschlag: „Micha Schäfer verantwortet die kulinarische Ausrichtung.“
- **DoubleEye, Schöneberg-Guide:** Verallgemeinerte Schlusszeit 18.29 Uhr stimmt nur Mo–Fr. [Eigene Seite](https://doubleeye.shop/) nennt Samstag 17.57 Uhr. Zeit streichen oder auf Werktage Mo–Fr begrenzen.
- **Schöneberg-Teaser DE/EN:** Alte Wels-Bowl steht zusätzlich im Teaser, muss bei einer Korrektur mit erfasst werden.
- **Gazzo, eigener Artikel:** Fass-Prosecco aktuell nicht ausreichend belegt. Septemberkarte führt Fasswein und Cava, Homepage Prosecco allgemein. Keine Behauptung, Prosecco werde grundsätzlich nicht mehr angeboten.

## Zweite konkrete Textprobe vor breiter Überarbeitung

Bonvivant, Cocktailbars DE vorher: „… die Bar führt Elias Heintz.“ Nachher: „… die Bar führt Martin Wolf.“ EN vorher: “and Elias Heintz runs the bar.” Nachher: “and Martin Wolf runs the bar.” Dieselbe veraltete Rollenangabe steht außerdem in DE/EN des Schöneberg-Guides und muss bei Freigabe ebenfalls geändert werden.

Die oben genannten aktuellen Karten sind Abrufstände, keine Dauerzusagen. Bei einer Überarbeitung erhalten wechselnde Gerichte entweder eine klare zeitliche Einordnung oder die Passage wird entsprechend gekürzt. Insbesondere geschmackliche Folgeaussagen über alte Zutaten werden nicht auf neue Zutaten übertragen.

## Vollständige Prüfnotizen

Die Teilberichte folgen unten; ihre Quellenlücken bleiben ausdrücklich offen.


---

# Aktualitätsprüfung Magazin – Gruppe A

Prüfdatum/Abrufdatum: 25.10.2026. Quelle des Prüfgegenstands: Sanity `ehwjnjr2/production`, `perspective=raw`, veröffentlichte `newsArticle`, alphabetisch nach `titleDe`, Positionen 0–11. DE/EN-Texte und referenzierte Betriebs-Websites wurden gezogen; Snapshot: `/tmp/eat-this-article-audit-a-source.json`. Keine Sanity-Änderungen.

**Ergebnis ist eine Quellenprüfung mit offenen Punkten, keine vollständige Tatsachenfreigabe.** Eine heute abrufbare, undatierte Website beweist kein heutiges Team. „Offen“ heißt weder falsch noch bestätigt. Öffnungszeiten und Gründungsdaten benötigen laut Schreibregeln eine zweite Quelle; wo hier nur eine steht, ist das ausdrücklich nur ein Teilbeleg. Geschmacksurteile und persönliche Besuchsbeobachtungen wurden nicht als heutige Tatsachen neu erfunden. Alle vorgeschlagenen Änderungen gelten sinngemäß auch für EN.

## 1. Ari’s: Ein Stück Amerika, das es so nie gab
Slug: `aris-berlin-burger-kreuzberg`. Status: **teilweise bestätigt, Menü und Biografie offen**.

- Die [Betriebsseite](https://www.arisberlin.com/) bestätigt Diner-Konzept, Lima/Peru als kulinarischen Bezug und Glogauer Straße 2.
- Die Seite liefert im auslesbaren Text keine aktuelle Speisekarte und keinen Lebenslauf. Deshalb sind Trad/Oklahoma/Lima Kreuzburger, sieben benannte Soßen, Spicy Green Goddess und Ariannas persönliche Lieblingsbestellung hier nicht aktuell bestätigt.
- Auch Aufwachsen in Lima und Aufenthalt in New York sind mit dieser Quelle nicht belegt. Keine gegenteilige Primärinformation gefunden.
- Minimalmaßnahme: Urteile aus dem besuchten Essen erhalten; Personendetails und als dauerhaft formulierte Gerichte erst nach aktueller Betriebsbestätigung freigeben. Keine neue Biografie aus alten Fremdporträts übernehmen.

## 2. Berlin auf Japanisch: Nigiri, Glut und Ramen
Slug: `beste-japanische-restaurants-berlin`. Status: **mehrere aktuelle Teilbelege; Personal/wechselnde Gerichte teilweise offen**.

| Betrieb | Bestätigt | Offen / Folgerung |
|---|---|---|
| SAN | [Betriebsseite](https://www.3berlin.com/): Weydingerstraße 22, 2-Stunden-Tischzeit, Stornierung nach unangekündigter Verspätung über 15 Minuten, kein vegetarisches/veganes Sushi. | Sakashita/Setos heutige Rollen und Karaage/Omakase nicht auf der ausgelesenen Seite. Regeln sind Primärbeleg, für Reservierungsdetails fehlt die zweite Quelle. |
| 893 Ryōtei | [Betriebsseite](https://893ryotei.de/) wiederholt Timeout. | Thunfischsorten, Uni, Saba, Tiradito/Ceviche und Best-of ab vier Personen aktuell nicht bestätigt. Der fehlgeschlagene Abruf belegt keine Schließung. |
| Sasaya | [Offizielle deutsche Seite](https://sasaya-berlin-de.tumblr.com/) nennt Lychenerstraße 50 und Do–Mo Mittag/Abend; Sommerpause ist ausdrücklich August 2026. Telefonanfragen mittags besser möglich. | Der Text „Telefon schwer zu erreichen“ sollte näher an die konkrete Betriebsinformation: „Telefonisch ist das Team mittags am besten erreichbar.“ Tägliche Gerichte/Tatami nicht frisch belegt. |
| stoke | [About](https://www.stokeberlin.com/about) bestätigt die drei Gründer, Yakitori/Binchotan und verschiedene Hühnerteile inklusive Hals, Herz, Haut, Oyster. [Start](https://www.stokeberlin.com/) bestätigt Eingang Feilnerstraße. | Website sagt ausdrücklich täglich wechselnde Karte. Gelbschwanzmakrele und Gyoza-Pie daher nicht als dauerhaft erhältlich behandeln. Freilandhaltung und Infatuation-Eintrag Juni 2026 hier nicht direkt belegt. |
| Cocolo Mitte | Keine aktuelle Primärmenüseite in dieser Recherche erschlossen. | Gesamte Brühen-/Zutatenliste, Hausnudeln und Kaedama offen; keine belastbare Änderungsbehauptung. |

## 3. Berlin braucht mehr Knödel
Slug: `oesterreichische-restaurants-berlin`. Status: **Knödelwirtschaft-Menü bestätigt; Österelli-Gerichte offen**.

- [Österelli](https://www.oesterelli.com/) nennt Julia/Andreas als Gastgeber, österreichische Küche und Bismarckstraße 6. Die Seite bewirbt inzwischen Berlin und Potsdam. Sie belegt nicht die konkrete aktuelle Knödel-/Krenschnitzel-/Marillenknödel-Kombination. Mehrere Orte sind keine Widerlegung des Berliner Abschnitts.
- Die [aktuelle SÜD-Seite](https://www.knoedelwirtschaft.de/en/sued) bestätigt Fuldastraße 33, Duo mit Parmesan/Butter/Salat, weitere Knödel einzeln, Speck/Steinpilz/vegane Rote Bete mit Sonnenblumenkernen und Topfen-Mohnknödel mit Quitte. Öffnung Werktage 17 Uhr, Wochenende mittags ist dort angegeben.
- Historische Wohnungsabende und genaue Eröffnungsdaten nicht frisch gegen zwei Quellen geprüft.
- Minimalmaßnahme: Österelli-Menü vor der nächsten Freigabe bestätigen; keine Ersetzung durch das Angebot des Potsdamer Standorts.

## 4. Berlin schleckt: Von Pandan bis Büffelmilch
Slug: `beste-eisdielen-berlin`. Status: **Produktkonzepte teilweise bestätigt; rotierende Sorten und Personen überwiegend offen**.

| Betrieb | Evidenz |
|---|---|
| Jones | [Eigene Biografie](https://www.jonesicecream.com/aboutus) bestätigt Gabrielles Dessertmeistertitel 2006, Ritz und Ice Cream/Cookies. Rezept ohne Ei sowie sämtliche Filial-/Produktdetails nicht separat frisch geprüft. |
| Hokey Pokey | [Website](https://www.hokey-pokey.de/) bestätigt Betrieb seit 2011 und Pistazie/weiße Schokolade als Becherprodukt. Niko Robert, Ritz-Carlton-Vergangenheit, Pulververzicht und konkrete Kugelsorten nicht aktuell gegengeprüft. |
| amatō | [Website](https://amatoberlin.com/) bestätigt Dunckerstraße 69. Kein auslesbares Menü oder Gründerporträt; Viet Anh, Juni 2025, Pandan/Thai Tea/Hojicha und Hundegeschichte bleiben offen. |
| Tribeca | [Website](https://www.tribecaicecream.com/) bestätigt pflanzliches Eis ohne raffinierten Zucker, beide genannten Straßen, Raw Chocolate/Pistazie, glutenfreie Sandwiches und Spaghetti-Eis. Gründer-/Rezeptgeschichte ist damit nicht geprüft. |
| Vanille & Marille | [Website](https://www.vanille-marille.de/) bestätigt alle im Artikel genannten Sorten und Leydenallee 92. Aktuell stehen die Läden auf Winterpause. Der vorhandene Hinweis auf Herbst-/Winterpausen ist deshalb sinnvoll; nicht pauschal als ganzjährig geöffnet darstellen. |
| Spumante | [Website](https://www.bistro-spumante.org/) bestätigt Reichenberger Straße 73 und abendliche Öffnung. Helene/Emma, Startdatum und Eis/Calamari/Zwiebelschmalz aktuell nicht bestätigt. |
| Kuréme | Kein aktueller Primärmenü-/Teamtext erschlossen. Eigener Kanal: [Instagram](https://www.instagram.com/thisiskureme/). Die verlinkten Fremdporträts waren keine ausreichende heutige Bestätigung. |
| Gazzo | [Website](https://www.gazzopizza.com/) bestätigt Sauerteigpizza und zeigt einen saisonalen Kürbis-Büffel-Softeis-Post. Nordfriesland-Hof und dauerhafte klassische Garnitur mit Katie’s-Shortbread hier nicht aktuell belegt. |

Minimalmaßnahme: Sorten als Beispiele aus einer wechselnden Auswahl kennzeichnen oder mit aktueller Karte bestätigen. Keine alten Eröffnungsporträts als Beleg für heutige Personalbesetzung.

## 5. Berlin zieht Nudeln: Scharfe Schüsseln bei LIU und Wen Cheng
Slug: `chinesische-restaurants-berlin`. Status: **Kernangebot bestätigt; bei LIU Tianshui-Verfügbarkeit unklar**.

- [LIU](https://chengduweidao.de/) bestätigt Kronenstraße 72, Sichuan-Rindfleischnudeln, Laoma ChaoShou sowie Vorbestellnummer/Kochen nach Ankunft. Die Seite enthält gleichzeitig alte Corona- und undatierte Ferienmeldungen. Diese News dürfen nicht als aktuell interpretiert werden.
- LIU schreibt im Tianshui-Hinweis, zunächst sei wieder die **Soße** zum Mitnehmen da. Das bestätigt kein aktuell verfügbares kaltes Nudelgericht. Im sichtbaren Bestellangebot fehlt dieses. Minimalvorschlag: Tianshui-Nudeln bis zur Klärung aus dem aktuellen Empfehlungsangebot herausnehmen; nicht behaupten, sie seien abgeschafft.
- [Wen-Cheng-Menü](https://www.wenchengnoodles.com/de/menu) bestätigt Biang-Biang-Gewürze/heißes Öl, Lamm/Kreuzkümmel und die mildere Wen-Cheng-Reihe sowie „Asian spicy“. Es gibt heute deutlich mehr als zwei einzelne Gerichte (Varianten, Beilagen, Dessert). „Es gibt zwei Schüsseln“ präzisieren zu „Die Nudeln kommen in zwei Grundvarianten.“
- Gründer-/Dialektgeschichte und genaues Eröffnungsdatum bleiben unbestätigt; die gefundene offizielle PDF von Januar 2024 ist keine aktuelle Karte.

## 6. Berlin zwischen Smashburger und Mitternachtshunger
Slug: `beste-burger-berlin`. Status: **Goldies/Burgermeister-Kernangebot bestätigt; Nachtzeiten und ALL IN offen**.

- [Goldies](https://www.goldies-smashburger.de/) bestätigt Gründer, Sterneküchenhintergrund, Cheeseburger-Zutaten mit Martin’s Bun und echte Milch/Bourbonvanille in Shakes. Auszeichnung steht als Selbstaussage auf der Seite; direkt beim Awardgeber/Jahr nicht überprüft. Nürnberg-Start und Graefestraßen-Nachtzeit nicht aktuell belegt.
- [Burgermeister](https://burgermeister.com/) bestätigt Meisterburger mit Bacon, karamellisierten Zwiebeln/BBQ und separat servierte Cheddarsoße. „Wochenende bis 4 Uhr“ und Mai-2026-Łódź nicht durch die geprüfte Primärseite bestätigt.
- ALL-IN-Webseite [letsgo-allin.com](https://www.letsgo-allin.com/) liefert 404. Wolt zeigt ähnliche Zutaten, ist gemäß Regeln jedoch kein alleiniger Tatsachenbeleg. Besonders Blumenkohl-Patty und Milkshake-Empfehlung daher offen.
- Ari’s siehe Abschnitt 1.
- Minimalmaßnahme: Nachtzeiten sind für diesen Artikel titel-/nutzenrelevant und brauchen aktuelle Standortquellen. Auslandsfilialstarts ohne Nutzen für den Berliner Besuch streichen.

## 7. Berlins Backstuben: Sauerteig, Butter, frühes Aufstehen
Slug: `beste-baeckereien-berlin`. Status: **mehrere Konzepte/Adressen bestätigt; JOHANN-Kalender und einzelne Teamstorys offen**.

| Betrieb | Primärprüfung / Grenzen |
|---|---|
| SOFI | [Website](https://sofiberlin.com/) bestätigt Nachbarschaftsbäckerei, wenig Eingriffe; [Shop](https://sofiberlin.com/collections/shop) listet Berlin Loaf und Morning Bun. Historische Gründer und Emmer nicht frisch belegt. |
| Albatross | [Website](https://albatrossberlin.com/) bestätigt Graefestraße 66/67. Keine aktuelle auslesbare Sortenkarte, Wochenend-Focaccia nicht bestätigt. |
| Gorilla | [Brunchkarte](https://gorilla-baeckerei.de/kueche) bestätigt Brunch nur Schöneberg und Shakshuka Toast am Wochenende; [Standorte](https://gorilla-baeckerei.de/locations) beide Adressen. [EUREF als Standortbetreiber](https://euref.de/gorilla-baeckerei-jetzt-auch-in-schoeneberg/) belegt den Schöneberger Start 2022. |
| JOHANN | [Website](https://johannbaeckerei.de/) technisch nicht abrufbar. Besonders Spezialbrote dienstags/donnerstags/samstags und Freitagsbrot sowie Fertigzeit 12 Uhr unbestätigt. Fremdquellen nennen teils Mi–So; das ist ein Prüfverdacht, keine bestätigte Dienstagsschließung. |
| AERA | [Website](https://aerabread.com/) und [Über uns](https://aerabread.com/pages/uber-uns) bestätigen Glutenfreiheit, natürlichen Sauerteig, Bauckhof, Handformen in Fasanenstraße und Kurfürst. Ava-Biografie und Dezember 2018 sind damit nicht bestätigt. |
| LA MAISON | [Website](https://www.lamaison.berlin/en/) bestätigt Herrfurthplatz 14 und Paul-Lincke-Ufer 17. Andreas-Biografie und Mai-2019-Start offen. |
| Taktil | Eigener [Instagram-Kanal](https://www.instagram.com/taktilberlin/) als Primärziel identifiziert, aktuelle Team-/Übernahmebestätigung nicht erschlossen. Phil/Bagel Oven steht nur in Fremdporträt; nicht als heute gesichert freigeben. |
| La Miche | [Website](https://lamiche.de/de/) bestätigt Crellestraße 2, Sauerteig, lange Führung, bevorzugt regionale/Bio-Zutaten und Mi–Sa. Aurélies Lebenslauf, Alleinbetrieb und vier konkrete Produkte bleiben mit dieser Seite offen. |
| Common | Eigener [Instagram-Kanal](https://www.instagram.com/common.berlin/) identifiziert. Kein aktueller Primärmenü-/Teamtext erschlossen. August-63-Kaffee, konkrete Gebäckliste und Fensterbetrieb offen. |
| Atelier Dough | [Website](https://www.atelierdough.com/) bestätigt tägliche Handarbeit, französische Technik, Grundzutaten und selbstgemachte Marshmallows; Crème-brûlée-Sorte und Gründerbiografie dort nicht belegt. |

Minimalmaßnahme: JOHANN-Wochentagskalender bis Primärbestätigung entfernen, da er eine konkrete Besuchsplanung auslöst. Nicht durch ebenso unbelegte neue Zeiten ersetzen.

## 8. Berlins Weinbars: Gute Weine und was dazu auf den Tisch kommt
Slug: `beste-weinbars-berlin`. Status: **höchste weitere Personal-Prüfpriorität: Material**.

- **Material:** „geführt von Carlos und Ebrahim“ nicht primär bestätigt. [Register-Aggregator](https://www.companyhouse.de/Material-CE-GmbH-Berlin) berichtet Ausscheiden Ebrahim Qayumis als Geschäftsführer am 09.10.2024. Nur ein Recherchehinweis: juristische Geschäftsführung ist nicht operative Mitarbeit. Keine Person entfernen allein aufgrund dieses Aggregators. Eine aktuelle Bestätigung durch Betrieb/Originalregister ist nötig; alter Cee-Cee-Eröffnungstext reicht dafür nicht.
- **jaja:** [eigene Seite](https://www.jajaberlin.com/) bestätigt Wein/saisonales Essen; Hannes als heutiger Inhaber, Blumenkohlgericht und aktuelle Michelin-Nennung nicht direkt geprüft.
- **Bottega Seppel:** [eigene Seite](https://www.bottega-seppel.de/) bestätigt Restaurant/Weinbar, Motto, Giesebrechtstraße 3 und saisonal wechselnde Karte. Lidia/Luiz, Eröffnungsmonat, Jakobsmuschel/Ricotta/Huhn sind im ausgelesenen Text nicht bestätigt.
- **Estelle:** [eigene Seite](https://estelle-dining.com/) bestätigt moderne europäische Nachbarschaftsküche und Kopenhagener Straße 12A; Biografien, 450 Grad, Brunch/Mittag und Hunderegel nicht aktuell belegt.
- **Pluto:** [eigene Seite](https://www.pluto-berlin.net/) bestätigt Kastanienallee 27, Do–Mo ab 17 Uhr und keine Reservierungen. Team, Design, Verarbeitung ganzer Tiere und Mangalitza-Schinken hier offen.
- **Freundschaft:** [Über uns](https://www.istdeinbesterfreund.com/ueber-uns.php) bestätigt Gründer 2018 und knapp 800 Positionen; [Kontakt](https://www.istdeinbesterfreund.com/kontakt.php) Mo–Fr ab 18 Uhr. Kleine Namensabweichung: Primärseite schreibt Geschäftspartner **Stephen** Landwehr, Artikel **Stephan**. Vor Korrektur Originalnamen klären; keine Aktualitätskrise.
- **ORA:** [About](https://ora.berlin/about/) bestätigt Alan Micks und Amyna Le sowie Apotheke und saisonale Küche. [Sample Menu](https://ora.berlin/menu/) bestätigt Chef’s Choice für zwei und beide im Artikel genannten Gerichte. Da ausdrücklich Beispielkarte: keine Garantie für Tagesverfügbarkeit.
- **Le Balto:** kein aktueller Primär-Team-/Menütext erschlossen. Aishah/Laurel, Wein vom Fass, Challa-Lachs-Toast offen.
- **Sardinen Bar:** [Über uns](https://www.sardinenbarberlin.com/pages/uber-uns) bestätigt Thomas Vetter, Familienbetriebe Frankreich/Portugal und Jahrgangsdosen; [Start](https://www.sardinenbarberlin.com/) nennt 2016. „erste Deutschlands“ bleibt Selbstaussage und braucht unabhängigen Beleg oder Streichung.

## 9. Bistro-Abende in Berlin: Austern, Wein und noch ein Gang
Slug: `franzoesische-restaurants-berlin`. Status: **Gri-Gri-Fehler gesichert; übrige Abschnitte unterschiedlich gut belegt**.

- Gri Gri: Ronjas vom Nutzer vorgelegte Mail widerlegt aktuelle Nennung Frithjof/Ronan und Küchenzuschreibung. Root bearbeitet Korrektur und Spot selbst; Gerichte des früheren Konzepts aktuell nicht bestätigt.
- Paris Bar: [eigene Seite](https://www.parisbar.net/) bestätigt Kantstraße 152. Gründung, Kunstgeschichte, konkrete Gerichte und Küche täglich bis 1 Uhr sind damit **nicht** frisch bestätigt.
- Bostich: [eigene Seite](https://www.bostich.berlin/) bestätigt Ludwigkirchstraße 10A. Die verlinkte [Abendkarte](https://cdn.prod.website-files.com/64390befc5291a5d6c41cf08/68dc12b4871615e06c51e697_Bostich_A3_250929.pdf) ließ sich im Webtool nicht öffnen. Dateiname deutet 29.09.2025 an, ist kein Beleg einer 2026-Karte. Gründer und Austernsorten/Geschnetzeltes/Crêpes aktuell offen.
- Colette: [Standort](https://brasseriecolette.de/berlin) bestätigt Tim Raue als Namens-/Konzeptgeber und La table dressée. Die aktuell verlinkte [Q4-2026-Karte](https://brasseriecolettev3.cdn.prismic.io/brasseriecolettev3/flNCBsQAXq_3wy6W_colette_speisekarten_2026_q4_CBE_CMU_de.pdf) bestätigt Oyster-&-Pearls-Flammkuchen, Garnele Marocain mit Pistazie/Rose/Litschi und Rinderfilet au poivre mit Pommes Churro.
- VOLK: [eigene Seite](https://volkmitte.de/) bestätigt Margaux Arabian, Oliver Chesler, Lunch/Dinner und täglich wechselnde französische Karte. Behaupteter Marseille-Teller seit Februar 2026 samt konkreter Stückzahlen nicht bestätigt; minimal bis aktueller Bestätigung entfernen.

## 10. Brammibal’s und Atelier Dough: Zwei Ideen vom guten Donut
Slug: `donuts-berlin`. Status: **Brammibal’s Großteil aktuell bestätigt; wechselnde Sorten riskant**.

- [Brammibal’s Geschichte](https://www.brammibalsdonuts.com/about-us/) bestätigt 2015 Marktstart, ersten Laden ein Jahr später, frisch/vegan/ohne Konservierung, mehr als 170 Beschäftigte, Original Beans, ganze Früchte und sofort essen. „Erster veganer Laden Europas“ ist Eigenaussage, laut Regeln ohne Zweitbeleg streichen/attributieren.
- [Startseite](https://www.brammibalsdonuts.com/) bestätigt BER und Strawberry-Sprinkles-Spende. Q4 unterstützt **Berliner Kältebus und Hamburger Mitternachtsbus**; Artikel nennt nur Berlin. Kein sachlicher Widerspruch, aber verkürzt. Oktober-Sorten Pumpkin Spice/Apple Biscoff nicht aus dem heutigen Hauptseitentext bestätigt.
- Minimalmaßnahme: Personalzahl, kumulierte Spendenzahl und gerade begünstigte Organisation nicht als undatiertes Dauerdetail im Guide führen. Monatssorten weglassen, statt mit neuen schnell veraltenden Sorten ersetzen.
- Atelier Dough: aktuelle [Betriebsseite](https://www.atelierdough.com/) bestätigt Handarbeit/Technik/Marshmallows und Adresse. Biografie/April 2023 und aktuelle Crème-brûlée-Verfügbarkeit bleiben offen.

## 11. Charlottenburg neben der Kantstraße: Udon, Galette, Schnitzel
Slug: `restaurants-charlottenburg`. Status: **Kernangebot vergleichsweise gut belegt; Detailhistorie teils offen**.

- AERA: [Über uns](https://aerabread.com/pages/uber-uns) bestätigt Rezeptarbeit seit November 2016 und Manufaktur Fasanenstraße; [Start](https://aerabread.com/) Sauerteig/Bauckhof/Kurfürst.
- Bubar: [Betriebsseite](https://bubar.eu/) bestätigt bretonischen Konditor/Plomelin/Les Menhirs, Buchweizenmehl/Bio-Eier/Butter/hausgemachtes Karamell und Mi/Sa Karl-August-Platz. „bis mittags“ dort nicht belegt; minimal streichen oder konkrete Marktzeit doppelt prüfen.
- Heno Heno: [Menü](https://www.henoheno.de/speisen.html) bestätigt Gyūdon/Onsen-Ei, Udon/Soba heiß/kalt, Tofu/Rind/Curry und hausgemachte Nukazuke. Umzug 2015 nicht frisch bestätigt.
- Standard: [Standort](https://www.standard-berlin.de/) bestätigt Schlüterstraße 63 und seit 2014; [aktuell verlinkte Karte](https://www.standard-berlin.de/wp-content/themes/pizza/downloads/menu_ch.pdf) bestätigt Margherita, Marinara und weiße Carbonara mit genannten Zutaten. 500 Grad, eine Minute, Lieferfrequenz Agerola und genaue Eröffnung November nicht aktuell belegt.
- Engelbecken: [Betriebsseite](https://www.engelbecken.de/) bestätigt Witzlebenstraße 31, tägliche Abendöffnung 17 Uhr, Enzian Mo–Fr mittags und Biozertifikat. Gründungs-/Umzugshistorie und aktuelle Schnitzelbeilage nicht separat geprüft. Keine neue Personalzuordnung aus „Schichtwechsel 2026“ nötig.

## 12. Crapulix: Ein Stück Frankreich, für das man nach Steglitz fährt
Slug: `crapulix-croissant-steglitz`. Status: **wesentliche Biografie/Handwerk/Sortiment bestätigt; weitere Details offen**.

Die [Betriebswebsite](https://crapulix.berlin/) war direkt zeitweise mit 500 nicht abrufbar, wurde aber als aktuelle offizielle Suchquelle mit vollständigem Text ausgeliefert. Sie bestätigt Oliviers Sterneküchen-Ausbildung und Restaurant-Vergangenheit, eigene Handarbeit ohne Konservierung, Grundhaltung, Croissant/Pain au Chocolat/Financiers/Canelés/Tartelettes/Zimtschnecken/Baguette und samstags Winterfeldtmarkt. Die Aussage „Hunderte vor Öffnung“ wurde nicht im rbb-Original überprüft. Keine gegenteilige Teaminfo gefunden. Schildhornstraße 87 braucht noch direkte Adressbestätigung; Aussage im Artikel nicht allein aus dem Suchtreffer als bestätigt behandeln.

## Prioritäten vor pauschaler Freigabe

1. Gri Gri: gesicherten Fehler in beiden Sprachen und Spot korrigieren (Root).
2. Material: heutige personelle Verantwortung direkt bestätigen; Aggregator ist nur Warnsignal.
3. JOHANN: Wochenkalender/Di-Verfügbarkeit aktuell bestätigen oder konkrete Kalenderversprechen entfernen.
4. VOLK-Mittagsteller, LIU-Tianshui-Nudeln und Nachtzeiten Goldies/Burgermeister: aktuelle Verfügbarkeit/Zeiten klären.
5. Primärquellenlücken schließen: 893/Cocolo, ALL IN, Kuréme/amatō, einzelne Bäckereien, Le Balto/Estelle/jaja. Keine Vollprüfung behaupten, solange diese Angaben offen sind.



---

# Aktualitätsprüfung – Teil C

Stand und Abrufdatum: 25.10.2026. Inhaltsquelle: Sanity `ehwjnjr2/production`, `perspective=raw`, veröffentlichte `newsArticle` nach `titleDe` sortiert, Indizes 24–34. Alle elf Artikel wurden aus Sanity mit deutschem und englischem Text, Teasern und Spot-Referenzen abgerufen. Keine Sanity- oder Git-Änderungen.

Dies ist eine belegte Erstprüfung der veränderlichen Angaben, keine Bescheinigung, dass sämtliche Aussagen in allen elf Artikeln aktuell und vollständig bewiesen sind. Ein laufender Webauftritt ist kein Nachweis für jedes Gericht oder jedes Teammitglied. Undatierte Website-Texte sind als solche behandelt. Nicht erreichbare Quellen beweisen keine Schließung. Historische Gründungs- und Besuchsaussagen sind von gegenwärtigen Angeboten zu unterscheiden. Die folgenden Korrekturen gelten jeweils auch für EN; Übersetzungen dürfen keine überholten Fakten stehen lassen.

## Belastbare Korrekturen

1. **Cocktailbars / Bonvivant:** „die Bar führt Elias Heintz“ ist nach den aktuellen Eigenangaben überholt. Ein offizieller Beitrag vom 02.06.2026 nennt **Martin Wolf** als Barleiter; ein weiterer vom 20.08.2026 beschreibt Elias als langjährigen Barchef, heute verstärkt im Management. Minimal den Satz zu „Die Bar führt Martin Wolf.“ ändern oder die Personalnennung entfernen. Quellen: [Bar des Bonvivant](https://bonvivant.berlin/en/liquid-fine-dining-the-bar-of-bonvivant.htm), [alkoholfreie Trinkkultur](https://bonvivant.berlin/de/nuechtern-feiern-alkoholfreie-trinkkultur-berlin.htm), [Journal mit Beitragsdaten](https://bonvivant.berlin/en/posts.htm).
2. **Pizza / The Grain:** Im Artikel steht „geöffnet ist mittwochs und freitags bis sonntags“. Der eigene Auftritt nennt **Mittwoch bis Sonntag, 17–22 Uhr**. Donnerstag fehlt also im Artikel. Minimal die unnötige Öffnungstage-Angabe entfernen oder berichtigen. Quellen: [Kontakt](https://thegrainberlin.de/de/contact/), [Menüseite, Juli 26](https://thegrainberlin.de/de/menu/).
3. **Schüsseldienst:** Die im Präsens genannten Beilagen der Rinderschaufel und der Wels stammen nicht aus der derzeit verlinkten offiziellen Karte. Diese nennt Rinderschaufel mit Pilz-Polenta, Mais, Pilzen und Römersalat; beim Fisch steht **Seelachs & Miso**, kein Wels. Auch gebackene Aubergine mit Fregola/Tomatensud ist dort nicht aufgeführt. Minimal die veralteten Gerichtsabsätze durch die aktuelle Zusammensetzung ersetzen oder saisonale Details kürzen. Das Fehlen eines Gerichts beweist nicht, dass es nie mehr serviert wird; es darf aber ohne weitere Bestätigung nicht als heutiges Dauerangebot beschrieben werden. Quelle: [offizielle Karte](https://www.schuesseldienst-berlin.de/).
4. **Italiener / Breda:** „Gruppen ab acht fragen per Mail an“ ist enger als die offizielle Regel. Diese verlangt Mail bei **mehr als acht Gästen**. Minimal „Für Gruppen mit mehr als acht Personen läuft die Reservierung per Mail.“ oder die Zahl ganz entfernen. Quelle: [Breda](https://breda.berlin/).

## 1. Noch einen? Berliner Bars für lange Abende

Sanity-ID: `news-beste-cocktailbars-berlin`.

- **Ändern:** Bonvivants aktuelle Barleitung, siehe oben. Veganes Angebot und alkoholische/alkoholfreie Begleitung bestätigt der [Betrieb](https://bonvivant.berlin/en/welcome.htm). Starres „sechs oder sieben Gänge“ sollte nach Projektregel entfallen; die aktuelle Dinnerseite nennt diese Zahl zwar ebenfalls, aber sie ist veränderlich. Zudem widersprechen sich dort Fließtext (Di–Sa) und Footer (Mi–Sa); keine neuen Öffnungstage aus dieser Seite übernehmen. [Dinner](https://bonvivant.berlin/en/vegan-dinner-at-bonvivant-berlin.htm).
- **Bestätigt:** Victoria Bar am Wochenende bis 4 Uhr; Adresse Potsdamer Straße 102. Die gelesene [Betriebsseite](https://victoriabar.de/welcome) bestätigt keine heutige Personenbesetzung und nicht die beiden spezifischen Drinkrezepte. Brand/Wiedereröffnung und historische Gründung bleiben gesondert offen.
- **Bestätigt:** Green Door beschreibt den New Yorker Möbelimport, Thomas Hausers Wandgestaltung und die Salon/Lynch-Anmutung selbst. [Betrieb](https://www.greendoor.de/de/). Die mehrfachen Awards und der Terrassenstart „Sommer 2026“ sind in dieser Prüfung **nicht separat aktuell belegt**. „Zuletzt“ ohne Jahreszahl sollte vermieden werden.
- **Bestätigt:** Velvet nennt Ganghoferstraße 1 und Dienstag geschlossen. [Betrieb](https://velvet-bar-berlin.de/). Pflanzenlabor und Awards wurden nicht vollständig gegen die aktuellen Originalunterlagen geprüft.
- **Gut gedeckt:** FABELEIs eigenes [Menü, Stand August 2026](https://fabelei.com/menu) bestätigt Espresso Martini mit Double Eye/Johann, Tatar vom Gut Kerkow donnerstags sowie Kartenzahlung. [Startseite](https://fabelei.com/) bestätigt die vier Wochen-Specials und die Arbeitstechniken; [Impressum](https://fabelei.com/impressum) Anastasia/Filip. Zahlung nur mit Karte hat hier einen Betriebsbeleg; für die Projektanforderung zweier Quellen fehlt ein unabhängiger zweiter Beleg.
- **Teilweise bestätigt:** Hotelbetreiber führt [Anima](https://www.lockeliving.com/de/berlin/locke-at-east-side-gallery) weiterhin als Café/Bar/Restaurant/Listening Bar im Locke. Die heutigen Betreiber, H.A.N.D.hifi-Anlage und das wiederkehrende DJ-Programm sind damit **nicht** vollständig belegt. Keine neue Personalbehauptung aus alten Eröffnungstexten ableiten.

## 2. Oukan, Barra, NaNum: Berlins eigenwillige Restaurantküchen

Sanity-ID: `news-fine-dining-berlin`.

- **Bestätigt:** Oukans [aktuelle eigene Menüseite](https://www.oukan.de/menue/) nennt Süßkartoffel-Flatbread mit Pilz-XO, Maitake/Pflaume/schwarzen Knoblauch und die Öffnung Mi–Sa 18–23. Die Suchindexfassung derselben Seite zeigte noch andere Gerichte als der Direktabruf: **Suchsnippet nicht als aktuelle Karte verwenden.** Die Bilder-Alttexte sprechen teils von sieben/fünf, Überschriften von sechs/vier Gängen. Zahl aus Fließtext entfernen statt die Widersprüche mitzuschleppen. Aktuelle Gründerrolle/Teesommelière nicht allein aus der Karte ableiten.
- **Bestätigt:** Barra nennt auf dem [eigenen Auftritt](https://www.barraberlin.com/) Bib Gourmand seit 2020 und Remers & Westhead als Gesellschaft. Der sehr knappe maschinenlesbare Auftritt belegt keine heutigen Rollenverteilungen, kein fixes Menü und keine Montag–Freitag-Regel. Dafür bleibt eine Prüfung des aktuellen Buchungs-/Menüsystems offen.
- **Bestätigt:** aerde beschreibt auf seiner [Restaurantseite](https://www.aerde.de/restaurant) Berlin/Brandenburg-Bezug, kleine saisonale Teller, Fermentation, Sammeln, alkoholfreie Begleitung und Di–Sa ab 18 Uhr. Als eigenständige Prognose von Berlin Food Stories ist die Stern-Kandidaten-Aussage kein heutiger Award; sie ist im Text bereits datiert, sollte aber bei Überarbeitung lieber entfallen.
- **Offen:** stokes konkrete aktuelle Teamkonstellation, Oyster-Spieß/Gyoza-Pie und Eingang wurden in dieser Recherche noch nicht durch eine aktuelle Betriebsquelle bestätigt. Nicht als geprüft kennzeichnen.
- **Offen:** 893s eigener Auftritt ließ sich nicht zuverlässig abrufen. Kein Nachweis für Schließung; aktuelle Gerichte und Gruppenregel ab vier bleiben offen.
- **Bestätigt:** November erklärt auf der [Betriebsseite](https://november-brasserie.com/) japanische Brasserie und direkt importierten Fisch; The Catch Family verlinkt. Aktuelle [Michelin-Seite](https://guide.michelin.com/en/berlin-region/berlin/restaurant/november-brasserie) bestätigt Sushi-Theke und Adresse. Michelin dokumentierte den Bib seit 2023 im [Beitrag vom 01.10.2024](https://guide.michelin.com/de/de/article/dining-out/unser-bib-des-monats-november-brasserie-in-berlin). Diese historische Quelle allein ersetzt keine explizite Prüfung des Awards 2026; aktuelle Profilansicht zeigte die Auszeichnung nicht als lesbaren Text.
- **Gut gedeckt:** [NaNum](https://nanumberlin.com/) bestätigt Jinok Kims Keramiken, koreanische Fermentküche, eigenen Garten/Tofu, Fisch optional und Mi–Sa ab 19 Uhr; auch Jinok/Dirk und Eröffnung mit 66 werden auf der Seite beschrieben. Konkrete aktuelle Kochkurstermine bleiben offen.

## 3. Pastaküche und Enoteca: Italienische Restaurants in Berlin

Sanity-ID: `news-beste-italiener-berlin`.

- **Ändern:** Breda-Gruppenregel, siehe oben. Die verlinkte Seite bestätigt Paul-Lincke-Ufer 42, nicht alle im Artikel genannten Gerichte oder die genaue heutige Teamkonstellation.
- **Gut gedeckt:** IL CALICEs [Abendkarte](https://enoiteca-il-calice.de/karten/abendkarte/) nennt Danny Benedettini, Antonio & Louis Bragato und enthält kirschholzgeräucherten Prosciutto, Cappelletti mit Kürbis und Tagliata vom Holzkohlegrill. Die Jahresangabe „seit Ende 2025“, die Gründungs-/Rückkehrgeschichte und rund 750 Weine wurden hier nicht eigenständig bestätigt. Die [Startseite](https://enoiteca-il-calice.de/) enthält intern widersprüchliche Öffnungszeiten; keine vermeintliche Aktualisierung daraus vornehmen.
- **Gut gedeckt:** [Mine](https://minerestaurant.de/) bestätigt Fun Fine Dining, Lage, Vitello, Kaviar-Spaghettini, Barolo-Lammschulter, sechsgängiges Signature-Angebot und MINE WINE. „Seit fünf Jahren in Folge“ ist relativ und nicht auf der gelesenen Seite belegt. Minimal „Der Guide Michelin empfiehlt Mine.“ nur mit aktuellem Michelin-Profil übernehmen; bis dahin Awardsatz entfernen. Die kleinste historische Weinbar wird im Artikel korrekt als Selbstaussage gekennzeichnet, nach Schreibregel dennoch besser ohne Superlativ.
- **Bestätigt:** [Big Mamma](https://www.bigmammagroup.com/italian-restaurants/coccodrillo-berlin) beschreibt aktuelles Coccodrillo-Konzept, 1960er-Norditalien, rote Samtbänke, Terrasse und sämtliche genannten Gerichtskategorien. Eröffnung Juli 2022/erstes Berliner Haus nicht erneut unabhängig überprüft.
- **Offen:** Caligari/Sugo und Pinci: keine belastbar gelesene aktuelle Primärquelle für die heutigen Betreiber und konkrete Tageskarte. Medieneröffnungstexte wurden nicht als heutiger Personalnachweis benutzt. Hier darf kein pauschales „aktuell geprüft“ stehen.

## 4. Phở oder Bánh Mì? Berlin auf Vietnamesisch

Sanity-ID: `news-vietnamesische-restaurants-berlin`.

- [Madame Ngos offizieller Domainaufruf](https://madame-ngo.de/) leitete auf `test.madame-ngo.de` um; dort sind vietnamesisch-französisches Konzept und Kantstraße 30 bestätigt. Die konkrete aktuelle Mittags-/Abendaufteilung, Les Trois Cochons und zehnstündige Hühnerbrühe sind damit noch nicht neu belegt. Kein vorschnelles Ersetzen anhand des allgemeinen Werbetextes.
- [Saveurs Markenauftritt](https://saveur-banhmi.com/) führt Berlin, Hamburg und Frankfurt, die [Berlin-Seite](https://saveur-banhmi.com/berlin/) Weinbergspark/Veteranenstraße als Standort. Das ist eine Bestätigung der Standorte, **keine** der heutigen Beschränkung auf zwei Sandwiches, des Hausbrots oder des Sonntagsruhetags. Aktuelles Bestellsystem muss noch inhaltlich gelesen werden.
- Empfehlung: bis zur vollständigen Kartenprüfung Tages-/Ruhetagsaussagen nicht als aktuell bestätigt behandeln. Kein belegter Gegenbeweis für die Gerichte gefunden.

## 5. Pizza in Berlin: Luftiger Rand oder lieber ein Slice?

Sanity-ID: `news-beste-pizzerien-berlin`.

- **Ändern:** The Grain lässt Donnerstag aus, siehe oben. [Eigene Geschichte](https://thegrainberlin.de/de/about/) bestätigt Sarah/Musa sowie die Technik mit höherem Wasseranteil und stärkerem Mehl. Neapelreisen noch nicht aktuell primär belegt. Menüseite verlinkt „Juli 26“, konkrete Karte noch nicht vollständig visuell ausgelesen.
- **Detailliert bestätigt:** Gazzos derzeit verlinkte [Karte, Dateititel 26.09.2026](https://www.gazzopizza.com/_files/ugd/c3e429_d3cad4bdd84a4fb6b78d6e9801a812e5.pdf) deckt Sauerteig, tägliches Füttern, 400 Grad, Brandenburg-Büffelmozzarella, Nr. 9 mit Spianata/Burrata/Padrón, Parmesancreme und Büffel-Softeis aus Nordfriesland mit Katie’s Blue Cat. Kein Aktualitätsfehler darin gefunden. Der Eröffnungszeitpunkt 2018 ist damit nicht separat neu belegt.
- **Detailliert bestätigt:** [GEMELLO-Menü](https://www.gemello.berlin/pages/menu) enthält Boy, P.Berg, Noma, Nano Plate und die beschriebenen Zutaten. [Startseite](https://www.gemello.berlin/) bestätigt pflanzliches Konzept und werktags 17 Uhr. Gründungsgeschichte/aktuelle gemeinsame Leitung Kugler-Gilony damit noch nicht eigenständig bewiesen.
- **Gut gedeckt:** [Slice Society](https://slicesociety.de/) bestätigt Pepperoni, Tomato Garlic und abgefüllten Hot Honey. [Eigene Geschichte](https://slicesociety.de/pages/about) bestätigt Alex/Marcus, Gründung 2023, Laden 2024, 48h-Teig und Torstraße. Regionaler Metzger nicht auf der gelesenen aktuellen Seite nachgewiesen.
- **Bestätigt:** [W Pizza Mitte](https://wpizza.de/locations/mitte/) bestätigt Standort, lange Stehtische und Turkish Delight mit Paprika-Tomate/Sucuk/Ei/Chiliöl. Hanf-Teig und heutige Rolle des Gründers sind damit noch nicht belegt. Den zentralen Hanf-Haken erst nach genauer Prüfung der aktuellen Teigwahl als bestätigt zählen.

## 6. Pizza, Patisserie, Sterneküche: So isst Berlin vegan

Sanity-ID: `news-vegane-restaurants-berlin`.

- Oukan und GEMELLO: aktuelle Gerichtsnennungen durch die oben verlinkten Eigenkarten weitgehend gedeckt. Oukans sechs Gänge nicht als dauerhafte Eigenschaft im Fließtext festschreiben.
- Bonvivant: heutige vegane Ausrichtung, Brunch und Michelin-Stern durch Eigenauftritt und [Michelins Reisebeitrag](https://guide.michelin.com/de/de/article/travel/2-tage-in-berlin-guide-michelin) bestätigt. Die Datierung ist **quellenintern widersprüchlich**: [Eigenbeitrag vom 17.09.2026](https://bonvivant.berlin/en/vegan-gastronomy-in-berlin-trend-over-or-just-the-beginning.htm) sagt Dinner vegan seit Anfang 2025, Brunch seit 2026; [anderer Eigenbeitrag](https://bonvivant.berlin/en/vegan-michelin-star-restaurants-germany.htm) sagt vollständig seit Januar 2026. Artikel „ganze Karte seit Anfang 2026“ ist mit der differenzierten Lesart vereinbar, kein sicherer Fehler. Minimal ohne Umstellungsjahr formulieren. [Michelin dokumentierte den Grünen Stern 2025](https://guide.michelin.com/de/de/article/michelin-guide-ceremony/14-neue-grune-sterne-bereichern-deutschlands-gastro-szene); heutigen Award nochmals explizit im Profil prüfen.
- Brammibal’s: [aktueller eigener Auftritt](https://www.brammibalsdonuts.com/) bestätigt Berlin/Hamburg/BER, Strawberry-Sprinkles-Spende 50 Cent, seit 2018 über 500.000 Euro. Diese veränderlichen Beträge sind gegenwärtig gedeckt, gehören aber nach Projektregel nicht dauerhaft in den Fließtext. Gründung 2015/2016 und europäischer Erstanspruch wurden nicht gegen zwei Quellen neu geprüft.
- Soi & Co.: aktuelle Eigenquelle für Gründer/Steinmühlen/Tofu-Cheesecake noch offen. Kein belastbarer Aktualitätsgegenbeweis, aber kein Freigabevermerk.

## 7. Prenzlauer Berg: Holzofen, Pizza, handgezogene Nudeln

Sanity-ID: `news-restaurants-prenzlauer-berg`.

- GEMELLO-Gerichte gedeckt; Gründerrollen siehe Pizza-Guide.
- [ITA](https://www.ita-berlin.de/de/) bestätigt Lettestraße 9 und Do–Mo 18–23, also Dienstag/Mittwoch zu. Personendetails und Zander sind noch nicht aus aktueller Eigenkarte belegt.
- The Grain: Technik und Personen Sarah/Musa gedeckt; heutiges Vorspeisenangebot noch offen.
- November: Konzept, The Catch Family und Adresse gedeckt; historische Bib-Quelle vorhanden, aktueller Awardstatus noch nicht abschließend bestätigt.
- [otto](https://www.otto-berlin.net/) bestätigt Adresse und eigene Verbindungen zu Pluto, Trio und Tagescafé bravo. Die konkrete 19-Plätze-Zahl, heutige Beschaffungsaufteilung und Noma-Biografie brauchen zusätzliche aktuelle/zeitgenössische Originalbelege.
- [Jolie](https://jolie-berlin.com/) bestätigt Wörther Straße 35, Catch Family und Dienstag geschlossen. Menü-Link wurde im Textabruf nicht als Karte aufgelöst; Pastete, Pfifferling-Wolfsbarsch und Sticky Toffee deshalb nicht als aktuell bestätigt zählen.
- **Osmans Töchter ist in den geprüften Punkten korrekt:** [eigene Geschichte](https://osmanstoechter.de/en/about-us/) und [Impressum](https://osmanstoechter.de/impressum/) bestätigen Frühjahr 2026, Bötzow und Arzus alleinige Leitung. [Karte 2026|002](https://osmanstoechter.de/wp-content/uploads/2026/06/OT_Speisekarte_DE_2026.pdf) bestätigt Menüs **ab vier**, Weinblätter mit Sauerkirschen/Pinienkernen/Zimt, Rinderfilet-Tatar und vegetarisch/vegane Option. Ab zehn auf der Gruppenreservierungsseite betrifft einen anderen Ablauf und ist **kein** Gegenbeweis gegen ab vier. Halal nennt die [Kartenseite](https://osmanstoechter.de/karte/) ausdrücklich.
- [Wen Cheng selbst](https://www.wenchengnoodles.com/de/about) nennt Rui und Peng **sowie Partner Valentin** bei der Gründung 2021. Zwei Brüder im Artikel sind nicht falsch, aber die Gründerbeschreibung ist verkürzt. Datum Juni und gegenwärtige Nudelvarianten/Reservierungsregel noch offen.

## 8. Schnitzel, Backhendl, noch ein Bier

Sanity-ID: `6017b98a-4381-44b6-b8cc-80985823e8e1`.

- [Trio](https://www.trioberlin.net/) bestätigt Linienstraße 13 und Mittags-/Abendbetrieb; die gegenwärtige Küche/Gründeraufstellung wurde noch nicht gegen aktuelle Karte/Impressum vollständig geprüft.
- [Henne](https://henne-berlin.de/) bestätigt Jungmasthähnchen, Leuschnerdamm 25 und Garten unter Linden. Die 1908-/Kennedy-Geschichte, Rezept/Beilagen und telefonische Reservierung ab 16 Uhr sind über diese Startseite nicht bewiesen; eigene Unterseiten noch prüfen.
- [Diener](https://diener-berlin.de/) bestätigt Mo–Sa ab 18 Uhr und sonntags geschlossen. Die vollständige aktuelle Speisekarte war im gelesenen Starttext nicht sichtbar; Klopse nicht allein aus Erwähnung eines Schnitzels ableiten.
- [Joseph-Roth-Diele](https://www.joseph-roth-diele.de/index.php/speisekarte/) bestätigt alle genannten Hauptgerichte und Kalten Hund; [Kontakt](https://www.joseph-roth-diele.de/index.php/kontakt/) bestätigt Di–Fr geöffnet. Küche 12–20 wurde nicht separat bestätigt (Kontakt nennt Gastraum 10–22). Diese beiden Zeitangaben sind kein direkter Widerspruch.
- Borchardts Homepage war fast ausschließlich bildbasiert; Gründung/Betreiber und heutiger Kartoffelsalat bleiben hier offen.
- [Jungbluth](https://jungbluth-restaurant.de/) bestätigt gemüsebetonte Küche, Herkunft, André Sawahn, neun Jahre Michelin-Auszeichnung ab 2015 und separaten Raum für zwölf Personen. Die Karte ist **ausdrücklich eine Beispielkarte**, keine Tageskarte. Aus ihr dürfen keine neuen heutigen Gerichte behauptet werden. Aktuelles Angebot „Jungbluths Wahl“ noch im vollständigen Menü abgleichen.

## 9. Schüsseldienst: Als ein Spitzenkoch beschloss, nur noch Schüsseln zu servieren

Sanity-ID: `news-schuesseldienst-schoeneberg`.

- **Korrigieren:** Gerichtszusammensetzungen siehe wichtigste Befunde. Auch die beschreibenden Folgeabsätze bauen auf den alten Zutaten auf und müssen mit angepasst werden, nicht nur die Zutatenliste.
- **Bestätigt:** Die eigene Website deckt Felix Mielke, sieben Jahre Le Faubourg, Start 2019, Umzug Mai 2021/Akazienstraße 7, Selbstbedienung, Catering und 18 Stunden Garzeit. Milchreis/Salzkaramell/gebrannte Mandeln steht weiterhin auf der Karte. Historisches Interview zur Organisation samstags ist als 2019 datiert und wird durch eine neue Karte nicht falsch.
- Vorsicht bei Quellenalter: Im „Über uns“-Text steht noch sinngemäß „seit bald zwei Jahren“ nach dem Umzug 2021, obwohl die aktuelle Karte andere Gerichte zeigt. **Eine Seite kann gleichzeitig aktuelle Karte und alten Vorstellungstext enthalten.** Das Website-Copyright 2026 ist kein Beleg, dass der gesamte Inhalt 2026 geprüft wurde.

## 10. Torstraße: Vom Pizza-Slice bis zu drei Michelin-Sternen

Sanity-ID: `news-essen-torstrasse`.

- [Rutz-Eigenauftritt](https://rutz-restaurant.de/) bestätigt Natur & Aromen/Marco Müller. [Aktuelle Veranstaltungsseite für 15.11.2026](https://rutz-restaurant.de/event/rutz-feat-jordnaer-juke-box-heroes-mueller-und-vildgaard-am-herd/) bestätigt fortbestehendes Team Müller und Drei-Sterne-Niveau. Die genaue Rolle ist Küchendirektor/Executive Chef; [eigene Meldung](https://rutz-restaurant.de/update-auf-11-inspirationen-fuer-das-berlin-size-menue-im-rutz/) nennt **Dennis Quetsch als Küchenchef**. Minimal Artikel „Küchendirektor Marco Müller“ statt „Küchenchef Marco Müller“. Drei Sterne/Grüner Stern 2026 zusätzlich direkt bei Michelin abgleichen; Erstanerkennung 2020 wird vom Betrieb belegt.
- Slice Society: Gründer, 2023/2024, Adresse, 18-Zoll-Pizza und Hot Honey gedeckt (Quellen unter Pizza).
- Rram: Eigenauftritt nicht zuverlässig erreichbar, Personal/Tagesgerichte bleiben offen. AERA: Eigenauftritt nicht zuverlässig maschinenlesbar; „Kurfürst“ und heutiges Angebot bleiben offen.
- [Hokey Pokey](https://www.hokey-pokey.de/) führt Torstraße 141 weiterhin und nennt ab 05.10. aktualisierte Zeiten. Das bestätigt Standort, nicht die aktuelle Verfügbarkeit jeder Sorte.
- Standards derzeit von der [Filialseite](https://www.standard-berlin.de/) verlinkte [Torstraßen-Karte](https://www.standard-berlin.de/wp-content/themes/pizza/downloads/menu_mi.pdf) bestätigt **beide konkret genannten Pizzen samt Belägen**: Mortazza dell’Estate und L’Ape che Punge. Kein Aktualitätsfehler darin gefunden.
- Historische Torstraßen-Benennung/Zollmauer wurde hier nicht erneut geprüft.

## 11. İskender, Meze und Grill: Türkische Restaurants in Berlin

Sanity-ID: `news-tuerkische-restaurants-berlin`.

- Osmans Töchter: aktuelle Leitung, Umzug und benannte Gerichte gedeckt; Menüs ab vier sind nach aktueller Eigenkarte korrekt. Siehe Prenzlauer-Berg-Prüfung.
- Bursa Uludağ: verlinkte Primärquelle ist Instagram; die heutige konkrete Freitagsöffnung bis 3 Uhr wurde nicht belastbar ausgelesen. Bis Bestätigung Zeit entfernen statt ungeprüft wiederholen.
- Hasir: eigener Auftritt mehrfach 502; kein Schließungsbeleg. Historischer Erfinderanspruch wird im Artikel bereits als Anspruch dargestellt; heutige Halal-/Produktions- und Restaurantdetails brauchen neue Betriebsbelege.
- Imren: aktuelle Betriebsquelle für zertifiziertes Lamm-/Kalbfleisch, Eigenproduktion und Brotbäckerei noch offen. Gerade **Fleischart und Zertifizierung** nicht aus alten Medienbeiträgen als heute gültig übernehmen.

## Nächster sinnvoller Schritt

Zuerst die oben belegten Personal-/Karten-/Öffnungstagefehler minimal in DE und EN korrigieren. Bei den offenen Betrieben aktuelle Menüs/Buchungsseiten und Betriebs-Instagram prüfen; bei fehlender öffentlicher Evidenz gezielt eine Bestätigung vom Betrieb einholen (keine Nachricht wurde versandt). Bis dahin offen kennzeichnen oder unnötige schnell veraltende Details weglassen. Es gibt nach diesem Durchgang keine Grundlage für die Aussage „alle elf Artikel sind vollständig aktuell geprüft“.


---

# Aktualitätsprüfung Magazin – Teil B

Prüfdatum: 25.10.2026. Sanity: `ehwjnjr2/production`, `perspective: raw`. Die zwölf veröffentlichten Artikel an Position 12–23 nach `titleDe` wurden vollständig in DE und EN gelesen. Es wurde nichts veröffentlicht oder in Sanity verändert.

**Bedeutung des Ergebnisses:** Eine aktuell abrufbare Betriebswebsite ist kein Nachweis, dass jede Aussage eines Artikels aktuell ist. Unten stehen gezielt bestätigte Angaben, konkrete Abweichungen und Lücken. Undatierte Seiten belegen nur die derzeitige Selbstdarstellung. Fehlende Gerichte auf einer aktuellen Karte heißen „nicht mehr aktuell belegt“, nicht zwingend „nie mehr erhältlich“. Historische Besuchswertungen bleiben Ersans Aussagen. Öffnungszeiten und historische Eröffnungsdaten sind ohne zweite Quelle noch nicht redaktionell abgenommen.

## Vorrangige Korrekturen

1. **Kreuzberg-Guide:** Frithjof Gernentz steht auch hier in DE und EN, samt Zuschreibung der Fine-Dining-Techniken und alter Gerichte. Ronjas vom Nutzer bereitgestellte E-Mail widerlegt die aktuelle Personalzuschreibung direkt. Namen, alte Küchenzuschreibung und unbestätigte Gerichtsliste in diesem Guide ebenfalls korrigieren.
2. **Schöneberg-Guide:** Wels-Bowl und Kartoffel-Lauch-Stampf entsprechen nicht der derzeit veröffentlichten Schüsseldienst-Karte. Sie nennt Seelachs & Miso und Rinderschaufel mit Pilz-Polenta. Auch Teaser DE/EN nennt die Wels-Bowl. Quelle: [offizielle Karte](https://www.schuesseldienst-berlin.de/).
3. **Brunch-Guide:** Father Carpenter: „Shakshuka mit Spinat und Feta“ entspricht nicht der aktuellen Herbstkarte. Diese nennt Spinat, geröstete Aubergine und grünes Tahini. [Offizielle Herbstkarte, Dateiname 23.09.2026](https://cdn.shopify.com/s/files/1/0668/5065/2424/files/260923_Autumn_Menu_Print.pdf?v=1790413920).
4. **Mitte-Guide:** „Unter der Woche erst ab 17 Uhr“ bei Standard Torstraße ist zu pauschal: offizielle Site nennt Freitag bereits 13 Uhr. Satz am besten streichen, statt sämtliche Zeiten in den Artikel zu übernehmen. [Standorte und Zeiten](https://www.standard-berlin.de/).
5. **Kreuzberg-Guide:** Micha Schäfer wird als aktueller Küchenleiter dargestellt; auf seiner eigenen Seite nennt er seine heutige Rolle **Creative Culinary Director**, nachdem er zuvor Head Chef war. Vorschlag: „Die kulinarische Leitung liegt bei Micha Schäfer.“ [Persönliche Primärquelle](https://www.schaefer-micha.com/). Keine Behauptung über einen neuen Küchenchef ergänzen.
6. **Schöneberg-Guide Bonvivant:** Elias Heintz ist als heutiger Barchef veraltet. Die aktuelle [Betriebsseite zur Bar](https://bonvivant.berlin/en/liquid-fine-dining-the-bar-of-bonvivant.htm) nennt ausdrücklich **Martin Wolf** als Leiter. DE und EN auf Martin Wolf ändern oder die Personalnennung weglassen.

## 1. Döner in Berlin: Wo ich hingehe

Sanity-ID: `c67d1617-b156-44c7-9c80-8af66553ffb7` · Slug `drei-doener-berlin`.

- **Keine vollständige aktuelle Quellenabnahme.** Die hinterlegte Hasir-Website lieferte beim Direktabruf einen 502-Fehler; Uludağ hat eine Instagram-Quelle, Imren keine Website im Datensatz. Das reicht weder zum Bestätigen noch Widerlegen der aktuellen Küchenangaben.
- Offene und besonders zeitkritische Aussagen: Uludağ-Inhaber steckt „jeden Tag“ selbst und ohne ihn kein Döner; Imren unbegrenzt Tee; konkrete Fleischmarinade; aktuelle Dönerpreise. Diese Angaben brauchen aktuelle Betriebsbestätigung oder eine belegte Datierung von Ersans Besuch. Die persönlichen Erinnerungen und Geschmackseindrücke sind davon zu unterscheiden.
- Die Döner-Erfinderlegende ist im Artikel bereits ausdrücklich als strittige Legende markiert. Keine neue historische Gewissheit daraus machen.
- Minimaler Vorschlag: „Bei meinem Besuch …“ nur mit Ersans tatsächlichem Besuchsdatum; sonst die universellen Betreiber-/Tee-Zusagen weglassen. Preise als historische Beobachtung datieren, nicht automatisch ändern.
- Geprüfter Endpunkt: [Hasir](https://www.hasir.de/) (Abruf fehlgeschlagen). Hinterlegte Betriebsquelle: [Uludağ Instagram](https://www.instagram.com/uludagkebapcisi_berlin/?hl=de).

## 2. Ein Tag in Schöneberg: Kaffee, Hunger, letzter Drink

Sanity-ID `news-essen-trinken-schoeneberg`.

- **Konkrete Kartenabweichung:** Schüsseldienst führt derzeit keine Wels-Bowl. Fischgericht ist Seelachs & Miso mit Blumenkohl-Kokos-Püree, Spinat, Buchenpilzen, Soja-Sesam-Aubergine und Wasabi-Mayo. Rinderschaufel weiterhin 18 Stunden gegart, inzwischen mit Pilz-Polenta, Mais und Pilzen. Felix Mielke, seine sieben Le-Faubourg-Jahre, Akazienstraße 7, Umzug Mai 2021 und Selbstbedienung bestätigt die [Betriebswebsite](https://www.schuesseldienst-berlin.de/). Der historische Vorstellungstext enthält selbst noch „seit bald 2 Jahren“ und ist erkennbar älter als die Karte: auch eine Betriebswebsite hat unterschiedliche Aktualitätsstände.
- Minimaler Ersatz DE: „Die Rinderschaufel wird 18 Stunden gegart und kommt mit Pilz-Polenta, Mais und Pilzen. Beim Fisch gibt es derzeit Seelachs mit Miso.“ EN sinngemäß; Teaser „Wels-Bowl“ durch „Rinderschaufel“ ersetzen. Für dauerhaften Text den Saisonbezug besser offen halten.
- Gorilla: Schöneberg-Brunch, Shakshuka Toast, Spanish Omelette und keine Reservierungen stehen auf der [offiziellen Küchenkarte](https://gorilla-baeckerei.de/kueche). EUREF-Standort bestätigt die [Standortseite](https://gorilla-baeckerei.de/locations). Eröffnung 13. April 2022 ist zusätzlich beim [EUREF selbst](https://euref.de/gorilla-baeckerei-jetzt-auch-in-schoeneberg/) belegt. **Keine aktuelle Menüabweichung** bei den im Guide genannten Gerichten festgestellt.
- Frühstück 3000: Chicken 3000 mit Cheddarwaffel sowie Steak Tatar mit gebeiztem Eigelb und Wasabi-Erdnüssen stehen auf der [Schöneberger Karte](https://fruehstueck3000.com/en/menu/); aktuelle Reservierungsempfehlung am Wochenende auf der [Startseite](https://fruehstueck3000.com/en/). Gegenwärtige Rollen aller drei Gründer nicht separat belegt.
- DoubleEye: [offizielle Seite](https://doubleeye.shop/) bestätigt Mo–Fr 8.19–18.29, **Samstag aber 8.33–17.57**. Der unbeschränkte Satz „Öffnungszeiten enden … um 18.29“ ist unpräzise. Minimal „Unter der Woche endet der Tag um 18.29 Uhr.“ oder genaue Zeit streichen.
- Victoria: Wochenende bis 4 Uhr bestätigt die [Betriebsseite](https://victoriabar.de/welcome); Historie, Brand/Wiederöffnung und Jackie-Brown-Rezept noch offen.
- Jones: Goltzstraße und eigene tägliche Eisproduktion bestätigt [Website](https://www.jonesicecream.com/) / [Eis-Seite](https://www.jonesicecream.com/icecream). Die absolute Aussage „ohne Ei“ sowie Meistertitel und Ritz-Vergangenheit sind dort nicht belegt; gerade „ohne Ei“ nicht als pauschale Allergenauskunft absichern.
- Bonvivant: heutiges veganes Dinner und Brunch bestätigt [Betriebsseite](https://bonvivant.berlin/en/welcome.htm). Datierung widersprüchlich: [eigene FAQ](https://bonvivant.berlin/de/kontakt.htm) sagt Dinner und Brunch seit 2025; die [eigene Bar-Seite](https://bonvivant.berlin/en/liquid-fine-dining-the-bar-of-bonvivant.htm) nennt vollständig vegan Anfang 2026, wie externe Pressemitteilung vom Februar 2026. Daher nicht einfach 2026 durch 2025 ersetzen: Übergangsdatum weglassen oder beim Betrieb klären. **Elias Heintz als aktueller Barchef ist dagegen widerlegt:** dieselbe aktuelle Bar-Seite nennt Martin Wolf als Leiter. In beiden Sprachen entsprechend ersetzen. Auch Betriebsquellen untereinander auf Datum/Widersprüche prüfen.
- Jules [Website](https://www.jules-cafe.de/) und Fabelei [Website](https://www.fabelei.com/) waren im Web-Werkzeug nicht abrufbar. Deren aktuelle Rollen, Karte und Kartenzahlungsregel bleiben offen.

## 3. Ein Tisch für zwei: Date-Abende in Berlin

Sanity-ID `news-restaurant-date-berlin`.

- Joseph-Roth-Diele: sämtliche genannten Speisen und Desserts stehen auf der [offiziellen Karte](https://www.joseph-roth-diele.de/index.php/speisekarte/). Adresse und Di–Fr bestätigt [Kontakt](https://www.joseph-roth-diele.de/index.php/kontakt/). **Küchenschluss 20 Uhr ist dort nicht belegt**, nur Lokalöffnung 10–22 Uhr. Nicht aus Lokalzeit einen anderen Küchenschluss ableiten. Vorschlag: Behauptung „Küche schließt um 20 Uhr“ entfernen, bis sie bestätigt ist.
- VOLK: aktuelle [Website](https://volkmitte.de/) nennt weiterhin Margaux Arabian, Oliver Chesler, französische täglich wechselnde Küche und Brunnenstraße 182. Januar 2019 und Mutterbeziehung stehen dort nur in eingebetteten älteren Pressezitaten, nicht als frisch datierte Teaminfo. Selbstimport der sämtlichen genannten Meeresfrüchte/Weine und Vintage-Durchgang nicht aktuell primär belegt. Kein konkreter Widerspruch gefunden, aber keine Vollfreigabe.

## 4. Gazzo: Wie ein Norweger die Pizza nach Neukölln brachte

Sanity-ID `news-gazzo-pizza-neukoelln`.

- **Viele Kernaussagen aktuell bestätigt:** Sauerteig, lange Fermentation, 400 °C, Mozzarella aus Brandenburg, Softeismilch aus Nordfriesland, Katie’s-Blue-Cat-Shortbread, Olivenöl/Salz und alle im Text genannten Pizza-Kombinationen stehen in der [offiziell verlinkten Karte vom Dateinamen 26.09.2026](https://www.gazzopizza.com/_files/ugd/c3e429_d3cad4bdd84a4fb6b78d6e9801a812e5.pdf). „Sin Win“ bestätigt die [Website](https://www.gazzopizza.com/).
- **Abweichung im Getränkedetail:** Artikel wiederholt „Prosecco vom Fass“. Aktuelle Karte nennt als Schaumwein Cava, während Sangiovese und Chardonnay als Fassweine markiert sind. Die Homepage nennt Prosecco allgemein, aber nicht Fass-Prosecco. Minimaler Vorschlag: „Wein“ statt „Prosecco vom Fass“; Fassbehauptung bis zur Betriebsbestätigung streichen.
- Offen: beide Gründerbiografien, Eröffnung September 2018, aktueller Betrieb durch die genannten Gründer, Bio-Mehl, konkrete Burrata-Herkunft. Karte belegt ausdrücklich Büffelmozzarella, nicht pauschal alle Burrata aus demselben Hof. Nicht als widerlegt behandeln; diese Detailbehauptungen jedoch nicht als aktuell nachgewiesen melden.

## 5. Griechisch in Berlin: Ein Tisch voller kleiner Teller

Sanity-ID `6a412d4f-b536-4874-b15a-78f7aaab3e22`.

- [File-Asto-Betriebsseite](https://file-asto.com/) bestätigt Geschäftsführer Solomon Papadopoulos/Alexios Vezakiadis sowie Kollwitzstraße 26 und Taverna Reichenberger Straße 125. Sie bietet keine lesbare Karte und kein Eröffnungsdatum.
- Offen: aktuelle Menüdetails der Weinbar, drei Papierpäckchen und weitere Gerichte in der Taverna, Eröffnung März 2026; Infatuation-Aufnahme müsste beim Herausgeber geprüft werden. Die sehr exakten gegenwärtigen Gerichte sind mit dieser schmalen Website nicht abgesichert.
- Philomeni’s/Greek Delicious: keine eigene Website hinterlegt oder belastbare aktuelle Primärkarte in dieser Prüfung gefunden. Betreiberwechsel/Ruhestand und konkrete Tagesgerichte daher offen.
- Minimaler Vorschlag: Vor einer Neufassung aktuelle Karte der beiden File-Asto-Standorte und Greek Delicious einholen; keine neuen Köche oder Gerichte aus alten Presseporträts übernehmen. Noch keine hinreichend belegte inhaltliche Neufassung.

## 6. Gut essen in Berlin-Mitte: Restaurants, Cafés und Weinbars

Sanity-ID `news-restaurants-mitte`.

- **Bestätigt:** Slice Society: Gründer Alex/Marcus, 2023, New-York-Stil, Cheese/Pepperoni/Vodka/vegan Tomato Garlic und eigener Hot Honey über [aktuelle Betriebsseite](https://slicesociety.de/). 48 Stunden Gärzeit auf der gelesenen Homepage nicht belegt.
- Kolo: Gründername, Titel und Bedeutung des Namens über [About](https://kolocoffee.eu/pages/about); Rösterei, Single Origins/Microlots/Competition-Auswahl über [Shop](https://kolocoffee.eu/). Gründungsjahr 2024 und Zeitpunkt des Umzugs nicht dadurch belegt.
- Bar Basta: Casa Camper bestätigt [auf eigener Seite](https://www.casacamper.com/de/berlin/eat-and-drink/) Standort im Erdgeschoss, Wochenendbrunch im New-York-Stil und Marktküche. Seite nennt auch Lunch, sodass „unter der Woche abends“ keine vollständige Darstellung ist, jedoch nicht ausdrücklich falsch. Preis/Award/Gründerrollen dort nicht belegt.
- Oukan: vegan, Fermentationslabor und Tees aus Japan/China/Taiwan bestätigt [offizielle Seite](https://www.oukan.de/en/). [Menüseite](https://www.oukan.de/menue/) nennt vier/sechs Gänge, englische Homepage sechs bis acht und Bild-Alt-Texte teils fünf/sieben. Genaues Menüvolumen aus Fließtext streichen; „Menü mit Teebegleitung“ genügt.
- Distrikt: Frühstück/Lunch ganztägig und Fjord/wechselnde Röstereien/Companion-Tee bestätigt [Betrieb](https://www.distriktcoffee.de/); Frühstückssandwich mit Mortadella/Sriracha bestätigt [Karte](https://www.distriktcoffee.de/menu).
- **Korrektur Standard:** [offizielle Zeiten](https://www.standard-berlin.de/) Torstraße So–Do ab 17, Fr–Sa ab 13. „Unter der Woche erst ab 17“ streichen oder auf Mo–Do beschränken. Vier Standorte insgesamt; Text behauptet keine falsche Gesamtzahl.
- Saveur: [Betriebsseite](https://saveur-banhmi.com/) verlinkt Berlin/Hamburg/Frankfurt. Genau zwei Sandwiches, Brot, Sonntagsruhetag nicht abgenommen.
- Offen ohne hinreichende aktuelle Primärquelle: SOFI-Betreiber-/Getreidedetails, W-Pizza-Hanfteig und genannte Beläge, Freundschaft-Gründerrollen/800 Weine/Zeiten. Keine automatische Fortschreibung der alten Absätze als „frisch geprüft“.

## 7. Kaffee in Berlin: Kleine Röstereien und gute Cafés

Sanity-ID `news-beste-cafes-berlin`.

- Kolo: aktuell sogar kolumbianischer Herera Geisha im [Shop](https://kolocoffee.eu/); allgemeine Rohkaffee-Auswahl bestätigt, kein Anlass einen bestimmten wechselnden Lot dauerhaft einzubetonieren.
- Bonanza: [Betriebsseite](https://bonanzacoffee.de/) bestätigt seit 2006, Röstung Berlin und Europaversand. Historische Gründerbegegnung und ursprüngliche Adresse wurden nicht erneut belegt.
- DoubleEye: Mo–Fr-Zeiten passen exakt zur [offiziellen Seite](https://doubleeye.shop/). Gründungsjahr und Champions-Titel noch zweite Quelle/Veranstalter nötig.
- Companion: [offizielle Kontaktseite](https://retail.companiontea.com/de/pages/contact) bestätigt Weserstraße 166 und Betreiber Barber/Onton. Historie 2013/2018, Herkunftsstädte und Rückverfolgbarkeit jedes aktuellen Tees nicht auf dieser Seite belegt.
- Distrikt: aktuelle Frühstücksteller-Zutaten und Kaffee-/Teelieferanten stimmen mit [Karte](https://www.distriktcoffee.de/menu) und [Startseite](https://www.distriktcoffee.de/) überein.
- BEN RAHIM: 2015 in Berlin, Cezwe als zentrales Getränk und zuckerfreie Philosophie bestätigt [eigene Markenseite](https://benrahim.com/). Frühere The-Barn-Anstellung/Brisbane nicht erneut belegt.
- Oslo: ursprüngliche vom Datensatz verlinkte `.co`-Domain war nicht abrufbar. Eine unter Oslo firmierende [Squarespace-Seite](https://disha-lundberg.squarespace.com/) erklärt Eröffnung Juli 2012, eigenes Rösten, Gebäck, Vinyl, Eichendorffstraße 13. Betreiberzuordnung dieser Domain nicht unabhängig abgesichert; **nicht als endgültige Primärverifizierung behandeln**. Eine zusätzlich gefundene `.com`-Site enthält auffällig generische Gesundheits-/Kaffeebehauptungen und wurde ausdrücklich nicht als belastbare Betriebsquelle verwendet.
- Concierge: [offizielles Impressum](https://www.conciergecoffee.de/impressum) bestätigt Benjamin Pates und Namdar Nosratifard. Die Gründung 2014 ist fragwürdig: 2014er zeitnahe Presseberichte sprechen bereits von Eröffnung im Sommer davor, also 2013. Ohne heutige Primärbestätigung hier **Prüfhinweis, keine bewiesene Datumsberichtigung**. Minimal: Jahreszahl weglassen. [Aktuelle Betreiberwebsite](https://www.conciergecoffee.de/) liefert ansonsten kaum Text.
- Akkurat: Besselstraße 13, aktueller Cafébetrieb und Zugehörigkeit zu Akkurat Studios bestätigt [offizielle Website](https://akkurat.cafe/). Gründer, Möbelherkunft, Eröffnung 2021 und gegrillte Sandwiches offen.
- Nicht hinreichend aktuell verifiziert: Jules, The-Barn-Gründungshistorie, Five-Elephant-Umbau 2025/Röstereiort, westberlin-Umzug/Dachterrasse, WIM-Inhaberin/2014/Apfeltarte. [Five-Elephant-Shop](https://www.fiveelephant.com/) bestätigt weiter Cheesecake, aber nicht sämtliche Umbaudetails. Für WIM und westberlin wurden nur sekundäre aktuelle Treffer gefunden; keine Scheinsicherheit daraus.
- Minimaler Textbedarf: unsichere Concierge-Jahreszahl entfernen; aktuelle Betriebsrollen und Bau-/Umzugsgeschichten nur nach Primärbestätigung beibehalten. Kein Artikel als insgesamt aktuell abgenommen.

## 8. Kantstraße: Hundert Jahre, acht Restaurants und ziemlich viel gutes Essen

Sanity-ID `news-restaurants-kantstrasse`.

- Ottenthal: Adresse, seit 1994, Lunch/Dinner über [Betrieb](https://www.ottenthal.com/). Die [aktuell verlinkte Oktoberkarte 2026](https://www.ottenthal.com/wp-content/uploads/2026/10/Menue-Ottenthal-Restaurant-Berlin-Oktober-I-26.pdf) ist ein besserer aktueller Kartenbeleg als frühere Porträts. Darin keine Kürbissuppe und kein Bauernschinken gefunden; Blauensteiner wird bei Debrezinern genannt. Diese Gerichte deshalb nicht als festes heutiges Angebot behaupten. Minimal nur das konkret aktuell belegte Schnitzel nennen, weitere Gerichteliste streichen.
- Kuchi: [Betriebsseite](https://kuchi.de/restaurant/kant/) und [2026er Karte](https://kuchi.de/wp-content/uploads/2026/03/KUCHI_Kant_2026_DE.pdf) bestätigen Makrele vom Robata, Hühnerschenkel, Hühnerhaut, Tokyo Carbonara mit Guanciale/Eigelb/Parmesan. Keine aktuelle Kartenabweichung in diesen Details. Umbaujahr und historische Gründung nicht neu abgenommen.
- FunkyFisch: Fisch-Auslage, mediterran/asiatische Verbindung über [Betrieb](https://neu.funky-fisch.de/). [Direkt verlinkte Karte](https://neu.funky-fisch.de/wp-content/uploads/2024/02/FF_Menu2024_WEB_EN.pdf) bestätigt Bouillabaisse, Fisch-Buns/Hoisin und Gambas al Ajillo, trägt jedoch 2024 im Dateipfad: kein garantiert frisch datierter Menüstand.
- Comedor: [Betrieb](https://www.comedor.berlin/) bestätigt Esszimmer-Bedeutung, mexikanische Küche/europäischer Twist, regionale Zutaten und Kantstraße 74. Gründer-/Kochrollen sowie Aguachile/Mole-Amarillito-Kombinationen aktuell nicht auf der gelesenen Site bestätigt. Nicht als aktuelle feste Speisen fortschreiben.
- FúFú: [vom Betrieb verwendete Reservierungsseite](https://reservations.allo.restaurant/de/fufu-bistro) belegt Kantstraße 132, aber keine Köche oder Karte. Namen und aktuelle Gerichte weiter offen.
- Paris Bar: [offizielle Website](https://www.parisbar.net/) bestätigt Adresse 152, keine auslesbare aktuelle Karte. 893-Site Timeout; Madame Ngo nicht abrufbar. Keine Schließung daraus ableiten.
- Tientsin-/Legations-/Studierendenhistorie ist keine Frage tagesaktueller Küche, blieb aber in dieser auf aktuelle Betriebsfakten gerichteten Prüfung ohne historische Primärquellenabnahme. Nicht „vollständig faktisch geprüft“ melden.

## 9. Kaviar und Turkish Eggs: So frühstückt Berlin

Sanity-ID `news-bester-brunch-berlin`.

- **Korrektur Father Carpenter:** [Herbstkarte 23.09.2026](https://cdn.shopify.com/s/files/1/0668/5065/2424/files/260923_Autumn_Menu_Print.pdf?v=1790413920) nennt Shakshuka mit Spinat, Aubergine und grünem Tahini, keinen Feta. Minimal DE „Shakshuka mit Spinat und gerösteter Aubergine“, EN „spinach and roasted aubergine shakshuka“.
- Turkish Eggs/Harissa, French Toast/Haselnüsse, F.C. Benedict/Pulled Pork, Dattelpudding, Geisha Flight und keine getrennten Rechnungen am Wochenende sind auf derselben aktuellen Karte bestätigt. Historische Gründer-/Röstereijahre separat offen.
- Distrikt: gesamte im Guide genannte Gerichtsauswahl passt zur [offiziellen Karte](https://www.distriktcoffee.de/menu).
- Frühstück 3000: [aktuelle Karte](https://fruehstueck3000.com/en/menu/) bestätigt Chicken 3000, Tatar, Pilz-Langos, Eggs Benedict Kaviar und Crème-brûlée-French-Toast mit Rhabarber. Rollen aller drei Personen noch nicht aktuell abgenommen.
- Bar Basta: Wochenende/New-York-Brunch vom [Hotel selbst](https://www.casacamper.com/de/berlin/eat-and-drink/) bestätigt; O.D.B.-Sandwich, genaue Startzeit und Award nicht durch diese Seite bestätigt.
- Venue: keine eigene Website im Datensatz; die genaue aktuelle Fünf-Kategorien-Logik und Steglitz-Betrieb wurden hier nicht primär abgenommen. Kein neuer Sachverhalt erfunden.

## 10. Kolo Coffee: Wo ich jetzt meinen Kaffee trinke

Sanity-ID `news-kolo-coffee-berlin`.

- Gründer Vladyslav Demonenko, Coffee-in-Good-Spirits-Vizetitel 2022, ukrainischer Brewers Cup 2023, Namensbedeutung und Berliner Rösterei stehen auf [eigener About-Seite](https://kolocoffee.eu/pages/about). Für Auszeichnungen nach Projektregel noch Veranstalterquelle als zweite Bestätigung erforderlich.
- Rohkaffee-Spektrum und Competition-Kaffee durch [Shop](https://kolocoffee.eu/) bestätigt.
- Nicht aktuell primär bestätigt: Titel „bester Specialty Coffee Shop“ bei Berlin Coffee Week 2025, WLAN/Arbeitsregel, genau eine Espresso-Sorte, V60/Batch Brew als aktuelles Angebot. Ersans Cappuccino-/Filtererlebnis ist seine Besuchsbeobachtung und braucht keine nachträgliche Umdeutung.
- Minimaler Vorschlag: absolute Ein-Sorten-Aussage gegebenenfalls als Besuchsbeobachtung datieren; Award erst nach Veranstalternachweis beibehalten. Keine belegte neue Personal- oder Konzeptänderung festgestellt.

## 11. Kreuzberg hat Hunger: Tacos, Brathähnchen, große Küche

Sanity-ID `news-restaurants-kreuzberg`.

- **Gri Gri: gesicherter Korrekturbedarf in DE/EN** aufgrund Ronjas vom Nutzer weitergeleiteter Mail. Nicht nur Namenssatz entfernen: Fine-Dining-Zuschreibung und alte Aubergine-/Vitello-Gerichte repräsentieren möglicherweise ebenso das frühere Konzept. Aktuell teamgeführte Küche als neue primäre Betreiberangabe verwenden; keine neue Gerichteliste ohne Karte.
- **Nobelhart-Rolle präzisieren:** [Micha Schäfers eigene Website](https://www.schaefer-micha.com/) nennt ihn heute Creative Culinary Director statt Head Chef. Minimal „Micha Schäfer verantwortet die kulinarische Ausrichtung“. [Restaurant selbst](https://nobelhartundschmutzig.com/en/) bestätigt lokale Philosophie, Start Februar 2015, offene Küche und lange Theke. Sein Text führt auch einen großen Gemeinschaftstisch, was dem Artikel nicht widerspricht.
- **Zeiten widersprüchlich:** Restaurant-Haupttext nennt Di–Sa, Footer Mo–Sa; [Michelin](https://guide.michelin.com/de/de/berlin-region/berlin/restaurant/nobelhart-schmutzig) ebenfalls Mo–Sa. Deshalb „geöffnet Di–Sa“ im Guide nicht als sicher aktuell melden; weglassen oder direkt klären. Michelin bestätigt regionale Küche/Billy Wagner/Micha, aber Berufsrollen sind gegenüber dessen Eigenaussage zu gewichten.
- Kanal61: [offizielle Site](https://kanal61berlin.de/) nennt aktuell Do–So ab 18 Uhr. **Wochenendmittagsöffnung nicht belegt**, diese Aussage entfernen bis bestätigt. Menüs wechseln saisonal laut [offiziellem Event-PDF](https://kanal61berlin.de/wp-content/uploads/2025/07/KANAL61-EVENTS-FILE.pdf); die genannte feste Sardinen-/Ricotta-/Tatar-Liste nicht als heutige Karte abgesichert.
- Boii Boii: [Betrieb](https://www.boiiboii.com/home) bestätigt Thai-Küche und Lausitzer Straße 25, keine lesbare Karte. Pla Tod/Cheesecake/Austern und Teamrollen offen. Infatuation-Ehrung nur beim Herausgeber prüfen, keine Primärbestätigung aus Restaurant-Homepage.
- Tacos el Rey: [Betrieb](https://www.elreyberlin.de/) bestätigt frische Nixtamal-Tortillas vor Ort und stellt ein „Menu May 2026“ als Bild bereit. Farbangabe blauer Mais und komplette Gerichte nicht anhand des ausgelesenen Texts bestätigt. Keine Behauptung, Menübild sei bereits vollständig visuell geprüft.
- Henne: [Betriebsseite](https://henne-berlin.de/) bestätigt Jungmasthähnchen und Linden; [Über uns](https://henne-berlin.de/ueber_uns.html) und [Karte](https://henne-berlin.de/speisekarte.html) liefern teils Bildinhalt. Kennedy-Brief/Mauerabstand und Detailbeilagen nicht aus lesbarem Text bestätigt, daher offen.
- St. Bart: keine Betriebswebsite im Datensatz; Team und aktuelle Sunday-Roast-/Brick-Chicken-Verfügbarkeit nicht primär abgenommen.

## 12. Neukölln zum Teilen, Schlemmen und Sitzenbleiben

Sanity-ID `news-restaurants-neukoelln`.

- Barra: Bib Gourmand seit 2020, Okerstraße 2, Remers/Westhead als Firmierung auf [offizieller Site](https://www.barraberlin.com/). Aktuelle Öffnung Mo–Fr und Hamachi-/Pasta-Angaben dort nicht verfügbar. Bib zusätzlich bei Michelin abnehmen.
- Feed the Pony: Konzept, drei Gründerherkünfte, Hannah/Martin, VAU/Noma/Barr-Vergangenheit, fünf Gänge, Schillerpromenade 37 und Fr–So sind ungewöhnlich ausführlich auf [Betriebsseite](https://www.feedthepony.de/) bestätigt. Site stellt Hannah als am Herd stehend vor, Martin als Gastgeber; Maja wird als Gründerin/Partnerin erwähnt. Artikelsatz „Hannah, Martin und Maja kochen seit …“ kann fälschlich drei aktuelle Köche suggerieren. Minimal „Gegründet haben …; in der Küche steht Hannah.“ Keine erfundene Aussage, Maja habe den Betrieb verlassen.
- CODA: René Frank, Patisserie-Techniken und zwei Sterne auf [Betriebsseite](https://coda-berlin.com/). **Eigene Website widerspricht sich beim Ruhetag**: einmal Mi–Sa, im zweiten Footer Di–Sa. „Nur Mi–Sa“ deshalb entfernen oder direkt bestätigen. Artikel-Spekulation von Berlin Food Stories über möglichen dritten Stern ist keine Auszeichnung; aus Aktualitätssicht besser streichen. Auszeichnung 2022 beim 50-Best-Veranstalter noch separat verifizieren.
- Gazzo: Spianata-Calabrese-Pizza/Büffel-Burrata/Pimientos und Softeis aktuell durch [Septemberkarte 2026](https://www.gazzopizza.com/_files/ugd/c3e429_d3cad4bdd84a4fb6b78d6e9801a812e5.pdf) bestätigt. Herkunftsdetails und technische Temperatur siehe Gazzo-Einzelartikel.
- AVIV: [Betriebsseite](https://aviv030.com/) bestätigt Richardstraße 76 und die im Text genannten Mittag-/Abendtage. Konkrete Sabich-/Shakshuka-/Kibbeh-Liste hat keine auslesbare aktuelle Karte; nicht vollständig verifiziert.
- Knödelwirtschaft Süd: [aktuelle Betriebsseite](https://www.knoedelwirtschaft.de/en/sued) bestätigt Fuldastraße 33, Knödelduo/zusätzliche Knödel und veganen Rote-Bete-Knödel. Historie Sommer 2013/Wohnungsdinner nicht erneut primär belegt.
- Kitten: [offizielle Site](https://kittendeli.de/) lieferte keinen auslesbaren Text. Gegenwärtige Küchenrolle Yuval Belhans, Mittwoch-Ruhetag und aktuelles Sabich-Rezept offen.
- Bari: Instagram als einzige hinterlegte Betriebsquelle; aktuelle Rolle von Virginia Vallesi und Karte nicht durch eine neue lesbare Primärquelle abgesichert. Im Bericht nicht als „aktuell bestätigt“ führen.

## Schlussfolgerung für die Redaktion

Abgleich mit `docs/research/magazin-artikel-2026-10-07.md`: Viele dort markierte Struktur-/Übersetzungsfehler sind im jetzigen Bestand bereits beseitigt (Date-Guide keine fünf Spots/Budgetbehauptung, Brunch fünf statt acht, Kaffee vierzehn statt fünfzehn, kein Museumscafé mehr, aktuelle Barra-Datierung, Bar-Basta-EN betreibt nicht mehr das Hotel). Als weiterhin offen bestätigt werden Kolo Coffee Week 2025/Brewers Cup-Veranstalternachweis, Imren-Tee/Marinade, Uludağ-tägliche Betreiberanwesenheit, Jones eifrei, Victoria-Brandgeschichte, Bari-Personal und volatile Gerichte. Der ältere Bericht nennt für Kolos Vizetitel eine zweite Primärquelle aus dem damaligen Coachingteam: [Röststätte](https://www.roeststaette.com/vlad-ist-vizeweltmeister-in-coffee-in-good-spirits-so-lief-der-wettbewerb/). Diese Quelle wurde in dieser Sitzung nicht erneut abgerufen und ist daher als früherer Beleg, nicht neue aktuelle Prüfung gekennzeichnet.

Alle zwölf Artikel sind in diesem Teil auf Aktualitätsrisiken gesichtet; **keiner erhält eine pauschale Faktenfreigabe**. Besonders relevant sind nicht nur Schließungen: alte Gerichte, universelle Küchen-/Barchefrollen und auf mehrere Seiten verteilte widersprüchliche Zeiten sind echte Risiken. Konkrete sofort vorbereitbare Minimaländerungen: Gri-Gri-Absatz im Kreuzberg-Guide; Schüsseldienst-Menü/Teaser; Father-Carpenter-Shakshuka; Standard-Zeit; Micha-Schäfer-Rolle; unbestätigtes Fass-Prosecco; pauschale DoubleEye-Schlusszeit. Offene Aussagen werden erst nach Betriebs-/Veranstalterbestätigung ersetzt, sonst gestrichen statt mit anderen alten Pressemeldungen aufgefüllt.
