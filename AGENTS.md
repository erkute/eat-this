# Eat This

`nextjs/` = die Live-App (Next.js App Router, Firebase App Hosting). `studio/` = Sanity Studio. Neue Branches: `claude/`.

Toter Code wird ersatzlos gelöscht, keine Kompatibilitäts-Shims. Fällt ein Feature weg, geht im selben Commit alles mit: Code, Texte, CSS, Tests, Kommentare, Doku. Danach `typecheck`, `lint`, `audit:css-modules` und `npx knip`. Kommentare beschreiben, was gilt, nicht, was früher war.

## Befehle (aus `nextjs/`)

```
npm test          npm run lint          npm run typecheck      npm run test:e2e
npm run build:isolated     # statt `build`, wenn `next dev` läuft
npm run build:email-art    # Pflicht nach Textänderungen in scripts/build-email-art.mts
npm run build:email-spots  # Spot-Cards der Anmelde-Mail aus Sanity
npm run build:deck-og-art  # Deck-Vorschaubild; nach Änderung an deck.collectLabel/collectBody oder den offenen Karten
npm run build:basemap      # beide Map-Paletten
```

## Deploy

**Code-Review ist Pflicht, vor jedem Commit und Push:** Änderungen gegen die Anforderungen und diese Regeln prüfen, Befunde beheben, Korrekturen erneut prüfen. Das Ergebnis vor dem Push kurz berichten.

| Branch    | Firebase-Projekt         | URL                                                                       |
| --------- | ------------------------ | ------------------------------------------------------------------------- |
| `main`    | `eat-this-8a13b`         | https://www.eatthisdot.com                                                |
| `staging` | `eat-this-staging-8a13b` | `…--eat-this-staging-8a13b.us-central1.hosted.app` (Basic Auth + noindex) |

- **Weg:** Feature-Branch → PR nach `staging` → PR `staging → main`. Kleinkram (Doku, Texte, Einzeiler) direkt auf `staging`.
- **Feature-PR** erst mergen, wenn alle Checks grün sind.
- **„Bring das live“:** PR `staging → main` öffnen und `gh pr merge <nr> --merge --auto` setzen.
- **„Live“ melden** erst, wenn am Merge-Commit auf `main` der Rollout-Check von App Hosting grün ist (`/deploy-verify`). Status nie weiter melden, als er belegt ist.
- **Nie** den Pre-Push-Hook mit `--no-verify` umgehen. Bei `firebase`-Befehlen immer `--project` setzen; Firestore-Regeln und Sanity Studio werden separat deployt.

## Gewollte Produktlogik (nicht „reparieren“)

- **Startseite:** Hero mit offenem, statischem Kartenfächer sofort anzeigen. Der Cookie-Dialog erscheint unabhängig davon. Remy bleibt als Figur und Chat auf der Seite.
- **Must Eat aufdecken:** Angemeldet gibt `POST /api/must-eat-reveal` jede Karte frei, ohne Kauf und ohne Standortprüfung auf dem Server; die 50 m misst nur der Browser. Gebremst wird über das Ratenlimit je Konto (10/min, 15/Tag).
- **Verdeckte Karte ohne Konto:** Der Tipp lässt die Karte kurz zittern und öffnet dann das Login-Modal im Starter-Modus, ohne Zwischenschritt. Die Erklärfolien (`MustEatsOnboarding`) kommen nur per „Wie funktioniert's?“, nie von selbst.
- **Herzen:** `api/heart` schreibt Favorit und `heartCount` in einer Admin-Transaktion. Der Client schreibt den Zähler nie.
- **Bestenlisten** kommen aus `topSpots` in Sanity; unter drei gültigen Einträgen entfällt die Liste.
- **E-Mail-Link-Login:** Die Adresse kommt aus `emailForSignIn` oder erneuter Eingabe, nie aus Link-Parametern. Geschützte Routen prüfen mit Widerrufsprüfung.

## Was sonst kaputtgeht

