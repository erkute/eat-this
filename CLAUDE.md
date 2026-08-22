# Eat This

`nextjs/` = die Live-App (Next.js App Router, Firebase App Hosting). `studio/` = Sanity Studio.
Frühes Stadium, praktisch keine echten User: alten/toten Code ersatzlos rausschmeißen, keine Kompatibilitäts-Shims.

## Befehle (alle aus `nextjs/`)

```
npm test          npm run lint          npm run typecheck
npm run build:css                 # Pflicht nach jeder Änderung an css/ – dev baut nicht neu
npm run build:isolated            # statt `build`, wenn `next dev` läuft (sonst 500er)
npm run sync:brand-font           # holt die aktivierte Providence aus Creative Cloud
npm run build:email-art           # Pflicht nach jeder Textänderung in scripts/build-email-art.mts
npm run build:email-spots         # rendert die Spot-Cards der Anmelde-Mail neu aus Sanity
```

## Deploy

| Branch    | Firebase-Projekt         | URL                                                                       |
| --------- | ------------------------ | ------------------------------------------------------------------------- |
| `main`    | `eat-this-8a13b`         | https://www.eatthisdot.com                                                |
| `staging` | `eat-this-staging-8a13b` | `…--eat-this-staging-8a13b.us-central1.hosted.app` (Basic Auth + noindex) |

Zwei **getrennte** Projekte – bei jedem `firebase`-Befehl `--project` explizit setzen.
`main` ist branch-protected: Feature-Branch → PR nach `staging` → PR nach `main`. Auf `staging` darf direkt gepusht werden.
Der `.githooks/pre-push`-Hook baut voll durch (~30-60 s) – nie mit `--no-verify` umgehen, Log unter `/tmp/eat-this-prepush-build.log`.

## Was sonst kaputtgeht

- **CSS:** Quelle `nextjs/css/`, minifiziert `nextjs/public/css/` (nie direkt editieren). Nach jeder `style.css`-Änderung `CSS_VERSION` in `lib/constants.ts` hochzählen – neun Layouts hängen dran.
- **Auth-Mails:** `emails/SignupEmail.tsx` (neue Adresse) und `emails/LoginEmail.tsx` (bestehendes Konto) – zwei getrennte Mails, kein Flag. Der CTA bleibt Live-Text – nie ein Bild, sonst ist er bei blockierten Bildern unsichtbar.
- **Markenschrift in Mails:** Gmail lädt keine Webfonts, und die Typekit-Lizenz deckt E-Mail nicht ab. Alles in FF Providence Sans Pro wird deshalb **lokal** zu Bildern gerendert: Headlines über `build:email-art` (Maße in `emails/art.generated.ts`), Spot-Cards über `build:email-spots` (Auswahl in `emails/spots.generated.ts`). Die Schrift selbst liegt per `.gitignore` nur lokal – sie darf nicht ins Repo und nicht auf den Server. Fehlt sie, rendern beide Skripte sichtbar gewarnt mit Schoolbell. Nie eine Laufzeit-Route bauen, die Mail-Bilder rendert: die hing auf Staging hinter der Basic Auth und hätte die Schrift aufs Deployment gezwungen.
- **Bilder unter `public/`:** vor dem Commit zu WebP (`cwebp -q 80`). Ausnahmen, die PNG bleiben: `favicon.ico`, `apple-touch-icon.png`, PWA-Icons, OG-/Twitter-Bilder.
- **Keine Opacity-Fades** für Ein-/Ausblend-_Bewegung_ auf Brand-Flächen – stattdessen translate/scale/clip-path. (Hover-States etc. dürfen Opacity nutzen.)
- **Die App ist light-only.** Kein Dark Mode, kein `prefers-color-scheme`. `color-scheme: light` in `globals.css` muss bleiben.
- **CSP läuft als `Report-Only`** – nicht als „enforced" beschreiben.
- **i18n:** DE auf `/`, EN auf `/en/...`. Interne Links immer über den `Link` aus `i18n/navigation.ts`.
- **Zwei tsconfigs, kein Zufall:** `tsconfig.json` gehört dem Default-Dist-Dir (`.next`), `tsconfig.verify.json` dem isolierten Build (`.next-verify`); `next.config.ts` wählt anhand von `NEXT_DIST_DIR`. Next hängt `<distDir>/types/**/*.ts` an die tsconfig, die es bekommt – in einer gemeinsamen Datei sammelten sich beide Dist-Dirs an, und `build:isolated` fiel über den veralteten Validator des jeweils anderen, sobald eine Route gelöscht war. Nie beide Dist-Dirs in eine `include` zurückschreiben.
- **Parallele Sessions:** ein Worktree pro Session. `scripts/worktree.sh <branch>` legt sie unter `../eat-this-worktrees/` an; der Claude-Code-Harness legt seine eigenen unter `.claude/worktrees/` ab – beides sind echte `git worktree`s, `git worktree list` ist die Wahrheit. Zwei Agents in einer Arbeitskopie teilen HEAD und `.next-verify/`: Branch-Wechsel und `git stash` verschieben fremde Arbeit, gleichzeitige Builds killen sich gegenseitig.
- **Worktrees wieder abräumen:** `.next` und `.next-verify` bleiben nach dem Pre-Push-Build liegen – zusammen rund 1,2 GB **pro** Worktree. Nach dem Merge `git worktree remove <pfad>` (Symlinks auf `node_modules`/`.env.local` werden dabei nur gelöst, nicht verfolgt). Stashes sind repo-weit und überleben das Entfernen.

## Deployment-Zustand ehrlich benennen

`committed` → `pushed` → `PR offen` → `Rollout erfolgreich` (nur wenn App Hosting es meldet) → `smoke-getestet`. Keine Stufe ohne Beleg überspringen.
