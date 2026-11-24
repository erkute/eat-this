# S15 – Suchabsichten und Indexentscheidungen

Eigenständig kopierbarer Startauftrag für einen künftigen Chat. Typ: **Nur Prüfung/Entscheidung**.

**Auftrag:** Bearbeite für Eat This ausschließlich P6, I1, I2, I4, I6, I7 im folgenden begrenzten Umfang.

## Arbeitsregeln für diesen neuen Chat

Projekt Eat This. Die Anwendung liegt in `nextjs/`, Sanity Studio in `studio/`. Lies die aktuelle `AGENTS.md` vollständig. Zuerst `git worktree list` und `git status`; Hauptkopie kann fremde unfertige URL-Arbeit enthalten und ist keine verlässliche Live-Kopie. Keine fremden Änderungen/Worktrees anfassen. Aktuellen Remote-main und Release-/Rollout-Check unabhängig vom lokalen Hauptbranch lesen. Vor eigenen Änderungen eigene Kopie über `./scripts/worktree.sh claude/<passender-name>` (Standardbasis origin/staging) erstellen; keine gemeinsame Arbeitskopie mit anderen schreibenden Agents. Abweichungen zur hier genannten historischen Basis zuerst abgleichen.

Dieser Auftrag enthält die Ausgangslage. Weitere Details stehen im [Befundabgleich](../befunde.md) und in den [Nachweisen](../nachweise.md). Der Plan selbst autorisiert keine zukünftigen Veröffentlichungen, Kostenänderungen oder produktiven Schreibtests; der aktuelle Nutzerauftrag bestimmt den Ausführungsumfang.

Gewollte Logik bewahren: Hero sofort offen/statisch, Remy bleibt; Gastkarte wackelt kurz und öffnet Starter-Login ohne automatische Erklärfolien. Reveal angemeldet serverseitig ohne Kauf/Standortprüfung, 50 m nur Browser, Limits 10/min und 15/Tag. Auth bleibt eager, E-Mail nie aus Linkparametern, Token-Widerruf prüfen; Herzen nur Admintransaktion. Messung ausschließlich eigener Zähler ohne Browser-Speicher; kein GA/Cookie-Dialog. Sanity ist Inhaltsquelle, Entwürfe nur im beauftragten Umfang, Veröffentlichung erst ausdrückliche Freigabe und danach DE/EN abrufen. Keine Geheimnisse oder privaten Nutzungszahlen in öffentliche Dateien/PRs kopieren.

Bei Codeänderung tote Reste vollständig löschen; i18n-Link verwenden, bestehende et-btn/et-label/--et-Tokens und Hell/Dunkel beachten. Keine unerlaubten Pfeile, Unterstreichungen oder Fotoabdunklungen. Sichtbare Änderungen vorher/nachher Telefon/Desktop mit/ohne Reduced Motion prüfen. Aus nextjs: typecheck, lint, audit:css-modules, npx knip und risikogerechte Tests; für Browser build:isolated, dann test:e2e/audit:preview Port 3100. Keine unnötigen Abhängigkeiten installieren (node_modules ist geteilt). Live-Browser erst nach /no-count und aktiviertem Nicht-mitzählen. Performance vorher/nachher am gleichen Seitentyp, Warnungen mit Werten; Feldziele LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1, TBT ist kein Feld-INP.

Vor später beauftragtem Commit/Push ist Code-Review gegen Anforderungen und AGENTS Pflicht, Befunde beheben und erneut prüfen, Ergebnis vor Push berichten; Hook nie umgehen. Feature → staging → main, nur grüne Checks mergen. Live erst nach grünem App-Hosting-Rollout am tatsächlichen main-Merge-SHA. Infrastruktur/Billing/Preise/Rewards/Newsletter/Werbung nicht aus historischen Empfehlungen ableiten. Folgechats/Automationen nicht eigenständig erstellen.

## Ausgangsstand und Abhängigkeiten

Planbasis vom 23.11.2026: main `aa156ce26bbcd29c9cb16f7227b552465b621366`, Release #1415; App-Hosting-Rollout success frisch geprüft. #1409 Mail/Notbremse/Sentry, #1411 Web Vitals, #1413/#1415 Leseseiten und lokale Konto-E2E, #1412/#1414 Standard-404 sind darin enthalten. Inzwischen neue Releases zuerst berücksichtigen.

