# Magazin: Überarbeitung und Bestandsprüfung

Stand: 7. Oktober 2026. Inhaltliche Quelle: Sanity `ehwjnjr2/production`.

## Frühstückstitel erneut präzisiert

Auf Nutzerwunsch ersetzt durch „Hummer-Brioche und Çılbır: So frühstückt Berlin“; englisch „Lobster brioche and çılbır: Berlin does breakfast“. DE/EN und SEO veröffentlicht.

## Weitere Titelkorrektur: Kaffee, Wein, Frühstück, besondere Küchen und Mitte

Fünf Artikel nach erneutem Nutzerfeedback konkretisiert; „Berlin frühstückt länger“ und „Brunch ohne Eile“ waren ein gemeinsamer Titel. DE/EN und beide SEO-Titel mit Revisionsschutz gespeichert und veröffentlicht. Alle zehn öffentlichen Sprachseiten zeigen die neuen H1 nach signierter Cache-Revalidierung.

- Kaffee in Berlin: Kleine Röstereien und gute Cafés
- Berlins Weinbars: Gute Weine und was dazu auf den Tisch kommt
- Frühstück in Berlin: Acht Lokale und was du dort bestellst
- Oukan, Barra, NaNum: Berlins eigenwillige Restaurantküchen
- Gut essen in Berlin-Mitte: Restaurants, Cafés und Weinbars

## Nachkorrektur: Titel, Bilder und rechte Heftseite

Nach Nutzerfeedback wurden die Titel für Vegan, Italienisch, Türkisch und Donuts erneut präzisiert (DE/EN sowie SEO) und veröffentlicht. Die drei erstmals veröffentlichten Themenartikel Chinesisch, Griechisch und Knödel hatten kein Aufmacherbild; vorhandene Sanity-Assets von Wen Cheng, File Asto Taverna und Österelli wurden nach Sichtprüfung zugeordnet, mit Alt-Text versehen und veröffentlicht. Keine neue Bildgenerierung. Alle 30 veröffentlichten Artikel haben jetzt einen auflösbaren Bildverweis. Die sieben geänderten Artikel wurden auf allen 14 öffentlichen Sprach-URLs nach signierter Cache-Revalidierung geprüft; alle Titel und Bildverweise stimmen. Cover- und Artikelbilder auf 390px und 1440px erfolgreich geladen.

Die ursprüngliche iPhone-Aufblitz-Korrektur ist vom Nutzer als wirksam bestätigt. Der anschließend gemeldete schwarze Innenrahmen war in WebKit reproduzierbar: Ein hochformatiger Artikel ließ seitlich innerhalb der rechten Heftseite den dunklen Browsergrund frei. Eine eigene, mitbewegte Papierfläche unter dem Artikel füllt diese Lücken in der Artikelfarbe. Der dunkle Browsergrund bleibt bestehen. Pixeltest vor Änderung rot (rechter Rand RGB 11/10/8 statt Weiß), danach bei 390/1440px, Hell/Dunkel und sowohl ganz aufgeklappt als auch mitten im Zoom grün. Lifecycle-/Abbruchtests 14/14, Lint, Typecheck und isolierter Build erfolgreich; DE/EN-Navigation mit/ohne Reduced Motion und axe-Prüfung ebenfalls bestanden. Diese Animationskorrektur liegt lokal auf Port 3002, nicht als App-Deployment vor.

## Aktueller Veröffentlichungsstand

Auf ausdrücklichen Wunsch am 7. Oktober 2026 **alle 30 überarbeiteten Artikel veröffentlicht**, einschließlich der drei zuvor unveröffentlichten Artikel. Vor Veröffentlichung Draft-Revisionen mit dem geprüften Stand verglichen; beim Publish mit Revisionsschutz gearbeitet. Anschließend 30/30 veröffentlichte Sanity-Dokumente abgeglichen und **alle 60 öffentlichen Artikel-URLs (DE/EN)** erfolgreich auf HTTP-Abruf und korrekte neue H1 geprüft. Auch die Magazinübersicht zeigt die neue Crapulix-Headline.

Die vier Spot-Entwürfe bleiben unveröffentlicht; die Freigabe bezog sich auf Artikel. Lokale Layout-/Animationsänderungen wurden damit nicht deployt.

## Vorheriger Prüf- und Entwurfsstand

