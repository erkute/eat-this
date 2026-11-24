# S05 – Startseite und Anmelden verständlich machen

Eigenständig kopierbarer Startauftrag für einen künftigen Chat. Typ: **Umsetzung, Texte/kleines UI**.

**Auftrag:** Bearbeite für Eat This ausschließlich P1, P3, P4, P7, W1, I7 im folgenden begrenzten Umfang.

## Arbeitsregeln für diesen neuen Chat

Projekt Eat This. Die Anwendung liegt in `nextjs/`, Sanity Studio in `studio/`. Lies die aktuelle `AGENTS.md` vollständig. Zuerst `git worktree list` und `git status`; Hauptkopie kann fremde unfertige URL-Arbeit enthalten und ist keine verlässliche Live-Kopie. Keine fremden Änderungen/Worktrees anfassen. Aktuellen Remote-main und Release-/Rollout-Check unabhängig vom lokalen Hauptbranch lesen. Vor eigenen Änderungen eigene Kopie über `./scripts/worktree.sh claude/<passender-name>` (Standardbasis origin/staging) erstellen; keine gemeinsame Arbeitskopie mit anderen schreibenden Agents. Abweichungen zur hier genannten historischen Basis zuerst abgleichen.

Dieser Auftrag enthält die Ausgangslage. Weitere Details stehen im [Befundabgleich](../befunde.md) und in den [Nachweisen](../nachweise.md). Der Plan selbst autorisiert keine zukünftigen Veröffentlichungen, Kostenänderungen oder produktiven Schreibtests; der aktuelle Nutzerauftrag bestimmt den Ausführungsumfang.

Gewollte Logik bewahren: Hero sofort offen/statisch, Remy bleibt; Gastkarte wackelt kurz und öffnet Starter-Login ohne automatische Erklärfolien. Reveal angemeldet serverseitig ohne Kauf/Standortprüfung, 50 m nur Browser, Limits 10/min und 15/Tag. Auth bleibt eager, E-Mail nie aus Linkparametern, Token-Widerruf prüfen; Herzen nur Admintransaktion. Messung ausschließlich eigener Zähler ohne Browser-Speicher; kein GA/Cookie-Dialog. Sanity ist Inhaltsquelle, Entwürfe nur im beauftragten Umfang, Veröffentlichung erst ausdrückliche Freigabe und danach DE/EN abrufen. Keine Geheimnisse oder privaten Nutzungszahlen in öffentliche Dateien/PRs kopieren.

Bei Codeänderung tote Reste vollständig löschen; i18n-Link verwenden, bestehende et-btn/et-label/--et-Tokens und Hell/Dunkel beachten. Keine unerlaubten Pfeile, Unterstreichungen oder Fotoabdunklungen. Sichtbare Änderungen vorher/nachher Telefon/Desktop mit/ohne Reduced Motion prüfen. Aus nextjs: typecheck, lint, audit:css-modules, npx knip und risikogerechte Tests; für Browser build:isolated, dann test:e2e/audit:preview Port 3100. Keine unnötigen Abhängigkeiten installieren (node_modules ist geteilt). Live-Browser erst nach /no-count und aktiviertem Nicht-mitzählen. Performance vorher/nachher am gleichen Seitentyp, Warnungen mit Werten; Feldziele LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1, TBT ist kein Feld-INP.

Vor später beauftragtem Commit/Push ist Code-Review gegen Anforderungen und AGENTS Pflicht, Befunde beheben und erneut prüfen, Ergebnis vor Push berichten; Hook nie umgehen. Feature → staging → main, nur grüne Checks mergen. Live erst nach grünem App-Hosting-Rollout am tatsächlichen main-Merge-SHA. Infrastruktur/Billing/Preise/Rewards/Newsletter/Werbung nicht aus historischen Empfehlungen ableiten. Folgechats/Automationen nicht eigenständig erstellen.

## Ausgangsstand und Abhängigkeiten

Planbasis vom 23.11.2026: main `aa156ce26bbcd29c9cb16f7227b552465b621366`, Release #1415; App-Hosting-Rollout success frisch geprüft. #1409 Mail/Notbremse/Sentry, #1411 Web Vitals, #1413/#1415 Leseseiten und lokale Konto-E2E, #1412/#1414 Standard-404 sind darin enthalten. Inzwischen neue Releases zuerst berücksichtigen.

