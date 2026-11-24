# S28 – CDN-Varianten und Region getrennt prüfen

Eigenständig kopierbarer Startauftrag für einen künftigen Chat. Typ: **Nur Architektur/Messung/Entscheidung**.

**Auftrag:** Bearbeite für Eat This ausschließlich T2 im folgenden begrenzten Umfang.

## Arbeitsregeln für diesen neuen Chat

Projekt Eat This. Die Anwendung liegt in `nextjs/`, Sanity Studio in `studio/`. Lies die aktuelle `AGENTS.md` vollständig. Zuerst `git worktree list` und `git status`; Hauptkopie kann fremde unfertige URL-Arbeit enthalten und ist keine verlässliche Live-Kopie. Keine fremden Änderungen/Worktrees anfassen. Aktuellen Remote-main und Release-/Rollout-Check unabhängig vom lokalen Hauptbranch lesen. Vor eigenen Änderungen eigene Kopie über `./scripts/worktree.sh claude/<passender-name>` (Standardbasis origin/staging) erstellen; keine gemeinsame Arbeitskopie mit anderen schreibenden Agents. Abweichungen zur hier genannten historischen Basis zuerst abgleichen.

Dieser Auftrag enthält die Ausgangslage. Weitere Details stehen im [Befundabgleich](../befunde.md) und in den [Nachweisen](../nachweise.md). Der Plan selbst autorisiert keine zukünftigen Veröffentlichungen, Kostenänderungen oder produktiven Schreibtests; der aktuelle Nutzerauftrag bestimmt den Ausführungsumfang.

Gewollte Logik bewahren: Hero sofort offen/statisch, Remy bleibt; Gastkarte wackelt kurz und öffnet Starter-Login ohne automatische Erklärfolien. Reveal angemeldet serverseitig ohne Kauf/Standortprüfung, 50 m nur Browser, Limits 10/min und 15/Tag. Auth bleibt eager, E-Mail nie aus Linkparametern, Token-Widerruf prüfen; Herzen nur Admintransaktion. Messung ausschließlich eigener Zähler ohne Browser-Speicher; kein GA/Cookie-Dialog. Sanity ist Inhaltsquelle, Entwürfe nur im beauftragten Umfang, Veröffentlichung erst ausdrückliche Freigabe und danach DE/EN abrufen. Keine Geheimnisse oder privaten Nutzungszahlen in öffentliche Dateien/PRs kopieren.

Bei Codeänderung tote Reste vollständig löschen; i18n-Link verwenden, bestehende et-btn/et-label/--et-Tokens und Hell/Dunkel beachten. Keine unerlaubten Pfeile, Unterstreichungen oder Fotoabdunklungen. Sichtbare Änderungen vorher/nachher Telefon/Desktop mit/ohne Reduced Motion prüfen. Aus nextjs: typecheck, lint, audit:css-modules, npx knip und risikogerechte Tests; für Browser build:isolated, dann test:e2e/audit:preview Port 3100. Keine unnötigen Abhängigkeiten installieren (node_modules ist geteilt). Live-Browser erst nach /no-count und aktiviertem Nicht-mitzählen. Performance vorher/nachher am gleichen Seitentyp, Warnungen mit Werten; Feldziele LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1, TBT ist kein Feld-INP.

Vor später beauftragtem Commit/Push ist Code-Review gegen Anforderungen und AGENTS Pflicht, Befunde beheben und erneut prüfen, Ergebnis vor Push berichten; Hook nie umgehen. Feature → staging → main, nur grüne Checks mergen. Live erst nach grünem App-Hosting-Rollout am tatsächlichen main-Merge-SHA. Infrastruktur/Billing/Preise/Rewards/Newsletter/Werbung nicht aus historischen Empfehlungen ableiten. Folgechats/Automationen nicht eigenständig erstellen.

## Ausgangsstand und Abhängigkeiten

Planbasis vom 23.11.2026: main `aa156ce26bbcd29c9cb16f7227b552465b621366`, Release #1415; App-Hosting-Rollout success frisch geprüft. #1409 Mail/Notbremse/Sentry, #1411 Web Vitals, #1413/#1415 Leseseiten und lokale Konto-E2E, #1412/#1414 Standard-404 sind darin enthalten. Inzwischen neue Releases zuerst berücksichtigen.

**T2 (offen):** Middleware und breiter Matcher bleiben; Code dokumentiert App-Hosting-Cache-Auswirkung und Ausnahmen. Live-TTFB/Cachepfade wurden heute nicht neu gemessen. Weder CDN-Umbau noch Regionswechsel sind freigegeben.

**Voraussetzungen/Entscheidungen:** S13-Messbasis; aktuelle Release-/URL-Arbeit neu abgleichen.

## Ziel und begrenzte Arbeit

Einen sicheren kleinen CDN-Versuch entwerfen, ohne die gesamte Request-Architektur auf Verdacht umzubauen.

Inventar aller Middleware-Aufgaben: Locale, alte URLs, Referral-Cookie, Staging-Basic-Auth/noindex, Cacheausnahmen und sensible Authantworten. Messe gleiche DE-/EN-URLs und Header kalt/warm/mit/ohne Cookies, ohne Inhalte anderer Nutzer zu cachen. Vergleiche höchstens zwei Varianten samt Invalidierung/Rollback. Entscheide CDN-Umbau separat; Regionswechsel separat mit Abhängigkeiten zu Firebase-Daten/Auth/Storage/Hosting und Downtime. Ein Regionswechsel erfordert nach Ja einen eigenen Migrationsauftrag, er ist in S29 ausdrücklich ausgeschlossen.

**Relevante Dateien/Quellen** (Pfade relativ zur jeweils eigenen Repo-Kopie, vor Bearbeitung prüfen): nextjs/middleware.ts; nextjs/lib/seo/legacyRedirects.ts; nextjs/i18n; nextjs/app/api/revalidate/route.ts; nextjs/apphosting.yaml; Staging-Schutz; aktuelle offizielle App-Hosting-Dokumentation.

## Konkrete Prüfung

Primärdokumentation nachlesen; tatsächliche Header/TTFB und Sanity-Revalidierung belegen. Keine Cache-/Hosting-/Regionskonfiguration ändern. Staging-Prüfung nur autorisiert, keine Veröffentlichung. Fremde URL-Worktrees nicht anfassen.

## Fertig-Kriterien und Übergabe

Variantenentscheidung und ein konkret begrenzter S29-Staging-Versuch oder begründetes Nein; eigene Region-Entscheidung ohne implizite Migration.

Berichte abschließend kurz: tatsächlicher SHA/Branch, geänderte Dateien oder reine Prüfergebnisse, ausgeführte Prüfungen samt Grenzen/Warnungen, Entscheidungslage und Status je Befund-ID. Lege für den nächsten Chat eine knappe lokale Übergabe an; keine vertraulichen Daten veröffentlichen. Nur belegten Zustand melden. Nicht den gesamten übrigen Plan nebenbei abarbeiten.