- Magazin-Aufmacher lokal überarbeitet: eigener Kopf mit „Auf dem Teller“ / „Wo Berlin gut isst.“ in Providence, darunter klar größere Artikelheadline und kleinerer, leichterer Einstieg. Desktop zweispaltig, Telefon untereinander. Lesbare Titel unter allen Archiv-Covern bleiben erhalten.
- Alle **27 veröffentlichten Artikel in DE/EN** gelesen; die **3 unveröffentlichten Themenentwürfe** zusätzlich auf Titel, Einstieg, Aufbau und Bestandsabdeckung geprüft. Die persönlichen Titel von Kolo und dem Döner-Text bleiben erhalten. **28 Headlines und Teaser in DE/EN überarbeitet**, SEO-Titel und Beschreibungen angepasst, Slugs unverändert.
- **30 Artikelentwürfe in Sanity gespeichert**, davon 27 neue Drafts bestehender Veröffentlichungen und 3 zuvor vorhandene Entwürfe weiterbearbeitet. **Nicht veröffentlicht.** Die normale Magazinseite liest weiterhin die veröffentlichten Texte; der neue Seitenaufbau ist unter `http://localhost:3002/news` sichtbar. Im Studio den jeweiligen Entwurf öffnen und „Vorschau“ verwenden.
- **15 Artikelkörper** mit gezielten DE/EN-Korrekturen geändert. Dazu zählen Romanname „Das Spinnennetz“, Imren, Date-Zählung/Budgetbehauptung, veraltete ORA-Angaben, Bonvivant vegan, Hokey-Pokey-Sorte, Hotelbetreiber-Fehlübersetzung, Cocolo-Brühenbehauptung und der falsche Mitte-Rahmen „nur im Stehen“. Rund **75 einzelne Block-/Passagenänderungen** im Änderungsprotokoll, zusätzlich die neue vegane Auswahl.
- Vegan-Guide enthält jetzt **6 statt 4 Orte**: Klinke entfernt; GEMELLO, Bonvivant und VEG’D mit eigenen Texten und Restaurantkarten ergänzt. Oukan, Soi & Co. und Brammibal’s bleiben. DE/EN-Karten identisch.
- **4 Spot-Entwürfe korrigiert**: Klinke als deutsche Küche statt vegan (auch Vegan-Tag entfernt); FREA veraltete 15-Uhr-Angabe aus der Beschreibung entfernt (strukturierte Zeiten waren schon 8–17 Uhr); Jolie unbestätigtes Wochenendfrühstück und Frühstücks-Tag entfernt; Bonvivant veraltete Gangzahl und widersprüchliche Eigelb-Signatur entfernt. Bestehender FREA-Entwurf wurde erhalten und gezielt geändert.

Keine pauschale externe Verifikation aller Texte oder Betriebe: 252 Spots wurden vollständig strukturell und gegen den Artikelbestand abgeglichen, 16 offizielle Betriebswebsites für Ergänzungen plus die im Faktenbericht genannten Primärquellen gezielt geprüft. Die Berichte unterscheiden bestätigte Fakten, redaktionelle Urteile und offene Behauptungen.

## Neue Headlines

