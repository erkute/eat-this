---
name: deploy-verify
description: Prüfen, ob ein Eat-This-Deploy wirklich auf App Hosting ausgerollt ist (Rollout-Status + Build-Commit statt Zeitstempel oder gecachtem HTML).
disable-model-invocation: true
---

# Deploy prüfen

| Branch | Projekt | Backend |
| --- | --- | --- |
| `main` | `eat-this-8a13b` | `eat-this` |
| `staging` | `eat-this-staging-8a13b` | `eat-this-staging` |

Beide `us-central1`. Immer `--project` setzen. Ein Rollout dauert ~3–10 min, in der Warteschlange je Rollout.

1. Rollouts holen und nach `createTime` sortieren (Liste ist unsortiert, `--location` ist Pflicht):
   ```bash
   firebase apphosting:rollouts:list <backend> --location us-central1 --project <projekt> > /tmp/ro.json
   python3 -c "import json;r=open('/tmp/ro.json').read();d=json.loads(r[r.find('['):]);[print(x['name'].split('/')[-1],x['createTime'],x['state'],x.get('build','').split('/')[-1]) for x in sorted(d,key=lambda x:x['createTime'])[-6:]]"
   ```
2. Build des Rollouts prüfen (beide Argumente positionell): `firebase apphosting:builds:get <backend> <buildId> --location us-central1 --project <projekt>` → `source.codebase.hash` muss der volle erwartete SHA sein, Build `READY`, Rollout `SUCCEEDED`.
3. Erst danach Smoke-Test; als Beleg eignet sich ein content-gehashtes Asset unter `/_next/static/`, nicht gecachtes HTML.
4. Nur wenn wirklich hängend (>10 min je Rollout, kein neuer Rollout): `firebase apphosting:rollouts:create eat-this -g "$(git rev-parse origin/main)" -f --project eat-this-8a13b` (voller SHA).

Ergebnis melden als **ausgerollt / baut noch / fehlgeschlagen / unbelegt**, mit Umgebung, Rollout-Status und SHA.
