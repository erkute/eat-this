# Eat This

`nextjs/` = die Live-App (Next.js App Router, Firebase App Hosting). `studio/` = Sanity Studio.
Frühes Stadium, praktisch keine echten User: alten/toten Code ersatzlos rausschmeißen, keine Kompatibilitäts-Shims.
Fällt ein Feature oder eine Mechanik weg, geht im selben Commit alles mit: Code, i18n-Texte, CSS, Tests, Kommentare, Doku. Vorher nach dem Namen suchen (`rg`), danach `typecheck`, `lint` (meldet ungenutzte Variablen) und `audit:css-modules`. Kommentare beschreiben, was gilt – nicht, was früher war.

Einzige Regeldatei; `CLAUDE.md` importiert sie nur. Neue Branches: `claude/`.

## Befehle (alle aus `nextjs/`)

```
npm test          npm run lint          npm run typecheck
npm run build:isolated            # statt `build`, wenn `next dev` läuft (sonst 500er)
npm run sync:brand-font           # holt die aktivierte Neue Haas Grotesk Text aus Creative Cloud
npm run build:email-art           # Pflicht nach jeder Textänderung in scripts/build-email-art.mts
npm run build:email-spots         # rendert die Spot-Cards der Anmelde-Mail neu aus Sanity
```

`./scripts/worktree.sh <branch> [base]` liegt dagegen im Repo-Wurzelverzeichnis.

## Deploy

**Code-Review vor jedem Commit und Push:** Änderungen gegen die Anforderungen und diese Projektregeln prüfen, relevante Befunde beheben und die Korrekturen erneut prüfen. Review-Ergebnis vor dem Push kurz berichten (Betreiber, 13.10.2026).

| Branch    | Firebase-Projekt         | URL                                                                       |
| --------- | ------------------------ | ------------------------------------------------------------------------- |
| `main`    | `eat-this-8a13b`         | https://www.eatthisdot.com                                                |
| `staging` | `eat-this-staging-8a13b` | `…--eat-this-staging-8a13b.us-central1.hosted.app` (Basic Auth + noindex) |

