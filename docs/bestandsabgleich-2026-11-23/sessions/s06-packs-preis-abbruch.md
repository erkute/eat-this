# S06 – Pack-Angebot und Checkout-Abbruchziel

Eigenständig kopierbarer Startauftrag für einen künftigen Chat. Typ: **Umsetzung, begrenzter Kauf-Einstieg**.

**Auftrag:** Bearbeite für Eat This ausschließlich P2, P4, W3, W8 im folgenden begrenzten Umfang.

## Arbeitsregeln für diesen neuen Chat

Projekt Eat This. Die Anwendung liegt in `nextjs/`, Sanity Studio in `studio/`. Lies die aktuelle `AGENTS.md` vollständig. Zuerst `git worktree list` und `git status`; Hauptkopie kann fremde unfertige URL-Arbeit enthalten und ist keine verlässliche Live-Kopie. Keine fremden Änderungen/Worktrees anfassen. Aktuellen Remote-main und Release-/Rollout-Check unabhängig vom lokalen Hauptbranch lesen. Vor eigenen Änderungen eigene Kopie über `./scripts/worktree.sh claude/<passender-name>` (Standardbasis origin/staging) erstellen; keine gemeinsame Arbeitskopie mit anderen schreibenden Agents. Abweichungen zur hier genannten historischen Basis zuerst abgleichen.

Dieser Auftrag enthält die Ausgangslage. Weitere Details stehen im [Befundabgleich](../befunde.md) und in den [Nachweisen](../nachweise.md). Der Plan selbst autorisiert keine zukünftigen Veröffentlichungen, Kostenänderungen oder produktiven Schreibtests; der aktuelle Nutzerauftrag bestimmt den Ausführungsumfang.

Gewollte Logik bewahren: Hero sofort offen/statisch, Remy bleibt; Gastkarte wackelt kurz und öffnet Starter-Login ohne automatische Erklärfolien. Reveal angemeldet serverseitig ohne Kauf/Standortprüfung, 50 m nur Browser, Limits 10/min und 15/Tag. Auth bleibt eager, E-Mail nie aus Linkparametern, Token-Widerruf prüfen; Herzen nur Admintransaktion. Messung ausschließlich eigener Zähler ohne Browser-Speicher; kein GA/Cookie-Dialog. Sanity ist Inhaltsquelle, Entwürfe nur im beauftragten Umfang, Veröffentlichung erst ausdrückliche Freigabe und danach DE/EN abrufen. Keine Geheimnisse oder privaten Nutzungszahlen in öffentliche Dateien/PRs kopieren.

Bei Codeänderung tote Reste vollständig löschen; i18n-Link verwenden, bestehende et-btn/et-label/--et-Tokens und Hell/Dunkel beachten. Keine unerlaubten Pfeile, Unterstreichungen oder Fotoabdunklungen. Sichtbare Änderungen vorher/nachher Telefon/Desktop mit/ohne Reduced Motion prüfen. Aus nextjs: typecheck, lint, audit:css-modules, npx knip und risikogerechte Tests; für Browser build:isolated, dann test:e2e/audit:preview Port 3100. Keine unnötigen Abhängigkeiten installieren (node_modules ist geteilt). Live-Browser erst nach /no-count und aktiviertem Nicht-mitzählen. Performance vorher/nachher am gleichen Seitentyp, Warnungen mit Werten; Feldziele LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1, TBT ist kein Feld-INP.

Vor später beauftragtem Commit/Push ist Code-Review gegen Anforderungen und AGENTS Pflicht, Befunde beheben und erneut prüfen, Ergebnis vor Push berichten; Hook nie umgehen. Feature → staging → main, nur grüne Checks mergen. Live erst nach grünem App-Hosting-Rollout am tatsächlichen main-Merge-SHA. Infrastruktur/Billing/Preise/Rewards/Newsletter/Werbung nicht aus historischen Empfehlungen ableiten. Folgechats/Automationen nicht eigenständig erstellen.

## Ausgangsstand und Abhängigkeiten

