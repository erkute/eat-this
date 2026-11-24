# S07 – Stripe-Wege im Testmodus belegen

Eigenständig kopierbarer Startauftrag für einen künftigen Chat. Typ: **Testarbeit, isoliert**.

**Auftrag:** Bearbeite für Eat This ausschließlich T9, W3, W8 im folgenden begrenzten Umfang.

## Arbeitsregeln für diesen neuen Chat

Projekt Eat This. Die Anwendung liegt in `nextjs/`, Sanity Studio in `studio/`. Lies die aktuelle `AGENTS.md` vollständig. Zuerst `git worktree list` und `git status`; Hauptkopie kann fremde unfertige URL-Arbeit enthalten und ist keine verlässliche Live-Kopie. Keine fremden Änderungen/Worktrees anfassen. Aktuellen Remote-main und Release-/Rollout-Check unabhängig vom lokalen Hauptbranch lesen. Vor eigenen Änderungen eigene Kopie über `./scripts/worktree.sh claude/<passender-name>` (Standardbasis origin/staging) erstellen; keine gemeinsame Arbeitskopie mit anderen schreibenden Agents. Abweichungen zur hier genannten historischen Basis zuerst abgleichen.

Dieser Auftrag enthält die Ausgangslage. Weitere Details stehen im [Befundabgleich](../befunde.md) und in den [Nachweisen](../nachweise.md). Der Plan selbst autorisiert keine zukünftigen Veröffentlichungen, Kostenänderungen oder produktiven Schreibtests; der aktuelle Nutzerauftrag bestimmt den Ausführungsumfang.

Gewollte Logik bewahren: Hero sofort offen/statisch, Remy bleibt; Gastkarte wackelt kurz und öffnet Starter-Login ohne automatische Erklärfolien. Reveal angemeldet serverseitig ohne Kauf/Standortprüfung, 50 m nur Browser, Limits 10/min und 15/Tag. Auth bleibt eager, E-Mail nie aus Linkparametern, Token-Widerruf prüfen; Herzen nur Admintransaktion. Messung ausschließlich eigener Zähler ohne Browser-Speicher; kein GA/Cookie-Dialog. Sanity ist Inhaltsquelle, Entwürfe nur im beauftragten Umfang, Veröffentlichung erst ausdrückliche Freigabe und danach DE/EN abrufen. Keine Geheimnisse oder privaten Nutzungszahlen in öffentliche Dateien/PRs kopieren.

Bei Codeänderung tote Reste vollständig löschen; i18n-Link verwenden, bestehende et-btn/et-label/--et-Tokens und Hell/Dunkel beachten. Keine unerlaubten Pfeile, Unterstreichungen oder Fotoabdunklungen. Sichtbare Änderungen vorher/nachher Telefon/Desktop mit/ohne Reduced Motion prüfen. Aus nextjs: typecheck, lint, audit:css-modules, npx knip und risikogerechte Tests; für Browser build:isolated, dann test:e2e/audit:preview Port 3100. Keine unnötigen Abhängigkeiten installieren (node_modules ist geteilt). Live-Browser erst nach /no-count und aktiviertem Nicht-mitzählen. Performance vorher/nachher am gleichen Seitentyp, Warnungen mit Werten; Feldziele LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1, TBT ist kein Feld-INP.

Vor später beauftragtem Commit/Push ist Code-Review gegen Anforderungen und AGENTS Pflicht, Befunde beheben und erneut prüfen, Ergebnis vor Push berichten; Hook nie umgehen. Feature → staging → main, nur grüne Checks mergen. Live erst nach grünem App-Hosting-Rollout am tatsächlichen main-Merge-SHA. Infrastruktur/Billing/Preise/Rewards/Newsletter/Werbung nicht aus historischen Empfehlungen ableiten. Folgechats/Automationen nicht eigenständig erstellen.

## Ausgangsstand und Abhängigkeiten

