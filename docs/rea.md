# REA für Eat This

REA ist ein lokales Entwicklungswerkzeug zum Untersuchen von Websites und Anwendungen. Es läuft außerhalb der Next.js-App; Firebase, Sanity und das App-Bundle bekommen keine neue Abhängigkeit.

## Start

Aus dem Repo-Wurzelverzeichnis:

```sh
npm run --silent rea -- --version
npm run --silent rea -- --help
npm run --silent rea -- list-browser-targets http://127.0.0.1:9337 --format json
```

Der npm-Befehl lädt REA 6.4.0 und eine separate Node-22.22.2-Laufzeit in den npm-Cache. Sie ist unabhängig von der Node-Version der App (`.nvmrc`) und ändert deren Lockfiles nicht; der gestartete REA-Prozess verwendet immer die separate Node-Version.

Die Projektkonfigurationen `.codex/config.toml` und `.mcp.json` registrieren denselben Startbefehl für Codex beziehungsweise Claude Code. Nach dem Neuladen der MCP-Server bzw. einem Client-Neustart stehen die Werkzeuge im Agenten zur Verfügung. Die CLI funktioniert sofort. Versionen bei einem Update in diesen beiden Konfigurationen und im Root-`package.json` gemeinsam ändern.

Verifiziert am 13.10.2026: CLI meldet 6.4.0; Codex liest den aktivierten Projekteingang; ein echter MCP-Handshake liefert Serverversion 6.4.0, 170 Tools und einen erfolgreichen `list_browser_targets`-Aufruf. Eine Registrierung allein ist kein Nachweis, dass ein bereits laufender Chat seine Tool-Liste neu geladen hat.

## Browseranalyse

Für eine vorhandene Seite braucht REA einen separaten Chrome-Prozess mit eigenem temporären Profil und lokalem Debugging-Port. Alternativ startet `capture-browser-scenario` einen eigenen Browser. Aktuelle Argumente über `--help` nachschlagen. Szenarien setzen explizite Zeitlimits für Klicks und andere wartende Aktionen.

```sh
npm run --silent rea -- inspect-web-page http://127.0.0.1:9337 TARGET_ID \
  --include-accessibility-text --format json
npm run --silent rea -- capture-browser-scenario /tmp/eat-this-scenario.json --format json
```

Captures, Screenshots und Browserprofile bleiben unter `/tmp/eat-this-*`. Für vergleichbare Bildschirmgrößen `browser.mode: launch` samt `environment.viewport` verwenden: CDP-Verbindungen zu vorhandenen Browsern garantieren die Startoptionen nicht. Ein schmaler Desktop-Browser ist kein Nachweis für die native Android-/iOS-App.

REA liefert Grenzen der Aufzeichnung mit: spätes Anhängen erfasst frühere Netzwerkanfragen nicht; noch laufende Requests machen eine Aufnahme unvollständig. Bei `cleanup_incomplete` die gemeldeten Ressourcen und verbleibenden Prozesse prüfen. Ein fehlgeschlagener Schritt ist kein Beleg für fehlende Produktfunktionalität.

## Quellen

- [REA](https://github.com/morluto/rea), [Browseranalyse](https://rea.tools/guides/browser/)
- [Projektbezogene MCP-Konfiguration in Codex](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