Planbasis vom 23.11.2026: main `aa156ce26bbcd29c9cb16f7227b552465b621366`, Release #1415; App-Hosting-Rollout success frisch geprüft. #1409 Mail/Notbremse/Sentry, #1411 Web Vitals, #1413/#1415 Leseseiten und lokale Konto-E2E, #1412/#1414 Standard-404 sind darin enthalten. Inzwischen neue Releases zuerst berücksichtigen.

**P2 (Entscheidung nötig):** Die Preiswartephase ist im Code bestätigt. Kartenzahlen dienen nur dem Leer-Prüfwert. Kommentare erklären ausdrücklich, dass das Produkt Zahlen nicht nennt: Das ist ein Konflikt zwischen früherer Produktaussage und historischer Empfehlung, keine Erlaubnis zur stillen Änderung. Preise bleiben unverändert.

**P4 (Entscheidung nötig):** Uneinheitlichkeit besteht in sichtbaren DE-/EN-Strings weiter. Die Anwendung verwendet einen passwortlosen gemeinsamen Einstieg; eine künstliche Trennung zwischen neuen und bestehenden Konten darf kein falsches Versprechen schaffen.

**W3 (nicht ausreichend belegt):** Die aktuelle Kaufzahl wurde nicht abgefragt. Der UI-Mangel aus P2 ist bestätigt; daraus folgt keine belegte Ursache für fehlende Käufe. Ein Funktionsfehler im Stripe-Weg ist ebenfalls nicht bewiesen.

**W8 (offen):** cancelPath bestätigt genau diese bestehende Unterscheidung. Die historische Rückkehrzahl wird nicht als heutige Kaufabbruchzahl verwendet.

**Voraussetzungen/Entscheidungen:** S04: Zahlendarstellung/Preismodell geklärt; S05-Begriffe verfügbar.

## Ziel und begrenzte Arbeit

Preis und freigegebene Mengenangaben sofort anzeigen; Abbruch sicher zum richtigen Produkt führen.

Rendere Preis unabhängig vom Auth-/Ownership-Laden. Zeige nur beschlossene öffentliche Gesamt-/Neukarteninformation; keine privaten Kartenvorderseiten offenlegen. Preise unverändert, solange nicht ausdrücklich anders entschieden. Leere Packs bleiben nicht kaufbar. Leite cancel_url serverseitig aus dem bekannten Pack ab: Kategorie-Detail oder für All Berlin die Packs-Übersicht, jeweils DE/EN. Keine beliebige Return-URL annehmen. Sichtbare Begriffe auch auf Kaufbestätigung angleichen.

**Relevante Dateien/Quellen** (Pfade relativ zur jeweils eigenen Repo-Kopie, vor Bearbeitung prüfen): nextjs/app/[locale]/pack/[slug]/page.tsx; nextjs/app/[locale]/pack/[slug]/PackBuyButton.tsx; nextjs/app/[locale]/packs/page.tsx; nextjs/app/components/AllBerlinBoard.tsx; nextjs/app/api/stripe/checkout/route.ts; nextjs/lib/pack/packDetail.ts.

## Konkrete Prüfung

Server-HTML ohne JS, langsame Auth-Hydrierung, Gast/angemeldet/Besitzer, leeres Pack, All Berlin, DE/EN und manipulierte packId prüfen. Gezielte Checkout-Route- und Ownership-Tests; echte Stripe-Rückkehr erst S07. 390/1440 px, Themes/Motion; Build und Standardchecks. Kein echter Kauf.

## Fertig-Kriterien und Übergabe

Angebot ist vor Hydrierung vollständig gemäß Entscheidung sichtbar; Cancel-Ziele gültig und sicher; keine Aussage über reale Kaufwirkung. T9 bleibt bis Testmodusbeleg offen.

Berichte abschließend kurz: tatsächlicher SHA/Branch, geänderte Dateien oder reine Prüfergebnisse, ausgeführte Prüfungen samt Grenzen/Warnungen, Entscheidungslage und Status je Befund-ID. Lege für den nächsten Chat eine knappe lokale Übergabe an; keine vertraulichen Daten veröffentlichen. Nur belegten Zustand melden. Nicht den gesamten übrigen Plan nebenbei abarbeiten.
