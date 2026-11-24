# S25 – Angebots- und Wachstumswirkung nachbeobachten

Eigenständig kopierbarer Startauftrag für einen künftigen Chat. Typ: **Nur Messung/Nachbeobachtung**.

**Auftrag:** Bearbeite für Eat This ausschließlich P1, P2, P3, P9, W1, W2, W3, W4, W5, W6, W7 im folgenden begrenzten Umfang.

## Arbeitsregeln für diesen neuen Chat

Projekt Eat This. Die Anwendung liegt in `nextjs/`, Sanity Studio in `studio/`. Lies die aktuelle `AGENTS.md` vollständig. Zuerst `git worktree list` und `git status`; Hauptkopie kann fremde unfertige URL-Arbeit enthalten und ist keine verlässliche Live-Kopie. Keine fremden Änderungen/Worktrees anfassen. Aktuellen Remote-main und Release-/Rollout-Check unabhängig vom lokalen Hauptbranch lesen. Vor eigenen Änderungen eigene Kopie über `./scripts/worktree.sh claude/<passender-name>` (Standardbasis origin/staging) erstellen; keine gemeinsame Arbeitskopie mit anderen schreibenden Agents. Abweichungen zur hier genannten historischen Basis zuerst abgleichen.

Dieser Auftrag enthält die Ausgangslage. Weitere Details stehen im [Befundabgleich](../befunde.md) und in den [Nachweisen](../nachweise.md). Der Plan selbst autorisiert keine zukünftigen Veröffentlichungen, Kostenänderungen oder produktiven Schreibtests; der aktuelle Nutzerauftrag bestimmt den Ausführungsumfang.

Gewollte Logik bewahren: Hero sofort offen/statisch, Remy bleibt; Gastkarte wackelt kurz und öffnet Starter-Login ohne automatische Erklärfolien. Reveal angemeldet serverseitig ohne Kauf/Standortprüfung, 50 m nur Browser, Limits 10/min und 15/Tag. Auth bleibt eager, E-Mail nie aus Linkparametern, Token-Widerruf prüfen; Herzen nur Admintransaktion. Messung ausschließlich eigener Zähler ohne Browser-Speicher; kein GA/Cookie-Dialog. Sanity ist Inhaltsquelle, Entwürfe nur im beauftragten Umfang, Veröffentlichung erst ausdrückliche Freigabe und danach DE/EN abrufen. Keine Geheimnisse oder privaten Nutzungszahlen in öffentliche Dateien/PRs kopieren.

Bei Codeänderung tote Reste vollständig löschen; i18n-Link verwenden, bestehende et-btn/et-label/--et-Tokens und Hell/Dunkel beachten. Keine unerlaubten Pfeile, Unterstreichungen oder Fotoabdunklungen. Sichtbare Änderungen vorher/nachher Telefon/Desktop mit/ohne Reduced Motion prüfen. Aus nextjs: typecheck, lint, audit:css-modules, npx knip und risikogerechte Tests; für Browser build:isolated, dann test:e2e/audit:preview Port 3100. Keine unnötigen Abhängigkeiten installieren (node_modules ist geteilt). Live-Browser erst nach /no-count und aktiviertem Nicht-mitzählen. Performance vorher/nachher am gleichen Seitentyp, Warnungen mit Werten; Feldziele LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1, TBT ist kein Feld-INP.

Vor später beauftragtem Commit/Push ist Code-Review gegen Anforderungen und AGENTS Pflicht, Befunde beheben und erneut prüfen, Ergebnis vor Push berichten; Hook nie umgehen. Feature → staging → main, nur grüne Checks mergen. Live erst nach grünem App-Hosting-Rollout am tatsächlichen main-Merge-SHA. Infrastruktur/Billing/Preise/Rewards/Newsletter/Werbung nicht aus historischen Empfehlungen ableiten. Folgechats/Automationen nicht eigenständig erstellen.

## Ausgangsstand und Abhängigkeiten

Planbasis vom 23.11.2026: main `aa156ce26bbcd29c9cb16f7227b552465b621366`, Release #1415; App-Hosting-Rollout success frisch geprüft. #1409 Mail/Notbremse/Sentry, #1411 Web Vitals, #1413/#1415 Leseseiten und lokale Konto-E2E, #1412/#1414 Standard-404 sind darin enthalten. Inzwischen neue Releases zuerst berücksichtigen.

**P1 (offen):** Der Hero enthält weiterhin den englischen Slogan und den CTA zu Must Eats. Die Map-Erklärung folgt erst in HubMapIntro. Die wahrgenommene Verständlichkeit wurde in Session 1 nicht im Browser gemessen.

**P2 (Entscheidung nötig):** Die Preiswartephase ist im Code bestätigt. Kartenzahlen dienen nur dem Leer-Prüfwert. Kommentare erklären ausdrücklich, dass das Produkt Zahlen nicht nennt: Das ist ein Konflikt zwischen früherer Produktaussage und historischer Empfehlung, keine Erlaubnis zur stillen Änderung. Preise bleiben unverändert.

