# S08 – Angebot auf Spot und Karten-Entfernung

Eigenständig kopierbarer Startauftrag für einen künftigen Chat. Typ: **Umsetzung, kleines UI-Paket**.

**Auftrag:** Bearbeite für Eat This ausschließlich W2, W4 im folgenden begrenzten Umfang.

## Arbeitsregeln für diesen neuen Chat

Projekt Eat This. Die Anwendung liegt in `nextjs/`, Sanity Studio in `studio/`. Lies die aktuelle `AGENTS.md` vollständig. Zuerst `git worktree list` und `git status`; Hauptkopie kann fremde unfertige URL-Arbeit enthalten und ist keine verlässliche Live-Kopie. Keine fremden Änderungen/Worktrees anfassen. Aktuellen Remote-main und Release-/Rollout-Check unabhängig vom lokalen Hauptbranch lesen. Vor eigenen Änderungen eigene Kopie über `./scripts/worktree.sh claude/<passender-name>` (Standardbasis origin/staging) erstellen; keine gemeinsame Arbeitskopie mit anderen schreibenden Agents. Abweichungen zur hier genannten historischen Basis zuerst abgleichen.

Dieser Auftrag enthält die Ausgangslage. Weitere Details stehen im [Befundabgleich](../befunde.md) und in den [Nachweisen](../nachweise.md). Der Plan selbst autorisiert keine zukünftigen Veröffentlichungen, Kostenänderungen oder produktiven Schreibtests; der aktuelle Nutzerauftrag bestimmt den Ausführungsumfang.

Gewollte Logik bewahren: Hero sofort offen/statisch, Remy bleibt; Gastkarte wackelt kurz und öffnet Starter-Login ohne automatische Erklärfolien. Reveal angemeldet serverseitig ohne Kauf/Standortprüfung, 50 m nur Browser, Limits 10/min und 15/Tag. Auth bleibt eager, E-Mail nie aus Linkparametern, Token-Widerruf prüfen; Herzen nur Admintransaktion. Messung ausschließlich eigener Zähler ohne Browser-Speicher; kein GA/Cookie-Dialog. Sanity ist Inhaltsquelle, Entwürfe nur im beauftragten Umfang, Veröffentlichung erst ausdrückliche Freigabe und danach DE/EN abrufen. Keine Geheimnisse oder privaten Nutzungszahlen in öffentliche Dateien/PRs kopieren.

Bei Codeänderung tote Reste vollständig löschen; i18n-Link verwenden, bestehende et-btn/et-label/--et-Tokens und Hell/Dunkel beachten. Keine unerlaubten Pfeile, Unterstreichungen oder Fotoabdunklungen. Sichtbare Änderungen vorher/nachher Telefon/Desktop mit/ohne Reduced Motion prüfen. Aus nextjs: typecheck, lint, audit:css-modules, npx knip und risikogerechte Tests; für Browser build:isolated, dann test:e2e/audit:preview Port 3100. Keine unnötigen Abhängigkeiten installieren (node_modules ist geteilt). Live-Browser erst nach /no-count und aktiviertem Nicht-mitzählen. Performance vorher/nachher am gleichen Seitentyp, Warnungen mit Werten; Feldziele LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1, TBT ist kein Feld-INP.

Vor später beauftragtem Commit/Push ist Code-Review gegen Anforderungen und AGENTS Pflicht, Befunde beheben und erneut prüfen, Ergebnis vor Push berichten; Hook nie umgehen. Feature → staging → main, nur grüne Checks mergen. Live erst nach grünem App-Hosting-Rollout am tatsächlichen main-Merge-SHA. Infrastruktur/Billing/Preise/Rewards/Newsletter/Werbung nicht aus historischen Empfehlungen ableiten. Folgechats/Automationen nicht eigenständig erstellen.

## Ausgangsstand und Abhängigkeiten

Planbasis vom 23.11.2026: main `aa156ce26bbcd29c9cb16f7227b552465b621366`, Release #1415; App-Hosting-Rollout success frisch geprüft. #1409 Mail/Notbremse/Sentry, #1411 Web Vitals, #1413/#1415 Leseseiten und lokale Konto-E2E, #1412/#1414 Standard-404 sind darin enthalten. Inzwischen neue Releases zuerst berücksichtigen.

**W2 (offen):** MustEatTeaserSection nennt Gerichte auf Karten und führt zur Map; ein konkreter Starter-Angebotstext/ShareButton fehlt dort. Der Klickpfad bleibt zunächst ein Map-Link; seine eventuelle Angleichung an direkte Login-Logik muss bewusst und getestet erfolgen.

**W4 (Entscheidung nötig):** Browser prüft 50 m; der Server gibt angemeldet ohne Kauf und ohne Standortprüfung frei. Diese bewusst geltende Logik hat Vorrang. Ein Pack-Hinweis darf ein Komfortangebot sein, keine neue Bezahlschranke oder behauptete Server-Ortsbindung. proximityHint besteht, mobile/desktop Kartenabläufe sind beteiligt.

**Voraussetzungen/Entscheidungen:** S04: Pack-Hinweis/Angebot entschieden; S05/S06 Nutzen/Preise konsistent.

## Ziel und begrenzte Arbeit

Auf Spot-Einstiegen den freigegebenen Starter-Nutzen erklären und ggf. freiwillige Pack-Alternative passend zeigen.

Ergänze einen kontextgerechten Einstieg und vorhandenes Teilen, ohne Text-/UI-Flut. Prüfe insbesondere, ob der Spot-Teaser bewusst in die Map führt; nur bestätigte Nutzerlogik angleichen. Pack-Hinweis bei Entfernung ausschließlich bei positiver S04-Entscheidung. Keine Kaufpflicht, kein Server-Standortcheck, kein zusätzliches automatisches Onboarding. Keine neuen Analyse-IDs oder Browser-Speicher.

**Relevante Dateien/Quellen** (Pfade relativ zur jeweils eigenen Repo-Kopie, vor Bearbeitung prüfen): nextjs/app/components/MustEatTeaserSection.tsx; nextjs/app/[locale]/restaurant/[slug]/page.tsx; nextjs/app/components/ShareButton.tsx; nextjs/app/components/map/MustEatDetail.tsx; nextjs/app/components/map/MustEatDetailMobile.tsx; nextjs/lib/i18n/translations.ts.

## Konkrete Prüfung

Gast, Starter, Besitzer und Karte ohne kaufbares Kategorie-Pack; 50-m-Browserzustände sowie Nearby-Reveal ohne Kauf; DE/EN, 390/1440, Themen/Motion, Tastatur und Share-Fallback. Vor/nachher desselben Spot-Seitentyps messen; Standardchecks und gezielte E2E.

## Fertig-Kriterien und Übergabe

Angebot verständlich und optional, vorhandene kostenfreie Wege und Serverlimits unverändert; Wirkung erst S25 auswerten.

Berichte abschließend kurz: tatsächlicher SHA/Branch, geänderte Dateien oder reine Prüfergebnisse, ausgeführte Prüfungen samt Grenzen/Warnungen, Entscheidungslage und Status je Befund-ID. Lege für den nächsten Chat eine knappe lokale Übergabe an; keine vertraulichen Daten veröffentlichen. Nur belegten Zustand melden. Nicht den gesamten übrigen Plan nebenbei abarbeiten.
