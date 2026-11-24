# S02 – Messung ohne Browserspeicher

Eigenständig kopierbarer Startauftrag für einen künftigen Chat. Typ: **Umsetzung, klein**.

**Auftrag:** Bearbeite für Eat This ausschließlich P9, W1 im folgenden begrenzten Umfang.

## Arbeitsregeln für diesen neuen Chat

Projekt Eat This. Die Anwendung liegt in `nextjs/`, Sanity Studio in `studio/`. Lies die aktuelle `AGENTS.md` vollständig. Zuerst `git worktree list` und `git status`; Hauptkopie kann fremde unfertige URL-Arbeit enthalten und ist keine verlässliche Live-Kopie. Keine fremden Änderungen/Worktrees anfassen. Aktuellen Remote-main und Release-/Rollout-Check unabhängig vom lokalen Hauptbranch lesen. Vor eigenen Änderungen eigene Kopie über `./scripts/worktree.sh claude/<passender-name>` (Standardbasis origin/staging) erstellen; keine gemeinsame Arbeitskopie mit anderen schreibenden Agents. Abweichungen zur hier genannten historischen Basis zuerst abgleichen.

Dieser Auftrag enthält die Ausgangslage. Weitere Details stehen im [Befundabgleich](../befunde.md) und in den [Nachweisen](../nachweise.md). Der Plan selbst autorisiert keine zukünftigen Veröffentlichungen, Kostenänderungen oder produktiven Schreibtests; der aktuelle Nutzerauftrag bestimmt den Ausführungsumfang.

Gewollte Logik bewahren: Hero sofort offen/statisch, Remy bleibt; Gastkarte wackelt kurz und öffnet Starter-Login ohne automatische Erklärfolien. Reveal angemeldet serverseitig ohne Kauf/Standortprüfung, 50 m nur Browser, Limits 10/min und 15/Tag. Auth bleibt eager, E-Mail nie aus Linkparametern, Token-Widerruf prüfen; Herzen nur Admintransaktion. Messung ausschließlich eigener Zähler ohne Browser-Speicher; kein GA/Cookie-Dialog. Sanity ist Inhaltsquelle, Entwürfe nur im beauftragten Umfang, Veröffentlichung erst ausdrückliche Freigabe und danach DE/EN abrufen. Keine Geheimnisse oder privaten Nutzungszahlen in öffentliche Dateien/PRs kopieren.

Bei Codeänderung tote Reste vollständig löschen; i18n-Link verwenden, bestehende et-btn/et-label/--et-Tokens und Hell/Dunkel beachten. Keine unerlaubten Pfeile, Unterstreichungen oder Fotoabdunklungen. Sichtbare Änderungen vorher/nachher Telefon/Desktop mit/ohne Reduced Motion prüfen. Aus nextjs: typecheck, lint, audit:css-modules, npx knip und risikogerechte Tests; für Browser build:isolated, dann test:e2e/audit:preview Port 3100. Keine unnötigen Abhängigkeiten installieren (node_modules ist geteilt). Live-Browser erst nach /no-count und aktiviertem Nicht-mitzählen. Performance vorher/nachher am gleichen Seitentyp, Warnungen mit Werten; Feldziele LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1, TBT ist kein Feld-INP.

Vor später beauftragtem Commit/Push ist Code-Review gegen Anforderungen und AGENTS Pflicht, Befunde beheben und erneut prüfen, Ergebnis vor Push berichten; Hook nie umgehen. Feature → staging → main, nur grüne Checks mergen. Live erst nach grünem App-Hosting-Rollout am tatsächlichen main-Merge-SHA. Infrastruktur/Billing/Preise/Rewards/Newsletter/Werbung nicht aus historischen Empfehlungen ableiten. Folgechats/Automationen nicht eigenständig erstellen.

## Ausgangsstand und Abhängigkeiten

Planbasis vom 23.11.2026: main `aa156ce26bbcd29c9cb16f7227b552465b621366`, Release #1415; App-Hosting-Rollout success frisch geprüft. #1409 Mail/Notbremse/Sentry, #1411 Web Vitals, #1413/#1415 Leseseiten und lokale Konto-E2E, #1412/#1414 Standard-404 sind darin enthalten. Inzwischen neue Releases zuerst berücksichtigen.

**P9 (offen):** trackEventOnce liest und schreibt eatthis_analytics_* in sessionStorage; Aufrufer bleiben Kaufabschluss und Standort-Einladung. Dies widerspricht der eindeutigen heutigen Projektregel.

**W1 (teilweise):** Die Textschwäche aus P3 ist bestätigt; reale lokale Kontoabläufe sind inzwischen getestet. Eine aktuelle Konversionsrate oder kausaler Texteffekt ist nicht belegt. Historische Zähler sind aggregiert und dürfen nicht wie identifizierbare Sitzungsfunnel interpretiert werden.

**Voraussetzungen/Entscheidungen:** S01; keine Produktentscheidung nötig.

## Ziel und begrenzte Arbeit

Den klaren Regelverstoß P9 beseitigen und die Aussagekraft der betroffenen Zähler dokumentieren.

Lies trackEventOnce samt beiden Aufrufern und Tests. Ersetze Sitzungsspeicher mit der kleinsten passenden Lösung ohne persistente Besucherkennung. Entscheide anhand der vorhandenen Datenstruktur, ob Kauf-Idempotenz im existierenden serverseitigen Zahlungsweg belastbar lösbar ist. Wenn dafür ein größerer Datenumbau nötig wäre, halte die Reload-Doppelzählungsgrenze ausdrücklich fest und lagere den zusätzlichen Umbau in einen konkreten gesonderten Auftrag aus. Keine Session-ID, kein Fingerprinting, kein Cookie-Dialog. Ändere weder Auth-E-Mail-Speicher noch Theme-Einstellungen. Lösche ersetzte Helfer/Tests/Kommentare vollständig.

**Relevante Dateien/Quellen** (Pfade relativ zur jeweils eigenen Repo-Kopie, vor Bearbeitung prüfen): nextjs/lib/analytics.ts; nextjs/app/[locale]/checkout/success/CheckoutSuccessAnalytics.tsx; nextjs/lib/map/useMapLocationFeedback.ts; zugehörige Unit-Tests; nextjs/app/api/count/route.ts nur zur Semantikprüfung.

## Konkrete Prüfung

Prüfe Strict-Mode-/Remount-Verhalten, zwei unterschiedliche Transaktionen, Seitenwechsel, Reload und blockierten Speicher. Kontrolliere mit einem Speicher-Spy bzw. Browserinstrumentierung, dass die Messung keine Browser-Speicherschreibvorgänge ausführt. Unit-Tests für die tatsächlichen Risiken; typecheck, lint, audit:css-modules und npx knip. Bei Browserprüfung isolierten Build verwenden, keine produktiven Käufe.

## Fertig-Kriterien und Übergabe

P9 erfüllt Speicherregel; Kauf-/Standort-Ereignisse bleiben zweckmäßig; Deduplizierungsgrenzen und Funneldefinitionen stehen in der Übergabe. Review ohne offenen relevanten Befund; kein Commit/Push ohne späteren ausdrücklichen Auftrag.

Berichte abschließend kurz: tatsächlicher SHA/Branch, geänderte Dateien oder reine Prüfergebnisse, ausgeführte Prüfungen samt Grenzen/Warnungen, Entscheidungslage und Status je Befund-ID. Lege für den nächsten Chat eine knappe lokale Übergabe an; keine vertraulichen Daten veröffentlichen. Nur belegten Zustand melden. Nicht den gesamten übrigen Plan nebenbei abarbeiten.
