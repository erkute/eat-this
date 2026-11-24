# S17 – Tipprollen und deutsche Spot-Titel

Eigenständig kopierbarer Startauftrag für einen künftigen Chat. Typ: **Prüfung und höchstens fünf Inhaltsentwürfe**.

**Auftrag:** Bearbeite für Eat This ausschließlich P5, I5 im folgenden begrenzten Umfang.

## Arbeitsregeln für diesen neuen Chat

Projekt Eat This. Die Anwendung liegt in `nextjs/`, Sanity Studio in `studio/`. Lies die aktuelle `AGENTS.md` vollständig. Zuerst `git worktree list` und `git status`; Hauptkopie kann fremde unfertige URL-Arbeit enthalten und ist keine verlässliche Live-Kopie. Keine fremden Änderungen/Worktrees anfassen. Aktuellen Remote-main und Release-/Rollout-Check unabhängig vom lokalen Hauptbranch lesen. Vor eigenen Änderungen eigene Kopie über `./scripts/worktree.sh claude/<passender-name>` (Standardbasis origin/staging) erstellen; keine gemeinsame Arbeitskopie mit anderen schreibenden Agents. Abweichungen zur hier genannten historischen Basis zuerst abgleichen.

Dieser Auftrag enthält die Ausgangslage. Weitere Details stehen im [Befundabgleich](../befunde.md) und in den [Nachweisen](../nachweise.md). Der Plan selbst autorisiert keine zukünftigen Veröffentlichungen, Kostenänderungen oder produktiven Schreibtests; der aktuelle Nutzerauftrag bestimmt den Ausführungsumfang.

Gewollte Logik bewahren: Hero sofort offen/statisch, Remy bleibt; Gastkarte wackelt kurz und öffnet Starter-Login ohne automatische Erklärfolien. Reveal angemeldet serverseitig ohne Kauf/Standortprüfung, 50 m nur Browser, Limits 10/min und 15/Tag. Auth bleibt eager, E-Mail nie aus Linkparametern, Token-Widerruf prüfen; Herzen nur Admintransaktion. Messung ausschließlich eigener Zähler ohne Browser-Speicher; kein GA/Cookie-Dialog. Sanity ist Inhaltsquelle, Entwürfe nur im beauftragten Umfang, Veröffentlichung erst ausdrückliche Freigabe und danach DE/EN abrufen. Keine Geheimnisse oder privaten Nutzungszahlen in öffentliche Dateien/PRs kopieren.

Bei Codeänderung tote Reste vollständig löschen; i18n-Link verwenden, bestehende et-btn/et-label/--et-Tokens und Hell/Dunkel beachten. Keine unerlaubten Pfeile, Unterstreichungen oder Fotoabdunklungen. Sichtbare Änderungen vorher/nachher Telefon/Desktop mit/ohne Reduced Motion prüfen. Aus nextjs: typecheck, lint, audit:css-modules, npx knip und risikogerechte Tests; für Browser build:isolated, dann test:e2e/audit:preview Port 3100. Keine unnötigen Abhängigkeiten installieren (node_modules ist geteilt). Live-Browser erst nach /no-count und aktiviertem Nicht-mitzählen. Performance vorher/nachher am gleichen Seitentyp, Warnungen mit Werten; Feldziele LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1, TBT ist kein Feld-INP.

Vor später beauftragtem Commit/Push ist Code-Review gegen Anforderungen und AGENTS Pflicht, Befunde beheben und erneut prüfen, Ergebnis vor Push berichten; Hook nie umgehen. Feature → staging → main, nur grüne Checks mergen. Live erst nach grünem App-Hosting-Rollout am tatsächlichen main-Merge-SHA. Infrastruktur/Billing/Preise/Rewards/Newsletter/Werbung nicht aus historischen Empfehlungen ableiten. Folgechats/Automationen nicht eigenständig erstellen.

## Ausgangsstand und Abhängigkeiten

Planbasis vom 23.11.2026: main `aa156ce26bbcd29c9cb16f7227b552465b621366`, Release #1415; App-Hosting-Rollout success frisch geprüft. #1409 Mail/Notbremse/Sentry, #1411 Web Vitals, #1413/#1415 Leseseiten und lokale Konto-E2E, #1412/#1414 Standard-404 sind darin enthalten. Inzwischen neue Releases zuerst berücksichtigen.

**P5 (nicht ausreichend belegt):** Die Spot-Seite rendert den Sanity-Tipp unabhängig von den Karten. Der damalige Vergleich von nur drei Spots ist keine Vollprüfung und wurde heute nicht gegen geschützte Kartendaten wiederholt. Unterschiedliche Empfehlungen können beabsichtigt sein.

**I5 (offen):** Live-Stichproben ACID Mitte, Bertie und Arturo bestätigen englische Gattungsbegriffe im DE-Title. Die historische Gesamtzahl wurde nicht neu gezählt. Menü-Title hat Vorrang vor redaktionellem Title, daher Feldänderung nicht blind mit Ausgabe gleichsetzen.

**Voraussetzungen/Entscheidungen:** S04: Tipprollen geklärt; S15 liefert Titel-/Suchabsichtsrahmen.

## Ziel und begrenzte Arbeit

Zwei konkrete redaktionelle Befunde in einer kleinen Spot-Kohorte bereinigen.

Prüfe zuerst Gazzo, die heutige Saveur-de-Bánh-Mì-Filiale und Kitten Deli gegen autorisiert verfügbare Kartendaten, ohne geschützte Inhalte in öffentliche Dokumente zu kopieren. Leite höchstens drei Tippentwürfe aus der beschlossenen Rolle ab. Prüfe ACID/Bertie/Arturo und ergänze höchstens zwei weitere passende Titel zur maximal fünf Spots großen Kohorte. Sanity-Entwürfe anlegen nur im ausdrücklich gestarteten Umsetzungsauftrag; nie automatisch publizieren.

**Relevante Dateien/Quellen** (Pfade relativ zur jeweils eigenen Repo-Kopie, vor Bearbeitung prüfen): nextjs/app/[locale]/restaurant/[slug]/page.tsx; nextjs/lib/seo/restaurantMeta.ts; nextjs/app/components/MustEatTeaserSection.tsx; docs/must-eat-karten.md; Sanity betroffener Spots.

## Konkrete Prüfung

Jedes Gericht/Preis/Faktum belegt; keine Titelkorrektur auf Verdacht, Menü-Title-Vorrang berücksichtigen. DE-/EN-Ausgabe simulieren/prüfen; nach späterer Veröffentlichungsfreigabe beide Sprachseiten abrufen. Keine Produktcodeänderung nötig, sofern Template korrekt.

## Fertig-Kriterien und Übergabe

Maximal fünf prüfbare Spot-Entwürfe, klare Tipprollen, deutsche passende Metatitel ohne EN-Verlust; historische Mengen nicht als neu gezählt ausgeben.

Berichte abschließend kurz: tatsächlicher SHA/Branch, geänderte Dateien oder reine Prüfergebnisse, ausgeführte Prüfungen samt Grenzen/Warnungen, Entscheidungslage und Status je Befund-ID. Lege für den nächsten Chat eine knappe lokale Übergabe an; keine vertraulichen Daten veröffentlichen. Nur belegten Zustand melden. Nicht den gesamten übrigen Plan nebenbei abarbeiten.
