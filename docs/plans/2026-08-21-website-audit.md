# Website-Audit — Befunde und Vorgehen

Stand: 21.08.2026 · Basis: `main` @ cd5c23d9 · Live-Messungen gegen www.eatthisdot.com

Eine Session reicht nicht. Dieses Dokument ist deshalb zweigeteilt: **wie** man
sich durch das Thema arbeitet (Abschnitt 1) und **was** der erste Durchgang
gefunden hat (Abschnitt 2–4). Abschnitt 5 hält fest, was nach dem Rollout in Produktion ankam; Abschnitt 6 schneidet die Arbeit in Sessions.

**Fortschritt:** Session A bis E erledigt (PR #425).

---

## 1. Vorgehen

Die Regel für alles hier: **erst messen, dann anfassen.** Der Code ist in
gutem Zustand — die Versuchung, „aufzuräumen", produziert hier mehr Risiko als
Gewinn. Jeder Befund unten hat einen reproduzierbaren Beleg, und jeder Fix
braucht denselben Beleg danach noch einmal.

### Die sechs Messschnitte

| #   | Schnitt          | Werkzeug                                                  | Was er beantwortet                             |
| --- | ---------------- | --------------------------------------------------------- | ---------------------------------------------- |
| 1   | Repo-Hygiene     | `git worktree list`, `git branch`, `du -sh`               | Was liegt herum und kostet nichts als Platz?   |
| 2   | Build-Gesundheit | `npm run build:isolated`, `npm run typecheck`, `npm test` | Ist das Deploy-Gate überhaupt grün?            |
| 3   | Toter Code       | Skripte unten                                             | Was ist geschrieben, aber nie ausgeliefert?    |
| 4   | Bundle           | `.next-verify/app-build-manifest.json` + `gzip -c`        | Was zahlt _jeder_ Besucher, auf _jeder_ Seite? |
| 5   | Auslieferung     | `curl -sI` gegen Produktion                               | Was passiert zwischen Cloud Run und Browser?   |
| 6   | Nutzererlebnis   | Lighthouse CI (siehe unten)                               | Wie fühlt sich das Ergebnis am Gerät an?       |
| 7   | Inhalt           | `npx tsx scripts/content-lint.ts`                         | Wo fehlen Pflege-Felder?                       |

Schnitt 4, 5 und 6 sind die, die tatsächlich Ladezeit bewegen. Schnitt 3 bewegt
Wartbarkeit, nicht Performance — nicht verwechseln.

### Schnitt 6 muss man nicht bauen — er läuft schon

`.github/workflows/lighthouse.yml` misst bei jedem `main`-Push die **echten
Produktions-URLs** dreimal durch, mit Schwellen aus `.lighthouserc.json`. Das
ist die fertige Vorher-/Nachher-Messung für die Sessions B, C und D; niemand
muss dafür etwas Neues aufsetzen. Ergebnisse holt man sich mit:

```bash
gh run list --workflow=lighthouse.yml --limit 5
gh run view <id> --log | grep -A3 'warning for'
```

Zwei Dinge dabei im Kopf behalten: die Werte sind Lighthouse-Simulation mit
gedrosseltem Mobilnetz, nicht gemessene Nutzer — und Performance ist dort nur
`warn`, blockiert also nichts.

### Die Skripte

Die Dead-Code-Analysen liegen bewusst nicht im Repo (Einmal-Werkzeug, kein
Produktionscode). So werden sie reproduziert:

**Vorher aber:** für CSS gibt es im Repo bereits das schärfere Werkzeug.
`scripts/audit-css-cascade.mjs` findet Deklarationen, die eine spätere Regel
überschreibt, und `scripts/cascade/` (README, Selbsttest, Playwright-Anbindung)
macht aus so einem Verdacht einen Beweis — per Computed-Style-Sweep über
Viewports × die 24 `[data-map-body]`-Zustände × jede Klasse eines Moduls, mit
`prune.mjs` zum Entfernen. Meine Analyse unten arbeitet auf Klassen*namen*, die
dort auf Deklarationen _innerhalb_ lebender Regeln. Für Session E ist das
Repo-Werkzeug das bessere. (Es ist mir im ersten Durchgang entgangen, weil
meine Scans über `.ts`/`.tsx` liefen und diese Dateien `.mjs`/`.js` sind.)

**Tote CSS-Modul-Klassen.** Pro `*.module.css` die Klassenselektoren
extrahieren, Kommentare / `@keyframes` / `:global(…)` vorher wegschneiden — sonst
zählt man Kommentarreste und fremde Bibliotheksklassen mit (mein erster Lauf
meldete 103 Treffer, davon waren 97 genau das). Dann gegen die tatsächlichen
Importeure prüfen: `styles.foo`, `styles['foo']`, `styles[\`foo${x}\`]`-Präfixe
und `composes:`.

> **Der Fallstrick, der mich erwischt hat (Session E):** Importe müssen über
> **beide** Schreibweisen aufgelöst werden — relativ (`./Foo.module.css`) **und**
> über den `@/`-Alias (`@/app/components/Foo.module.css`). Mein Skript konnte nur
> relativ, und beide Prüfagenten hatten denselben blinden Fleck. Ergebnis:
> `LoginModalOverlay.module.css` galt als verwaist, wird aber von
> `BridgeAuth.tsx:33` per Alias importiert. Erst der Pre-Push-Build hat es
> gefangen. Es ist im ganzen Repo das einzige so eingebundene CSS-Modul — genau
> deshalb fiel es durch.

**Ungenutzte globale Klassen.** `css/style.css` gegen den gesamten Baum aus
`.tsx`/`.ts`/`.module.css` — die globalen `hv-*`-Klassen werden aus CSS-Modulen
heraus per `:global()` referenziert, ein reiner TSX-Scan übersieht das.

**Nicht importierte Dateien.** Alle `.ts`/`.tsx` gegen alle Importe; App-Router-
Einstiegspunkte (`page`, `layout`, `route`, `not-found`, …), `scripts/` und
Tests ausnehmen, sonst ist das Ergebnis Rauschen.

**Ungenutzte Assets.** `public/**` gegen den Baum, dabei **dynamische** Pfade
mitdenken: `og_${slug}.png` und `phone-map-${w}.webp` werden per Template
zusammengesetzt und tauchen nirgends als Literal auf. Erst Stichprobe grep'en,
dann löschen.

### Belegpflicht

Für jeden Fix gilt die Kette aus CLAUDE.md: `committed` → `pushed` → `PR offen`
→ `Rollout erfolgreich` → `smoke-getestet`. Bei Performance-Fixes kommt eine
Stufe davor: **Zahl vorher, Zahl nachher.** „Fühlt sich schneller an" zählt
nicht — `curl -sI` und die Bundle-Tabelle aus dem Build sind die Belege.

---

## 2. Befunde

Sortiert nach Wirkung pro Aufwand, nicht nach Schwere.

### P0 — Das Deploy-Gate ist kaputt

`npm run build:isolated` und `npx tsc --noEmit` schlagen in diesem Worktree
fehl. Nicht wegen des Codes:

```
.next/types/validator.ts(287,39): error TS2307:
  Cannot find module '../../app/api/email/spot-card/route.js'
```

`tsconfig.json` nimmt **beide** Dist-Verzeichnisse in `include` auf:

```json
".next-verify/types/**/*.ts",
".next/types/**/*.ts",
```

`build:isolated` schreibt nach `.next-verify/` und regeneriert dort die
Route-Validatoren — `.next/types/validator.ts` bleibt aber auf dem Stand des
letzten `next dev`. Seit Commit 4732394f („Spot-Cards vorrendern statt zur
Laufzeit bauen") die Route `/api/email/spot-card` entfernt hat, zeigt dieser
alte Validator auf ein Modul, das es nicht mehr gibt.

**Warum das teuer ist:** der `pre-push`-Hook ist das einzige Gate vor einem
App-Hosting-Rollout und ruft genau `build:isolated`. In jeder Arbeitskopie mit
altem `.next` blockiert er jeden Push mit einem Fehler, der nichts mit dem Push
zu tun hat. Der naheliegende Ausweg ist `--no-verify` — den CLAUDE.md verbietet.

**Beleg des Zusammenhangs:** nach `rm -f .next/types/validator.ts` lief derselbe
Build sauber durch (Exit 0). Eine Gegenprobe mit einem `tsconfig` ohne
`.next/types/**/*.ts` war ebenfalls fehlerfrei.

**Fix:** `.next/types/**/*.ts` aus `include` nehmen. Next trägt für den jeweils
aktiven Dist-Ordner selbst ein, was der Typecheck braucht; der zweite,
inaktive Ordner ist per Definition veraltet. Danach beide Builds fahren
(`build` _und_ `build:isolated`), um zu zeigen, dass keiner Typinformation
verliert.

**Aufwand:** eine Zeile. **Risiko:** gering, aber Typecheck-Abdeckung nachweisen.

### P1 — Das CDN cacht kein einziges HTML-Dokument

Jede Seite, auch die 686 vorgerenderten Restaurant-Seiten:

```
cache-control: max-age=0, must-revalidate, no-cache, no-store, private
cdn-cache-status: miss
set-cookie: NEXT_LOCALE=de; Path=/; Max-Age=31536000
```

`cdn-cache-status: miss` — bei jedem Abruf, auch beim zweiten hintereinander.
Gemessene TTFB aus Berlin:

| Seite                       | TTFB       | Rendering                         |
| --------------------------- | ---------- | --------------------------------- |
| `/news/drei-doener-berlin`  | 0,37 s     | ISR, `revalidate = 3600`          |
| `/`                         | 0,48 s     | `force-dynamic`                   |
| `/map`                      | 0,49 s     | `force-dynamic`                   |
| `/must-eats`                | 0,53 s     | `force-dynamic`                   |
| `/restaurant/cafe-botanico` | **0,97 s** | vorgerendert, `revalidate = 3600` |

Die langsamste Seite ist die, die eigentlich fertig auf der Platte liegt.

Der Lighthouse-CI-Lauf vom selben Tag (Run `32518436983`, drei Durchgänge je
URL gegen Produktion) zeigt, was davon am Gerät ankommt:

| URL                             | LCP     | Sonstiges                                   |
| ------------------------------- | ------- | ------------------------------------------- |
| `/`                             | 4383 ms | über der 4000-ms-Schwelle                   |
| `/map`                          | 5588 ms | Performance-Score **0,48**, TBT **2619 ms** |
| `/news`                         | 4463 ms |                                             |
| `/en/guides/beste-pizza-berlin` | 4510 ms |                                             |
| `/restaurant/engelbecken`       | —       | einzige Seite ohne Warnung                  |

Vier von fünf gemessenen Seiten reißen die LCP-Schwelle. Das sind
Lighthouse-Simulationswerte mit gedrosseltem Mobilnetz, keine echten Nutzer —
aber sie decken sich mit beiden P1-Befunden: TTFB, den kein CDN abfängt, plus
ein JS-Sockel, der auf `/map` 2,6 Sekunden blockiert.

> **Korrigiert am 21.08.2026 (Session B).** Die unten stehende Cookie-Diagnose
> ist richtig, aber sie ist nicht die Ursache — sie ist ein zweiter, kleinerer
> Blocker hinter einem viel größeren. Siehe **P0-neu** direkt darunter.

### P0-neu — Keine einzige Seite wird statisch erzeugt

Der Build meldet „Generating static pages (811/811)" und markiert ~750 Pfade
als `●` (SSG). Auf der Platte landet davon **nichts**:

```bash
find .next/server/app -name '*.html' | wc -l     # → 0
node -e "console.log(Object.keys(require('./.next/prerender-manifest.json').routes))"
# → [ '/robots.txt', '/sitemap.xml', '/llms.txt' ]
```

Drei statische Routen, alle drei Route-Handler. **Keine Seite.** Die
Verzeichnisse (`.next/server/app/de/restaurant/` …) werden angelegt und bleiben
leer. Jeder einzelne Seitenaufruf wird in Cloud Run neu gerendert — deshalb
`no-store`, deshalb `cdn-cache-status: miss`, und deshalb ist ausgerechnet die
vorgerenderte Restaurantseite mit 0,97 s die langsamste der Messung.

`next build --debug` nennt den Grund, 791-mal:

```
Error: Static generation failed due to dynamic usage on /de/restaurant/aris, reason: headers
    at get requestLocale [as requestLocale] (.next/server/chunks/5655.js:5:49958)
```

Der Stacktrace zeigt auf **next-intls `requestLocale`**, das auf `headers()`
zurückfällt. Betroffen ist alles: 688 Restaurantseiten, 36 Bezirke, 20 Packs,
20 Kategorien, 14 News — und eine zur Kontrolle angelegte Probe-Seite, die
nichts enthält außer `<p>probe</p>`.

**Was nachweislich NICHT die Ursache ist** (jeweils vollständig entfernt und neu
gebaut, damit die nächste Session das nicht wiederholt):

| Verdacht                                          | Ergebnis                            |
| ------------------------------------------------- | ----------------------------------- |
| `NEXT_LOCALE`-Cookie im Rewrite-Pfad              | `Set-Cookie` weg, `no-store` bleibt |
| Middleware (Datei komplett entfernt)              | unverändert                         |
| Sentry (`withSentryConfig` komplett entfernt)     | unverändert                         |
| `clientTraceMetadata` (Sentrys Trace-Meta-Tags)   | Tags weg, unverändert               |
| `setRequestLocale` in `generateMetadata` ergänzt  | unverändert                         |
| Root-Layout, `instrumentation.ts`, `cacheHandler` | unauffällig                         |

**Gefunden und behoben.** Ein einziges `<Link>` aus `@/i18n/navigation` in
`app/components/NotFoundContent.tsx`. Die Datei ist eine **Server**-Komponente,
und `not-found.tsx` hängt im Baum **jeder** Route — next-intls `Link` löst dort
die Locale über die Request-Config auf und liest dabei `headers()`. Ein
einziger `headers()`-Zugriff irgendwo im Baum macht die ganze Route dynamisch.

Der Beweis kam durch Herausnehmen: Build ohne `app/not-found.tsx` → dynamische
Fehler von 791 auf 10, vorgerenderte HTML-Dateien von 0 auf 791. Die
Nachbarkomponenten (`SiteNav`, `SiteFooter`, `BurgerDrawer`) nutzen dasselbe
`Link`, sind aber Client-Komponenten — deren Lookup läuft im Browser und ist
harmlos. `NotFoundContent` war die einzige Server-Komponente in der Kette.

**Fix:** plain `<a>` mit selbst gebautem Präfix (`locale === 'en' ? '/en'+href
: href`). Die Locale ist dort ohnehin ein Prop, wird also nie erschlossen.
Kosten: die drei 404-Links machen einen vollen Seitenwechsel statt Soft-Nav —
auf einer 404-Seite die richtige Abwägung.

**Ergebnis, gemessen am Standalone-Server:**

```
vorher:   cache-control: private, no-cache, no-store, max-age=0, must-revalidate
          (kein x-nextjs-cache-Header — der Prerender-Cache wurde nie gefragt)

nachher:  x-nextjs-cache: HIT
          cache-control: s-maxage=3600, stale-while-revalidate=31532400
```

790 vorgerenderte Seiten statt 0. Die verbliebenen 10 dynamischen Routen sind
exakt die gewollten: `/map`, `/must-eats`, `/profile`, `/checkout` × 2 Sprachen.

**Der Fehler war unsichtbar** — der Build meldet weiter „Generating static pages
(811/811)" und markiert die Routen weiter `●`. Nur das leere
`.next/server/app/**` und ein prerender-manifest mit drei Einträgen verraten
ihn. Dagegen steht jetzt
`__tests__/app/not-found-keeps-pages-static.test.ts`: er verbietet
locale-auflösende Server-Importe im Root-404-Baum. Beim ersten Lauf hat er
sofort eine zweite Stelle gemeldet (`app/[locale]/not-found.tsx` nutzt
`getLocale()`) — die ist nachweislich harmlos, weil `[locale]/layout.tsx`
vorher `setRequestLocale()` aufruft; der Test hält diese Unterscheidung fest.

**Noch offen:** EN-Seiten setzen weiterhin `NEXT_LOCALE` (das macht next-intls
eigene Middleware, nicht unsere) und bleiben damit für den CDN uncachebar. DE
ist der Großteil des Traffics; EN wäre ein eigener, kleiner Schritt.

---

**Nachgelagerte Ursache (bleibt gültig):** [`middleware.ts:233`](nextjs/middleware.ts:233)
setzt auf dem DE-Rewrite-Pfad — also bei praktisch jedem Seitenaufruf —
`NEXT_LOCALE`. Eine Antwort mit `Set-Cookie` ist für den App-Hosting-CDN
grundsätzlich nicht cachebar. Auch wenn das Prerendering repariert ist, muss
dieser Cookie weg, sonst cacht der CDN weiterhin nichts.

**Und der Cookie hat dort keine Funktion.** `routing.ts` setzt
`localeDetection: false`, next-intl liest ihn also gar nicht. Gelesen wird er
nur von Client-Code (`app/welcome/page.tsx:37`, `lib/i18n/I18nContext.tsx:53`) —
und `I18nContext` setzt ihn beim Sprachwechsel selbst. Die beiden anderen
Stellen in der Middleware (`?lang=`-Redirect Zeile 166, `/de/…`-Redirect Zeile 220) sind die, die ihn wirklich brauchen; die auf dem Rewrite-Pfad ist reine
Kosten.

**Fix in zwei Schritten, nicht in einem:**

1. Das `res.cookies.set` auf dem Rewrite-Pfad streichen. Danach prüfen, ob
   `cdn-cache-status` bei ISR-Seiten auf `hit` geht.
2. Falls nicht: explizite `Cache-Control`/`CDN-Cache-Control` für die
   ISR-Routen setzen. **Nur** für die — `/`, `/map`, `/must-eats`, `/profile`
   sind `force-dynamic` und teils nutzerabhängig, die müssen `private` bleiben.

**Aufwand:** klein. **Risiko:** mittel — Cache-Header falsch gesetzt heißt im
schlimmsten Fall, dass ein eingeloggter Nutzer eine fremde Seite sieht. Das
gehört auf Staging verifiziert, mit und ohne Session, bevor es auf `main` geht.

### P1 — Der JS-Sockel: 188 kB auf jeder Seite ✅ **behoben, PR #425**

> **Korrigiert am 22.08.2026 (Session C).** Die Überschrift hier hieß „127 kB
> gzip Sentry auf jeder einzelnen Seite" und die Zahl war falsch. Der Chunk
> ist nicht Sentry, er enthält ihn nur.

Ausgangslage:

```
+ First Load JS shared by all             188 kB
  ├ chunks/7327-…                         130 kB
  ├ chunks/c34fc056-…                     54,4 kB   ← React
  └ other shared chunks                   3,97 kB
```

Der Chunk lädt laut `app-build-manifest.json` in **58 von 58** Routen und
steht in `rootMainFiles` — Startpfad, nicht nachgelagert.

**Was Sentry wirklich kostet.** Nur ein Build entscheidet das, und drei
Schätzungen lagen daneben: mein Audit sagte 127 kB, zwei unabhängige
Analysen 32,7 und 56,8 kB. Gemessen, mit neutralisiertem
`instrumentation-client.ts` und Error-Boundaries ohne Sentry-Import:

| Variante                            | Shared First Load | `/map`     |
| ----------------------------------- | ----------------- | ---------- |
| vorher                              | 188 kB            | 341 kB     |
| **Tracing tree-shaken (umgesetzt)** | **137 kB**        | **291 kB** |
| Client-Sentry ganz raus             | 105 kB            | 260 kB     |

Der echte Sentry-Anteil ist also **83 kB**, nicht 127. Umgesetzt wurde die
mittlere Variante: **51 kB weniger auf allen 43 Routen**, Fehlerberichte
vollständig erhalten.

**Der Schalter, der nicht wirkte.** Die alte Konfiguration nutzte
`bundleSizeOptimizations` und behauptete im Kommentar, damit den Sentry-Chunk
zu trimmen. In `@sentry/nextjs` 10.57.0 liest aber nur `webpack.treeshake` die
Flags, die den DefinePlugin füttern (`setupTreeshakingFromConfig`,
`build/cjs/config/webpack.js:549`) — und die Namen sind andere:
`removeTracing`, nicht `excludeTracing`. Ein Vergleichsbuild mit und ohne den
alten Block ergab beide Male 137 kB; er ist ersatzlos raus.

Weil Next die Webpack-Konfiguration für Client, Server **und** Edge ausführt,
greift `removeTracing` in allen drei Bundles. `tracesSampleRate` ist damit
überall wirkungslos und fliegt aus allen drei Sentry-Configs; ebenso der
Export `onRouterTransitionStart`, der auf das weggeshakete
`captureRouterTransitionStart` zeigte.

**Was verloren geht:** Performance-Traces, Transactions, Web Vitals in Sentry,
Trace-Header auf eigene API-Aufrufe. Bei `tracesSampleRate: 0.1` und dem
aktuellen Traffic war das nie ein brauchbares Sample — und die Lighthouse-CI
misst Web Vitals bei jedem `main`-Push gegen Produktion.

Die Lücke ist real und nachgezählt: `useReportWebVitals`, `web-vitals`,
`onLCP`, `onINP`, `onCLS`, `onFCP`, `onTTFB` haben in `app/` und `lib/`
zusammen **0 Treffer**. Es gibt also keine zweite Quelle im Code — die
Lighthouse-CI ist ab jetzt die einzige. Wer echte Feldwerte statt
Labormessungen braucht, muss sie eigens aufsetzen (Next liefert dafür
`useReportWebVitals`, das die Daten an `/api/count` schicken könnte).

**Was bleibt:** `captureException`, Breadcrumbs, Stacktraces,
Sourcemap-Auflösung, serverseitiges Sentry inklusive `onRequestError` und der
17 manuellen Aufrufe in den API-Routen.

**Nicht-Befund, geprüft:** Der `/monitoring`-Tunnel funktioniert. Eine Analyse
hielt ihn für von der Middleware abgefangen und schloss daraus, Client-Sentry
melde ohnehin nichts. Gegen Produktion geprüft: mit der echten Org-ID kommt
eine `401` von Sentrys Ingestion, mit falscher eine `404`, per GET eine `404`.
Der Tunnel greift — und er ist die einzige CSP-konforme Sendeadresse, denn
`connect-src` enthält keinen Sentry-Host.

**Nicht-Befund, geprüft:** Der Polyfill-Chunk (39 kB) trägt `noModule` —
moderne Browser laden ihn nie. Dort ist nichts zu holen.

**Offen geblieben:** Der vollständige Übersetzungskatalog steckt im
RSC-Payload jeder Seite. Die Startseite ist 36,8 kB gzip, `translations.ts`
allein 9,2 kB gzip für beide Sprachen. next-intl kann Namespaces selektiv
ausliefern — eigener, kleiner Schritt.

### P2 — Eine tote Subquery, zweimal berechnet ✅ **behoben, PR #425**

> **Korrigiert am 22.08.2026 (Session D).** Der Befund hieß hier „Startseite
> zieht 339 Restaurants für einen Spot des Tages" und schlug vor, die Auswahl
> nach GROQ zu verlagern. Das Problem war ein anderes — und billiger zu lösen.

`pickSpotOfDay` liest **ausschließlich** `featuredOnDate`, `_id` und die
Kandidatenzahl (`lib/home/pickSpotOfDay.ts:15-23`). `featured` und
`mustEatCount` standen im Interface, wurden in **beiden** Queries berechnet —
`mustEatCount` als korrelierte Subquery über alle 339 Restaurants,
in `getHomeData.ts:35` und noch einmal in `spotOfDay.server.ts:11` — und in
keiner Verzweigung je gelesen. Die Studio-Beschreibung
(`studio/schemaTypes/restaurant.js:65`) behauptet noch die alte Semantik; die
Doku war dem Code hinterher.

Der Fix ist damit keine Query-Verlagerung mit Risiko für getestete
Auswahllogik, sondern eine **ersatzlose Streichung**. Gemessen gegen die
Sanity-API: Antwort 33 → 21 kB, Laufzeit im Rauschen leicht besser.

**Noch offen:** Die Präsentationsfelder (`name`, `slug`, `image`, `district`,
`sub`) braucht nur der Gewinner, nicht alle 339. Das wäre ein zweiter Schritt
mit zwei Queries — mehr Risiko, kleinerer Gewinn. **Nebenbedingung dabei:** der
Kandidatenfilter muss eine Teilmenge von `mapRestaurantsQuery`
(`lib/map/queries.ts:21`, `isOpen != false`) bleiben, sonst findet
`applySpotOfDayReveal` den Spot nicht und die Map-Freigabe fällt still aus.

### P2 — Doppelte Bildoptimierung auf der Startseite ✅ **behoben, PR #425**

`HubNearby` rendert Sanity-Bilder über `next/image`. Die URL ist zu dem
Zeitpunkt bereits `…?w=600&auto=format&q=80` (mapCard-Preset) — Sanitys CDN hat
das Bild fertig. Next schickte es trotzdem durch den App-Hosting-Optimizer,
also durch Cloud Run.

Die Nachbarkomponenten machen es anders und begründen es im Code:

> _„Deliberately bypass the App Hosting image proxy: Sanity serves the
> responsive, format-negotiated variants directly."_ — `HubSection.tsx`

**Korrektur:** `HubNearby` war nicht der einzige Ausreißer. Beim Nachmessen am
laufenden Produktionsserver blieben nach dem Umbau noch drei Bilder übrig —
`MagazineGrid.tsx:43` machte dasselbe. Beide sind jetzt umgestellt.

Gemessen am gebauten Server: **Sanity-Bilder durch den Proxy 7 → 0.** Die zwölf
lokalen Assets laufen weiter korrekt über den Optimizer.

### P2 — OG-Bilder sind 460–685 kB PNG ✅ **behoben, PR #425**

Neun Kategorie-Share-Cards, zusammen 4,60 MB, als unquantisierte 24-Bit-PNGs.
CLAUDE.md nimmt OG-Bilder bewusst von der WebP-Regel aus — richtig, viele
Social-Crawler mögen kein WebP. Aber _PNG bleiben_ heißt nicht _unkomprimiert
bleiben_.

`pngquant` ist auf dem Rechner nicht installiert, `sharp` liegt als
Next-Abhängigkeit ohnehin im Baum und kann dasselbe:
`sharp(x).png({ palette: true, quality: 100, effort: 10 })`. Es sind flache
Illustrationen, also greift Palettenquantisierung fast verlustfrei.

**Ergebnis: 4,60 → 1,73 MB (62 %),** RMSE 1,2–1,4 auf einer 0–255-Skala,
schlechtester Fall zusätzlich im direkten Bildvergleich angesehen — kein
sichtbarer Unterschied.

**Nebenbefund:** Zwei Routen liefern dieselben neun Dateien mit je eigener
Version aus — `kategorie/[slug]` über ein lokales `PACK_OG_VERSION`,
`guides/[slug]` über ein hartkodiertes `?v=2`. Beide standen zufällig auf 2,
was genau die Art Drift ist, die unsichtbar bleibt, bis eine der beiden sich
bewegt. Jetzt eine Konstante `OG_PACK_VERSION` in `lib/constants.ts`, mit Test.

### P3 — `<Image>` ohne `sizes` ✅ **behoben, PR #425**

> **Korrigiert am 22.08.2026 (Session D).** Hier stand: „Ohne `sizes` nimmt
> Next `100vw` an." Das gilt **nur für `fill`-Bilder**. Bei numerischem `width`
> erzeugt Next x-Deskriptoren aus `[width, width*2]`
> (`node_modules/next/dist/shared/lib/get-img-props.js`, Funktion `getWidths`).

Die Schlussfolgerung stimmte trotzdem, und der Effekt ist größer als gedacht.
Das Hero-Pack der Guide-Seiten hat `width={420}` und lieferte damit fix
`640w 1x, 1080w 2x` — auf Retina also **169 kB für einen Slot, der nie breiter
als 270 px rendert**, wo 640w (**87 kB**) reicht. Auf der Kategorie-Übersicht
dreimal dasselbe, alle drei mit `priority` vorgeladen.

Gesetzt wurden fünf `sizes`. **Zwei bewusst nicht:** die Payment-Logos in
`pack/[slug]:102` und `packs:163` sind konstant 70 px breit und bekommen heute
`w=96`/`w=256`. Ein `sizes` würde ihnen die volle 16-stufige Leiter geben —
eine Verschlechterung, keine Verbesserung.

**Noch offen:** Die Payment-Logo-Quellen sind selbst nur 70×48 px und bleiben
auf Retina unscharf. Das heilt kein `sizes`, nur ein größeres Ausgangsbild.
Ebenfalls offen: das Guide-Hero-Pack trägt `priority`, obwohl es dekorativ ist
(`alt=""`, Container `aria-hidden`) — es konkurriert im Preload mit echten
LCP-Ressourcen. Mit `sizes` ist der Preload jetzt 640w statt 1080w; ob
`priority` dort überhaupt gerechtfertigt ist, wäre separat zu prüfen.

Nebenbei geprüft und **kein** Befund: die `w=3840`-Einträge im Live-HTML sind
nur das letzte Glied des srcset.

### P3 — Reste des entfernten `/login`-Routes ✅ **behoben, PR #425**

`LoginPanel.tsx` sagt selbst:

> _„The standalone /login route that rendered a second, older full-page variant
> of this panel is gone."_

Entfernt wurden fünf tote Klassen in `LoginPanel.module.css` — alle als
**Alias-Selektoren in Gruppenregeln**, nicht als eigene Regeln: `.page` neben
`.frame`, `.loginGrid` neben `.modalSimple` (dreimal, inklusive zweier Media
Queries), `.formPanel` neben `.modalLogin` (zweimal), `.form` neben
`.modalForm`, und `.menuList span/strong` neben `.toLabel`. Dazu in
`LoginPanel.tsx` der `useRouter`-Import samt `const router` und der
`TOAST_HANDOFF_KEY`-Import.

**Korrektur:** `LoginModalOverlay.module.css` stand hier als „wird nirgends
importiert". Das war falsch — `BridgeAuth.tsx:33` importiert es über den
`@/`-Alias und nutzt `modalStyles.overlay` in Zeile 104. Die Löschung wurde
zurückgenommen; siehe den Fallstrick in Abschnitt 1.

### P3 — Tote Regel in der globalen `style.css` ✅ **behoben, PR #425**

`.homeV2 .hv-link` (`css/style.css:893`) wird von keinem Element getragen. Der
einzige Treffer auf `hv-link` im Code ist eine Test-Zusicherung, dass die Klasse
eben **nicht** im Markup steht. Nicht zu verwechseln mit `.hv-link-underline`,
das `ProfilePacks` nutzt — anderer Klassenname, bleibt.

`CSS_VERSION` auf 310 gehoben und `style.min.css` neu gebaut, wie CLAUDE.md es
verlangt.

### P3 — Ungenutzte Assets: acht statt drei ✅ **behoben, PR #425**

Das Audit nannte drei. Die Reste-Suche fand fünf weitere:

```
240 KB  public/pics/about/0477e049b54b21c5fb7ea43d5a97ac2b.webp
 48 KB  public/pics/eat-email.png
 16 KB  public/pics/eat.webp
 12 KB  public/pics/icon-news.webp
 12 KB  public/pics/logo-red.webp
  8 KB  public/pics/icon-burger.webp
  8 KB  public/pics/icon-map.webp
  8 KB  public/pics/icons/standort.webp   (Verzeichnis danach leer)
```

Selbst gegengeprüft: exakte Pfadsuche über `nextjs/`, `studio/`, `docs/` und
`.github/`, plus `manifest.json`. Bei `eat.webp` und `icon-news.webp` liefert
`git log -S` **überhaupt keinen Commit** — sie wurden nie von Code referenziert.
Bei den anderen ließ sich der Commit benennen, der die letzte Referenz entfernt
hat. Die Roh-Treffer auf „eat" und „standort" waren Namensartefakte
(`NotificationToast` spricht von Standort, nicht vom Icon).

Nebenbei erledigt sich der einzige Verstoß gegen die WebP-Regel aus CLAUDE.md:
`eat-email.png`.

### P3 — Lint: 20 Warnungen auf 0 ✅ **behoben, PR #425**

Vier waren echter toter Code: die beiden in `LoginPanel`, `INNER_W` in
`build-email-phones.mts`, und eine `eslint-disable`-Direktive in
`SignupEmail.tsx`, die durch die neue Konfiguration überflüssig wurde (Lint
meldet so etwas selbst — schöner Beleg, dass die Regel greift).

Die übrigen sechzehn waren zwei bewusste Muster, jetzt ehrlich konfiguriert
statt einzeln unterdrückt:

- **E-Mail-Templates können kein `next/image` nutzen.** Gmail hat keine
  Laufzeit, die eine optimierte Komponente hydrieren könnte, und der
  Next-Optimizer ist aus einem Mailclient nicht erreichbar. Override für
  `emails/**`, im selben Stil wie der bestehende für `app/components/map/**`.
- **Die Cascade-Sweep-Skripte sind absichtlich je EIN bare
  `async (page) => {…}`,** weil sie so an die Playwright-MCP übergeben werden
  (siehe `scripts/cascade/README.md`). Ein Top-Level-Ausdruck ist der Sinn des
  Formats.
- Dazu die Standardkonvention, dass `_` „absichtlich ungenutzt" heißt — das
  Zählidiom `for (const _ of …)` allein stellte zehn der zwanzig Warnungen.

**Warum das zählt:** bei zwanzig bekannten Warnungen geht eine neue unter. Eine
Lint-Ausgabe, die niemand mehr liest, ist keine.

### P3 — Content-Lint: 5 Befunde bei 339 Restaurants ⏸ **1 von 5 lösbar**

```
hoch    sardinen-bar                  photoCreditUrl fehlt
mittel  larb-koi                      description nur 260 Zeichen
mittel  smashd-eatery-x-forn-simsim   2 Bilder doppelt in gallery
info    larb-koi                      weder website noch instagramHandle
info    larb-koi                      Insider-Tipp fehlt im Map-Popup
```

In den Datensatz geschaut (Session E), und die fünf zerfallen in zwei Gruppen:

**Mechanisch lösbar (1) — erledigt, wartet auf Veröffentlichung.**
`smashd-eatery-x-forn-simsim` hatte fünf Galerie-Einträge, von denen zwei
Assets je zweimal referenziert waren: `2efdaa5d…` unter den `_key`s `6118e033`
und `77cc57c2`, `8ed232af…` unter `5b3d74e9` und `926f26e2`. Die beiden
späteren Einträge trugen identische `caption` und `credit` — es ging also keine
Information verloren.

Entfernt am 22.08.2026 mit Revisions-Sperre (`ifRevisionId`), damit der Patch
fehlschlägt, falls jemand zwischenzeitlich editiert. Ergebnis im Draft: drei
Einträge, drei eindeutige Bilder, Reihenfolge unverändert.

**Der Befund bleibt bis zur Veröffentlichung bestehen.** `lib/sanity.ts:27`
setzt `perspective: 'published'`, der Content-Lint sieht also weiter das
veröffentlichte Dokument mit fünf Einträgen. Der Draft liegt unter
`drafts.restaurant-smash-d-eatery-x-forn-simsim` im Studio und muss dort
publiziert werden — das ist bewusst eine Entscheidung des Betreibers, keine
Aufräumarbeit.

**Braucht Wissen, das im Repo nicht steht (4).** `sardinen-bar` hat weder
`photoCredit` noch `photoCreditUrl` — wer das Foto gemacht hat, ist eine
Tatsache, die ich nicht kenne und nicht erfinden darf. `larb-koi` fehlen
Beschreibungstext, Website, Instagram und Insider-Tipp; das sind redaktionelle
Inhalte über ein reales Restaurant, die auf einer öffentlichen Seite landen.
Erfundene Angaben wären schlimmer als fehlende.

**Nicht ausgeführt:** das Publizieren. Ein Patch legt nur einen Draft an; live
geht er erst, wenn ihn jemand im Studio veröffentlicht.

## 3. Wo nichts zu holen war

Bewusst dokumentiert, damit die nächste Session das nicht erneut abklopft.

**Totes CSS gibt es praktisch nicht.** `css/style.css`: 57 Klassen, **0**
ungenutzt. CSS-Module: 1116 Klassen, **6** ungenutzt — und alle sechs sind der
`/login`-Rest aus P3. Bei 23 241 Zeilen CSS ist das eine bemerkenswerte Quote.

**Kein toter Anwendungscode.** Von 194 `.ts`/`.tsx` hat keine einzige
Komponente und kein einziges `lib/`-Modul keinen Importeur. Was ohne Import
dasteht, sind CLI-Skripte in `scripts/` und Framework-Dateien — beides korrekt.

**Keine ungenutzten Abhängigkeiten.** 19 `dependencies`, 15 `devDependencies`,
alle mit Fundstelle.

**Keine temporären Dateien im Repo.** Kein `.bak`, `.old`, `.orig`, `.tmp`,
`.rej`, kein `*copy*`. `git status --ignored` zeigt nur `.env.local`,
`next-env.d.ts`, `tsconfig.tsbuildinfo` und `.claude/` — alles wie vorgesehen.

**Alt-Texte sind vollständig.** Jedes `<img>` und `<Image>` in `app/` hat
`alt` — die einzige Ausnahme steht in einer Testdatei.

**Tests sind grün.** 1156 bestanden, 5 übersprungen, 170 Dateien, 10,4 s.

**Lazy-Loading sitzt.** maplibre-gl ist mit 266 kB gzip der größte Chunk im
Projekt und lädt ausschließlich auf `/map`, über eine `next/dynamic`-Grenze.
Genau so soll das aussehen.

**SEO-Fundament steht.** hreflang pro Locale, self-canonicals, JSON-LD,
`generateStaticParams` auf allen Katalog-Routen, `noindex` bewusst auf
`/must-eats`. Die News-Route hat sogar den Sonderfall behandelt, dass EN die
Basissprache ist und nur bei echter Übersetzung ein Alternate gesetzt wird.

---

## 4. Aufräumen außerhalb des Codes

### Worktrees: 6,9 GB, alle Branches gemergt

```
1,0G  consent-free-analytics/
2,2G  email-design-signup-login-d77f90/
1,2G  login-404-footer-issue-d2b206/
1,3G  pack-category-duplicate-price-615676/
1,2G  packs-carousel-desktop-42a71f/   ← diese Session
320K  nextjs/                          ← kein Worktree, Streuobst
```

Nach `git fetch` liegen **alle 13** `claude/*`-Branches in `origin/main`. Die
vier fremden Worktrees halten also nichts Unveröffentlichtes mehr.

Der Platz steckt fast vollständig in Build-Ordnern: `.next-verify` ist in jedem
Worktree ~1 GB und wird vom `pre-push`-Hook angelegt, aber nie aufgeräumt. Fünf
Worktrees × 1 GB, nur damit ein Push einmal verifiziert werden konnte.

`.claude/worktrees/nextjs/` ist überhaupt kein Worktree — nur ein
`node_modules/` mit `next` und `styled-jsx` darin. Rest einer abgebrochenen
npm-Operation.

**Vorschlag:** die vier fremden Worktrees entfernen, die gemergten Branches
löschen, das Streuverzeichnis wegräumen. Diese Session läuft in
`packs-carousel-desktop-42a71f` — die bleibt bis zum Schluss.

Das ist ein löschender Eingriff in fremde Arbeitskopien und braucht deine
Freigabe, auch wenn alles gemergt ist.

### Zwei Ungenauigkeiten in CLAUDE.md

1. **Worktree-Pfad.** CLAUDE.md verweist auf `scripts/worktree.sh <branch>`.
   Das Skript legt Worktrees unter `<parent>/eat-this-worktrees/<name>` an — die
   tatsächlich existierenden liegen unter `.claude/worktrees/<name>` und wurden
   vom Harness erzeugt. Zwei Mechanismen, ein Satz Doku.
2. **Aufräumen fehlt.** Dass `.next-verify` nach dem Push zurückbleibt und pro
   Worktree ein GB kostet, steht nirgends. Ein Satz in „Was sonst kaputtgeht"
   spart später eine volle Platte.

---

## 5. Nach dem Rollout — was in Produktion ankam

Gemessen am 22.08.2026 gegen www.eatthisdot.com. Rollout
`rollout-2026-08-22-005` meldete `SUCCEEDED` um 19:51:25Z; die Vorher-Werte
sind wenige Minuten davor auf derselben Leitung entstanden.

### Was trägt

**Der Prerender-Cache greift.** Auf allen ISR-Seiten steht jetzt
`x-nextjs-cache: HIT`. Vorher fehlte dieser Header **komplett** — der Cache
wurde nie gefragt, jede Seite wurde in Cloud Run neu gerendert. Das ist der
Kern von Session B, und er ist eingelöst.

| Seite                        | TTFB vorher | nachher     |
| ---------------------------- | ----------- | ----------- |
| `/guides/beste-pizza-berlin` | 0,475 s     | **0,266 s** |
| `/bezirk/kreuzberg`          | 0,457 s     | **0,281 s** |
| `/restaurant/cafe-botanico`  | 0,403 s     | **0,251 s** |
| `/`                          | 0,482 s     | **0,346 s** |
| `/kategorie/pizza`           | 0,405 s     | **0,295 s** |
| `/news/drei-doener-berlin`   | 0,357 s     | **0,288 s** |

Methodisch: Vorher-Werte sind Einzelmessungen, Nachher-Werte Mediane aus drei.
Die Richtung ist über alle sechs Seiten konsistent. Am 21.08. lag
`/restaurant/cafe-botanico` bei 0,97 s und war die langsamste Seite der
Messung — jetzt ist sie die schnellste.

**Weiteres, in Produktion bestätigt:** JS der Startseite 338,4 → 289,9 kB gzip
(−48,5 kB, praktisch die 50 kB aus Session C) · Sanity-Bilder durch den Proxy
7 → 0 · `og_pizza.png` 542.834 → 202.971 Bytes, ausgeliefert als `?v=3` ·
Guide-Hero-srcSet beginnt bei 384w statt fix 640/1080 · `style.min.css?v=311`.

### P1-neu — Middleware macht Seiten uncachebar. Ursache belegt, Fix nicht trivial

**Stand 22.08.2026, nach gezielter Untersuchung.** Die Arbeitshypothese ist
bestätigt, und der Weg zum Fix ist enger als gedacht.

#### Die Ursache ist dokumentiert

Firebase App Hosting schreibt es wörtlich hin
([Doku](https://firebase.google.com/docs/app-hosting/optimize-cache)):

> Routes affected by Next.js middleware are not cached.

Der Adapter (`@apphosting/adapter-nextjs@14.0.21`, aus dem Header
`x-fah-adapter`) markiert die Routen zur **Build-Zeit** anhand von
`config.matcher` — unabhängig davon, was die Middleware zur Laufzeit tut.

#### Der Beweis, dass die Plattform unseren eigenen Header umschreibt

Zwei Route-Handler desselben Builds, beide mit `revalidate`, beide setzen ihren
`Cache-Control` **selbst im Code**:

|                  | `/llms.txt`                             | `/api/restaurant-detail/[slug]`                                    |
| ---------------- | --------------------------------------- | ------------------------------------------------------------------ |
| unser Code setzt | `public, max-age=86400, s-maxage=86400` | `public, max-age=300, s-maxage=3600, stale-while-revalidate=86400` |
| Matcher          | ausgenommen (Punkt im Pfad)             | **trifft**                                                         |
| es kommt an      | **byteidentisch**                       | `max-age=300, stale-while-revalidate=86400, private`               |
| CDN              | `hit`, `age: 697`                       | `miss`                                                             |

`public` → `private`, `s-maxage` gestrichen. Den String haben wir selbst
geschrieben; Next kann ihn nicht verändert haben. Ein blankes `no-store` als
einziges Token existiert in `next@15.5.23` überhaupt nicht — dort gibt es nur
die dreiteiligen Varianten.

#### Der Gewinn ist gemessen, nicht geschätzt

`/welcome` ist die einzige vorgerenderte **Seite** außerhalb des Matchers:

```
/welcome                  kein x-fah-middleware   s-maxage=31536000   cdn=hit, age 740
/restaurant/cafe-botanico x-fah-middleware: true  no-store            cdn=miss, immer
```

Acht Abrufe auf `/welcome`: acht Treffer. Sobald eine Seite die Middleware
nicht durchläuft, ist sie CDN-cachebar.

#### Messfalle: Trefferquoten misst man nicht mit drei Requests

Der CDN steht auf mehreren Edge-Knoten, und ein Abruf landet nicht immer auf
demselben. Zwölf Abrufe auf `/welcome`, direkt hintereinander:

```
miss  hit(760)  hit(761)  miss  hit(762)  hit(762)
hit(762)  miss  hit(763)  hit(763)  hit(764)  miss
```

**Rund drei von vier treffen, jeder vierte landet auf einem Knoten ohne
Eintrag.** Bei dieser Quote sind drei aufeinanderfolgende `miss` reiner Zufall —
und genau das ist mir am 22.08.2026 passiert: Ich habe dreimal `miss` gemessen
und daraus geschlossen, der CDN cache überhaupt nichts, nicht einmal
`immutable`-Assets. Die Schlussfolgerung war falsch und stand fünfzehn Minuten
lang als Ergebnis im Raum.

Zwei Dinge, die die Serie zusätzlich zeigt und die eine Einzelmessung nie
hergibt:

- **Das `age` läuft linear durch** (760 → 764 über die zwölf Abrufe, 825 nach
  einer Minute Pause). Der Eintrag war beim ersten Abruf schon 13 Minuten alt,
  stammt also nicht aus meinen Requests. Ein `age`, das mit der Wanduhr mitgeht,
  ist der Beleg, dass man einen echten Cache-Eintrag vor sich hat und nicht
  einen, den man gerade selbst erzeugt hat.
- **Ein Rollout invalidiert den Eintrag nicht zwingend.** Fünf Minuten nach dem
  Rollout um 21:50 war alles `miss`; der Eintrag, der kurz darauf mit `age 825`
  antwortete, hatte den Rollout überlebt. Die `miss` kamen von Knoten, die ihn
  nie hatten — nicht von einem geleerten Cache.

**Regel:** Für eine Aussage über CDN-Verhalten mindestens zehn Abrufe fahren und
die Quote nennen, nicht das Ergebnis. `age` immer mitprotokollieren. Ein
einzelnes `miss` bedeutet nichts.

#### Warum der naheliegende Fix nicht funktioniert

Der Plan wäre: ISR-Pfade aus dem Matcher nehmen, den DE-Rewrite stattdessen
über `rewrites()` in `next.config.ts` erzeugen. Für einen normalen Google-Klick
macht die Middleware ohnehin nur eine Sache — sie hängt `/de` vor den Pfad;
alle elf anderen Zweige fallen durch.

**Aber `rewrites()` verhält sich auf App Hosting anders als bei Next.** Die
Sentry-Tunnel-Regeln liegen in `afterFiles` (`routes-manifest.json`:
`beforeFiles: []`), laufen bei Next also _nach_ der Middleware. Gemessen gegen
Produktion:

```
/monitoring                 x-fah-middleware=1  x-fah-adapter=1
/monitoring?o=123           x-fah-middleware=1  x-fah-adapter=1
/monitoring?o=123&p=456     x-fah-middleware=0  x-fah-adapter=0
```

Sobald die `has`-Bedingungen greifen, **unterdrückt die Rewrite-Regel die
Middleware** — der Next-Server sieht den Request nicht. Die Plattform dreht
Nexts Reihenfolge um.

Damit sind beide Ausgänge eines Catch-all-Rewrites schlecht:

- **Er unterdrückt die Middleware überall.** Dann fallen auch die Zweige weg,
  die der Plan bewusst behalten wollte: Staging-Basic-Auth, Apex→www, die fünf
  410er für geschlossene Spots, `?ref=`-Referrals.
- **Oder er schreibt um und reicht weiter.** Dann sieht die Middleware
  `/de/restaurant/x` **ohne** den `INTERNAL_LOCALE_HEADER` (den setzt nur
  `middleware.ts:240`), trifft den Zweig `middleware.ts:216` und leitet mit 308
  zurück auf `/restaurant/x` — das der Edge erneut umschreibt. Endlosschleife
  über den kompletten Katalog.

#### Der zweite Blocker: Staging

Der Basic-Auth-Gate steckt **in** der Middleware (`middleware.ts:114-127`) und
ist der einzige Träger des `X-Robots-Tag: noindex` auf ISR-Seiten. Nimmt man
die Pfade aus dem Matcher, stehen auf Staging ~690 vorgerenderte Seiten ohne
Passwort und ohne noindex offen. Der verbleibende Schutz wäre
`app/robots.ts` (`disallow: /`) — eine Bitte, kein Riegel.

#### Was das für die Umsetzung heißt

Kein Ein-Zeilen-Fix. Wer das angeht, braucht drei Dinge zusammen:

1. Einen **eng gefassten** Rewrite nur für die ISR-Präfixe, nicht catch-all —
   und die Messung, welches der beiden Verhalten oben eintritt.
2. Eine Antwort auf die Schleife: entweder den `/de/…`-308-Zweig für dieselben
   Präfixe deaktivieren, oder den Rewrite so bauen, dass er die Middleware
   sicher unterdrückt.
3. Einen Ersatz für den Staging-Gate auf diesen Pfaden — eine Ebene tiefer
   (Layout, Route) oder über einen anderen Mechanismus.

**Nebenbefund, unbelegt aber prüfenswert:** Der Localhost-Ausnahme des
Staging-Gates (`middleware.ts:118`) liest `req.headers.get('host')`, obwohl elf
Zeilen später steht, dass auf App Hosting `x-forwarded-host` der echte Host
ist. Greift dort je ein Host, der mit `localhost` beginnt, fällt der
Staging-Schutz für alle Pfade.

### Lighthouse: `/map` sieht schlechter aus, aber nicht wegen dieses Rollouts

| Lauf          | Build   | Score | LCP     | TBT     |
| ------------- | ------- | ----- | ------- | ------- |
| 21.08.        | alt     | 0,48  | 5588 ms | 2619 ms |
| 22.08. 19:31Z | alt     | 0,44  | 7709 ms | 3745 ms |
| 22.08. 19:42Z | alt     | 0,44  | 6872 ms | 3128 ms |
| 22.08. 19:53Z | **neu** | 0,43  | 7462 ms | 3246 ms |

`/map` war heute schon vor dem Rollout schlechter als gestern, und die beiden
Läufe auf demselben alten Build unterscheiden sich um 837 ms LCP und 617 ms
TBT. Der Wert nach dem Rollout liegt mitten in dieser Spanne. Die Verschlechterung
ist diesem Merge **nicht zuzuschreiben** — sie ist entweder Messrauschen oder
stammt aus den parallel gemergten Map-Änderungen (#429, #434).

Auf den übrigen Seiten sind die LCP-Warnungen verschwunden: `/`, `/news` und
`/en/guides/beste-pizza-berlin` warnen nicht mehr. Neu ist eine TBT-Warnung auf
`/` mit 818,5 ms — knapp über der 800-ms-Schwelle.

**Lehre für die Methode:** Ein einzelner Lighthouse-Lauf trägt hier keine
Aussage. Auf `/map` streuen zwei Läufe auf identischem Build um mehr als 10 %.
Wer eine Verbesserung belegen will, braucht mindestens einen Vorher-Lauf am
selben Tag — sonst misst man den Wochentag.

---

## 6. Session-Schnitt

Jede Session ist für sich abschließbar und endet mit einem PR nach `staging`.

**Session A — Gate reparieren, Platz schaffen** — ✅ **erledigt am 21.08.2026, PR #425**
P0 behoben, aber anders als hier geplant: der Eintrag einfach aus `include` zu
streichen hält nicht, weil Next ihn bei jedem Default-Build wieder einträgt
(nachgemessen). Stattdessen eine tsconfig pro Dist-Dir —
`tsconfig.verify.json` plus `typescript.tsconfigPath` in `next.config.ts`,
gewählt über `NEXT_DIST_DIR`. Beide Builds bleiben voll typgeprüft. Der Beweis
lief über einen künstlich rekonstruierten Stale-Eintrag: alte Konfiguration
reproduziert `TS2307`, `build:isolated` und der neue `npm run typecheck` laufen
durch, und der Pre-Push-Hook meldete beim echten Push `build clean`.
Aufgeräumt: vier gemergte Worktrees und das Streuverzeichnis entfernt
(6,9 GB → 2,0 GB), zwölf gemergte lokale Branches gelöscht. **Offen
geblieben:** die zwölf gemergten Branches auf `origin` — löschen betrifft das
geteilte Repo und war nicht freigegeben.

**Session B — Auslieferung** — ✅ **erledigt am 21.08.2026, PR #425**
Die geplante Cookie-Diagnose war der kleinere von zwei Blockern und allein
wirkungslos. Der größere lag eine Ebene tiefer: keine einzige Seite wurde
statisch erzeugt, wegen eines `<Link>` in einer Server-Komponente des
404-Baums (siehe P0-neu). Beide Blocker sind weg, gemessen: `x-nextjs-cache:
HIT` und `s-maxage=3600` statt `no-store`, 790 vorgerenderte Seiten statt 0.
Dazu ein Regressionstest, der den Fehler nicht wiederkommen lässt.
**Offen:** `cdn-cache-status` in Produktion — das lässt sich erst nach dem
Rollout auf `main` prüfen, Staging trägt es wegen der Basic Auth nicht.

_(ursprünglicher Plan:)_
P1 CDN-Caching. Cookie-Fix, dann messen, dann ggf. Cache-Header. Braucht
Staging-Verifikation mit und ohne Session. Erfolgsmaß: `cdn-cache-status: hit`
auf `/restaurant/*` und `/news/*`, TTFB dort unter 0,2 s.

**Session C — JS-Sockel** — ✅ **erledigt am 22.08.2026, PR #425**
Entscheidung gefallen: Tracing raus, Fehlerberichte bleiben. Gemessen
188 → 137 kB Sockel, ~50 kB auf allen 43 Routen. Das Erfolgsmaß „unter 100 kB"
aus dem ursprünglichen Plan wurde bewusst NICHT verfolgt — es hätte den
kompletten Client-Sentry gekostet (105 kB) und damit jede Browser-Fehlermeldung.
Regressionstest hält die drei Stellen zusammen, die still auseinanderdriften
können.

_(ursprünglicher Plan:)_
P1 Sentry. Zuerst die Produktfrage klären: wie viel Beobachtbarkeit ist die
Ladezeit wert? Danach Tracing abschalten oder Sentry verzögert laden.
Erfolgsmaß: „First Load JS shared by all" unter 100 kB.

**Session D — Bilder und Daten** — ✅ **erledigt am 22.08.2026, PR #425**
Share-Cards 4,60 → 1,73 MB · doppelt optimierte Bilder auf der Startseite 7 → 0
(MagazineGrid kam beim Nachmessen dazu) · fünf `sizes` gesetzt, zwei bewusst
nicht · tote Subquery ersatzlos gestrichen, Antwort 33 → 21 kB. Zwei Befunde
mussten dabei korrigiert werden: die `100vw`-Begründung und der
GROQ-Umbau-Vorschlag.

_(ursprünglicher Plan:)_
P2 `HubNearby`-Bildpfad, `<Image sizes>`, OG-PNGs quantisieren, `spotOfDay`-
Query nach GROQ verlagern. Erfolgsmaß: Startseiten-Payload vorher/nachher.

**Session E — Reste** — ✅ **erledigt am 22.08.2026, PR #425**
Acht ungenutzte Assets (nicht drei), die `/login`-Reste, eine tote Regel in der
globalen `style.css`, Lint von 20 auf 0. Erfolgsmaß erreicht: 0 tote
CSS-Klassen, 0 Lint-Warnungen. **Der Pre-Push-Build hat dabei einen echten
Beinahe-Fehler gefangen** — siehe den Alias-Fallstrick in Abschnitt 1.
**Offen geblieben:** vier der fünf Content-Lint-Befunde brauchen Wissen, das im
Repo nicht steht (ein Fotografenname, redaktionelle Texte). Nur der
Galerie-Dublettenfall ist mechanisch lösbar.

_(ursprünglicher Plan:)_
P3 `/login`-Überbleibsel, drei ungenutzte Assets, die fünf Content-Lint-Befunde
in Sanity nachpflegen.

Reihenfolge ist nicht beliebig: A vor allem anderen, weil sonst jeder Push in
den kaputten Typecheck läuft. B vor C, weil TTFB vor Bundle-Größe kommt, solange
das CDN nichts hält.

---

## Anhang: reproduzieren

```bash
# Alles aus nextjs/
npm run typecheck                      # seit PR #425 immun gegen ein veraltetes .next
npm run build:isolated                 # Bundle-Tabelle
npm test                               # 1156 Tests
npx tsx scripts/content-lint.ts        # Content-Befunde

# Auslieferung (Produktion)
curl -sI https://www.eatthisdot.com/restaurant/cafe-botanico \
  | grep -iE 'cache-control|set-cookie|cdn-cache-status'

# Nutzererlebnis — die Messung läuft schon, Ergebnisse abholen
gh run list --workflow=lighthouse.yml --limit 5
gh run view <id> --log | grep -A3 'warning for'

# Wie viele Routen laden den Sentry-Chunk
node -e "const m=require('./.next-verify/app-build-manifest.json');
const e=Object.entries(m.pages);
console.log(e.filter(([,v])=>v.some(f=>f.includes('7327-'))).length+' von '+e.length)"
```
