# S31 – Technische Wirkung und Kosten nachbeobachten

Eigenständig kopierbarer Startauftrag für einen künftigen Chat. Typ: **Nur Messung/Nachbeobachtung**.

**Auftrag:** Bearbeite für Eat This ausschließlich T1, T2, T3, T5, T6, T7, T10 im folgenden begrenzten Umfang.

## Arbeitsregeln für diesen neuen Chat

Projekt Eat This. Die Anwendung liegt in `nextjs/`, Sanity Studio in `studio/`. Lies die aktuelle `AGENTS.md` vollständig. Zuerst `git worktree list` und `git status`; Hauptkopie kann fremde unfertige URL-Arbeit enthalten und ist keine verlässliche Live-Kopie. Keine fremden Änderungen/Worktrees anfassen. Aktuellen Remote-main und Release-/Rollout-Check unabhängig vom lokalen Hauptbranch lesen. Vor eigenen Änderungen eigene Kopie über `./scripts/worktree.sh claude/<passender-name>` (Standardbasis origin/staging) erstellen; keine gemeinsame Arbeitskopie mit anderen schreibenden Agents. Abweichungen zur hier genannten historischen Basis zuerst abgleichen.

Dieser Auftrag enthält die Ausgangslage. Weitere Details stehen im [Befundabgleich](../befunde.md) und in den [Nachweisen](../nachweise.md). Der Plan selbst autorisiert keine zukünftigen Veröffentlichungen, Kostenänderungen oder produktiven Schreibtests; der aktuelle Nutzerauftrag bestimmt den Ausführungsumfang.

Gewollte Logik bewahren: Hero sofort offen/statisch, Remy bleibt; Gastkarte wackelt kurz und öffnet Starter-Login ohne automatische Erklärfolien. Reveal angemeldet serverseitig ohne Kauf/Standortprüfung, 50 m nur Browser, Limits 10/min und 15/Tag. Auth bleibt eager, E-Mail nie aus Linkparametern, Token-Widerruf prüfen; Herzen nur Admintransaktion. Messung ausschließlich eigener Zähler ohne Browser-Speicher; kein GA/Cookie-Dialog. Sanity ist Inhaltsquelle, Entwürfe nur im beauftragten Umfang, Veröffentlichung erst ausdrückliche Freigabe und danach DE/EN abrufen. Keine Geheimnisse oder privaten Nutzungszahlen in öffentliche Dateien/PRs kopieren.

Bei Codeänderung tote Reste vollständig löschen; i18n-Link verwenden, bestehende et-btn/et-label/--et-Tokens und Hell/Dunkel beachten. Keine unerlaubten Pfeile, Unterstreichungen oder Fotoabdunklungen. Sichtbare Änderungen vorher/nachher Telefon/Desktop mit/ohne Reduced Motion prüfen. Aus nextjs: typecheck, lint, audit:css-modules, npx knip und risikogerechte Tests; für Browser build:isolated, dann test:e2e/audit:preview Port 3100. Keine unnötigen Abhängigkeiten installieren (node_modules ist geteilt). Live-Browser erst nach /no-count und aktiviertem Nicht-mitzählen. Performance vorher/nachher am gleichen Seitentyp, Warnungen mit Werten; Feldziele LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1, TBT ist kein Feld-INP.

Vor später beauftragtem Commit/Push ist Code-Review gegen Anforderungen und AGENTS Pflicht, Befunde beheben und erneut prüfen, Ergebnis vor Push berichten; Hook nie umgehen. Feature → staging → main, nur grüne Checks mergen. Live erst nach grünem App-Hosting-Rollout am tatsächlichen main-Merge-SHA. Infrastruktur/Billing/Preise/Rewards/Newsletter/Werbung nicht aus historischen Empfehlungen ableiten. Folgechats/Automationen nicht eigenständig erstellen.

## Ausgangsstand und Abhängigkeiten

Planbasis vom 23.11.2026: main `aa156ce26bbcd29c9cb16f7227b552465b621366`, Release #1415; App-Hosting-Rollout success frisch geprüft. #1409 Mail/Notbremse/Sentry, #1411 Web Vitals, #1413/#1415 Leseseiten und lokale Konto-E2E, #1412/#1414 Standard-404 sind darin enthalten. Inzwischen neue Releases zuerst berücksichtigen.

**T1 (Entscheidung nötig):** Guthabenfehler werden als buddy_out_of_credit behandelt; Sitzung/IP/global sind limitiert. Technikprotokoll belegt alten Ausfall, keine aktuelle Verfügbarkeit. Remy bleibt Figur und Chat; Billing wurde nicht verändert oder kostenpflichtig getestet.

