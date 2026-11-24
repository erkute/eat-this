# S24 – Mail-Vorlage und echte Mailclient-Prüfung

Eigenständig kopierbarer Startauftrag für einen künftigen Chat. Typ: **Prüfung; Newsletter nur bedingt**.

**Auftrag:** Bearbeite für Eat This ausschließlich T4, W7 im folgenden begrenzten Umfang.

## Arbeitsregeln für diesen neuen Chat

Projekt Eat This. Die Anwendung liegt in `nextjs/`, Sanity Studio in `studio/`. Lies die aktuelle `AGENTS.md` vollständig. Zuerst `git worktree list` und `git status`; Hauptkopie kann fremde unfertige URL-Arbeit enthalten und ist keine verlässliche Live-Kopie. Keine fremden Änderungen/Worktrees anfassen. Aktuellen Remote-main und Release-/Rollout-Check unabhängig vom lokalen Hauptbranch lesen. Vor eigenen Änderungen eigene Kopie über `./scripts/worktree.sh claude/<passender-name>` (Standardbasis origin/staging) erstellen; keine gemeinsame Arbeitskopie mit anderen schreibenden Agents. Abweichungen zur hier genannten historischen Basis zuerst abgleichen.

Dieser Auftrag enthält die Ausgangslage. Weitere Details stehen im [Befundabgleich](../befunde.md) und in den [Nachweisen](../nachweise.md). Der Plan selbst autorisiert keine zukünftigen Veröffentlichungen, Kostenänderungen oder produktiven Schreibtests; der aktuelle Nutzerauftrag bestimmt den Ausführungsumfang.

Gewollte Logik bewahren: Hero sofort offen/statisch, Remy bleibt; Gastkarte wackelt kurz und öffnet Starter-Login ohne automatische Erklärfolien. Reveal angemeldet serverseitig ohne Kauf/Standortprüfung, 50 m nur Browser, Limits 10/min und 15/Tag. Auth bleibt eager, E-Mail nie aus Linkparametern, Token-Widerruf prüfen; Herzen nur Admintransaktion. Messung ausschließlich eigener Zähler ohne Browser-Speicher; kein GA/Cookie-Dialog. Sanity ist Inhaltsquelle, Entwürfe nur im beauftragten Umfang, Veröffentlichung erst ausdrückliche Freigabe und danach DE/EN abrufen. Keine Geheimnisse oder privaten Nutzungszahlen in öffentliche Dateien/PRs kopieren.

Bei Codeänderung tote Reste vollständig löschen; i18n-Link verwenden, bestehende et-btn/et-label/--et-Tokens und Hell/Dunkel beachten. Keine unerlaubten Pfeile, Unterstreichungen oder Fotoabdunklungen. Sichtbare Änderungen vorher/nachher Telefon/Desktop mit/ohne Reduced Motion prüfen. Aus nextjs: typecheck, lint, audit:css-modules, npx knip und risikogerechte Tests; für Browser build:isolated, dann test:e2e/audit:preview Port 3100. Keine unnötigen Abhängigkeiten installieren (node_modules ist geteilt). Live-Browser erst nach /no-count und aktiviertem Nicht-mitzählen. Performance vorher/nachher am gleichen Seitentyp, Warnungen mit Werten; Feldziele LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1, TBT ist kein Feld-INP.

Vor später beauftragtem Commit/Push ist Code-Review gegen Anforderungen und AGENTS Pflicht, Befunde beheben und erneut prüfen, Ergebnis vor Push berichten; Hook nie umgehen. Feature → staging → main, nur grüne Checks mergen. Live erst nach grünem App-Hosting-Rollout am tatsächlichen main-Merge-SHA. Infrastruktur/Billing/Preise/Rewards/Newsletter/Werbung nicht aus historischen Empfehlungen ableiten. Folgechats/Automationen nicht eigenständig erstellen.

## Ausgangsstand und Abhängigkeiten

Planbasis vom 23.11.2026: main `aa156ce26bbcd29c9cb16f7227b552465b621366`, Release #1415; App-Hosting-Rollout success frisch geprüft. #1409 Mail/Notbremse/Sentry, #1411 Web Vitals, #1413/#1415 Leseseiten und lokale Konto-E2E, #1412/#1414 Standard-404 sind darin enthalten. Inzwischen neue Releases zuerst berücksichtigen.

**T4 (erledigt):** c748ac0d/#1409 stellt passende Motive auf JPEG. Heutige Dateigrößen in Bytes: Papier 100510, Signup 219961/120042, Login 103894/55561. Testbudget: Papier <200 KB, Artwork <300 KB, HTML <100 KB. Echte Gmail-/Apple-Mail-/Outlook-Abnahme ist nicht neu belegt.

**W7 (Entscheidung nötig):** Im App-Code ist weiterhin nur der transaktionale Auth-Mailversand belegt. Ein vorhandener Anbieterwert oder altes Segment wäre kein Nachweis einer rechtmäßig nutzbaren Liste. Keine aktuelle Wiederkehrquote ermittelt.

**Voraussetzungen/Entscheidungen:** T4 kann unabhängig geprüft werden; Newsletter nur nach S22/S23.

## Ziel und begrenzte Arbeit

Historische Mailclient-Lücke schließen; bei bestätigtem Newsletter genau eine Vorlage reviewbar erstellen.

Erhalte bestehende verkleinerte JPEG-Mailbilder; keine erneute pauschale Größenarbeit. Prüfe Auth-Login/Signup DE/EN in Gmail, Apple Mail, Outlook mit blockierten Bildern und Handy/Desktop. Bereite lokale HTML-/Bildvorschauen vor; reale Testmail an explizit benannte eigene Testempfänger erst mit Freigabe. Bei Newsletter-Ja genau einen Entwurf mit Abmeldung produzieren, keinen Regelversand/Automationen und keine Empfängerliste starten.

**Relevante Dateien/Quellen** (Pfade relativ zur jeweils eigenen Repo-Kopie, vor Bearbeitung prüfen): nextjs/emails/components/Shell.tsx; nextjs/emails/theme.ts; nextjs/scripts/build-email-art.mts; nextjs/emails/__tests__/authEmails.test.ts; ggf. genau eine freigegebene neue Newslettervorlage.

## Konkrete Prüfung

Papier <200 KB, Artwork <300 KB, HTML <100 KB, CTA echter Link mit gelber Fläche und Wortbild/Alttext. Keine Webfont-/absolute-/transform-Abhängigkeit. build:email-art nach Skripttextänderung; keine Laufzeit-Mailbildroute, Brandfont nie ins Repo/auf Server. Nicht verfügbare Clients als ungeprüft benennen.

## Fertig-Kriterien und Übergabe

Reviewbare Vorlagen und tatsächlich geprüfte Clients belegt; fehlende Clients/offener Versand klar. Monatlicher Versand bleibt separater ausdrücklicher Auftrag.

Berichte abschließend kurz: tatsächlicher SHA/Branch, geänderte Dateien oder reine Prüfergebnisse, ausgeführte Prüfungen samt Grenzen/Warnungen, Entscheidungslage und Status je Befund-ID. Lege für den nächsten Chat eine knappe lokale Übergabe an; keine vertraulichen Daten veröffentlichen. Nur belegten Zustand melden. Nicht den gesamten übrigen Plan nebenbei abarbeiten.
