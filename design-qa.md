# Map – Design-Abnahme, 23.10.2026

final result: passed

## Visueller Vergleich

Quelle: `/Users/ersane/.codex/generated_images/01a1692c-e268-7b73-a022-530c719fbcf7/exec-c83dde8e-a42e-4365-9fe1-63b2003c854b.png` (1132 × 1390 px). Gewählte Marker-Variante 1 mit leicht spitzerem Ende.
Implementierung: `/tmp/eat-this-map-design/map-final-desktop.png` (1440 × 1000 px, CSS-Viewport 1440 × 1000, Dichte 1). Zustand: heller Modus, öffentliche Must-Eat-Karte Tomate Slice, Desktop.
Gemeinsamer Vollansichts- und Detailvergleich: `/tmp/eat-this-map-design/marker-source-implementation-comparison.png`. Quelle proportional auf 53 px Höhe normalisiert; Browser-Marker 44 × 53 CSS-px in einem 60 × 69 px Ausschnitt. Der produktive WebP-Export entfernt transparenten Rand der Quelle. Keine zusätzliche Verzerrung oder Rotation im CSS.
Telefon: 390 × 844, `/tmp/eat-this-map-design/audit-musteat-phone-final.png` und `audit-zoom-phone-final.png` im selben Ordner.

## Befunde und Korrekturen

- Marker-Wortmarke wird aus dem ausgewählten Artwork übernommen; zwei Zeilen, optisch mittig, kompakte Fläche mit sichtbarer Spitze. Must-Eat-Rückseite überlappt die obere rechte Schulter.
- Listenbilder von 3:2 auf 4:3 erhöht; bestehende kleine Zwischenräume und sichere Kartenüberstände bleiben erhalten.
- Geöffnet-Filter und Statusflächen grün, geschlossen rot; weiße Schrift mit ausreichendem Kontrast.
- Galerie und Must-Eat-Zoom: schwarzer Hintergrund, freies weißes Schließen-Symbol. Galerie blättert mit Fotovorschauen, Must-Eat-Zoom mit benannten Seitenzahlen; keine Richtungs-Pfeile.
- Erklärung überlagerte nach Kartenwechsel die Großansicht: während Zoom zurückgestellt, danach wieder verfügbar. Komponententest und DE/EN-Browsertests prüfen dies.
- Bilddienst lieferte zeitweise 503: ein automatischer Neuversuch und danach eine explizite Wiederholen-Aktion verhindern eine dauerhaft kaputte Bilddarstellung. Fehler und Wiederherstellung gezielt getestet. Die vorgelagerte Dienststörung selbst ist dadurch nicht behoben.

## Fünf Gestaltungsflächen

- Schrift: bestehende Neue-Haas-Körper-/UI-Schrift, konsistente Größen und Zeilenhöhen geprüft. Marker bleibt Artwork. DE/EN und lange Spotnamen geprüft.
- Rhythmus: Bilder, Beschriftungen, Filterabstände, Kartenüberstand und 48-px-Touchflächen in Großansicht geprüft.
- Farben: zentrale Status-Tokens, heller/dunkler Modus und Kontrast geprüft.
- Bilder: Originalfotos ohne zusätzliche Abdunklung, WebP-Marker mit Transparenz und ohne Ersatzzeichnung. Foto- und Kartenzoom geprüft.
- Inhalte: bestehende Spotdaten beibehalten; Zoom-Beschriftungen und Fehlerzustände DE/EN. Zehn neue Namensflächen sind ausschließlich Entwürfe, Auswahl noch offen.

## Verifikation

- 184 Unit-Tests in 27 Dateien bestanden.
- Lint, Typecheck und isolierter Produktionsbuild bestanden.
- 30 Produktions-Browsertests bestanden, 4 viewportbedingte Doppelprüfungen übersprungen; zusätzlich 6 Must-Eat-Zoom-Browsertests bestanden.
- Suche mit Vorschlägen, Ergebniswahl und leerem Zustand; Filter; Spotdetail; Galerie, Swipe, Tastatur und Fokusrückgabe; Magazinlinks; Gastkarte/Login; Must-Eat-Wechsel und Zoom; DE/EN; Reduced Motion; Theme und Barrierefreiheit geprüft.
- Keine relevanten Browser-Konsolenfehler in der manuellen Map-Prüfung. Bilddienst-503 wurden separat beobachtet und behandelt.

## Grenzen und offene Auswahl

Keine angemeldete Kartenfreischaltung mit echtem Konto oder reale Standortfreigabe durchgeführt. Keine Veröffentlichung. Zehn Varianten der weißen Namensflächen: `/tmp/eat-this-map-design/namensflaechen-uebersicht.png`; keine davon ohne Auswahl übernommen.

## Vergleichsverlauf

Die gemeinsame finale Gegenüberstellung zeigt keine verbleibende P0/P1/P2-Abweichung des ausgewählten Marker-Artworks. Frühere proportionale CSS-Nachbauten wurden durch das gewählte Artwork ersetzt. Die oben dokumentierten Ablaufprobleme wurden behoben und erneut im Produktionsbuild geprüft.

## Umsetzungsliste

- [x] Marker-Quelle übernehmen und im Browser vergleichen
- [x] Listenbilder erhöhen und Statusfarben angleichen
- [x] Detail-, Galerie- und Must-Eat-Abläufe prüfen und korrigieren
- [x] Fehlerzustand und Wiederherstellung prüfen
- [ ] Weiße Namensfläche nach Nutzerauswahl umsetzen

## Marker-Korrektur nach Nutzerfeedback

Die bisherige gerundete Rasterform wurde auf ausdrücklichen Wunsch ersetzt. Neue Quelle: `/Users/ersane/.codex/generated_images/01a1692c-e268-7b73-a022-530c719fbcf7/exec-ad3ac90a-f32d-4744-9eee-125e185d5b12.png`. Eckige rote Knitterfläche, Wortmarke auf ungefähr zwei Drittel verkleinert. Rückkarte nun top -19%, right -21%, width 44%, eigener z-index 2 über der Markerfläche (z-index 0). Visuell auf Desktop 1280 × 720 und Telefon 390 × 844 geprüft; Rückkarte steht sichtbar außen und verdeckt die Wortmarke nicht. Belege: `/tmp/eat-this-map-design/marker-eckig-desktop.png`, `/tmp/eat-this-map-design/marker-eckig-mobile.png`. 12 Map-Stilprüfungen und diff-check bestanden. Frühere Angaben zur Marker-Quelle sind durch diesen Absatz ersetzt.

Vor Commit: Rückkarte gemäß letztem Feedback nochmals 7 Prozentpunkte höher und 7 Prozentpunkte nach links verschoben. Desktop/Telefon erneut geprüft: `/tmp/eat-this-map-design/marker-corner-final-desktop.png`, `/tmp/eat-this-map-design/marker-corner-final-mobile.png`. Selbstreview gegen Anforderungen und Projektregeln ohne verbleibenden Befund; Lint und Typecheck erneut bestanden.