| Bisher | Neuer Titel (DE) | Neuer Titel (EN) |
|---|---|---|
| Crapulix: Handgemachte Croissants und Canelés in Steglitz | Crapulix: Dieses Croissant braucht keine Füllung | Crapulix: A croissant that needs no filling |
| Französisch essen in Berlin: 5 Adressen | Bistro-Abende in Berlin: Austern, Wein und noch ein Gang | Bistro nights in Berlin: oysters, wine and one more course |
| Deutsche Küche in Berlin: 6 Adressen | Schnitzel, Backhendl, noch ein Bier | Schnitzel, fried chicken and another beer |
| Die 5 besten Pizzerien in Berlin – von Sauerteig bis NY-Slice | Pizza in Berlin: Luftiger Rand oder lieber ein Slice? | Pizza in Berlin: puffy crust or a New York slice? |
| Date in Berlin: Joseph-Roth-Diele und VOLK | Ein Tisch für zwei: Date-Abende in Berlin | A table for two: date nights in Berlin |
| Die besten Bäckereien in Berlin – und was du dort bestellst | Berlins Backstuben: Sauerteig, Butter, frühes Aufstehen | Berlin’s bakeries: sourdough, butter and early starts |
| Burger in Berlin: 6 Buden für verschiedene Lebenslagen | Berlin zwischen Smashburger und Mitternachtshunger | Berlin burgers, from smashed patties to late-night cravings |
| Kaffee in Berlin: 15 Cafés und Röstereien | Berlin, erst mal einen Kaffee | Berlin, let’s start with coffee |
| Cocktails in Berlin: 6 Bars für den Abend | Noch einen? Berliner Bars für lange Abende | One more? Berlin bars for a long evening |
| Japanisch essen in Berlin: 5 Adressen | Berlin auf Japanisch: Nigiri, Glut und Ramen | Japanese Berlin: nigiri, charcoal and ramen |
| Weinbars in Berlin: 9 Adressen | Ein Glas wird selten allein bleiben: Berlins Weinbars | One glass leads to another: Berlin’s wine bars |
| Brunch in Berlin: 8 Adressen für den Vormittag | Berlin frühstückt länger: Brunch ohne Eile | Berlin takes its time: brunch without the rush |
| Essen und Trinken in Schöneberg – 9 Adressen von acht Uhr morgens bis vier Uhr nachts | Ein Tag in Schöneberg: Kaffee, Hunger, letzter Drink | A day in Schöneberg: coffee, food and a final drink |
| Besondere Küche in Berlin: 7 Adressen | Berlins Küchen, für die man einen Abend freihält | Berlin kitchens worth making an evening of |
| Essen in Charlottenburg: 5 Adressen | Charlottenburg tischt auf: Sushi, Mole, Schnitzel | Charlottenburg serves up sushi, mole and schnitzel |
| Essen in Kreuzberg: 7 Adressen | Kreuzberg hat Hunger: Tacos, Brathähnchen, große Küche | Hungry in Kreuzberg: tacos, crispy chicken and tasting menus |
| Essen gehen in Mitte – die 10 besten Adressen zwischen Torstraße und Weinbergspark | Mitte mit Appetit: Vom Pizza-Slice bis zum Menü | Hungry in Mitte: from a pizza slice to a tasting menu |
| Essen in Neukölln: 8 Adressen | Neukölln zum Teilen, Schlemmen und Sitzenbleiben | Neukölln for sharing plates and lingering over dinner |
| Essen in Prenzlauer Berg: 8 Adressen | Prenzlauer Berg: Holzofen, Pizza, handgezogene Nudeln | Prenzlauer Berg: wood-fired dinners and hand-pulled noodles |
| Vegan essen in Berlin: 4 Adressen | Vegan in Berlin: Vom ersten Bissen bis zum Menü | Vegan Berlin: from a quick bite to a tasting menu |
| Vietnamesisch essen: Madame Ngo und Saveur de Bánh Mì | Phở oder Bánh Mì? Berlin auf Vietnamesisch | Phở or bánh mì? Vietnamese food in Berlin |
| Eis in Berlin: 8 Adressen von Waffel bis Softeis | Berlin schleckt: Von Miso-Caramel bis Büffelmilch | Berlin scoops: from miso caramel to buffalo-milk soft serve |
| Italienisch essen in Berlin: 6 Adressen jenseits der Pizza | Berlin auf Italienisch: Pasta, Wein, noch ein Teller | Italian Berlin: pasta, wine and another plate |
| Türkisch essen in Berlin: 4 Adressen | Mehr als Döner: Berlin isst türkisch | Beyond döner: Turkish food in Berlin |
| Die besten Donuts in Berlin – und wo du sie findest | Berlins Donuts können mehr als rosa Glasur | Berlin’s donuts go beyond pink icing |
| Chinesische Nudeln in Berlin: LIU und Wen Cheng | Berlin zieht Nudeln: Scharfe Schüsseln bei LIU und Wen Cheng | Berlin’s noodle pull: a spicy bowl at LIU or Wen Cheng |
| Griechisch essen in Berlin: 3 Adressen | Griechisch in Berlin: Ein Tisch voller kleiner Teller | Greek Berlin: a table full of small plates |
| Knödel in Berlin: Österelli und Knödelwirtschaft | Berlin braucht mehr Knödel | Berlin needs more Knödel |

Unverändert gute persönliche Headlines: **„Kolo Coffee: Wo ich jetzt meinen Kaffee trinke“** und **„Döner in Berlin: Wo ich hingehe“**. Hier gezielte Sach-/SEO-Korrekturen statt neuer Stimme.

## Welche wichtigen Orte bislang fehlen

121 von 252 Spot-Dokumenten hatten vor der Überarbeitung Artikelkarten. 131 ohne Karte sind kein automatischer Fehler: Filialen sind eigene Dokumente, Porträts und persönliche Texte dürfen bewusst auswählen. 32 Must-Eats bei 28 Restaurants wurden mit einbezogen.

