# Projektstand

Stand: 30.09.2026 nach dem lokalen Aufräumen.

## Ausgangslage vor Commit und Deployment

Der Nutzer bestätigt den neuesten Stand als live. Lokal wurden die Remote-Refs
abgerufen und die Dateiinhalte abgeglichen:

- Produktion: `origin/main` bei `6c44f63c` (PR #972).
- Staging: `origin/staging` bei `335561d2` (PR #992).
- Beide Commits haben denselben Dateiinhalt; die Commit-IDs unterscheiden sich
  durch die Merge-Historie.
- Die Hauptarbeitskopie steht auf `staging` und war vor dieser Dokumentationspflege
  mit `origin/staging` synchron. Lokales `main` wurde ebenfalls aktualisiert.

Zum Zeitpunkt dieser Bestandsaufnahme war kein App-Hosting-Rollout geprüft
und kein neuer Smoke-Test durchgeführt. Die Live-Aussage stammt vom Nutzer; der Git-Abgleich
bestätigt den Quellstand, nicht den Deployment-Zustand.

## Bereinigung

Die zwei alten Claude-Worktrees und 23 lokale Arbeitsbranches wurden entfernt.
Es bleibt die Hauptarbeitskopie mit den lokalen Branches `main` und `staging`.
Beim Aufräumen gab es keine offenen PRs und keine Stashes. Remote-Arbeitsbranches
wurden nicht gelöscht. `AGENTS.md` blieb erhalten.

Die Git-Historie und damaligen Refs wurden vor der Bereinigung in
`/private/tmp/eat-this-before-cleanup-20260930.bundle` gesichert und das Bundle
mit `git bundle verify` geprüft. Das ist eine temporäre Git-Sicherung, kein
Backup ignorierter Dateien, lokaler Konfiguration oder Build-Verzeichnisse.

## Weitere Bereinigung

Historische Pläne, Audits, Rechtstext-Entwürfe, Roadmap, SEO-Messprotokolle und
alte Specs wurden auf Wunsch des Nutzers aus der Arbeitskopie entfernt.
Die alte GitHub-Vorlage für die abgeschlossene Guest+20-Migration ist entfernt.
Die vorher committierten Fassungen bleiben in der Git-Historie verfügbar.
Weiterhin wichtige Produktentscheidungen stehen kompakt in
[Produktlogik](architecture.md); die aktuelle Betriebsanleitung unter
[Staging](runbooks/staging.md).

Entfernt wurden außerdem die ungenutzten Next.js-Builds `.next` und
`.next-verify`, TypeScript-Build-Caches, generierte Studio-Dateien, alte
QA-Screenshots und lokale Archive bereits aufgegebener Sessions.
Builds und Caches werden bei Bedarf neu erzeugt.

Auch die fünf datierten Kuratierungsaufträge, die August-Importliste samt
Fortschrittsdatei, zwei alte Must-Eat-Manifest-Sicherungen, zwei Protokolle
der entfernten Legacy-Berechtigungen und die alte CDN-Purge-URL-Liste sind
entfernt. Aktuelle Karten-Zuordnungen und Manifestdateien bleiben erhalten.

Erhalten bleiben Quellcode, Tests, aktuelle Betriebs- und Agent-Anleitungen,
installierte Abhängigkeiten, lokale Umgebungsdateien und Zertifikate,
lizenzierte Schriften, die Original-Kartenbilder in `Cards/` und private
Datenexporte. Diese Dateien sind Arbeitsmittel oder Produktionsdaten, keine
wegwerfbaren Build-Reste.

Frühere offene Arbeiten werden nicht weitergeführt. Verworfen bedeutet nicht
umgesetzt oder geprüft. Sanity-Entwürfe, GitHub-Issues und andere externe
Bestände wurden bei der lokalen Bereinigung weder geprüft noch gelöscht.

Neue Arbeiten beginnen mit dem dann aktuellen Quellstand und einem neuen
Auftrag. Die verbindlichen Arbeitsregeln stehen in [AGENTS.md](../AGENTS.md)
(`CLAUDE.md` importiert sie nur).
