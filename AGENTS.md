# Eat This

`nextjs/` = die Live-App (Next.js App Router, Firebase App Hosting). `studio/` = Sanity Studio.
Einzige Regeldatei; `CLAUDE.md` importiert sie nur. Neue Branches: `claude/`.

Frühes Stadium, praktisch keine echten User: alten Code ersatzlos löschen, keine Kompatibilitäts-Shims. Fällt ein Feature weg, geht im selben Commit alles mit: Code, i18n-Texte, CSS, Tests, Kommentare, Doku. Vorher nach dem Namen suchen (`rg`), danach `typecheck`, `lint`, `audit:css-modules` und `npx knip` (ungenutzte Dateien und Exporte). Kommentare beschreiben, was gilt, nicht, was früher war.

## Befehle

Aus `nextjs/`:

```
npm test                   npm run lint                npm run typecheck
npm run audit:css-modules  npm run test:e2e            npm run audit:preview
npm run build:isolated     # statt `build`, wenn `next dev` läuft (sonst 500er)
npm run sync:brand-font    # holt die aktivierte Neue Haas Grotesk Text aus Creative Cloud
npm run build:email-art    # Pflicht nach jeder Textänderung in scripts/build-email-art.mts
npm run build:email-spots  # rendert die Spot-Cards der Anmelde-Mail neu aus Sanity
npm run build:basemap      # erzeugt beide Map-Paletten (hell, dunkel)
```

Aus dem Repo-Wurzelverzeichnis: `./scripts/worktree.sh <branch> [base]`.

## Deploy

**Code-Review vor jedem Commit und Push:** Änderungen gegen die Anforderungen und diese Regeln prüfen, relevante Befunde beheben, Korrekturen erneut prüfen. Das Ergebnis vor dem Push kurz berichten.

| Branch    | Firebase-Projekt         | URL                                                                       |
| --------- | ------------------------ | ------------------------------------------------------------------------- |
| `main`    | `eat-this-8a13b`         | https://www.eatthisdot.com                                                |
| `staging` | `eat-this-staging-8a13b` | `…--eat-this-staging-8a13b.us-central1.hosted.app` (Basic Auth + noindex) |

Zwei **getrennte** Projekte: bei jedem `firebase`-Befehl `--project` setzen. Firestore-Regeln und Sanity Studio werden separat deployt.

- **Weg nach `main`:** `main` ist geschützt, es führt immer über `staging`. Kleinkram (Doku, Texte, Einzeiler) direkt auf `staging`; größere Arbeit über Feature-Branch → PR nach `staging`.
- **„Bring das live“:** PR `staging → main` öffnen und `gh pr merge <nr> --merge --auto` setzen. GitHub mergt, sobald `nextjs` grün ist.
- **Checks:** Einen Feature-PR erst mergen, wenn alle sieben Checks grün sind (`nextjs`, `e2e` ×3, `lighthouse` ×3, zusammen ~12 min). `staging → main` und Pushes bauen, linten und testen nur (~4 min). Ändert ein PR nur `*.md` oder `.claude/`, überspringt der Check den Build; Pushes bauen immer.
- **Pre-Push-Hook:** `.githooks/pre-push` baut voll durch, nie mit `--no-verify` umgehen. Log: `/tmp/eat-this-prepush-build.log`.
- **„Live“ melden:** erst wenn am Merge-Commit auf `main` der Check `App Hosting - Rollout (eat-this-8a13b/…)` grün ist (`gh api repos/erkute/eat-this/commits/<sha>/check-runs`, ~5–10 min). Rollout-Nachweis: `/deploy-verify`.
- **Status** nur so weit melden, wie er belegt ist: `committed` → `pushed` → `PR offen` → `Rollout erfolgreich` → `smoke-getestet`.
- **Staging:** `/api/stripe/webhook` und `/api/revalidate` sind vom Basic-Auth-Gate ausgenommen; ihre Signaturprüfung muss bleiben.

## Gewollte Produktlogik (nicht „reparieren“)

- **Startseite:** Hero mit offenem, statischem Kartenfächer sofort anzeigen. Der Cookie-Dialog erscheint unabhängig davon. Remy bleibt als Figur und Chat auf der Seite.
- **Must Eat aufdecken:** Angemeldet gibt `POST /api/must-eat-reveal` jede Karte frei, ohne Kauf und ohne Standortprüfung auf dem Server. Die 50 m misst nur der Browser (Koordinaten sind ohnehin öffentlich). Gebremst wird über das Ratenlimit je Konto (10/min, 15/Tag); `route.test.ts` hält das fest.
- **Verdeckte Karte ohne Konto:** Der Tipp lässt die Karte kurz zittern und öffnet dann das Login-Modal im Starter-Modus (`openLoginModal({ kind: 'card', mustEatId })`, das merkt sich die Karte selbst). Keine Tafel, kein Zwischenschritt davor. Gilt gleich im Map-Detail (CSS, `.mustEatCardTapping`) und im Startseiten-Teaser (GSAP in `HubMustEatsTeaser`); Dauer und Reduced-Motion-Regel (dann sofort, ohne Warten) hält für beide `lib/guestCardShake.ts`. Erklärt wird die Karte im Must-Eat-Detail daneben: die Folien aus `MustEatsOnboarding`, nur per „Wie funktioniert's?“, nie von selbst.
- **Herzen:** `api/heart` schreibt Favorit und `restaurants/{id}.heartCount` in einer Admin-Transaktion, idempotent. Der Client schreibt den Zähler nie.
- **Bestenlisten** kommen aus `topSpots` in Sanity (`rankCurated`); unter drei gültigen Einträgen entfällt die Liste.
- **E-Mail-Link-Login:** Die Adresse kommt aus `emailForSignIn` oder erneuter Eingabe, nie aus Link-Parametern. Geschützte Routen und Session-Cookies prüfen mit Widerrufsprüfung.

