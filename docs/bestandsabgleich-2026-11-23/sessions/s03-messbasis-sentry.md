# S03 – Feldmessung und Sentry-Nachweise lesen

Eigenständig kopierbarer Startauftrag für einen künftigen Chat. Typ: **Nur Prüfung/Dokumentation**.

**Auftrag:** Bearbeite für Eat This ausschließlich T5, T7 im folgenden begrenzten Umfang.

## Arbeitsregeln für diesen neuen Chat

Projekt Eat This. Die Anwendung liegt in `nextjs/`, Sanity Studio in `studio/`. Lies die aktuelle `AGENTS.md` vollständig. Zuerst `git worktree list` und `git status`; Hauptkopie kann fremde unfertige URL-Arbeit enthalten und ist keine verlässliche Live-Kopie. Keine fremden Änderungen/Worktrees anfassen. Aktuellen Remote-main und Release-/Rollout-Check unabhängig vom lokalen Hauptbranch lesen. Vor eigenen Änderungen eigene Kopie über `./scripts/worktree.sh claude/<passender-name>` (Standardbasis origin/staging) erstellen; keine gemeinsame Arbeitskopie mit anderen schreibenden Agents. Abweichungen zur hier genannten historischen Basis zuerst abgleichen.

Dieser Auftrag enthält die Ausgangslage. Weitere Details stehen im [Befundabgleich](../befunde.md) und in den [Nachweisen](../nachweise.md). Der Plan selbst autorisiert keine zukünftigen Veröffentlichungen, Kostenänderungen oder produktiven Schreibtests; der aktuelle Nutzerauftrag bestimmt den Ausführungsumfang.

Gewollte Logik bewahren: Hero sofort offen/statisch, Remy bleibt; Gastkarte wackelt kurz und öffnet Starter-Login ohne automatische Erklärfolien. Reveal angemeldet serverseitig ohne Kauf/Standortprüfung, 50 m nur Browser, Limits 10/min und 15/Tag. Auth bleibt eager, E-Mail nie aus Linkparametern, Token-Widerruf prüfen; Herzen nur Admintransaktion. Messung ausschließlich eigener Zähler ohne Browser-Speicher; kein GA/Cookie-Dialog. Sanity ist Inhaltsquelle, Entwürfe nur im beauftragten Umfang, Veröffentlichung erst ausdrückliche Freigabe und danach DE/EN abrufen. Keine Geheimnisse oder privaten Nutzungszahlen in öffentliche Dateien/PRs kopieren.

Bei Codeänderung tote Reste vollständig löschen; i18n-Link verwenden, bestehende et-btn/et-label/--et-Tokens und Hell/Dunkel beachten. Keine unerlaubten Pfeile, Unterstreichungen oder Fotoabdunklungen. Sichtbare Änderungen vorher/nachher Telefon/Desktop mit/ohne Reduced Motion prüfen. Aus nextjs: typecheck, lint, audit:css-modules, npx knip und risikogerechte Tests; für Browser build:isolated, dann test:e2e/audit:preview Port 3100. Keine unnötigen Abhängigkeiten installieren (node_modules ist geteilt). Live-Browser erst nach /no-count und aktiviertem Nicht-mitzählen. Performance vorher/nachher am gleichen Seitentyp, Warnungen mit Werten; Feldziele LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1, TBT ist kein Feld-INP.

Vor später beauftragtem Commit/Push ist Code-Review gegen Anforderungen und AGENTS Pflicht, Befunde beheben und erneut prüfen, Ergebnis vor Push berichten; Hook nie umgehen. Feature → staging → main, nur grüne Checks mergen. Live erst nach grünem App-Hosting-Rollout am tatsächlichen main-Merge-SHA. Infrastruktur/Billing/Preise/Rewards/Newsletter/Werbung nicht aus historischen Empfehlungen ableiten. Folgechats/Automationen nicht eigenständig erstellen.

## Ausgangsstand und Abhängigkeiten

Planbasis vom 23.11.2026: main `aa156ce26bbcd29c9cb16f7227b552465b621366`, Release #1415; App-Hosting-Rollout success frisch geprüft. #1409 Mail/Notbremse/Sentry, #1411 Web Vitals, #1413/#1415 Leseseiten und lokale Konto-E2E, #1412/#1414 Standard-404 sind darin enthalten. Inzwischen neue Releases zuerst berücksichtigen.

**T5 (teilweise):** 7fb2cc37/#1411 implementiert Reporter, validierte Histogramme und Median/P75 je Seitentyp/Gerät. Quantile sind Stufenobergrenzen. Belastbarer heutiger Feldnachweis bleibt offen; CrUX war zuletzt zu klein. Live-Lighthouse des aktuellen SHA hat deutliche Warnungen (E08).

**T7 (teilweise):** df4885cf/#1409 verbessert Titel/Filter/Uploadfehler. Später laut übergebenem Nachweis 3 moderne Artifact Bundles/516 Dateien für aa156ce2; dieser Bundle-Nachweis wurde in Session 1 nicht neu direkt aus Sentry gelesen. Echte Symbolikation eines neuen Produktionsfehlers weiterhin unbelegt; keine Issues geschlossen.

**Voraussetzungen/Entscheidungen:** S02; kann vor Angebotsarbeit erfolgen.

## Ziel und begrenzte Arbeit

Nachgewiesene Erfassung von unbelegter Feldleistung/Symbolikation trennen und eine frische Messbasis schaffen.

Lies aktuelle aggregierte Vitals je Seitentyp/Gerät nur über autorisierten Zugriff; dokumentiere privat Zeitraum, Anzahl, Stufenobergrenzen und mögliche Verzerrungen. Prüfe CrUX-Verfügbarkeit neu. Kontrolliere in Sentry Release/Artifact-Bundle/Debug-ID-Zuordnung und ein bereits vorhandenes neues passendes Event. Keine künstliche Produktionsausnahme, keine Issues schließen und keine Filteränderung auf Verdacht. Fehlende Zugriffe oder Events klar als Grenze erfassen.

**Relevante Dateien/Quellen** (Pfade relativ zur jeweils eigenen Repo-Kopie, vor Bearbeitung prüfen): nextjs/app/components/WebVitalsReporter.tsx; nextjs/lib/analytics/webVitals.ts; nextjs/app/api/count/route.ts; nextjs/app/components/admin/stats/reports/Vitals.tsx; nextjs/next.config.ts; nextjs/lib/sentry/beforeSend.ts.

## Konkrete Prüfung

Reporter-, Histogramm- und Admin-Tests lesen; nur bei konkretem Fehler gezielt reproduzieren. Vergleiche Datenform mit Feldzielen LCP 2,5 s / INP 200 ms / CLS 0,1. Bestehende Lighthouse-Warnungen nicht mit Feldwerten mischen; Rohdaten und Nutzerzahlen nicht in öffentliche Repo-Dateien schreiben.

## Fertig-Kriterien und Übergabe

Kurze belegte Mess-/Sentry-Matrix mit offenen Nachweisen, konkreter späterer Prüffrist und ohne neue Produkt-/Infrastrukturänderung. Zu wenig Daten bleibt ausdrücklich zu wenig Daten.

Berichte abschließend kurz: tatsächlicher SHA/Branch, geänderte Dateien oder reine Prüfergebnisse, ausgeführte Prüfungen samt Grenzen/Warnungen, Entscheidungslage und Status je Befund-ID. Lege für den nächsten Chat eine knappe lokale Übergabe an; keine vertraulichen Daten veröffentlichen. Nur belegten Zustand melden. Nicht den gesamten übrigen Plan nebenbei abarbeiten.
