# S20 – Deck-Beschreibung und freiwilliges Einladen

Eigenständig kopierbarer Startauftrag für einen künftigen Chat. Typ: **Umsetzung, vorhandenes Sharing**.

**Auftrag:** Bearbeite für Eat This ausschließlich P8, W6 im folgenden begrenzten Umfang.

## Arbeitsregeln für diesen neuen Chat

Projekt Eat This. Die Anwendung liegt in `nextjs/`, Sanity Studio in `studio/`. Lies die aktuelle `AGENTS.md` vollständig. Zuerst `git worktree list` und `git status`; Hauptkopie kann fremde unfertige URL-Arbeit enthalten und ist keine verlässliche Live-Kopie. Keine fremden Änderungen/Worktrees anfassen. Aktuellen Remote-main und Release-/Rollout-Check unabhängig vom lokalen Hauptbranch lesen. Vor eigenen Änderungen eigene Kopie über `./scripts/worktree.sh claude/<passender-name>` (Standardbasis origin/staging) erstellen; keine gemeinsame Arbeitskopie mit anderen schreibenden Agents. Abweichungen zur hier genannten historischen Basis zuerst abgleichen.

Dieser Auftrag enthält die Ausgangslage. Weitere Details stehen im [Befundabgleich](../befunde.md) und in den [Nachweisen](../nachweise.md). Der Plan selbst autorisiert keine zukünftigen Veröffentlichungen, Kostenänderungen oder produktiven Schreibtests; der aktuelle Nutzerauftrag bestimmt den Ausführungsumfang.

Gewollte Logik bewahren: Hero sofort offen/statisch, Remy bleibt; Gastkarte wackelt kurz und öffnet Starter-Login ohne automatische Erklärfolien. Reveal angemeldet serverseitig ohne Kauf/Standortprüfung, 50 m nur Browser, Limits 10/min und 15/Tag. Auth bleibt eager, E-Mail nie aus Linkparametern, Token-Widerruf prüfen; Herzen nur Admintransaktion. Messung ausschließlich eigener Zähler ohne Browser-Speicher; kein GA/Cookie-Dialog. Sanity ist Inhaltsquelle, Entwürfe nur im beauftragten Umfang, Veröffentlichung erst ausdrückliche Freigabe und danach DE/EN abrufen. Keine Geheimnisse oder privaten Nutzungszahlen in öffentliche Dateien/PRs kopieren.

Bei Codeänderung tote Reste vollständig löschen; i18n-Link verwenden, bestehende et-btn/et-label/--et-Tokens und Hell/Dunkel beachten. Keine unerlaubten Pfeile, Unterstreichungen oder Fotoabdunklungen. Sichtbare Änderungen vorher/nachher Telefon/Desktop mit/ohne Reduced Motion prüfen. Aus nextjs: typecheck, lint, audit:css-modules, npx knip und risikogerechte Tests; für Browser build:isolated, dann test:e2e/audit:preview Port 3100. Keine unnötigen Abhängigkeiten installieren (node_modules ist geteilt). Live-Browser erst nach /no-count und aktiviertem Nicht-mitzählen. Performance vorher/nachher am gleichen Seitentyp, Warnungen mit Werten; Feldziele LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1, TBT ist kein Feld-INP.

Vor später beauftragtem Commit/Push ist Code-Review gegen Anforderungen und AGENTS Pflicht, Befunde beheben und erneut prüfen, Ergebnis vor Push berichten; Hook nie umgehen. Feature → staging → main, nur grüne Checks mergen. Live erst nach grünem App-Hosting-Rollout am tatsächlichen main-Merge-SHA. Infrastruktur/Billing/Preise/Rewards/Newsletter/Werbung nicht aus historischen Empfehlungen ableiten. Folgechats/Automationen nicht eigenständig erstellen.

## Ausgangsstand und Abhängigkeiten

Planbasis vom 23.11.2026: main `aa156ce26bbcd29c9cb16f7227b552465b621366`, Release #1415; App-Hosting-Rollout success frisch geprüft. #1409 Mail/Notbremse/Sentry, #1411 Web Vitals, #1413/#1415 Leseseiten und lokale Konto-E2E, #1412/#1414 Standard-404 sind darin enthalten. Inzwischen neue Releases zuerst berücksichtigen.

**P8 (offen):** Over a hundred/Über hundert steht weiterhin in beiden Deck-Beschreibungen. Die damalige Bestandszahl wird nicht als heutiger Wert verwendet; die Aussage ist nicht zwingend falsch, aber unpräzise.

**W6 (Entscheidung nötig):** Einladungs-/Deck-Aktionen bestehen; Belohnung ist weiterhin eine Karte für beide. Kommentar begründet bewusst die begrenzte Belohnung gegen den kleinen Kartenbestand. Aktuelle Nutzung ist nicht neu belegt.

**Voraussetzungen/Entscheidungen:** S04-Begriffe; Belohnung bleibt ohne neue Entscheidung eine Karte.

## Ziel und begrenzte Arbeit

Geteilte Decks korrekt beschreiben und vorhandenes Einladen am passenden Erfolgsmoment auffindbar machen.

Wähle belegbare aktuelle öffentliche Zahl oder zeitlose Formulierung statt alter Spotmenge. Nutze bestehende Share-/Referral-Funktion an genau einem geeigneten Starter-Erfolgsmoment. Keine Belohnungserhöhung ohne getrennte Nutzerentscheidung, keine automatisch versandten Einladungen oder Nachrichten. Sichtbare Begriffe konsistent; geschützte/unveröffentlichte Bestände nicht mitzählen.

**Relevante Dateien/Quellen** (Pfade relativ zur jeweils eigenen Repo-Kopie, vor Bearbeitung prüfen): nextjs/lib/i18n/translations.ts; nextjs/app/[locale]/deck/[uid]/page.tsx; nextjs/app/[locale]/deck/[uid]/DeckActions.tsx; nextjs/app/components/profile/ProfileInvite.tsx; nextjs/app/components/SignInRewardPanel.tsx; nextjs/lib/referral/constants.ts.

## Konkrete Prüfung

Gast/angemeldet, eigenes/fremdes Deck, DE/EN, native Share-/Clipboard-Fallback, Referral-Einmaligkeit und ungültige IDs. 390/1440, Themen/Motion und Tastatur. Bei collectLabel/collectBody/offenen Karten build:deck-og-art; ggf. neue Publicbilder gemäß AGENTS. Standardchecks und gezielte Emulator-E2E.

## Fertig-Kriterien und Übergabe

DE-/EN-Vorschaubeschreibung belastbar, freiwilliges Teilen funktioniert, Reward unverändert oder explizit freigegeben; Nutzung erst S25 bewerten.

Berichte abschließend kurz: tatsächlicher SHA/Branch, geänderte Dateien oder reine Prüfergebnisse, ausgeführte Prüfungen samt Grenzen/Warnungen, Entscheidungslage und Status je Befund-ID. Lege für den nächsten Chat eine knappe lokale Übergabe an; keine vertraulichen Daten veröffentlichen. Nur belegten Zustand melden. Nicht den gesamten übrigen Plan nebenbei abarbeiten.