Zwei **getrennte** Projekte – bei jedem `firebase`-Befehl `--project` explizit setzen.
`main` ist branch-protected, der Weg dorthin führt immer über `staging`. Kleinkram (Doku, Texte, Einzeiler) direkt auf `staging` committen und pushen; größere Arbeit über Feature-Branch → PR nach `staging`. „Bring das live“ heißt: PR `staging → main` öffnen und `gh pr merge <nr> --merge --auto` setzen – GitHub mergt, sobald `nextjs` grün ist. Ändert ein PR nur `*.md` oder `.claude/`, überspringt der CI-Check den Build; Pushes auf `staging`/`main` bauen immer. Browser, Barrierefreiheit und Lighthouse laufen nur im PR nach `staging`, als eigene Jobs `e2e` und `lighthouse` (je drei Rechner parallel, ~12 min gesamt); einen Feature-PR erst mergen, wenn alle sieben Checks grün sind – `nextjs` allein reicht dort nicht. `staging → main` und Pushes bauen, linten und testen (~4 min). „Live“ erst melden, wenn am Merge-Commit auf `main` der Check `App Hosting - Rollout (eat-this-8a13b/…)` grün ist (`gh api repos/erkute/eat-this/commits/<sha>/check-runs`, dauert ~5–10 min).
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
- **Auth-Mails:** `emails/SignupEmail.tsx` (neue Adresse) und `emails/LoginEmail.tsx` (bestehendes Konto) – zwei getrennte Mails, kein Flag. Der CTA bleibt ein echter Link mit gelber Fläche; nur sein Wort ist ein Bild in der Markenschrift, mit Alt-Text in Ink – so ist er bei blockierten Bildern beschriftet statt leer. Nie den ganzen Knopf als Bild.
- **Alles Gestaltete in Mails wird lokal zu Bildern gerendert.** Gmail lädt keine Webfonts (und die Typekit-Lizenz deckt E-Mail nicht ab), entfernt `position:absolute` und `transform`. Deshalb: jeder Text in Markenschrift – Headlines, Fließtext, Footer – über `build:email-art` (Maße in `emails/art.generated.ts`), Spot-Cards über `build:email-spots` (`emails/spots.generated.ts`). Echter Text bleiben nur der Ersatz-Link und der Satz, warum die Mail kommt. Die Markenschrift (Neue Haas Grotesk Text Pro, `assets/fonts/NeueHaasGroteskTextPro*`, per `sync:brand-font`) liegt per `.gitignore` nur lokal – sie darf nicht ins Repo und nicht auf den Server; fehlt sie, rendern die Skripte sichtbar gewarnt mit Schoolbell. Nie eine Laufzeit-Route bauen, die Mail-Bilder rendert: die hing auf Staging hinter der Basic Auth und hätte die Schrift aufs Deployment gezwungen.
- **Bilder unter `public/`:** vor dem Commit zu WebP (`cwebp -q 80`). Ausnahmen, die PNG bleiben: `favicon.ico`, `apple-touch-icon.png`, PWA-Icons, OG-/Twitter-Bilder.
- **Verdeckte Karte ohne Konto:** der Tipp lässt die Karte kurz zittern und öffnet dann das Login-Modal im Starter-Modus (`openLoginModal({ kind: 'card', mustEatId })` – das merkt sich die Karte selbst, `rememberPendingStarterCard` nicht einzeln aufrufen). Keine Tafel, kein Zwischenschritt davor. Erklärt wird die Karte im Must-Eat-Detail daneben: die Folien aus `MustEatsOnboarding`, beim ersten Mal von selbst, danach per „Wie funktioniert's?“. Gilt gleich im Map-Detail (CSS, `.mustEatCardTapping`) und im Startseiten-Teaser (GSAP in `HubMustEatsTeaser`) – Dauer und die Reduced-Motion-Regel (dann sofort, ohne Warten) hält für beide `lib/guestCardShake.ts`.
- **Hell- und Dunkelmodus gelten appweit, einschließlich Map** (Betreiber, 20.10.2026). `lib/theme.ts` verwaltet die manuelle, gespeicherte Wahl; umgeschaltet wird im Menü und im Footer (`ThemeSwitch`, Sonne/Mond neben DE/EN, seit 22.10.2026 auch im Footer). Hell ist Standard. UI-Flächen und Schrift nutzen `--et-ground` / `--et-fg`; `--et-ink` / `--et-white` bleiben feste Markenfarben für Fotos, Artwork und Angebote. Beide Map-Paletten mit `npm run build:basemap` erzeugen.
- **ISR-Cache über mehrere Instanzen:** `nextjs/cache-handler.cjs` teilt jede Tag-Invalidierung über Firestore `_revalidatedTags/shared` und setzt sie bei jedem Aufruf neu (Next 15.5 nimmt sonst nur die erste pro Instanz). Ohne ihn erreicht der Sanity-Webhook nur die Instanz, auf der er landet.
- **CSP läuft als `Report-Only`** (`next.config.ts`) – nicht als „enforced" beschreiben.
- **i18n:** DE auf `/`, EN auf `/en/...`. Interne Links immer über den `Link` aus `i18n/navigation.ts`.
- **Zwei tsconfigs, kein Zufall:** `tsconfig.json` gehört dem Default-Dist-Dir (`.next`), `tsconfig.verify.json` dem isolierten Build (`.next-verify`); `next.config.ts` wählt anhand von `NEXT_DIST_DIR`. Next hängt `<distDir>/types/**/*.ts` an die tsconfig, die es bekommt – in einer gemeinsamen Datei sammelten sich beide Dist-Dirs an, und `build:isolated` fiel über den veralteten Validator des jeweils anderen, sobald eine Route gelöscht war. Nie beide Dist-Dirs in eine `include` zurückschreiben.
- **Getrennte Arbeitskopien bei paralleler Arbeit.** Vor neuer Isolation `git worktree list` prüfen und eine freie Arbeitskopie wiederverwenden. `./scripts/worktree.sh <branch> [base]` legt manuelle Worktrees unter `../eat-this-worktrees/` an und startet neue Branches standardmäßig von `origin/staging`. Zwei Agents dürfen nicht gleichzeitig HEAD, Stashes oder `.next-verify/` derselben Arbeitskopie verändern; Stashes sind repo-weit. Manuelle Worktrees erst nach Prüfung laufender Prozesse und lokaler Änderungen mit `git worktree remove <pfad>` entfernen – ein Merge allein macht eine noch verwendete Arbeitskopie nicht frei.

