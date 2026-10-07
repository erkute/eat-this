# Eat This

`nextjs/` = die Live-App (Next.js App Router, Firebase App Hosting). `studio/` = Sanity Studio.
Frühes Stadium, praktisch keine echten User: alten/toten Code ersatzlos rausschmeißen, keine Kompatibilitäts-Shims.

Einzige Regeldatei für alle Agents; `CLAUDE.md` importiert sie nur. Neue Branches: Codex `codex/`, Claude `claude/`.

## Befehle (alle aus `nextjs/`)

```
npm test          npm run lint          npm run typecheck
npm run build:isolated            # statt `build`, wenn `next dev` läuft (sonst 500er)
npm run sync:brand-font           # holt die aktivierte Providence aus Creative Cloud
npm run build:email-art           # Pflicht nach jeder Textänderung in scripts/build-email-art.mts
npm run build:email-spots         # rendert die Spot-Cards der Anmelde-Mail neu aus Sanity
```

`./scripts/worktree.sh <branch> [base]` liegt dagegen im Repo-Wurzelverzeichnis.

## Deploy

| Branch    | Firebase-Projekt         | URL                                                                       |
| --------- | ------------------------ | ------------------------------------------------------------------------- |
| `main`    | `eat-this-8a13b`         | https://www.eatthisdot.com                                                |
| `staging` | `eat-this-staging-8a13b` | `…--eat-this-staging-8a13b.us-central1.hosted.app` (Basic Auth + noindex) |

Zwei **getrennte** Projekte – bei jedem `firebase`-Befehl `--project` explizit setzen.
`main` ist branch-protected, der Weg dorthin führt immer über `staging`. Kleinkram (Doku, Texte, Einzeiler) direkt auf `staging` committen und pushen; größere Arbeit über Feature-Branch → PR nach `staging`. „Bring das live“ heißt: PR `staging → main` öffnen und `gh pr merge <nr> --merge --auto` setzen – GitHub mergt, sobald `nextjs` grün ist. Ändert ein PR oder Push nur `*.md`, `.claude/`, `.agents/` oder `.codex/`, überspringt der CI-Check den Build.
Der `.githooks/pre-push`-Hook baut voll durch (~30-60 s) – nie mit `--no-verify` umgehen, Log unter `/tmp/eat-this-prepush-build.log`.

Firestore-Regeln und Sanity Studio werden separat deployt. Auf Staging sind `/api/stripe/webhook` und `/api/revalidate` vom Basic-Auth-Gate ausgenommen – ihre Signaturprüfung muss bleiben. Rollout-Nachweis: `/deploy-verify`.

Status nur so weit melden, wie er belegt ist: `committed` → `pushed` → `PR offen` → `Rollout erfolgreich` (nur wenn App Hosting es meldet) → `smoke-getestet`.

## Gewollte Produktlogik (nicht „reparieren“)

- **Must-Eat aufdecken:** angemeldet gibt `POST /api/must-eat-reveal` jede Karte frei, ohne Kauf und ohne Standortprüfung auf dem Server – die 50 m misst nur der Browser (Koordinaten sind ohnehin öffentlich). Gebremst wird über das Ratenlimit je Konto (10/min, 15/Tag); `route.test.ts` hält das fest.
- **Herzen:** `api/heart` schreibt Favorit und `restaurants/{id}.heartCount` in einer Admin-Transaktion, idempotent. Der Client schreibt den Zähler nie.
- **Bestenlisten** kommen aus `topSpots` in Sanity (`rankCurated`); unter drei gültigen Einträgen entfällt die Liste.
- **E-Mail-Link-Login:** die Adresse kommt aus `emailForSignIn` oder erneuter Eingabe, nie aus Link-Parametern. Geschützte Routen und Session-Cookies prüfen mit Widerrufsprüfung.

## Was sonst kaputtgeht

