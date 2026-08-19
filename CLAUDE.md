# Eat This

`nextjs/` = die Live-App (Next.js App Router, Firebase App Hosting). `studio/` = Sanity Studio.
Frühes Stadium, praktisch keine echten User: alten/toten Code ersatzlos rausschmeißen, keine Kompatibilitäts-Shims.

## Befehle (alle aus `nextjs/`)

```
npm test          npm run lint          npx tsc --noEmit
npm run build:css                 # Pflicht nach jeder Änderung an css/ – dev baut nicht neu
npm run build:isolated            # statt `build`, wenn `next dev` läuft (sonst 500er)
```

## Deploy

| Branch    | Firebase-Projekt         | URL                          |
| --------- | ------------------------ | ---------------------------- |
| `main`    | `eat-this-8a13b`         | https://www.eatthisdot.com   |
| `staging` | `eat-this-staging-8a13b` | `…--eat-this-staging-8a13b.us-central1.hosted.app` (Basic Auth + noindex) |

Zwei **getrennte** Projekte – bei jedem `firebase`-Befehl `--project` explizit setzen.
`main` ist branch-protected: Feature-Branch → PR nach `staging` → PR nach `main`. Auf `staging` darf direkt gepusht werden.
Der `.githooks/pre-push`-Hook baut voll durch (~30-60 s) – nie mit `--no-verify` umgehen, Log unter `/tmp/eat-this-prepush-build.log`.

## Was sonst kaputtgeht

- **CSS:** Quelle `nextjs/css/`, minifiziert `nextjs/public/css/` (nie direkt editieren). Nach jeder `style.css`-Änderung `CSS_VERSION` in `lib/constants.ts` hochzählen – neun Layouts hängen dran.
- **Bilder unter `public/`:** vor dem Commit zu WebP (`cwebp -q 80`). Ausnahmen, die PNG bleiben: `favicon.ico`, `apple-touch-icon.png`, PWA-Icons, OG-/Twitter-Bilder.
- **Keine Opacity-Fades** für Ein-/Ausblend-*Bewegung* auf Brand-Flächen – stattdessen translate/scale/clip-path. (Hover-States etc. dürfen Opacity nutzen.)
- **Die App ist light-only.** Kein Dark Mode, kein `prefers-color-scheme`. `color-scheme: light` in `globals.css` muss bleiben.
- **CSP läuft als `Report-Only`** – nicht als „enforced" beschreiben.
- **i18n:** DE auf `/`, EN auf `/en/...`. Interne Links immer über den `Link` aus `i18n/navigation.ts`.

## Deployment-Zustand ehrlich benennen

`committed` → `pushed` → `PR offen` → `Rollout erfolgreich` (nur wenn App Hosting es meldet) → `smoke-getestet`. Keine Stufe ohne Beleg überspringen.