| Priorität | Ergänzung | Redaktionelle Entscheidung |
|---|---|---|
| Umgesetzt im Draft | GEMELLO, Bonvivant, VEG’D → Vegan | Offiziell als vegan bestätigt; ersetzt die falsche Klinke-Einordnung und verbreitert die Auswahl. |
| Hoch | Crapulix → Bäckereien | Eigenes Porträt und Must-Eat vorhanden, im breiten Bäckerei-Guide bislang nicht vertreten. Gute Gelegenheit für einen internen Verweis. |
| Hoch | BUBAR → Charlottenburg / französische Küche | Eigener Must-Eat, bretonische Galettes; ausdrücklich Markt-/Tagesadresse, kein Abendrestaurant. |
| Hoch | Ça Va Sàigòn → vietnamesische Küche | Eigenständige Marke mit Bánh Mì, im CMS bisher vor allem als Café eingeordnet. |
| Hoch | Heno Heno → japanische Küche | Udon, Soba und Reisgerichte ergänzen eine sehr dinnerlastige Auswahl um Alltagsküche. |
| Mittel | Standard → Pizza | Schon im Mitte-Guide. Eine Filiale repräsentiert die Marke; nicht alle vier aufnehmen. |
| Scope klären | CODA, Nobelhart & Schmutzig, Rutz, Bonvivant → besondere Küche | Relevante Lücken, falls ein Fine-Dining-Überblick gemeint ist. Aktueller Artikel bleibt bewusst eine Auswahl eigenständiger Küchen, kein vollständiges Sterneranking. |
| Neue Geschichten | EIVGI’S, Romeo’s, SWORD MASTER NOODLE, Zur Bratpfanne | Eigene Must-Eats ohne Magazin-Karte. Besser gezielte Mittagstisch-/Sandwich-/Nudel-/Imbissgeschichten als unpassendes Anhängen an bestehende Artikel. |

Diese weiteren Ergänzungen sind **Empfehlungen, noch keine neuen Artikelabsätze**. Begründungen, Artikel-für-Artikel-Entscheidungen und der vollständige 252-Spot-Anhang stehen im [Spot-Abgleich](magazin-spots-2026-10-07.md).

## Noch offen

- **Five Elephant Neue Nationalgalerie:** Markenwebsite und Museumswebsite widersprechen sich beim Betreiber. Nicht stillschweigend umbenannt oder als geschlossen markiert. Vor Veröffentlichung des Kaffee-Guides klären.
- **Betriebsdetails und Erfahrungsbehauptungen:** Einzelne Speisen, Preise, Ruhetage, Zahlung/Laptop-Regeln sowie „immer ausverkauft“ sind nicht durch diesen Audit vollständig bestätigt. Im [Faktenbericht zu allen Artikeln](magazin-artikel-2026-10-07.md) pro Artikel benannt. Neue persönliche Besuchserlebnisse wurden nicht erfunden.
- **Spot-Pflege:** 55 fehlende Tipps, 19 dünne Beschreibungen, 4 fehlende Küchenarten, 5 Spots ohne gepflegte externe Präsenz. Alle 252 ohne `lastReviewed`. Keine Inhalte nur zur Feldfüllung erfunden.
- **iPhone-Safari:** Die zuvor eingebaute Abdunklung des Browserhintergrunds während der Heftanimation bleibt bestehen. Der konkrete weiße Randblitzer wurde nicht auf einem echten iPhone reproduziert; Desktop-WebKit-Prüfung ersetzt diesen Nachweis nicht.

## Nachweise

Sanity-Drafts nach dem Schreiben erneut gelesen: Titel, Teaser, SEO und DE/EN-Referenzen aller 30 Artikel stimmen mit den vorbereiteten Änderungen überein; beide Inhaltsfelder aller 15 geänderten Artikelkörper vollständig abgeglichen. Keine Slug-Änderungen, keine Veröffentlichung.

Die beiden Detailberichte dokumentieren die **Befunde vor Umsetzung**. Ihr Hinweis „keine Änderungen“ bezeichnet den lesenden Recherchelauf; maßgeblich für den anschließend tatsächlich gespeicherten Stand ist dieser Ergebnisbericht.

Technische Abnahme: `npm run lint`, `npm run typecheck`, `npm test` (2.599 erfolgreich, 7 übersprungen) und `npm run build:isolated` erfolgreich. Isolierter Produktionsbuild auf Port 3102 mit Desktop-WebKit geprüft: DE/EN, 390 × 844 und 1440 × 1000, jeweils mit/ohne Reduced Motion; Magazin → Artikel funktioniert, kein horizontaler Überlauf, keine Page-Errors, automatischer axe-Scan ohne WCAG-A/AA-Fundstellen. Consent- und Zähl-POSTs im Test isoliert; Analytics-Backend nicht Gegenstand der Abnahme. Die Browserprüfung zeigt veröffentlichte Sanity-Texte mit neuem Layout; die neuen CMS-Texte sind als Draft-Daten geprüft, noch nicht im öffentlichen Routing veröffentlicht.

Auch alle vier Spot-Drafts nach dem Schreiben erneut gelesen und gegen die vorgesehenen Änderungen verglichen.
