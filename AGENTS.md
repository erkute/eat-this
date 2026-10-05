# Eat This

`nextjs/` = Live-App (Next.js App Router, Firebase App Hosting)  
`studio/` = Sanity Studio

Frühes Stadium mit praktisch keinen echten Usern. Alten oder toten Code ersatzlos entfernen. Keine Kompatibilitäts-Shims für nicht mehr benötigte Implementierungen.

## Arbeitsweise

`AGENTS.md` und `CLAUDE.md` enthalten dieselben Projektregeln und müssen synchron gehalten werden.

Aktueller technischer Projektstand: [docs/status.md](docs/status.md)

Neue Codex-Branches verwenden den Präfix `codex/`.

## Befehle

Aus `nextjs/`:

```bash
npm test
npm run lint
npm run typecheck
npm run build:isolated
```

`build:isolated` verwenden, wenn parallel `next dev` läuft.

E-Mail-Assets bei entsprechenden Änderungen neu bauen:

```bash
npm run build:email-art
npm run build:email-spots
```

Brand-Font lokal synchronisieren:

```bash
npm run sync:brand-font
```

## Git und Deployment

| Branch | Firebase-Projekt |
| --- | --- |
| `main` | `eat-this-8a13b` |
| `staging` | `eat-this-staging-8a13b` |

Die Firebase-Projekte sind getrennt. Bei `firebase`-Befehlen immer `--project` explizit setzen.

Workflow:

`Feature-Branch → PR nach staging → PR nach main`

`main` ist branch-protected. Auf `staging` darf direkt gepusht werden.

Der Pre-Push-Hook führt einen vollständigen Build aus. Nicht mit `--no-verify` umgehen.

Log:

```text
/tmp/eat-this-prepush-build.log
```

## Nicht offensichtliche technische Regeln

### i18n

DE liegt unter `/`, EN unter `/en/...`.

Für interne Links den `Link` aus `i18n/navigation.ts` verwenden.

### CSS

Zwischen verschiedenen CSS-Modulen ist die Lade-Reihenfolge nicht garantiert. Keine modulübergreifenden Overrides bauen, die von gleicher Spezifität und Reihenfolge abhängen.

### E-Mail-Assets

Brand-Typografie in E-Mails wird lokal als Bild gerendert. Keine Webfonts oder Runtime-Route für das Rendering einführen.

`FF Providence Sans Pro` bleibt ausschließlich lokal und darf weder ins Repo noch ins Deployment gelangen.

### TypeScript Builds

Die zwei tsconfigs sind absichtlich getrennt:

- `tsconfig.json` → `.next`
- `tsconfig.verify.json` → `.next-verify`

Nicht beide Dist-Verzeichnisse in dieselbe `include` aufnehmen.

`next.config.ts` wählt die Konfiguration über `NEXT_DIST_DIR`.

## Parallele Arbeit

Parallele Agents verwenden getrennte Arbeitskopien.

Vor Worktree-Arbeit:

```bash
git worktree list
```

Manuelle Worktrees:

```bash
./scripts/worktree.sh <branch> [base]
```

Nicht gleichzeitig `HEAD`, Stashes oder `.next-verify/` derselben Arbeitskopie verändern. Stashes sind repo-weit.

## Deployment-Status

Status nur so weit melden, wie er tatsächlich verifiziert wurde:

`committed → pushed → PR offen → Rollout erfolgreich → smoke-getestet`

Keine Stufe ohne Beleg überspringen.
