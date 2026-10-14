# Google Maps: erste REA-Untersuchung für Eat This

Stand: 13.10.2026. Untersucht: Google Maps im Browser, ausgeloggt, Deutsch, Suche „Restaurants Berlin“, optionale Cookies abgelehnt. Keine Änderung der Eat-This-Oberfläche.

## Tatsächlich beobachtet

Die vollständige Desktop-Sequenz lief mit REA 6.4.0 in Chrome 155 bei 1440 × 1000 Pixeln: Suche laden, Trattoria Portofino öffnen, Detail schließen, Preisfilter öffnen. Alle Schritte erfolgreich; REA bewertet die angeforderten URL-, Accessibility- und Screenshot-Artefakte als vollständig. Diese Sequenz hat keine Netzwerkereignisse angefordert und ist kein Nachweis vollständiger technischer Rekonstruktion.

1. **Liste und Detail nebeneinander.** Auf dem breiten Bildschirm bleibt die Ergebnisliste links stehen. Ein zusätzliches Panel zeigt das ausgewählte Restaurant, rechts bleibt die Karte sichtbar. Der ausgewählte Ort bekommt einen hervorgehobenen roten Pin mit Namen. Beleg: Schritt `details` und zugehöriger Screenshot.
2. **Die Suchabsicht überlebt den Detailbesuch.** „Restaurants Berlin“ bleibt im Suchfeld. Nach Schließen des Detailpanels sind Ergebnisliste und Filter weiterhin verfügbar. Die URL wechselt zwischen Such- und Ortsansicht. Eine pixelgenaue Wiederherstellung von Scrollposition und Kamera wurde damit noch nicht nachgewiesen. Beleg: `results`, `details`, `returned-list`.
3. **Kartenbewegung und neue Suche sind unterscheidbar.** Die Liste enthält eine zunächst nicht markierte Checkbox „Ergebnisse beim Bewegen der Karte aktualisieren“. Im breiten Detailzustand wurde zusätzlich „In diesem Gebiet suchen“ angezeigt. Der genaue Auslöser, Bewegungsschwellwert und das Verhalten bei eingeschalteter Checkbox sind noch offen. Beleg: Accessibility-Baum und Desktop-Screenshots.
4. **Filter hängen am Suchkontext.** Preis, Bewertung, Küche, Öffnungszeiten und „Alle Filter“ sind verfügbar. Der Preis-Klick öffnet im Accessibility-Baum einen Dialog mit zwei Slidern sowie „Löschen“ und „Übernehmen“. Es wurde noch keine Preisspanne angewendet; tatsächliche Filterwirkung bleibt ungeprüft. Beleg: `price-menu`.
5. **Das Layout variiert.** Bei einer anfänglichen kleineren Desktop-Ansicht (756 × 469 Pixel) ersetzte das Restaurantdetail die Liste und bot „Zurück“. Im breiten Lauf gab es stattdessen das zusätzliche Panel mit einem eigenen Schließen-Knopf. Ein separater Lauf bei 390 × 844 Pixeln zeigte die schmale Webansicht; das ist keine Prüfung der nativen Google-Maps-App und keine vollständige mobile Browseremulation.

Google zeigte in diesen Sitzungen den Hinweis „Die Ansicht ist beschränkt und du siehst nur einen Teil der Google Maps-Daten.“ Ergebnisse und Anzeigen wechselten zwischen Läufen. Die Beobachtungen beschreiben diese Sitzung, keine universelle Google-Maps-Spezifikation.

## Abgleich mit dem vorhandenen Eat-This-Code

Nur Code gelesen, kein neuer Live-Test von Eat This:

| Muster | Bestehender Stand | Konsequenz |
| --- | --- | --- |
| Suche und Filter | `nextjs/lib/map/useMapFilters.ts`: Suchtext, Kategorie, Bezirk, Preis und geöffnet; `mapFilterParams.ts` / `useMapFilterUrl` für URL-Zustand | Vorhandene Mechanik weiterverwenden. |
| Liste folgt Karte | `nextjs/lib/map/listCenter.ts` und `MapSection.tsx`: nach einer Nutzergeste Sortierung um die Kartenmitte; Detailflüge werden gesondert behandelt | Bereits gewollte Produktlogik. Eine explizite Gebietssuche wäre eine eigene Produktentscheidung, kein offensichtlicher Bugfix. |
| Rückkehr aus Details | `MapSection.tsx`: merkt Listenposition, Zeilenanker, Herkunft Liste/Karte und vorherigen Panelzustand | Rückkehr zuerst im Browser prüfen; nicht nochmals implementieren. |
| Verlinkbare Orte | `nextjs/lib/map/useMapDeepLinks.ts`: `?r=` öffnet einen Spot, auch nach Reload | Eigene stabile Links verwenden; Googles interne URL-Kodierung ist dafür nicht nötig. |

## Sinnvolle nächste Untersuchung

**Zuerst das zusätzliche Detailpanel auf breiten Screens bewerten.** Das wäre eine konkrete Variante für Eat This: mehrere Spots vergleichen, ohne die Liste aus dem Blick zu verlieren. Vor einer Umsetzung den bestehenden Ablauf auf Desktop und Telefon aufnehmen und anhand der vorhandenen Komponenten prüfen, ob die zusätzliche Spalte genug Platz hat. Die schmale Ansicht braucht eine eigene Lösung.

Danach gezielt prüfen: Listenanker und Kamera nach Detailrückkehr; Unterschied zwischen Neusortieren um die Kartenmitte und tatsächlichem Begrenzen auf den sichtbaren Ausschnitt; Zusammenspiel mit Suchtext und aktiven Filtern. Der Google-Lauf allein begründet keinen Wechsel der bisherigen Eat-This-Logik.

## Evidenz und Grenzen

Lokale Dateien, bewusst außerhalb des Repos:

- Erfolgreiches Szenario: `/tmp/eat-this-rea-maps-desktop-verified-scenario.json`
- Ergebnis: `/tmp/eat-this-rea-maps-desktop-verified.json`
- Evidence-ID: `ev_0c80c43fd10019d6503508d633b56740722e02b07178b9078a67a39264d92cd7`
- Screenshots: `/tmp/eat-this-rea-verified-results.png`, `/tmp/eat-this-rea-verified-details.png`, `/tmp/eat-this-rea-verified-returned-list.png`
- Schmale Ansicht: `/tmp/eat-this-rea-maps-narrow.json`, `/tmp/eat-this-rea-narrow-results.png`
- MCP-Verifikation: `/tmp/eat-this-rea-mcp-check.json`

Frühere Probeläufe hatten Timeouts, weil ein Restaurant nicht mehr in der wechselnden Trefferliste vorkam bzw. das breite Layout keinen „Zurück“-Knopf besitzt. Ein Lauf meldete außerdem `cleanup_incomplete`; bei der anschließenden Prozessprüfung waren dessen Prozesse beendet. Die erfolgreiche Sequenz verwendet das tatsächlich beobachtete Detail-Schließen. Frühere Netzwerkaufzeichnungen waren wegen noch laufender Requests unvollständig. Es wurden weder Backendlogik noch Rankingalgorithmus rekonstruiert; keine Performancewerte erhoben. Temporäre Dateien sind keine dauerhaft archivierte Evidenz.

## Ergänzende Primärquellen

- [Google Maps: Suche und Filter](https://support.google.com/maps/answer/3092445?hl=en): dokumentiert Orts-/Kategoriesuche, Pins und Desktop-Filter für Preis und Öffnungszeiten.
- [Google Maps: Umgebungssuche](https://support.google.com/maps/answer/4610185/?co=GENIE.Platform%3DDesktop): dokumentiert „Nearby“ und nennt Relevanz, Entfernung und Bekanntheit als Rankingfaktoren; das erklärt keine internen Algorithmen.
- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started): öffentliche Schnittstelle für Such- und Routenlinks ohne API-Key.
- [REA Browseranalyse](https://rea.tools/guides/browser/): passive Beobachtung von Seite und Netzwerkanfragen; frühere Anfragen liegen außerhalb eines später gestarteten Aufzeichnungsfensters.

Einrichtung und Nutzung: [REA für Eat This](../rea.md).