Planbasis vom 23.11.2026: main `aa156ce26bbcd29c9cb16f7227b552465b621366`, Release #1415; App-Hosting-Rollout success frisch geprüft. #1409 Mail/Notbremse/Sentry, #1411 Web Vitals, #1413/#1415 Leseseiten und lokale Konto-E2E, #1412/#1414 Standard-404 sind darin enthalten. Inzwischen neue Releases zuerst berücksichtigen.

**T9 (teilweise):** 17beaf44/#1413/#1415 deckt echten lokalen E-Mail-Link, Starter/Wunschkarte/Einmaligkeit, Herz-Transaktion/Persistenz und Nearby-Reveal ohne Kauf ab. Auth/Firestore/Storage-Emulatoren echt; Produktionsregeln nur für Firestore, Storage nutzt eigene deny-all-Testregeln und synthetische Daten. HTTPS-Proxy ermöglicht Secure-Cookies in WebKit. Stripe-Kauf/Weiterleitung ist dadurch nicht lückenlos abgedeckt.

**W3 (nicht ausreichend belegt):** Die aktuelle Kaufzahl wurde nicht abgefragt. Der UI-Mangel aus P2 ist bestätigt; daraus folgt keine belegte Ursache für fehlende Käufe. Ein Funktionsfehler im Stripe-Weg ist ebenfalls nicht bewiesen.

**W8 (offen):** cancelPath bestätigt genau diese bestehende Unterscheidung. Die historische Rückkehrzahl wird nicht als heutige Kaufabbruchzahl verwendet.

**Voraussetzungen/Entscheidungen:** S06; isolierte Stripe-Testzugänge/Weiterleitung ausdrücklich verfügbar.

## Ziel und begrenzte Arbeit

Die konkrete verbliebene T9-Lücke prüfen, ohne Produktionskäufe oder -konten zu erzeugen.

Inventar vorhandener Stripe-Route-/Webhooktests erstellen. Definiere vorab zugesagten Umfang: Checkout-Erzeugung/Weiterleitung und Gast-/Auth-Abbruch in DE/EN sind Pflicht. Erfolg/Webhook/Entitlement nur als abgedeckt bezeichnen, wenn mit echten Testmodusnachweisen geprüft. Prüfe Credential-Typen ohne Werte auszugeben. Fehlt ein isolierter Zugang, sichere die lokal prüfbaren Teile und benenne exakt die blockierte externe Prüfung; niemals auf Live-Stripe ausweichen.

**Relevante Dateien/Quellen** (Pfade relativ zur jeweils eigenen Repo-Kopie, vor Bearbeitung prüfen): nextjs/app/api/stripe/checkout/route.ts; nextjs/app/api/stripe/webhook/route.ts; nextjs/app/[locale]/checkout/success; nextjs/e2e/checkout-theme.spec.ts; nextjs/e2e/account-fixture.ts; firebase.e2e.json; nextjs/e2e/README.md.

## Konkrete Prüfung

Bestehende Konto-E2E mit echten Auth/Firestore/Storage-Emulatoren; Produktion-Firestore-Regeln, separate deny-all-Storage-Testregeln korrekt benennen. Loopback-/Demo-Schutz, Secure-Cookies/WebKit, Abbruchziele, serverseitige Besitz-/Idempotenz-/Webhook-Signaturtests prüfen. Normale Produktion und Emulator-Build getrennt halten.

## Fertig-Kriterien und Übergabe

Prüfmatrix mit Testmodusbelegen pro zugesagtem Schritt, Ergebnissen/Skips und verbleibenden Lücken; kein pauschales Stripe-vollständig-getestet ohne entsprechenden Nachweis.

Berichte abschließend kurz: tatsächlicher SHA/Branch, geänderte Dateien oder reine Prüfergebnisse, ausgeführte Prüfungen samt Grenzen/Warnungen, Entscheidungslage und Status je Befund-ID. Lege für den nächsten Chat eine knappe lokale Übergabe an; keine vertraulichen Daten veröffentlichen. Nur belegten Zustand melden. Nicht den gesamten übrigen Plan nebenbei abarbeiten.