**P3 (offen):** packLead, cardLead und heartLead sind weiterhin gleichartig. FAQ nennt 20. Die tatsächliche einmalige Starter-Vergabe einschließlich Wunschkarte wird inzwischen im Emulator-Browser getestet.

**P9 (offen):** trackEventOnce liest und schreibt eatthis_analytics_* in sessionStorage; Aufrufer bleiben Kaufabschluss und Standort-Einladung. Dies widerspricht der eindeutigen heutigen Projektregel.

**W1 (teilweise):** Die Textschwäche aus P3 ist bestätigt; reale lokale Kontoabläufe sind inzwischen getestet. Eine aktuelle Konversionsrate oder kausaler Texteffekt ist nicht belegt. Historische Zähler sind aggregiert und dürfen nicht wie identifizierbare Sitzungsfunnel interpretiert werden.

**W2 (offen):** MustEatTeaserSection nennt Gerichte auf Karten und führt zur Map; ein konkreter Starter-Angebotstext/ShareButton fehlt dort. Der Klickpfad bleibt zunächst ein Map-Link; seine eventuelle Angleichung an direkte Login-Logik muss bewusst und getestet erfolgen.

**W3 (nicht ausreichend belegt):** Die aktuelle Kaufzahl wurde nicht abgefragt. Der UI-Mangel aus P2 ist bestätigt; daraus folgt keine belegte Ursache für fehlende Käufe. Ein Funktionsfehler im Stripe-Weg ist ebenfalls nicht bewiesen.

**W4 (Entscheidung nötig):** Browser prüft 50 m; der Server gibt angemeldet ohne Kauf und ohne Standortprüfung frei. Diese bewusst geltende Logik hat Vorrang. Ein Pack-Hinweis darf ein Komfortangebot sein, keine neue Bezahlschranke oder behauptete Server-Ortsbindung. proximityHint besteht, mobile/desktop Kartenabläufe sind beteiligt.

**W5 (nicht ausreichend belegt):** Heutige Kampagnenaktivität, Kosten und Zuordnung wurden nicht geprüft. Startseite erklärt Angebot oben weiterhin knapp (P1), beweist aber keine Kampagnenursache. Remy oder Anmeldung in zehn Sekunden nicht unbelegt versprechen.

**W6 (Entscheidung nötig):** Einladungs-/Deck-Aktionen bestehen; Belohnung ist weiterhin eine Karte für beide. Kommentar begründet bewusst die begrenzte Belohnung gegen den kleinen Kartenbestand. Aktuelle Nutzung ist nicht neu belegt.

**W7 (Entscheidung nötig):** Im App-Code ist weiterhin nur der transaktionale Auth-Mailversand belegt. Ein vorhandener Anbieterwert oder altes Segment wäre kein Nachweis einer rechtmäßig nutzbaren Liste. Keine aktuelle Wiederkehrquote ermittelt.

**Voraussetzungen/Entscheidungen:** Freigegebene Angebots-/Wachstumsänderungen tatsächlich ausgerollt; vollständige Vergleichszeiträume.

## Ziel und begrenzte Arbeit

Die historischen Geschäftshypothesen nach heutigen Änderungen ehrlich bewerten.

Nutze dieselben vollständigen Zeitfenster und ordne Rollouts/Kanäle/Sprachen zu. Trenne Login-Ansicht, Start, Mailversand, bestehendes Login und neues Konto sowie Checkout-Start von bestätigtem Kauf. Aggregierte Ereignisse sind kein personenbezogener lückenloser Funnel. P9-Deduplizierungsänderung kann Vergleichbarkeit beeinflussen. Unbekannte Quelle nicht als Direktverkehr beweisen, geringe Stichprobe nicht hochrechnen. Keine privaten Zahlen in öffentliche Repo-Dokumente.

**Relevante Dateien/Quellen** (Pfade relativ zur jeweils eigenen Repo-Kopie, vor Bearbeitung prüfen): Eigener Zähler/aggregierte Adminberichte nur lesend; definierte Rolloutdaten; Stripe-/Auth-Aggregate nur falls autorisierter Zugriff; keine personenbezogenen Exporte.

## Konkrete Prüfung

Erfassungsfehler/Opt-out/Reloads/Own-Admin-Ausschluss plausibilisieren. Nicht eingeführte W5/W7-Produkte nicht als fehlgeschlagen messen. Keine Testkäufe, Mails, Einladungen oder Kampagnen auslösen.

## Fertig-Kriterien und Übergabe

Privates zeitbezogenes Wirkungsprotokoll je umgesetzter ID mit Aussagegrenzen; Nutzer sieht belastbare nächste Entscheidung statt behaupteter Kausalität. Keine ungefragte Automation.

Berichte abschließend kurz: tatsächlicher SHA/Branch, geänderte Dateien oder reine Prüfergebnisse, ausgeführte Prüfungen samt Grenzen/Warnungen, Entscheidungslage und Status je Befund-ID. Lege für den nächsten Chat eine knappe lokale Übergabe an; keine vertraulichen Daten veröffentlichen. Nur belegten Zustand melden. Nicht den gesamten übrigen Plan nebenbei abarbeiten.