## Design-, Content- und Qualitätsabnahme

**Figma:** Bei Figma-Aufträgen direkt über den offiziellen Figma-MCP auf die Datei [Eat This](https://www.figma.com/design/p5XEjPCeGlgtXxhreeIgnB/Eat-This) zugreifen. Sie ist die Standarddatei für Mockups, Grafiken, Logos und Booster Packs, sofern der Nutzer keine andere Datei nennt; den Link nicht erneut erfragen. Eine im Auftrag genannte Seite oder Node hat Vorrang, sonst die passende Seite anhand der aktuellen Dateistruktur wählen und die betroffenen Frames vor Änderungen lesen.

**Knöpfe:** Jeder Text-Knopf trägt die globale Klasse `et-btn` (`globals.css`, Größen `et-btn-sm`/`et-btn-lg`, zweite Antwort und Fotos `et-btn-alt`). Module setzen nur Position (Abstand, Breite, Raster), nie Farbe, Form, Schrift oder Hover; die Farbe kommt aus `--et-solid`/`--et-on-solid` der Fläche. Änderungen am Knopf nur dort (Betreiber, 22.10.2026). Ausnahmen: Symbol-Knöpfe, Chips, Filter, Sprachwahl, Remy-Chat-Senden.

**Schrift:** Neue Haas Grotesk Text (Adobe-Fonts-Kit `kgb1lmh`, 400/700) für Titel, Bedienung und Lesetext, über `--et-font-display`/`--et-font-body`. Providence ist abgelöst und nicht mehr lizenziert – nicht wieder einsetzen.

**Design-Originale** (Blender, Fotos, Freisteller) liegen lokal unter `design/` und sind ignoriert, weil das Repo öffentlich ist. Was die App braucht, wird fertig nach `nextjs/public/` exportiert.

**Etiketten:** Text auf Fotos und kleine Zwischentitel über die globalen Klassen `et-label` / `et-label-paper` / `et-label-title` (`globals.css`), immer gerade, nie schief. Fotos werden für Text nie abgedunkelt (Betreiber, 22.10.2026).

**Navigation und CTAs:** Keine Pfeile oder Chevrons als Richtungszeichen (auch nicht für Weiter oder externe Links). Zwei Ausnahmen: die Lasche, die am Desktop das Listen-Panel der Map ein- und ausklappt (Betreiber, 22.10.2026), und der Zurück-Pfeil im Spot-Detail der Map – weißer Pfeil ohne Fläche links im Foto, Herz rechts, wie bei Airbnb; am Telefon übernimmt ihn beim Scrollen die feste Leiste (Betreiber, 28.10.2026). Keine unterstrichenen Wörter oder Links, auch nicht bei Hover oder Fokus. Interaktion und Fokus über Farbe, Fläche oder eine klare Umrandung kennzeichnen.

Bei sichtbaren Änderungen den betroffenen Ablauf vor und nach dem Umbau auf einem schmalen Telefon und Desktop prüfen. Bestehende Komponenten und die `--et-*`-Tokens in `globals.css` sind die gestalterische Referenz; neue Richtungen erst anhand konkreter Screens/Referenzen ausarbeiten. Schrift, Abstände, Bildausschnitt, Fokus und leere/ladende Zustände gehören zur Abnahme. Animationen mit und ohne Reduced Motion prüfen; sichtbare Inhalte sollen nicht auf eine Animation oder Hydrierung warten müssen.

`npm run build:isolated` erzeugt den Produktionsstand für `npm run test:e2e` und `npm run audit:preview` (Port 3100). Die Browserprüfung deckt DE/EN, Magazin → Artikel, Cookie-Auswahl, Gastkarte → Login (auch mit Reduced Motion) und Barrierefreiheit ab. DNT hält Testaufrufe aus der Zählung; nur der Consent-Beleg wird im Browsertest ersetzt, seine Backendtests bleiben separat. `E2E_BASE_URL` nur setzen, wenn bewusst ein bereits laufender Server geprüft werden soll; im Bericht Dev- und Produktionsmessungen unterscheiden. Playwright benötigt einmalig `npx playwright install chromium`. Screenshots und Traces bleiben unter `/tmp/eat-this-*`.

**Live-Tests im eingebauten Browser (Codex oder Claude):** Zuerst [`/no-count`](https://www.eatthisdot.com/no-count) öffnen. Nur wenn `eatthis_nocount=1` fehlt („Dieser Browser ist noch nicht ausgeschlossen.“), „Nicht mitzählen“ aktivieren. Danach vollständig neu laden und `eatthis_nocount=1` sowie „Dieser Browser wird nicht mitgezählt.“ bestätigen. Bei bereits vorhandenem Cookie die Einstellung beibehalten. Der Ausschluss gilt im selben Browserprofil auch für neue Chats (für Codex am 25.10.2026 bestätigt).

Performanceänderungen am selben Seitentyp vor/nachher messen. Der PR-Check misst seinen eigenen Build; der separate Live-Check wartet auf App Hosting. Performancebudgets melden Überschreitungen weiterhin als Warnung: Der Betreiber erhält die vollständige Intro-Dramaturgie der Startseite (Aufzugtüren und Remy) ausdrücklich (07.10.2026), obwohl sie den LCP verzögert. Diese Warnungen samt Messwerten berichten, nicht als bestandene Performanceziele darstellen. Feldziele am 75. Perzentil: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1. Lighthouse ist ein Labortest und misst kein echtes INP. Mit `npm run audit:field` vorhandene CrUX-Daten getrennt für Telefon und Desktop lesen (`CRUX_API_KEY`, ersatzweise `GOOGLE_API_KEY`, braucht Zugriff auf die Chrome UX Report API). Niedrigen Traffic oder fehlende Felddaten als fehlende Evidenz melden. Sentry-Tracing bleibt bewusst entfernt; neue Messung nur mit begründetem Datenbedarf und Bundlebudget.

**Texte** (Artikel, Spot-Beschreibungen, Tipps, Hub-Texte, SEO-Felder, EN) schreiben und verbessern nach `docs/texte-schreiben.md` – vorher ganz lesen.

**Must-Eat-Karten** (Figma, neue Karte, Kartendesign, Export und Einspielen) nach `docs/must-eat-karten.md`. REA (lokales Analysewerkzeug für Websites und Apps, `.mcp.json`): `docs/rea.md`.

Bei Content-/SEO-Arbeit Sanity als Inhaltsquelle verwenden; Fakten und DE/EN-Fassungen prüfen, Canonicals, hreflang, Sitemap, strukturierte Daten und interne Links am gerenderten Ergebnis kontrollieren. Vor Änderungen an Google-Anbindungen die vorhandenen Adapter `lib/admin/searchConsole.server.ts` und `googleAnalytics.server.ts` nutzen. Für SEO-Auswertungen (Search Console, GA4, PageSpeed, URL-Prüfung) steht der Konnektor GenieSeo bereit; Massen-URL-Prüfungen weiter über das Dienstkonto. Figma für konkrete Layout-/Komponentenarbeit, Adobe für Bild-/Font-/Asset-Arbeit, Remotion für Video; zusätzliche Plugins nur bei einer nachgewiesenen Lücke.