**P1 (offen):** Der Hero enthält weiterhin den englischen Slogan und den CTA zu Must Eats. Die Map-Erklärung folgt erst in HubMapIntro. Die wahrgenommene Verständlichkeit wurde in Session 1 nicht im Browser gemessen.

**P3 (offen):** packLead, cardLead und heartLead sind weiterhin gleichartig. FAQ nennt 20. Die tatsächliche einmalige Starter-Vergabe einschließlich Wunschkarte wird inzwischen im Emulator-Browser getestet.

**P4 (Entscheidung nötig):** Uneinheitlichkeit besteht in sichtbaren DE-/EN-Strings weiter. Die Anwendung verwendet einen passwortlosen gemeinsamen Einstieg; eine künstliche Trennung zwischen neuen und bestehenden Konten darf kein falsches Versprechen schaffen.

**P7 (Entscheidung nötig):** Navigation sagt Über mich/About me, die FAQ sagt Wir sind Foodies und HubMapIntro Wo wir essen gehen. Das ist eine Markenentscheidung, kein technischer Defekt.

**W1 (teilweise):** Die Textschwäche aus P3 ist bestätigt; reale lokale Kontoabläufe sind inzwischen getestet. Eine aktuelle Konversionsrate oder kausaler Texteffekt ist nicht belegt. Historische Zähler sind aggregiert und dürfen nicht wie identifizierbare Sitzungsfunnel interpretiert werden.

**I7 (offen):** DistrictHeader rendert weiterhin nur name als H1; Home EN-Title bleibt Marke zuerst. Ein behaupteter Rankingeffekt dieser Reihenfolge ist nicht gemessen. Home-Teil wird mit P1 gemeinsam umgesetzt.

**Voraussetzungen/Entscheidungen:** S04: Begriffe/Stimme und konkrete Texte bestätigt.

## Ziel und begrenzte Arbeit

Das Angebot im ersten Bereich und im jeweiligen Login-Anlass auf DE/EN konkret erklären.

Setze nur freigegebene Hero-/Map-Einstiegs- und Starter/Herz/Karten-Texte samt vereinbarter Stimme um. Gleiche den Home-Title/H1 sinnvoll ab. Erhalte Hero-Kartenfächer serverseitig offen/statisch und Remy. Erklärfolien nur auf ausdrücklichen Wie-funktionierts-Klick. Keine Änderung von Reward-, Auth- oder Reveal-Logik. Pack-/Checkout-Texte aus der Begriffsliste werden separat in S06 bearbeitet.

**Relevante Dateien/Quellen** (Pfade relativ zur jeweils eigenen Repo-Kopie, vor Bearbeitung prüfen): nextjs/app/components/HubHeroCopy.tsx; nextjs/app/components/HubMapIntro.tsx; nextjs/app/components/StarterPackSignup.tsx; nextjs/app/components/LoginBoard.tsx; nextjs/lib/i18n/translations.ts; nextjs/lib/landing/faqs.ts; nextjs/app/[locale]/(spa)/page.tsx.

## Konkrete Prüfung

Vorher/nachher 390/1440 px, DE/EN, Hell/Dunkel, Reduced Motion und normale Bewegung; Inhalt ohne JS/Animationswartezeit prüfen. Login-Anlässe, Gastkarte und Emulator-Starter ausführen. Textänderungen am Mail-Art-Skript erfordern build:email-art; sonst keine Mailgrafiken neu generieren. typecheck, lint, audit:css-modules, knip; passende Unit/E2E nach build:isolated.

## Fertig-Kriterien und Übergabe

Besucher versteht Nutzen und Kostenmodell; alle betroffenen Einstiegstexte konsistent; keine Regression der gewollten Logik und keine behauptete Konversionssteigerung ohne spätere S25.

Berichte abschließend kurz: tatsächlicher SHA/Branch, geänderte Dateien oder reine Prüfergebnisse, ausgeführte Prüfungen samt Grenzen/Warnungen, Entscheidungslage und Status je Befund-ID. Lege für den nächsten Chat eine knappe lokale Übergabe an; keine vertraulichen Daten veröffentlichen. Nur belegten Zustand melden. Nicht den gesamten übrigen Plan nebenbei abarbeiten.