**P6 (Entscheidung nötig):** Code und Live-HTTP bestätigen noindex in DE/EN. Für Pack-Details ist Vermeidung der Konkurrenz zu Kategorieseiten im Code begründet. noindex ist daher kein pauschaler Fehler.

**I1 (nicht ausreichend belegt):** Der historische Zeitraum ist keine heutige Rankingmessung. Aktuelle Templates können Text und kuratierte Top-Spots darstellen; OpenSEO-Kontext enthält nur eine ältere Recherche vom 12.11.2026. Ein Rankinggewinn oder unveränderte Schwäche ist heute nicht vollständig nachgewiesen.

**I2 (teilweise):** Eine neue GSC-Stichprobe bestätigt unterschiedliche Zustände: Gazzo DE ist gecrawlt, derzeit nicht indexiert; Gazzo EN wird als indexiert gemeldet. Das Originalgesamtergebnis lässt sich daraus weder bestätigen noch ersetzen. API-Inspektionen spiegeln Googles gespeicherten Stand, keinen Live-Crawl.

**I4 (nicht ausreichend belegt):** Bezirksseiten und redaktionelle Artikel bestehen nebeneinander; crossLinks stellt Querverbindungen her. Ob eine schädliche Konkurrenz besteht, ist ohne aktuelle Query×Seite-Auswertung nicht belegt. Mehrere URLs allein beweisen keine Kannibalisierung.

**I6 (Entscheidung nötig):** Live nennt Friedenau 2 und Friedrichshain 4 Einträge; Wedding 5, Steglitz 6. Seiten tragen index,follow. Sitemap-Schwelle bleibt >0, Map-Schwelle 5. Daraus folgt kein belegter SEO-Schaden und keine automatische noindex-Pflicht.

**I7 (offen):** DistrictHeader rendert weiterhin nur name als H1; Home EN-Title bleibt Marke zuerst. Ein behaupteter Rankingeffekt dieser Reihenfolge ist nicht gemessen. Home-Teil wird mit P1 gemeinsam umgesetzt.

**Voraussetzungen/Entscheidungen:** S05-Angebot konsistent; keine Veröffentlichung nötig.

## Ziel und begrenzte Arbeit

Kleine begründete Suchziel-Matrix und konkrete Inhalts-Piloten statt pauschaler SEO-Regeln.

Lies aktuelle GSC-Daten über vorhandenen Connector mit explizitem Zeitraum, Sprache/Gerät und Query×Seite. Prüfe priorisierte Index-Stichprobe mit Crawlzeiten. Entscheide /must-eats, Kaufseiten und kleine Bezirke getrennt. Verteile Mitte/Torstraße/Kantstraße auf unterschiedliche Suchabsichten. Eine Bezirks- und eine Kategorieseite für S16 wählen. Keine Schwelle nur wegen der Map kopieren und keine aktuellen Rankingzahlen aus dem Originalbericht übernehmen.

**Relevante Dateien/Quellen** (Pfade relativ zur jeweils eigenen Repo-Kopie, vor Bearbeitung prüfen): nextjs/lib/seo/sitemap-entries.ts; nextjs/lib/seo/crossLinks.ts; nextjs/app/[locale]/bezirk/[slug]/page.tsx; nextjs/app/[locale]/kategorie/[slug]/page.tsx; nextjs/app/[locale]/(spa)/must-eats/page.tsx; Sanity-Bezirke/Kategorien/Artikel nur lesen.

## Konkrete Prüfung

Robots/Sitemap/Canonical/hreflang in DE/EN auf Konsistenz; aktuelle öffentliche Spotmenge/Top-Spots und vorhandene Inhalte lesen. Keine Indexierungsanträge, Search-Console-Entfernungen, Sanity-Writes oder Redirects. Private GSC-Zahlen nicht öffentlich speichern.

## Fertig-Kriterien und Übergabe

Freigegebene Ziel-/Index-Matrix, klar begrenzte Piloten mit Faktenquellen und Nachmesszeitraum; noch offene Entscheidungen sichtbar.

Berichte abschließend kurz: tatsächlicher SHA/Branch, geänderte Dateien oder reine Prüfergebnisse, ausgeführte Prüfungen samt Grenzen/Warnungen, Entscheidungslage und Status je Befund-ID. Lege für den nächsten Chat eine knappe lokale Übergabe an; keine vertraulichen Daten veröffentlichen. Nur belegten Zustand melden. Nicht den gesamten übrigen Plan nebenbei abarbeiten.
