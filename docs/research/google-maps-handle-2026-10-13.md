# Google Maps: Griff am mobilen Web-Panel

Stand: 13.10.2026. Gewünschte Referenz ist ausdrücklich Google Maps im Handy-Browser, nicht die native App. Keine Änderung der Eat-This-Oberfläche.

## 1. Beobachtung: abgeschlossen, mit begrenztem Umfang

Google Maps in Chrome mit aktivierter Pixel-9-Pro-Emulation, 427 × 952 CSS-Pixel, 75 % Darstellung, ohne Drosselung. Nach Reload erschien die mobile Webseite; den App-Hinweis über die Web-Option geschlossen. Suchkontext „Restaurants Berlin“, Detail „Sale e Pane – Berlin“, Markelstraße 52. Das ist Touch-Emulation am Desktop, kein Test auf einem echten Telefon oder in Safari.

- Das offene Detail füllt den Bereich unter dem Google-Maps-Kopf.
- Ein Zug nach unten im oberen Detailbereich klappte das Panel in einen kompakten Zustand am unteren Rand. Dabei blieb der ausgewählte Pin auf der Karte sichtbar. Der Ausgangspunkt lag neben dem kleinen Schließen-/Einklappsymbol, nicht auf dessen Symbolfläche.
- Die Endposition lag deutlich unter dem Loslasspunkt: In dieser Geste blieb das Panel nicht frei an der Fingerposition stehen, sondern landete in einem kompakten Zustand.
- Ein anschließender kürzerer Zug am sichtbaren Griff nach oben endete wieder kompakt. Daraus lässt sich weder ein exakter Schwellwert noch die Anzahl aller Rastpositionen ableiten. Ein weiterer Versuch wurde durch aktive Benutzung von Chrome unterbrochen und zählt nicht als Ergebnis.

Screenshotbelege unter `/tmp/eat-this-handle-audit/`: `01-google-expanded.png`, `02-google-collapsed.png`; zugeschnittener Vergleich `google-panel-comparison.png` (links offen, rechts nach dem Herunterziehen). Temporäre Dateien sind keine dauerhaft archivierte Evidenz. Google-Quelle: [Maps-Suche Restaurants Berlin](https://www.google.com/maps/search/Restaurants+Berlin/?hl=de).

## 2. Abgleich mit Eat This: Code geprüft

Kein zusätzlicher interaktiver Eat-This-Test in diesem Durchlauf.

| Bereich | Vorhandene Umsetzung | Einordnung |
| --- | --- | --- |
| Loslassen | `nextjs/lib/map/useHandleScrollDrag.ts` lässt den Griff absichtlich frei stehen; Kommentar verweist auf Nutzerentscheidung vom 28.09.2026. Tippen wechselt weiterhin zwischen Karte und Liste. | Google verhielt sich in der beobachteten Geste anders. Rastpositionen wären eine Produktänderung, kein bloßer Performancefix. |
| Touch-Zuständigkeit | Im normalen Zustand beansprucht nur der Griff den Touch-Drag. Filter und Inhalt behalten natives Scrollen. Ist das Panel abgesenkt, kann die gesamte Fläche ziehen. | Der Übergang zwischen Panelziehen und Inhaltsscrollen ist ein konkreter Prüfpunkt für das Bediengefühl. Nicht allein die sichtbare Griffgröße vergleichen. |
| Trefferfläche | `MapSheet.module.css`: 26 px Griff plus unsichtbare Erweiterung um 12 px oben und 7 px unten, insgesamt etwa 45 px. | Die Touchfläche ist bereits größer als der sichtbare Strich. Einfach nur einen größeren Strich zeichnen löst keine Gestenprobleme. |
| Bewegung | `useHandleScrollDrag.ts`: maximal ein Update pro Animation-Frame; je nach Position Dokument-Scrollen plus Transform bzw. Transform des sichtbaren Panels. | Bereits ohne React-State-Update pro Fingerbewegung. Die Kombination ist komplex, aber damit noch kein nachgewiesener Engpass. |
| Mitbewegte Elemente | `sheetSlide.ts` verschiebt Bedienelemente und Kartenrahmen im selben Frame; `place()` sucht dabei DOM-Elemente erneut. | Möglicher Profiling-Punkt. Erst nach Messung optimieren; kein Beleg für Ruckeln. |
| Telefon vs. Tablet | Telefon verwendet `useHandleScrollDrag`; Tablet `useBottomSheet` mit anderer Gesten-/Snaplogik. | Ein Fix nur in `useBottomSheet` würde das Telefonproblem verfehlen. |

## 3. Empfehlung und offene Nachweise

Zuerst den Wechsel zwischen Griffziehen und Inhaltsscrollen auf unserem Handy-Panel reproduzieren: am Griff hoch/runter, aus tief gescrolltem Detail absenken, wieder hochziehen, schnelle Richtungswechsel und Loslassen. Die freie Endposition zunächst erhalten. Rastpositionen nur als bewusste alternative Bedienvariante bewerten.

Für technische Änderungen vor/nachher dieselbe Eat-This-Seite und denselben Produktionsbuild-Typ auf demselben Gerät messen. Auf lange Frames, Layoutarbeit und Reaktion auf Richtungswechsel achten. Safari mit ein-/ausfahrender Adressleiste muss separat geprüft werden, weil die bestehende Dokument-Scroll-Lösung diesen Fall bewusst berücksichtigt. Reduced Motion ebenfalls prüfen.

Es wurden keine FPS-, Framezeit- oder Eingabelatenzwerte erhoben. Googles interne Implementierung, Animationskurve, Geschwindigkeitsberechnung und Scroll-Übergabe sind nicht rekonstruiert. Die Aussage „Google ist performanter“ ist daher nicht nachgewiesen; belegt ist ein anderer beobachteter Abschluss der Ziehgeste.
