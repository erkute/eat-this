# Aktueller Stand — Kategorien abgeschlossen, Bezirke als nächster Schritt

Der folgende Stand ersetzt die früheren Gestaltungsentscheidungen und Übergänge weiter unten. Die ältere Abnahme bleibt als Verlauf erhalten.

## Freigegebenes Kategorie-Design

- Kategorie-Hauptseite: Original-Booster-Packs; Intro auch auf Desktop unter der Headline. Magazin bekommt eine eigene Fläche mit erklärendem Einstieg.
- Kategorie-Details: Pack links, Titel mit „in Berlin“ rechts, Beschreibung darunter. Keine redundanten Scroll-/Map-Buttons im Kopf. Editorialer Auftakt mit großem Spot, kompakte Empfehlungen und Magazin-Unterbrechung; „Weitere Spots“ offen. Andere Kategorien als große Schriftlinks.
- Favoriten: Nur bestehende kuratierte `topSpots`, keine neue Rangfolge. Original-Eat-This-Logo über „Favorit“ (EN „Favorite“), Markenrot `--et-accent` (#A82B2E), weiße Schrift. Kleiner Sticker an der oberen rechten Fotoecke wie Must-Eat-Peeks; nach Nutzerkorrektur 8° nach rechts gedreht. Breite 66 px beim großen Motiv, 58/52 px bei kompakten Karten. Kein zusätzlicher Kategorie-Tipp. Foto bleibt separat beschnitten; Sticker darf über die Ecke ragen.
- Restaurantübergang: Der verworfene Thumbnail-Zoom und die ebenfalls verworfene schwarze Blende sind vollständig entfernt. Echte lokalisierte Links navigieren sofort. Auf der Restaurantseite nur 8 px Bewegung in 240 ms, kein Fade, keine Bildvergrößerung, kein Overlay. Reduced Motion deaktiviert diese Bewegung.

## Prüfung des gesicherten Standes

- `npm run build:isolated` erfolgreich, einschließlich Lint und Typecheck.
- Vollständige Unit-Suite: 312 Dateien bestanden, 2 übersprungen; 2579 Tests bestanden, 7 übersprungen. Log `/tmp/eat-this-category-approved-all-tests.log`.
- Browser-Suite gegen den Produktionsbuild: 52 bestanden, 4 gerätespezifisch übersprungen (`e2e/discovery.spec.ts`, `e2e/spot-transition.spec.ts`). Log `/tmp/eat-this-category-approved-e2e.log`.
- Badge auf 1440, 375 und 320 px geprüft, DE/EN zugängliche Beschriftung, kein horizontaler Überlauf und keine Seitenfehler. Aufnahmen `/tmp/eat-this-approved-badge-{1440,375,320}.png`.
- Produktionsvorschau aus dieser Arbeitskopie: http://localhost:3106. Kein Push und kein Deployment durch diese Abnahme.

## Auftrag für die neue Session

Der Nutzer findet die Kategorie-Seiten nun gut. Die Bezirksübersicht `/bezirk` und die einzelnen Bezirksseiten sollen deutlich interessanter, neuer und einladender zum Durchklicken werden. Die fertigen Kategorien sind die Referenz für Hierarchie, Rhythmus und Marke; sie sollen nicht erneut umgebaut werden. Vorhandene SOP-/Design-Vorgaben prüfen: eigene SOP-Dateien wurden hier nicht gefunden, maßgeblich sind `AGENTS.md`, vorhandene Komponenten/`--et-*`-Tokens und konkrete Screens. Desktop und schmales Handy vor/nachher vergleichen. Sanity bleibt Inhaltsquelle, keine erfundenen Bezirksfakten.

Arbeitskopie: `/Users/ersane/.codex/worktrees/kiez-entdecken/Eat This Neu`, Branch `claude/kiez-entdecken`. Nicht den parallelen Haupt-Checkout ändern. Die nachfolgende ältere Abnahme beschreibt teilweise verworfene Varianten.

---

# Kiez Casting — Designabnahme, 08.10.2026

Gewählt: die zuerst angezeigte Variante „Kiez Casting“. Umsetzung in der bestehenden Next.js-App auf `claude/kiez-entdecken`, ausgehend von `origin/staging`. Inhalte und Fotos aus der angebundenen Sanity-Inhaltsquelle; keine Inhaltsänderungen im CMS. Geöffnete Produktionsvorschau: http://localhost:3106/bezirk; Entwicklungsserver: http://localhost:3006/bezirk. Lokal, nicht veröffentlicht.

## Aktueller Stand: gleiche Bildgrößen, Magazin und weitere Bezirke

- Bezirksübersicht: drei gleich große Bilder nebeneinander. Gemessen bei 1440 × 1000: jeweils 286 × 340 px, identische Oberkante. Auswahl und feste CTA-Position bleiben erhalten; auf Telefonen weiterhin ein Vorschaufoto.
- Magazin: Überschrift und Auslagenbeginn stehen auf derselben linken Kante wie „Wohin heute?“ (Desktop jeweils x130). Die Übersichten zeigen sechs neueste Ausgaben statt drei, wie die Startseite. Keine Bezirksfilterung. Alle Ausgaben bleiben über den bestehenden Link erreichbar.
- Bezirks-/Kategorie-Kopf: beide Fotos gleich breit und hoch, ohne Versatz. Charlottenburg: Desktop je rund 311 × 233 px, auf 320-px-Telefonen je 136 × 102 px.
- „Weitere Bezirke“: Foto-Karten mit Namen darunter, fünf Spalten auf Desktop, drei auf Tablet, zwei auf Telefonen. Vollständige Motive per `object-fit: contain`, keine beschnittenen Querformat-Miniaturen. Kreuzberg verwendet das vorhandene Bonanza-Foto, weil das bisherige Romeo’s-Motiv Screenshot-Bedienelemente enthält. Die GSAP-Bewegung umfasst nun Foto und Namen gemeinsam, damit beide beim Eintritt Abstand halten.
- Produktionsbuild erfolgreich, inklusive Lint und Typprüfung. Browserlauf: 25 Prüfungen bestanden, zwei gerätespezifisch übersprungen. Die verbleibende Telefonprüfung erwartete noch den alten Namen links neben dem Foto; auf die neue Anordnung unter dem Foto angepasst und separat bestanden. Damit alle 26 betroffenen Prüfungen grün, einschließlich Reduced Motion und DE/EN. Zusätzliche visuelle Messung auf Desktop, Pixel-7-Emulation und 320 px bestanden.
- Nachweise unter `/tmp/eat-this-kiez-qa/`: `desktop-equal-preview.png`, `desktop-six-magazines.png`, `desktop-equal-detail.png`, `desktop-further-districts.png`, `mobile-further-districts.png`, `narrow-equal-detail.png`, `equal-layout-measurements.json`. Build-Log: `/tmp/eat-this-three-spots-build-final.log`; Browserlogs: `/tmp/eat-this-three-spots-e2e-final.log`, `/tmp/eat-this-three-spots-narrow-final.log`; zusätzliche Messung: `/tmp/eat-this-three-spots-visual-final.log`.

## Vorherige Iteration: Usability-Korrektur nach Nutzerreview

Diese Korrektur ersetzt die weiter unten dokumentierten älteren Layoutmaße und den Abschluss mit zwei Empfehlungen.

- **Hover-Sprünge reproduziert und behoben.** Bei 1280 × 800 lag der Entdecken-Button vorher je nach Bezirk bei y790 oder y860. Der Magazinanfang wechselte zwischen y891 und y937. Die Übersicht hat nun eine kleinere Überschrift, Abstand zur Bildfläche, eine feste Bildhöhe und feste Positionen für Bezirksname, Anzahl und CTA. Der allgemein gehaltene Vorspann wurde entfernt. Der neue Test durchläuft alle elf Bezirke: Namen vollständig auf einer Zeile, CTA bis maximal y780, Verschiebung des Magazinanfangs unter 2 px. Vorher: `/tmp/eat-this-kiez-qa/stability-before.png`; nachher: `/tmp/eat-this-kiez-qa/stability-after.png`.
- **Detailseiten verdichtet.** Der Bezirksname bekommt die ganze Kopfbreite; Charlottenburg passt auch auf 320 px ungekürzt. Darunter stehen kurze Fakten und zwei versetzte Spot-Fotos. Empfehlungen nutzen drei Spalten, Vierer-Auswahlen wie Charlottenburg ab 1200 px eine gemeinsame Vierer-Reihe. Der Insider-Tipp öffnet sich bei Bedarf per nativem Details-Element. Weitere Spots haben 80-px-Fotos. Andere Bezirke sind ein zweispaltiger Namensindex mit Bildern, auf Telefonen einspaltig. Nachweise: `desktop--bezirk-charlottenburg.png`, `desktop-compact-spots.png`, `desktop-directory.png`, `desktop-district-links.png` im selben QA-Verzeichnis.
- **Gezielte Bewegung.** GSAP bewegt Bilder beim Eintritt in den sichtbaren Bereich um 18 px und dreht sie leicht zurück. Es verändert keine Layoutmaße und versteckt keine SSR-Inhalte. Reduced Motion deaktiviert diese Bewegung und den bestehenden Bildübergang. Die Browsertests beobachten beide Animationen tatsächlich im DOM und prüfen ihr Ausbleiben bei Reduced Motion.
- **Artikelabschluss korrigiert.** Echte Kategorie-Packbilder zurückgebracht, alle vier vorhandenen Nachbar-Spots angezeigt. Floskel, Trennlinie, Bezirks-CTA, Pfeile und Hover-Unterstreichung entfernt. Auf 320 px stehen die drei Packs nebeneinander und Empfehlungen in kompakten Bild-/Textzeilen. Nachweise: `desktop-restaurant-end.png`, `mobile-restaurant-end.png`, `narrow-packs.png`.
- **Finale Prüfung bestanden.** Produktionsbuild mit 601 statischen Seiten, Lint/Typprüfung, CSS-Modul-Prüfung und 23 betroffene Unit-Tests grün. Finaler Produktions-Browserlauf: 26 bestanden, zwei absichtlich je Geräteklasse übersprungen; 42,9 Sekunden. Desktop 1440 × 1000, Hover 1280 × 800, Pixel-7-Emulation 393 × 801 und schmales Telefon 320 × 740. DE/EN, Axe, Filter, Zurück-Navigation, komplette Links ohne JavaScript, Packs, Bilder und native Tipp-Interaktion geprüft. Logs: `/tmp/eat-this-kiez-refinement-build-final.log`, `/tmp/eat-this-kiez-refinement-e2e-final.log`.

Die Desktop- und Telefonansichten wurden zusätzlich anhand der gerenderten Screenshots geprüft. Keine Behauptung zu Safari/Firefox oder zu Feld-Performancewerten. Die folgenden Abschnitte dokumentieren die vorherigen Iterationen.

## Visuelle Referenz und Vergleich

### Aktuelle Korrektur: dunkle Rubriken und Startseiten-Buttons

Die nachträgliche Nutzeranweisung vom 08.10.2026 ersetzt die weiße Farbfläche des gewählten Mockups: Bezirke und Kategorien einschließlich ihrer Detailseiten verwenden jetzt den Ink-Grund der Startseite. Die Komposition und Entdecker-Interaktionen bleiben erhalten.

Die Buttons folgen der aktuellen Map-Vorschau auf der Startseite (`HubMapPreview.module.css`): Markenrot, weiße Providence-Schrift, 10 px Eckenradius, 52–56 px Höhe, weißer Hover-Zustand. Sekundäre Map-Aktionen stehen auf Ink Raised. Die Filter und die Kategorie-Links am Restaurantabschluss übernehmen die gerundeten Auswahlflächen. Kleine Akzenttexte verwenden den kontrastreicheren Text-Token; große Bezirksnamen den vorhandenen Heading-Token. Helle Fokusrahmen bleiben sichtbar, auch in der horizontalen Filterleiste.

Nachweise aus der Entwicklungsansicht: `/tmp/eat-this-kiez-qa/dark-desktop-dev.jpg` und `/tmp/eat-this-kiez-qa/dark-restaurant-dev.jpg`. Trotz angeforderter Viewport-Größe blieb der In-App-Browser dabei tatsächlich bei 496 × 799 CSS-Pixeln; die Dateien sind daher keine Desktop-Nachweise. Desktop und Telefon werden zusätzlich mit den festen Viewports der vorhandenen Produktions-Browsertests geprüft.

Finale Produktionsnachweise nach der zusätzlichen Nutzeranweisung „keine Pfeile“: `/tmp/eat-this-kiez-qa/dark-desktop-final.png` (1440 × 1000), `/tmp/eat-this-kiez-qa/dark-mobile-final.png` (Pixel 7, 393 × 801 CSS-Pixel) und `/tmp/eat-this-kiez-qa/dark-restaurant-final.png` (1440 × 1000). Sämtliche Pfeile in der Bezirks-/Kategorieauswahl, den Entdecken-CTAs und am Restaurantabschluss wurden einschließlich ihrer ungenutzten Styles entfernt. Im geöffneten Produktionsbrowser zusätzlich geprüft: kein SVG im Explorer, Ink-Hintergrund, CTA mit 10 px Radius und 21 px Telefonschrift.

Erneute Abnahme: 23 betroffene Unit-Tests grün; Lint, Typecheck, CSS-Modul-Prüfung und Produktionsbuild grün. Alle 20 Produktions-Browsertests auch nach Entfernung der Pfeile bestanden (29 Sekunden): Desktop/Telefon, DE/EN, Kontraste mit Axe, Navigation, Filter, Reduced Motion, Restaurantabschluss und Links ohne JavaScript. Log: `/tmp/eat-this-kiez-dark-e2e-final.log`; Build: `/tmp/eat-this-kiez-dark-build.log`.

### Ursprüngliche weiße Variante

- Original: `/Users/ersane/.codex/generated_images/01a11a95-8048-74a2-a787-542317211b9a/exec-242ffa07-857b-48ed-aea1-89ae0a80d91f.png`, 1448 × 1086 Pixel.
- Figma: https://www.figma.com/design/p5XEjPCeGlgtXxhreeIgnB/Eat-This?node-id=683-281
- Desktop-Referenz: Bildschirmbereich des Mockups bei x34/y18, 1022 × 646 Pixel, für den Vergleich proportional auf 1440 × 910 normalisiert: `/tmp/eat-this-kiez-qa/reference-desktop.png`.
- Desktop-Umsetzung: `/tmp/eat-this-kiez-qa/comparison-desktop-final.jpg`, Browser 1440 × 910 CSS-Pixel, Screenshot 1440 × 910 Pixel (1×). Zustand: Schöneberg ausgewählt, Seitenanfang. Referenz und Umsetzung gemeinsam visuell geprüft.
- Mobile-Referenz: x1093/y22, 319 × 647 Pixel, normalisiert auf 390 × 791: `/tmp/eat-this-kiez-qa/reference-mobile.png`.
- Vergleich bei gleicher Größe: `/tmp/eat-this-kiez-qa/comparison-mobile.jpg`, 390 × 791 (1×). Zusätzlich vollständiger Telefonbildschirm 390 × 844: `/tmp/eat-this-kiez-qa/mobile-final.jpg`; schmaler Grenzfall 320 × 740: `/tmp/eat-this-kiez-qa/mobile-320.jpg`.
- Kategorien: `/tmp/eat-this-kiez-qa/categories-desktop-final.jpg` (1440 × 1000), `/tmp/eat-this-kiez-qa/categories-mobile-final.jpg` (390 × 844).
- Details: `/tmp/eat-this-kiez-qa/detail-desktop.jpg` und `/tmp/eat-this-kiez-qa/pizza-mobile-final.jpg`.
- Restaurantabschluss: finale Produktionsaufnahmen `/tmp/eat-this-kiez-qa/desktop-restaurant-end.png` und `/tmp/eat-this-kiez-qa/mobile-restaurant-end.png`.
- Vorher: `/tmp/eat-this-rubriken-design/` enthält Desktop- und Telefonaufnahmen aller betroffenen Seitentypen; zusätzliche Aufnahme derselben Basis unter `/tmp/eat-this-kiez-qa/before-desktop.jpg`.

Der Mock enthält mehrere Bildschirme auf einer Tafel, keine spezifizierten CSS-Viewports. Die genannten Ausschnitte und Skalierungen machen die Dichteannahmen explizit. Die Einzelaufnahmen erlauben auch die Detailprüfung von Schrift, Bildbeschriftungen, Auswahlmarkierung, Fokus und CTA; ein weiterer vergrößerter Ausschnitt war nicht erforderlich.

## Befunde und Korrekturen

1. **P2, behoben — Desktop-Collage zu tief.** Erste Umsetzung: `/tmp/eat-this-kiez-qa/comparison-desktop.jpg`. Die rechte Bildreihe begann unter der Überschrift statt neben ihr. Ab 1200 px steht die Vorschau nun 120 px höher, mit 550 px Bildhöhe und größerem ausgewähltem Bezirksnamen. Nachweis: `comparison-desktop-final.jpg` im direkten Vergleich zur normalisierten Referenz.
2. **P2, behoben — Kategoriekomposition.** Erste Umsetzung verwendete ebenfalls drei Fotos und eine Namensspalte. Der gewählte Entwurf sieht hier zwei Namensspalten und ein großes Motiv vor. Entsprechend umgesetzt; Nachweis: `categories-desktop-final.jpg`.
3. **P2, behoben — Booster-Kontrast.** Die dunkle Booster-Tafel erbte die neue Textfarbe für weiße Rubrikseiten. Die Farbänderung ist jetzt auf die konkreten Rubrik-Elemente begrenzt. Erster Axe-Durchlauf meldete vier Fehler (DE/EN × Desktop/Mobile); finaler Testlauf ohne Axe-Verstöße.
4. **P2, behoben — Übergang im Entwicklungsmodus.** React Strict Mode konnte den einmaligen Bildübergang vor dem asynchron geladenen GSAP-Modul verbrauchen. Der Zustand wird jetzt erst im noch aktiven Effekt konsumiert. Inhalt und normale Links funktionieren unabhängig davon.
5. **P2, behoben — lange Restaurantnamen.** Namen im zweispaltigen Abschluss dürfen umbrechen, statt auf schmalen Telefonen über die nächste Karte zu laufen.

## Fünf geprüfte Gestaltungsflächen

- **Schrift:** echte Providence aus dem bestehenden Adobe-Kit für Titel und Navigation, bestehende Grotesk für Lesetext. Keine nachgebauten Schriftbilder. Größen, Gewichte, Unterlängen und mehrzeilige Namen auf 320/390/1440 px kontrolliert. Die im generierten Bild nur angenäherte Schrift wird bewusst durch die echte Markenschrift ersetzt.
- **Abstände und Layout:** asymmetrische Bezirkscollage, linksbündige große Überschrift, kompakte Namen; mobile Zweispaltigkeit mit einem Foto. Kategorien mit eigenständiger Einbild-Komposition. Details mit früher sichtbaren Filtern und zweispaltigen Empfehlungen. Artikelabschluss in begrenzter redaktioneller Breite.
- **Farben:** vorhandenes Weiß, Ink und Markenrot; sichtbare Auswahl und kontrastreiche Fokusrahmen. Nach der jüngsten Nutzerkorrektur stehen auch die Rubriken auf Ink. Der Restaurantabschluss übernimmt den dunklen Grund des bestehenden Restaurantartikels. Kein zusätzlicher Theme-Schalter und keine automatische Systemumschaltung.
- **Bilder:** reale, lizenzgeprüft projizierte Sanity-Fotos mit responsivem srcset und vorhandener Bildquelle. Motive aus dem KI-Mock sind illustrative Platzhalter und werden nicht als reale Berliner Orte ausgegeben. Beschriftungen benennen die tatsächlichen Spots. Unverändertes Markenlogo; die zunächst verwendeten Chevron-Icons wurden auf Nutzerwunsch entfernt.
- **Text und Inhalt:** tatsächliche Zahlen und alle elf nicht leeren Bezirke statt der acht illustrativen Mock-Einträge. Deshalb benötigt Mobile etwas mehr Höhe; der Einstieg bleibt direkt unter der Vorschau. DE/EN, vollständige Spot-Verzeichnisse, kuratierte Rangfolge, Metadaten und Weiterleitungen bleiben erhalten. Kategorie- und Bezirkslinks bleiben echte Links.

## Verhalten und Qualität

- Maus und Tastaturfokus wählen die Vorschau. Touch wählt ohne sofortige Navigation; der eindeutige Entdecken-Link führt hinein. Auswahl bleibt beim Zurückgehen erhalten.
- GSAP wechselt Vorschaufotos in 240 ms; der Übergang ins Detail dauert 600 ms. Scrollen, Touch, Tastatur und Unmount entfernen den dekorativen Übergang. Reduced Motion schaltet ihn aus. SSR-Inhalte werden nie auf Animation/Hydrierung wartend verborgen.
- Vollständige vorhandene Testsuite: 310 Dateien bestanden, 2 übersprungen; 2575 Tests bestanden, 7 übersprungen. Zusätzlich 3 neue Tests zum Bildübergang bestanden. Betroffene Hub-/Filtertests erneut grün.
- Typecheck, ESLint, CSS-Modul-Verweise und `git diff --check` grün. Isolierter Produktionsbuild erfolgreich, 601 statische Seiten.
- Browserläufe gegen eigenen Produktionsserver auf Port 3106: DE/EN, Auswahl, Zurück, Filter, tatsächliches Auftreten/Ausbleiben der Animation, ohne JavaScript, WCAG-Axe-Prüfungen, Restaurantabschluss sowie bestehende Magazin-/Consent-/Gastkarten-Flows. Finaler Lauf: alle 36 Tests bestanden (2,6 Minuten), einschließlich expliziter Beobachtung des GSAP-Übergangs und seines Ausbleibens bei Reduced Motion. Log: `/tmp/eat-this-kiez-e2e-final.log`.
- Im manuellen Browsercheck keine JavaScript-Fehler. Tastaturfokus auf Mitte und Schöneberg wechselt die Vorschau und zeigt einen sichtbaren Fokusrahmen. Bei 320 px: `body.scrollWidth === innerWidth === 320`.

## Umfang der Performance-Evidenz

Verglichen wurden die gzip-Größen der vorhandenen Produktionsartefakte desselben Seitentyps: ursprünglicher Haupt-Checkout mit „Die Bezirke“/„Die Kategorien“ gegen diese Arbeitskopie. Rohdaten: `/tmp/eat-this-kiez-qa/payload-comparison.json`.

| Seite | HTML vorher/nachher | initiale JS-Dateien vorher/nachher |
|---|---:|---:|
| Bezirke | 28269 / 20537 Bytes | 304651 / 307893 Bytes |
| Kategorien | 25719 / 19752 Bytes | 304649 / 307891 Bytes |

Das sind Größenvergleiche lokaler Builds, keine LCP-, INP- oder CLS-Messungen. Es werden keine bestandenen Core-Web-Vitals-Ziele behauptet. Keine neuen Abhängigkeiten; GSAP für den Detailübergang wird nur bei vorhandenem Übergangszustand nachgeladen.

## Abnahme

Alle Abnahmeschritte abgeschlossen. Keine offenen visuellen P0/P1/P2-Befunde. P3: Die bestehende Remy-Schaltfläche überlagert am unteren Bildschirmrand teilweise die dekorative CTA-Ecke; Text und primärer Klickbereich bleiben erreichbar. Ihre bestehende siteweite Position wurde nicht verändert.

Abnahme der anschließenden Dunkel-Korrektur und pfeillosen Fassung abgeschlossen.

final result: passed
