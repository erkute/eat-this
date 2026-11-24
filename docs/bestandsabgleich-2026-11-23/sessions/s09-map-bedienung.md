# S09 – Map-Status, Zoom und Filter bedienen

Eigenständig kopierbarer Startauftrag für einen künftigen Chat. Typ: **Umsetzung, Map-UI**.

**Auftrag:** Bearbeite für Eat This ausschließlich G1, G4, G5 im folgenden begrenzten Umfang.

## Arbeitsregeln für diesen neuen Chat

Projekt Eat This. Die Anwendung liegt in `nextjs/`, Sanity Studio in `studio/`. Lies die aktuelle `AGENTS.md` vollständig. Zuerst `git worktree list` und `git status`; Hauptkopie kann fremde unfertige URL-Arbeit enthalten und ist keine verlässliche Live-Kopie. Keine fremden Änderungen/Worktrees anfassen. Aktuellen Remote-main und Release-/Rollout-Check unabhängig vom lokalen Hauptbranch lesen. Vor eigenen Änderungen eigene Kopie über `./scripts/worktree.sh claude/<passender-name>` (Standardbasis origin/staging) erstellen; keine gemeinsame Arbeitskopie mit anderen schreibenden Agents. Abweichungen zur hier genannten historischen Basis zuerst abgleichen.

Dieser Auftrag enthält die Ausgangslage. Weitere Details stehen im [Befundabgleich](../befunde.md) und in den [Nachweisen](../nachweise.md). Der Plan selbst autorisiert keine zukünftigen Veröffentlichungen, Kostenänderungen oder produktiven Schreibtests; der aktuelle Nutzerauftrag bestimmt den Ausführungsumfang.

Gewollte Logik bewahren: Hero sofort offen/statisch, Remy bleibt; Gastkarte wackelt kurz und öffnet Starter-Login ohne automatische Erklärfolien. Reveal angemeldet serverseitig ohne Kauf/Standortprüfung, 50 m nur Browser, Limits 10/min und 15/Tag. Auth bleibt eager, E-Mail nie aus Linkparametern, Token-Widerruf prüfen; Herzen nur Admintransaktion. Messung ausschließlich eigener Zähler ohne Browser-Speicher; kein GA/Cookie-Dialog. Sanity ist Inhaltsquelle, Entwürfe nur im beauftragten Umfang, Veröffentlichung erst ausdrückliche Freigabe und danach DE/EN abrufen. Keine Geheimnisse oder privaten Nutzungszahlen in öffentliche Dateien/PRs kopieren.

Bei Codeänderung tote Reste vollständig löschen; i18n-Link verwenden, bestehende et-btn/et-label/--et-Tokens und Hell/Dunkel beachten. Keine unerlaubten Pfeile, Unterstreichungen oder Fotoabdunklungen. Sichtbare Änderungen vorher/nachher Telefon/Desktop mit/ohne Reduced Motion prüfen. Aus nextjs: typecheck, lint, audit:css-modules, npx knip und risikogerechte Tests; für Browser build:isolated, dann test:e2e/audit:preview Port 3100. Keine unnötigen Abhängigkeiten installieren (node_modules ist geteilt). Live-Browser erst nach /no-count und aktiviertem Nicht-mitzählen. Performance vorher/nachher am gleichen Seitentyp, Warnungen mit Werten; Feldziele LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1, TBT ist kein Feld-INP.

Vor später beauftragtem Commit/Push ist Code-Review gegen Anforderungen und AGENTS Pflicht, Befunde beheben und erneut prüfen, Ergebnis vor Push berichten; Hook nie umgehen. Feature → staging → main, nur grüne Checks mergen. Live erst nach grünem App-Hosting-Rollout am tatsächlichen main-Merge-SHA. Infrastruktur/Billing/Preise/Rewards/Newsletter/Werbung nicht aus historischen Empfehlungen ableiten. Folgechats/Automationen nicht eigenständig erstellen.

## Ausgangsstand und Abhängigkeiten

Planbasis vom 23.11.2026: main `aa156ce26bbcd29c9cb16f7227b552465b621366`, Release #1415; App-Hosting-Rollout success frisch geprüft. #1409 Mail/Notbremse/Sentry, #1411 Web Vitals, #1413/#1415 Leseseiten und lokale Konto-E2E, #1412/#1414 Standard-404 sind darin enthalten. Inzwischen neue Releases zuerst berücksichtigen.

**G1 (offen):** 10-px-Sonderregel und pan-y stehen weiter im Code. Die tatsächliche iOS-Auswirkung ist ohne Gerätetest nicht bewiesen; die Filter-Kopfzeile erlaubt teilweise bereits pinch-zoom.

**G4 (offen):** 24 px Breite bleibt; mobil erhöht sich nur die Höhe auf 44 px. Der Löschknopf ist bereits ein eigener Geschwisterknopf, keine verschachtelte Schaltfläche.

**G5 (offen):** RestaurantList verwendet weiterhin role=status und setzt now nach Mount. Die hörbare Wirkung wurde heute nicht mit VoiceOver/TalkBack geprüft; es bleibt ein plausibler semantischer Befund.

**Voraussetzungen/Entscheidungen:** S05/S08 abgeschlossen oder unabhängige eigene Kopie; keine Produktentscheidung nötig.

## Ziel und begrenzte Arbeit

Die drei klar abgegrenzten Map-Bedienprobleme beheben.

Statuslesbarkeit und UI-Pinch-Zoom gezielt verbessern, Filter-Löschfläche mobil mindestens 44×44 px mit ausreichendem Chip-Polster. role=status nur an statischen Listenlabels entfernen, aktive Treffer-/Fehlerrückmeldung bewahren. MapLibre-Pinch/Pan/Panelgesten nicht durch pauschale touch-action-Ersetzung zerstören.

**Relevante Dateien/Quellen** (Pfade relativ zur jeweils eigenen Repo-Kopie, vor Bearbeitung prüfen): nextjs/app/globals.css; nextjs/app/components/map/MapLayout.module.css; nextjs/app/components/map/RestaurantDetail.module.css; nextjs/app/components/map/MustEatDetail.module.css; nextjs/app/components/map/MapSheetDetail.module.css; nextjs/app/components/map/MapFilters.module.css; nextjs/app/components/map/RestaurantList.tsx.

## Konkrete Prüfung

Vorher/nachher Telefon/Desktop, Hell/Dunkel, DE/EN, 200%-Zoom, normal/reduced motion. iOS/Safari-Zoom manuell oder klar als echte-Geräte-Lücke benennen; WebKit allein ist kein echter iPhone-Nachweis. Tastatur und VoiceOver/TalkBack für Listen-Nachladen/Filter. Isolierter Build, passende E2E und Standardchecks.

## Fertig-Kriterien und Übergabe

Status/Zoom/Filter bedienbar und Ansagen ruhig; konkrete Gerätegrenzen dokumentiert. Keine pauschale A11y-Konformitätsbehauptung.

Berichte abschließend kurz: tatsächlicher SHA/Branch, geänderte Dateien oder reine Prüfergebnisse, ausgeführte Prüfungen samt Grenzen/Warnungen, Entscheidungslage und Status je Befund-ID. Lege für den nächsten Chat eine knappe lokale Übergabe an; keine vertraulichen Daten veröffentlichen. Nur belegten Zustand melden. Nicht den gesamten übrigen Plan nebenbei abarbeiten.