- **CSS:** `app/globals.css` plus CSS-Module. In Produktion lädt `globals.css` vor den Modulen – überschreibt ein Modul eine globale Regel mit gleicher Spezifität, gewinnt das Modul (in dev genauso). Zwischen zwei Modulen ist die Reihenfolge nicht festgelegt: nie mit gleicher Spezifität überschreiben.
- **Auth-Mails:** `emails/SignupEmail.tsx` (neue Adresse) und `emails/LoginEmail.tsx` (bestehendes Konto) – zwei getrennte Mails, kein Flag. Der CTA bleibt ein echter Link mit gelber Fläche; nur sein Wort ist ein Providence-Bild, mit Alt-Text in Ink – so ist er bei blockierten Bildern beschriftet statt leer. Nie den ganzen Knopf als Bild.
- **Alles Gestaltete in Mails wird lokal zu Bildern gerendert.** Gmail lädt keine Webfonts (und die Typekit-Lizenz deckt E-Mail nicht ab), entfernt `position:absolute` und `transform`. Deshalb: jeder Text in Markenschrift – Headlines, Fließtext, Footer – über `build:email-art` (Maße in `emails/art.generated.ts`), Spot-Cards über `build:email-spots` (`emails/spots.generated.ts`). Echter Text bleiben nur der Ersatz-Link und der Satz, warum die Mail kommt. FF Providence Sans Pro liegt per `.gitignore` nur lokal – sie darf nicht ins Repo und nicht auf den Server; fehlt sie, rendern die Skripte sichtbar gewarnt mit Schoolbell. Nie eine Laufzeit-Route bauen, die Mail-Bilder rendert: die hing auf Staging hinter der Basic Auth und hätte die Schrift aufs Deployment gezwungen.
- **Bilder unter `public/`:** vor dem Commit zu WebP (`cwebp -q 80`). Ausnahmen, die PNG bleiben: `favicon.ico`, `apple-touch-icon.png`, PWA-Icons, OG-/Twitter-Bilder.
- **Verdeckte Karte ohne Konto:** der Tipp lässt die Karte kurz zittern und öffnet dann das Login-Modal im Starter-Modus (`openLoginModal({ kind: 'card', mustEatId })` – das merkt sich die Karte selbst, `rememberPendingStarterCard` nicht einzeln aufrufen). Keine Tafel, kein Zwischenschritt davor. Erklärt wird die Karte im Must-Eat-Detail daneben: die Folien aus `MustEatsOnboarding`, beim ersten Mal von selbst, danach per „Wie funktioniert's?“. Gilt gleich im Map-Detail (`.mustEatCardTapping`) und im Startseiten-Teaser (`.photoTapping`) – Dauer und die Reduced-Motion-Regel (dann sofort, ohne Warten) hält `lib/guestCardShake.ts`; CSS-Module vergeben eigene Keyframe-Namen, die Animation liegt deshalb zwangsläufig doppelt.
- **Die App ist light-only.** Kein Dark Mode, kein `prefers-color-scheme`. `color-scheme: light` in `globals.css` muss bleiben. Einzige Ausnahme: der Hell/Dunkel-Knopf im Artikel (`lib/articleTheme.ts`) — nur dort, nur auf Knopfdruck, Dunkel = Ink-Grund der Marke.
- **CSP läuft als `Report-Only`** (`next.config.ts`) – nicht als „enforced" beschreiben.
- **i18n:** DE auf `/`, EN auf `/en/...`. Interne Links immer über den `Link` aus `i18n/navigation.ts`.
- **Zwei tsconfigs, kein Zufall:** `tsconfig.json` gehört dem Default-Dist-Dir (`.next`), `tsconfig.verify.json` dem isolierten Build (`.next-verify`); `next.config.ts` wählt anhand von `NEXT_DIST_DIR`. Next hängt `<distDir>/types/**/*.ts` an die tsconfig, die es bekommt – in einer gemeinsamen Datei sammelten sich beide Dist-Dirs an, und `build:isolated` fiel über den veralteten Validator des jeweils anderen, sobald eine Route gelöscht war. Nie beide Dist-Dirs in eine `include` zurückschreiben.
- **Getrennte Arbeitskopien bei paralleler Arbeit.** Vor neuer Isolation `git worktree list` prüfen und eine freie Arbeitskopie wiederverwenden. `./scripts/worktree.sh <branch> [base]` legt manuelle Worktrees unter `../eat-this-worktrees/` an und startet neue Branches standardmäßig von `origin/staging`. Zwei Agents dürfen nicht gleichzeitig HEAD, Stashes oder `.next-verify/` derselben Arbeitskopie verändern; Stashes sind repo-weit. Manuelle Worktrees erst nach Prüfung laufender Prozesse und lokaler Änderungen mit `git worktree remove <pfad>` entfernen – ein Merge allein macht eine noch verwendete Arbeitskopie nicht frei.