**T2 (offen):** Middleware und breiter Matcher bleiben; Code dokumentiert App-Hosting-Cache-Auswirkung und Ausnahmen. Live-TTFB/Cachepfade wurden heute nicht neu gemessen. Weder CDN-Umbau noch Regionswechsel sind freigegeben.

**T3 (Entscheidung nötig):** minInstances bleibt 0 bei 1024 MiB. Historische Warte-/Kostenwerte sind keine aktuelle Messung oder belastbare Rechnung; insbesondere die alte CPU-Annahme war ungeprüft.

**T5 (teilweise):** 7fb2cc37/#1411 implementiert Reporter, validierte Histogramme und Median/P75 je Seitentyp/Gerät. Quantile sind Stufenobergrenzen. Belastbarer heutiger Feldnachweis bleibt offen; CrUX war zuletzt zu klein. Live-Lighthouse des aktuellen SHA hat deutliche Warnungen (E08).

**T6 (teilweise):** f2de1280/#1413/#1415 lädt Herz-/Magazin-/Artikelszenen und bestimmte Prefetches nach Bedarf. Vergleich gleicher Produktionsseiten: Spot 357228→302396 gzip Bytes (−15,35 %), Artikel 327418→294860 (−9,94 %), je 390/1440 px mit drei frischen Läufen. Lokales LCP kaum verändert. Firebase-Auth bleibt bewusst eager.

**T7 (teilweise):** df4885cf/#1409 verbessert Titel/Filter/Uploadfehler. Später laut übergebenem Nachweis 3 moderne Artifact Bundles/516 Dateien für aa156ce2; dieser Bundle-Nachweis wurde in Session 1 nicht neu direkt aus Sentry gelesen. Echte Symbolikation eines neuen Produktionsfehlers weiterhin unbelegt; keine Issues geschlossen.

**T10 (erledigt):** 1299c040/#1409 ergänzt begrenzte Zähler je Prozess (maximal 5000 Schlüssel), Fenster/Bereinigung und Tests bei Datenbankausfall. Mailroute limitiert je E-Mail 3/Stunde und IP 10/Stunde. Diese Notbremse ist nicht global instanzübergreifend synchronisiert; kein Produktionsausfalltest erfolgt.

**Voraussetzungen/Entscheidungen:** Nur tatsächlich freigegebene/ausgerollte Technikpakete, sinnvoller Beobachtungszeitraum.

## Ziel und begrenzte Arbeit

Releaseerfolg, Besuchertempo, Fehlerqualität und laufende Kosten getrennt abschließen.

Prüfe aktuellen main-SHA und zugehörigen Rollout, Regressions-/Fehlerlage, Remy-Guthabenalarme, kalte/warme Latenz, CDN-Hits sowie tatsächliche Kosten nur für umgesetzte Varianten. Sentry-Symbolikation weiterhin nur anhand eines geeigneten echten neuen Events beurteilen. T10-Notbremse pro Instanz bleibt Grenze; keine Produktionsstörung für Tests. T4 nicht erneut aufmachen, wenn unverändert.

**Relevante Dateien/Quellen** (Pfade relativ zur jeweils eigenen Repo-Kopie, vor Bearbeitung prüfen): App-Hosting-Checks/Logs und Metriken nur lesen; eigene Vitals; Sentry; Anbieter-Billing; nextjs/lib/rateLimit.ts-Regressionstests bei relevanten Änderungen.

## Konkrete Prüfung

Gleiche Seitentypen/Geräte/Zeiträume, ausreichende Felddaten mit Histogrammgrenzen; TBT nicht INP. Budgetwarnungen und Kostenwerte statt pauschalem bestanden. Private Nutzer-/Billingzahlen nicht in öffentliche Dateien übernehmen.

## Fertig-Kriterien und Übergabe

Belegtes Abschluss-/Restarbeitsprotokoll pro Technik-ID; nicht umgesetzte Entscheidungen als bewusst offen/verworfen, keine automatische nächste Infrastrukturänderung oder Automation.

Berichte abschließend kurz: tatsächlicher SHA/Branch, geänderte Dateien oder reine Prüfergebnisse, ausgeführte Prüfungen samt Grenzen/Warnungen, Entscheidungslage und Status je Befund-ID. Lege für den nächsten Chat eine knappe lokale Übergabe an; keine vertraulichen Daten veröffentlichen. Nur belegten Zustand melden. Nicht den gesamten übrigen Plan nebenbei abarbeiten.