- **CSS:** `globals.css` lädt vor den Modulen. Zwischen zwei Modulen ist die Reihenfolge nicht festgelegt: dort nie mit gleicher Spezifität überschreiben.
- **Hell und Dunkel gelten appweit, einschließlich Map.** UI-Flächen und Schrift nutzen `--et-ground` / `--et-fg`; `--et-ink` / `--et-white` bleiben feste Markenfarben für Fotos und Artwork.
- **Mails:** Gmail lädt keine Webfonts und entfernt `position:absolute` und `transform`, darum wird alles Gestaltete lokal zu Bildern gerendert (`build:email-art`, `build:email-spots`). Der CTA bleibt ein echter Link mit gelber Fläche; nur sein Wort ist ein Bild, mit Alt-Text. Die Markenschrift (`assets/fonts/`, per `sync:brand-font`) darf nicht ins Repo oder auf den Server, also nie eine Laufzeit-Route für Mail-Bilder bauen.
- **Bilder unter `public/`:** vor dem Commit zu WebP (`cwebp -q 80`). PNG bleiben Favicon und App-Icons, OG-Bilder, Mail-Grafiken und Stripe-Shopbilder.
- **CSP läuft als `Report-Only`**, nicht als „enforced“ beschreiben.
- **i18n:** DE auf `/`, EN auf `/en/...`. Interne Links immer über den `Link` aus `i18n/navigation.ts`.
- **Zwei tsconfigs:** `tsconfig.json` gehört zu `.next`, `tsconfig.verify.json` zu `.next-verify`. Nie beide Dist-Dirs in eine `include` schreiben.
- **Parallele Arbeit:** Zwei Agents dürfen nicht gleichzeitig dieselbe Arbeitskopie verändern. Eigene Kopie per `./scripts/worktree.sh <branch>` (Repo-Wurzel), vorher `git worktree list` prüfen.

## Gestaltung

Bestehende Komponenten und die `--et-*`-Tokens in `globals.css` sind die Referenz.

- **Knöpfe:** Jeder Text-Knopf trägt `et-btn`, dazu Größen und Varianten aus `globals.css`. Module setzen nur Position, nie Farbe, Form, Schrift oder Hover. Eigen bleiben Symbol-Knöpfe, Chips, Filter, Sprachwahl und Remy-Chat-Senden.
- **Schrift:** Neue Haas Grotesk Text (Adobe-Fonts-Kit `kgb1lmh`), über `--et-font-display` / `--et-font-body`.
- **Etiketten:** Text auf Fotos über `et-label*`, immer gerade. Fotos werden für Text nie abgedunkelt.
- **Keine Pfeile oder Chevrons als Richtungszeichen.** Ausnahmen: die Lasche des Map-Panels am Desktop und der Zurück-Pfeil im Spot-Detail der Map.
- **Keine unterstrichenen Wörter oder Links**, auch nicht bei Hover oder Fokus; stattdessen Farbe, Fläche oder klare Umrandung.
- **Design-Originale** liegen lokal unter `design/` (ignoriert, das Repo ist öffentlich). Standard-Figma-Datei: [Eat This](https://www.figma.com/design/p5XEjPCeGlgtXxhreeIgnB/Eat-This).

## Abnahme

- **Sichtbare Änderungen** vorher und nachher auf schmalem Telefon und Desktop prüfen, Animationen mit und ohne Reduced Motion. Inhalte dürfen nicht auf eine Animation oder Hydrierung warten.
- **Browsertests:** `npm run build:isolated`, dann `test:e2e` oder `audit:preview` (Port 3100). Einmalig `npx playwright install chromium webkit`.
- **Live-Tests im Browser:** zuerst [`/no-count`](https://www.eatthisdot.com/no-count) öffnen und „Nicht mitzählen“ aktivieren, falls noch nicht geschehen.
- **Performance:** vor/nachher am selben Seitentyp messen. Budget-Warnungen samt Werten berichten, nicht als bestanden darstellen. Feldziele: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 (`npm run audit:field`).

## Inhalte

Sanity ist die Inhaltsquelle. Entwürfe anlegen ja, veröffentlichen nur auf Ersans „setz das live“; danach DE und EN abrufen, bevor „live“ gemeldet wird. Fakten müssen belegt sein. Eine Stilanleitung für Texte gibt es derzeit bewusst nicht. Must-Eat-Karten: `docs/must-eat-karten.md`.