## Was sonst kaputtgeht

- **CSS:** `app/globals.css` lädt vor den CSS-Modulen; überschreibt ein Modul eine globale Regel mit gleicher Spezifität, gewinnt das Modul. Zwischen zwei Modulen ist die Reihenfolge nicht festgelegt: dort nie mit gleicher Spezifität überschreiben.
- **Hell und Dunkel gelten appweit, einschließlich Map.** `lib/theme.ts` verwaltet die gespeicherte Wahl, umgeschaltet wird in Menü und Footer (`ThemeSwitch`), Hell ist Standard. UI-Flächen und Schrift nutzen `--et-ground` / `--et-fg`; `--et-ink` / `--et-white` bleiben feste Markenfarben für Fotos, Artwork und Angebote.
- **Auth-Mails:** `emails/SignupEmail.tsx` (neue Adresse) und `emails/LoginEmail.tsx` (bestehendes Konto) sind zwei getrennte Mails, kein Flag. Der CTA bleibt ein echter Link mit gelber Fläche; nur sein Wort ist ein Bild in der Markenschrift, mit Alt-Text in Ink. Nie den ganzen Knopf als Bild.
- **Gestaltetes in Mails wird lokal zu Bildern gerendert.** Gmail lädt keine Webfonts (die Typekit-Lizenz deckt E-Mail auch nicht ab) und entfernt `position:absolute` und `transform`. Jeder Text in Markenschrift läuft über `build:email-art` (Maße in `emails/art.generated.ts`), Spot-Cards über `build:email-spots` (`emails/spots.generated.ts`). Echter Text bleiben nur der Ersatz-Link und der Satz, warum die Mail kommt. Die Schrift (`assets/fonts/NeueHaasGroteskTextPro*`) liegt nur lokal und darf nicht ins Repo oder auf den Server; fehlt sie, rendern die Skripte sichtbar gewarnt mit Schoolbell. Nie eine Laufzeit-Route für Mail-Bilder bauen.
- **Bilder unter `public/`:** vor dem Commit zu WebP (`cwebp -q 80`). PNG bleiben `favicon.ico`, `apple-touch-icon.png`, PWA-Icons, OG-/Twitter-Bilder, Mail-Grafiken und Stripe-Shopbilder.
- **ISR-Cache über mehrere Instanzen:** `cache-handler.cjs` teilt jede Tag-Invalidierung über Firestore `_revalidatedTags/shared` und setzt sie bei jedem Aufruf neu. Ohne ihn erreicht der Sanity-Webhook nur die Instanz, auf der er landet.
- **CSP läuft als `Report-Only`** (`next.config.ts`), nicht als „enforced“ beschreiben.
- **i18n:** DE auf `/`, EN auf `/en/...`. Interne Links immer über den `Link` aus `i18n/navigation.ts`.
- **Zwei tsconfigs:** `tsconfig.json` gehört zu `.next`, `tsconfig.verify.json` zu `.next-verify`; `next.config.ts` wählt anhand von `NEXT_DIST_DIR`. Nie beide Dist-Dirs in eine `include` schreiben, sonst fällt `build:isolated` nach gelöschten Routen um.
- **Parallele Arbeit:** Zwei Agents dürfen nicht gleichzeitig HEAD, Stashes oder `.next-verify/` derselben Arbeitskopie verändern; Stashes sind repo-weit. Vor neuer Isolation `git worktree list` prüfen und freie Arbeitskopien wiederverwenden. `./scripts/worktree.sh` legt Worktrees unter `../eat-this-worktrees/` an, neue Branches standardmäßig von `origin/staging`. Entfernen erst nach Prüfung laufender Prozesse und lokaler Änderungen; ein Merge allein macht eine Arbeitskopie nicht frei.

## Gestaltung

Bestehende Komponenten und die `--et-*`-Tokens in `globals.css` sind die Referenz; neue Richtungen erst anhand konkreter Screens ausarbeiten.

