# S22 – Neuigkeiten-Mails als eigenes Produkt entscheiden

Eigenständig kopierbarer Startauftrag für einen künftigen Chat. Typ: **Entscheidung, keine Implementierung**.

**Auftrag:** Bearbeite für Eat This ausschließlich W7 im folgenden begrenzten Umfang.

## Arbeitsregeln für diesen neuen Chat

Projekt Eat This. Die Anwendung liegt in `nextjs/`, Sanity Studio in `studio/`. Lies die aktuelle `AGENTS.md` vollständig. Zuerst `git worktree list` und `git status`; Hauptkopie kann fremde unfertige URL-Arbeit enthalten und ist keine verlässliche Live-Kopie. Keine fremden Änderungen/Worktrees anfassen. Aktuellen Remote-main und Release-/Rollout-Check unabhängig vom lokalen Hauptbranch lesen. Vor eigenen Änderungen eigene Kopie über `./scripts/worktree.sh claude/<passender-name>` (Standardbasis origin/staging) erstellen; keine gemeinsame Arbeitskopie mit anderen schreibenden Agents. Abweichungen zur hier genannten historischen Basis zuerst abgleichen.

Dieser Auftrag enthält die Ausgangslage. Weitere Details stehen im [Befundabgleich](../befunde.md) und in den [Nachweisen](../nachweise.md). Der Plan selbst autorisiert keine zukünftigen Veröffentlichungen, Kostenänderungen oder produktiven Schreibtests; der aktuelle Nutzerauftrag bestimmt den Ausführungsumfang.

Gewollte Logik bewahren: Hero sofort offen/statisch, Remy bleibt; Gastkarte wackelt kurz und öffnet Starter-Login ohne automatische Erklärfolien. Reveal angemeldet serverseitig ohne Kauf/Standortprüfung, 50 m nur Browser, Limits 10/min und 15/Tag. Auth bleibt eager, E-Mail nie aus Linkparametern, Token-Widerruf prüfen; Herzen nur Admintransaktion. Messung ausschließlich eigener Zähler ohne Browser-Speicher; kein GA/Cookie-Dialog. Sanity ist Inhaltsquelle, Entwürfe nur im beauftragten Umfang, Veröffentlichung erst ausdrückliche Freigabe und danach DE/EN abrufen. Keine Geheimnisse oder privaten Nutzungszahlen in öffentliche Dateien/PRs kopieren.

Bei Codeänderung tote Reste vollständig löschen; i18n-Link verwenden, bestehende et-btn/et-label/--et-Tokens und Hell/Dunkel beachten. Keine unerlaubten Pfeile, Unterstreichungen oder Fotoabdunklungen. Sichtbare Änderungen vorher/nachher Telefon/Desktop mit/ohne Reduced Motion prüfen. Aus nextjs: typecheck, lint, audit:css-modules, npx knip und risikogerechte Tests; für Browser build:isolated, dann test:e2e/audit:preview Port 3100. Keine unnötigen Abhängigkeiten installieren (node_modules ist geteilt). Live-Browser erst nach /no-count und aktiviertem Nicht-mitzählen. Performance vorher/nachher am gleichen Seitentyp, Warnungen mit Werten; Feldziele LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1, TBT ist kein Feld-INP.

Vor später beauftragtem Commit/Push ist Code-Review gegen Anforderungen und AGENTS Pflicht, Befunde beheben und erneut prüfen, Ergebnis vor Push berichten; Hook nie umgehen. Feature → staging → main, nur grüne Checks mergen. Live erst nach grünem App-Hosting-Rollout am tatsächlichen main-Merge-SHA. Infrastruktur/Billing/Preise/Rewards/Newsletter/Werbung nicht aus historischen Empfehlungen ableiten. Folgechats/Automationen nicht eigenständig erstellen.

## Ausgangsstand und Abhängigkeiten

Planbasis vom 23.11.2026: main `aa156ce26bbcd29c9cb16f7227b552465b621366`, Release #1415; App-Hosting-Rollout success frisch geprüft. #1409 Mail/Notbremse/Sentry, #1411 Web Vitals, #1413/#1415 Leseseiten und lokale Konto-E2E, #1412/#1414 Standard-404 sind darin enthalten. Inzwischen neue Releases zuerst berücksichtigen.

**W7 (Entscheidung nötig):** Im App-Code ist weiterhin nur der transaktionale Auth-Mailversand belegt. Ein vorhandener Anbieterwert oder altes Segment wäre kein Nachweis einer rechtmäßig nutzbaren Liste. Keine aktuelle Wiederkehrquote ermittelt.

**Voraussetzungen/Entscheidungen:** S05-Angebot steht; Nutzerinteresse erforderlich.

## Ziel und begrenzte Arbeit

Newsletterumfang und Verantwortung klären, bevor Daten gesammelt oder Mails versandt werden.

Erstelle eine konkrete optionale Zusage, Beispielinhalt, Frequenz, geschätzte laufende Kosten und DOI-/Abmeldeablauf. Entscheide Rechtsgrundlage, Einwilligungsnachweis, Datenminimierung/Löschung und Verantwortlichkeit als echte neue Anforderungen; aktuelle primäre Quellen für rechtliche Aussagen prüfen. Bestehende Login-Adressen niemals als Marketingliste behandeln. Keine Rechtskonformität pauschal versprechen.

**Relevante Dateien/Quellen** (Pfade relativ zur jeweils eigenen Repo-Kopie, vor Bearbeitung prüfen): nextjs/lib/auth/sendMagicLink.ts; nextjs/emails; bestehende Auth-/Datenschutztexte; Anbieterfähigkeiten nur lesend prüfen.

## Konkrete Prüfung

Anmeldung ohne Newsletter möglich, Checkbox freiwillig/ungewählt, Bestätigung und Abmeldung getrennt vom Auth-Mail-Link. Keine Anbieter-Kontakte/Segmente/Automationen/Broadcasts anlegen oder produktive Mails auslösen.

## Fertig-Kriterien und Übergabe

Dokumentiertes Ja/Nein zum Produkt und getrennte Entscheidungen zu Takt/DOI/Kosten. Bei Nein W7 als bewusst verworfen schließen; bei Ja S23/S24 konkret beauftragen.

Berichte abschließend kurz: tatsächlicher SHA/Branch, geänderte Dateien oder reine Prüfergebnisse, ausgeführte Prüfungen samt Grenzen/Warnungen, Entscheidungslage und Status je Befund-ID. Lege für den nächsten Chat eine knappe lokale Übergabe an; keine vertraulichen Daten veröffentlichen. Nur belegten Zustand melden. Nicht den gesamten übrigen Plan nebenbei abarbeiten.
