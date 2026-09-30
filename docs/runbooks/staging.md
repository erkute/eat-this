# Staging-Betrieb

Aktualisiert am 30.09.2026. Ersetzt die veraltete Ersteinrichtungsanleitung vom
27.05.2026. Staging besteht bereits; Branch, Backend und Migration-Milestone
müssen nicht neu angelegt werden.

## Getrennte Projekte

| Umgebung | Branch | Firebase-Projekt | Backend |
| --- | --- | --- | --- |
| Produktion | `main` | `eat-this-8a13b` | `eat-this` |
| Staging | `staging` | `eat-this-staging-8a13b` | `eat-this-staging` |

Beide Backends liegen in `us-central1`. Staging gehört ausschließlich ins
Staging-Projekt. Bei jedem Firebase-Befehl `--project` explizit setzen.
Die bestehende Konfiguration steht in `nextjs/apphosting.yaml` und
`nextjs/apphosting.staging.yaml`. Letztere ergänzt die Basiskonfiguration für
die Backend-Umgebung mit dem Namen `staging`, nicht anhand des Backend-IDs.
Sie referenziert eigene Firebase-, Sanity-, Stripe- und Resend-Konfigurationen.
Die alte Anweisung, Resend auf Staging zu entfernen, gilt nicht mehr.

## Bestand prüfen

Aus der Repository-Wurzel:

```bash
git fetch origin --prune
git worktree list
git status --short --branch
firebase apphosting:backends:get eat-this-staging --project eat-this-staging-8a13b
```

Die tatsächliche Staging-URL aus der Backend-Ausgabe verwenden. Sie gehört
zur Domain `eat-this-staging-8a13b.us-central1.hosted.app`; die alte URL im
Produktionsprojekt ist überholt. Die Projektgrenze wird im Code unter
`nextjs/lib/firebase/project-boundary.ts` geprüft.

## Änderungen und Nachweis

Feature-Branch → PR nach `staging` → PR nach `main`; direkte Pushes nach
`staging` sind erlaubt. Der Pre-Push-Build bleibt aktiv. `main` ist geschützt.
Firestore-Regeln und Sanity Studio werden separat deployt.

Ein frischer Backend-Zeitstempel ist nur ein Hinweis. Einen erfolgreichen
Rollout anhand des App-Hosting-Status und des zugehörigen Build-Commits
bestätigen; anschließend die Anwendung separat smoke-testen. Anleitung:
[Deploy-Verifikation](../../.claude/skills/deploy-verify/SKILL.md).

Bei einem Smoke-Test Basic Auth ohne, mit falschen und mit gültigen
Zugangsdaten prüfen, außerdem `noindex`, gesperrtes Crawling und die leere
Staging-Sitemap. Die signierten Endpunkte `/api/stripe/webhook` und
`/api/revalidate` sind in der Middleware vom Basic-Auth-Gate ausgenommen;
ihre eigene Signaturprüfung muss erhalten bleiben. Die CSP ist Report-Only.

Das ist eine Betriebsanleitung, kein Nachweis eines neuen Rollouts oder einer
heute bestandenen Prüfung. Siehe [Projektstand](../status.md).