- **Knöpfe:** Jeder Text-Knopf trägt die globale Klasse `et-btn` (`globals.css`). Größen `et-btn-sm` / `et-btn-lg`; Varianten `et-btn-alt` (zweite Antwort, auf Fotos), `et-btn-paper` (Papier), `et-btn-tape` (Klebeband), `et-btn-text` (ohne Fläche), `et-btn-map-control` (Map). Module setzen nur Position (Abstand, Breite, Raster), nie Farbe, Form, Schrift oder Hover. Die Farbe kommt aus `--et-solid` / `--et-on-solid` der Fläche. Eigen bleiben Symbol-Knöpfe, Chips, Filter, Sprachwahl und Remy-Chat-Senden.
- **Schrift:** Neue Haas Grotesk Text (Adobe-Fonts-Kit `kgb1lmh`, 400/700) für Titel, Bedienung und Lesetext, über `--et-font-display` / `--et-font-body`.
- **Etiketten:** Text auf Fotos und kleine Zwischentitel über `et-label` / `et-label-paper` / `et-label-title`, immer gerade, nie schief. Fotos werden für Text nie abgedunkelt.
- **Keine Pfeile oder Chevrons als Richtungszeichen**, auch nicht für Weiter oder externe Links. Ausnahmen: die Lasche, die am Desktop das Listen-Panel der Map klappt, und der Zurück-Pfeil im Spot-Detail der Map (weißer Pfeil ohne Fläche links im Foto, Herz rechts; beim Scrollen übernimmt ihn die feste Leiste).
- **Keine unterstrichenen Wörter oder Links**, auch nicht bei Hover oder Fokus. Interaktion und Fokus über Farbe, Fläche oder eine klare Umrandung kennzeichnen.
- **Design-Originale** (Blender, Fotos, Freisteller) liegen lokal unter `design/` und sind ignoriert, weil das Repo öffentlich ist. Was die App braucht, wird fertig nach `nextjs/public/` exportiert.
- **Figma:** Standarddatei für Mockups, Grafiken, Logos und Booster Packs ist [Eat This](https://www.figma.com/design/p5XEjPCeGlgtXxhreeIgnB/Eat-This), direkt über den offiziellen Figma-MCP; den Link nicht erfragen. Eine genannte Seite oder Node hat Vorrang. Betroffene Frames vor Änderungen lesen.

## Abnahme und Tests

- **Sichtbare Änderungen:** den betroffenen Ablauf vor und nach dem Umbau auf einem schmalen Telefon und am Desktop prüfen. Schrift, Abstände, Bildausschnitt, Fokus und leere/ladende Zustände gehören dazu. Animationen mit und ohne Reduced Motion prüfen; sichtbare Inhalte dürfen nicht auf eine Animation oder Hydrierung warten.
- **Browserprüfung:** `npm run build:isolated` erzeugt den Produktionsstand für `test:e2e` und `audit:preview` (Port 3100). Einmalig `npx playwright install chromium webkit`. `E2E_BASE_URL` nur setzen, wenn bewusst ein laufender Server geprüft werden soll; im Bericht Dev- und Produktionsmessungen unterscheiden. Screenshots und Traces bleiben unter `/tmp/eat-this-*`.
- **Live-Tests im eingebauten Browser:** zuerst [`/no-count`](https://www.eatthisdot.com/no-count) öffnen. Fehlt `eatthis_nocount=1`, „Nicht mitzählen“ aktivieren, neu laden und „Dieser Browser wird nicht mitgezählt.“ bestätigen. Der Ausschluss gilt im selben Browserprofil auch für neue Chats.
- **Performance:** Änderungen am selben Seitentyp vor/nachher messen. Budgets melden Überschreitungen als Warnung: Warnungen samt Messwerten berichten, nicht als bestanden darstellen. Feldziele am 75. Perzentil: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1. Lighthouse ist ein Labortest und misst kein echtes INP. `npm run audit:field` liest CrUX-Daten getrennt für Telefon und Desktop (`CRUX_API_KEY`, ersatzweise `GOOGLE_API_KEY`). Wenig Traffic oder fehlende Felddaten als fehlende Evidenz melden. Sentry-Tracing bleibt entfernt; neue Messung nur mit begründetem Datenbedarf und Bundlebudget.

## Inhalte

- **Texte** (Artikel, Spot-Beschreibungen, Tipps, Hub-Texte, SEO-Felder, EN): nach `docs/texte-schreiben.md`, vorher ganz lesen.
- **Must-Eat-Karten** (Figma, neue Karte, Export, Einspielen): nach `docs/must-eat-karten.md`.
- **Content und SEO:** Sanity ist die Inhaltsquelle. Fakten und DE/EN-Fassungen prüfen; Canonicals, hreflang, Sitemap, strukturierte Daten und interne Links am gerenderten Ergebnis kontrollieren.
- **Google-Anbindungen:** vorhandene Adapter `lib/admin/searchConsole.server.ts` und `googleAnalytics.server.ts` nutzen. SEO-Auswertungen über den Konnektor GenieSeo, Massen-URL-Prüfungen über das Dienstkonto.
- **Werkzeuge:** Adobe für Bild und Schrift, Remotion für Video, REA zum Untersuchen von Websites und Apps (`docs/rea.md`). Weitere Plugins nur bei einer nachgewiesenen Lücke.
