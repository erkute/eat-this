# Website-Audit — Befunde und Vorgehen

Stand: 21.08.2026 · Basis: `main` @ cd5c23d9 · Live-Messungen gegen www.eatthisdot.com

Eine Session reicht nicht. Dieses Dokument ist deshalb zweigeteilt: **wie** man
sich durch das Thema arbeitet (Abschnitt 1) und **was** der erste Durchgang
gefunden hat (Abschnitt 2–4). Abschnitt 5 schneidet die Arbeit in Sessions.

---

## 1. Vorgehen

Die Regel für alles hier: **erst messen, dann anfassen.** Der Code ist in
gutem Zustand — die Versuchung, „aufzuräumen", produziert hier mehr Risiko als
Gewinn. Jeder Befund unten hat einen reproduzierbaren Beleg, und jeder Fix
braucht denselben Beleg danach noch einmal.

### Die sechs Messschnitte

| # | Schnitt | Werkzeug | Was er beantwortet |
|---|---------|----------|--------------------|
| 1 | Repo-Hygiene | `git worktree list`, `git branch`, `du -sh` | Was liegt herum und kostet nichts als Platz? |
| 2 | Build-Gesundheit | `npm run build:isolated`, `npx tsc --noEmit`, `npm test` | Ist das Deploy-Gate überhaupt grün? |
| 3 | Toter Code | Skripte unten | Was ist geschrieben, aber nie ausgeliefert? |
| 4 | Bundle | `.next-verify/app-build-manifest.json` + `gzip -c` | Was zahlt *jeder* Besucher, auf *jeder* Seite? |
| 5 | Auslieferung | `curl -sI` gegen Produktion | Was passiert zwischen Cloud Run und Browser? |
| 6 | Inhalt | `npx tsx scripts/content-lint.ts` | Wo fehlen Pflege-Felder? |

Schnitt 4 und 5 sind die, die tatsächlich Ladezeit bewegen. Schnitt 3 bewegt
Wartbarkeit, nicht Performance — nicht verwechseln.

### Die Skripte

Die Dead-Code-Analysen liegen bewusst nicht im Repo (Einmal-Werkzeug, kein
Produktionscode). So werden sie reproduziert:

**Tote CSS-Modul-Klassen.** Pro `*.module.css` die Klassenselektoren
extrahieren, Kommentare / `@keyframes` / `:global(…)` vorher wegschneiden — sonst
zählt man Kommentarreste und fremde Bibliotheksklassen mit (mein erster Lauf
meldete 103 Treffer, davon waren 97 genau das). Dann gegen die tatsächlichen
Importeure prüfen: `styles.foo`, `styles['foo']`, `styles[\`foo${x}\`]`-Präfixe
und `composes:`.

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
(`build` *und* `build:isolated`), um zu zeigen, dass keiner Typinformation
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

| Seite | TTFB | Rendering |
|---|---|---|
| `/news/drei-doener-berlin` | 0,37 s | ISR, `revalidate = 3600` |
| `/` | 0,48 s | `force-dynamic` |
| `/map` | 0,49 s | `force-dynamic` |
| `/must-eats` | 0,53 s | `force-dynamic` |
| `/restaurant/cafe-botanico` | **0,97 s** | vorgerendert, `revalidate = 3600` |

Die langsamste Seite ist die, die eigentlich fertig auf der Platte liegt.

**Ursache:** [`middleware.ts:233`](nextjs/middleware.ts:233) setzt auf dem
DE-Rewrite-Pfad — also bei praktisch jedem Seitenaufruf — `NEXT_LOCALE`. Eine
Antwort mit `Set-Cookie` ist für den App-Hosting-CDN grundsätzlich nicht
cachebar.

**Und der Cookie hat dort keine Funktion.** `routing.ts` setzt
`localeDetection: false`, next-intl liest ihn also gar nicht. Gelesen wird er
nur von Client-Code (`app/welcome/page.tsx:37`, `lib/i18n/I18nContext.tsx:53`) —
und `I18nContext` setzt ihn beim Sprachwechsel selbst. Die beiden anderen
Stellen in der Middleware (`?lang=`-Redirect Zeile 166, `/de/…`-Redirect Zeile
220) sind die, die ihn wirklich brauchen; die auf dem Rewrite-Pfad ist reine
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

### P1 — 127 kB gzip Sentry auf jeder einzelnen Seite

Die Bundle-Tabelle des Builds:

```
+ First Load JS shared by all             188 kB
  ├ chunks/7327-…                         130 kB   ← Sentry
  ├ chunks/c34fc056-…                     54,4 kB  ← React
  └ other shared chunks                   3,97 kB
```

Nachgemessen: 7327 ist 416 kB roh, 127 kB gzip, enthält
`browserTracingIntegration`, `captureException`, Breadcrumb-Maschinerie. Laut
`app-build-manifest.json` laden **58 von 58** App-Routen diesen Chunk, und er
steht in `rootMainFiles` — er ist Teil des Startpfads, nicht nachgelagert.

Rund **zwei Drittel des JS-Sockels sind Fehler-Telemetrie.** Zum Vergleich: die
gesamte Startseite hat 274 kB First Load, davon 12,8 kB eigener Seitencode.

Die naheliegenden Hebel sind schon gezogen — `next.config.ts` schaltet
Replay-Iframe/ShadowDom/Worker und Debug-Statements ab, Replay-Sampling steht
auf 0. Was bleibt:

- `browserTracingIntegration` kostet den größten verbliebenen Block.
  `tracesSampleRate: 0.1` heißt: 90 % der Besucher laden Tracing-Code, den sie
  nie auslösen. Bei der aktuellen Besucherzahl liefert das kaum verwertbare
  Daten.
- Alternative statt Abschalten: Sentry erst nach `load` bzw. bei der ersten
  Interaktion nachladen. Fehler *vor* dem Init gehen dann verloren — das ist
  die Abwägung, und sie ist eine Produktentscheidung, keine technische.

**Aufwand:** klein bis mittel. **Risiko:** gering technisch, aber es ist bewusst
weniger Beobachtbarkeit. Vorher entscheiden, was wichtiger ist.

### P2 — Startseite zieht 339 Restaurants für einen Spot des Tages

`lib/home/getHomeData.ts` holt über `spotCandidatesQuery` **alle** offenen
Restaurants — inklusive einer `count(*[_type == "mustEat" && references(^._id)])`-
Subquery **pro Restaurant** — und wählt danach in JS einen aus.

Das Ergebnis ist per `next: { revalidate: 3600, tags: [...] }` gecacht, der
Schaden ist also begrenzt. Aber die Kosten wachsen linear mit dem Katalog, und
der Cache wird von den Tags `restaurant` und `mustEat` invalidiert — also bei
jeder Redaktionsänderung. Bei 339 Restaurants noch unauffällig, bei 1000 nicht
mehr.

**Fix:** die Auswahl nach GROQ verlagern (Kandidaten nach `featuredOnDate` /
`featured` vorfiltern und projizieren, statt den vollen Katalog zu übertragen).
**Aufwand:** mittel — die Logik in `pickSpotOfDay` ist getestet, die Tests sind
der Schutz beim Umbau.

### P2 — Doppelte Bildoptimierung auf der Startseite

`app/components/HubNearby.tsx:148` rendert Sanity-Bilder über `next/image`. Die
URL ist zu dem Zeitpunkt bereits `…?w=600&auto=format&q=80` — Sanitys CDN hat
das Bild fertig. Next schickt es trotzdem durch den App-Hosting-Optimizer.

Die Nachbarkomponenten machen es anders und begründen es im Code:

> *„Deliberately bypass the App Hosting image proxy: Sanity serves the
> responsive, format-negotiated variants directly."* — `HubSection.tsx`

`HubSection`, `HubMustEatsTeaser`, `RestaurantList`, `bezirk/[slug]`,
`kategorie/[slug]` nutzen alle `sanityImageLoader`/`sanitySrcSet`. `HubNearby`
ist der Ausreißer und liefert ~6 Bilder auf der meistbesuchten Seite über den
teuren Weg aus.

**Fix:** `HubNearby` auf denselben Pfad ziehen. **Aufwand:** klein.

### P2 — OG-Bilder sind 460–685 kB PNG

```
685 KB  public/pics/og/og_fine-dining.png
541 KB  public/pics/og/og_lunch.png
…       (9 Dateien, zusammen 4,7 MB)
```

Sie werden korrekt genutzt (`guides/[slug]/page.tsx:39` baut
`og_${categorySlug}.png` zusammen). CLAUDE.md nimmt OG-Bilder bewusst von der
WebP-Regel aus — das ist richtig, viele Social-Crawler mögen kein WebP. Aber
*PNG bleiben* heißt nicht *unkomprimiert bleiben*: verlustbehaftete
PNG-Quantisierung (`pngquant`) holt hier typisch 60–70 % raus, ohne das Format
zu wechseln.

Betrifft keine Seitenladezeit, nur Crawler und Link-Vorschauen. Deshalb P2.

### P3 — 7 `<Image>` ohne `sizes`

`guides/[slug]:144`, `pack/[slug]:102` und `:246`, `kategorie:128`,
`packs:163` und `:214`, `KategorieBoost:25`. Ohne `sizes` nimmt Next `100vw` an
und lässt den Browser aus dem vollen srcset wählen — auf Retina-Desktop
entsprechend groß.

Nebenbei geprüft und **kein** Befund: die `w=3840`-Einträge im Live-HTML sind
nur das letzte Glied des srcset. Die Bilder auf der Startseite haben alle ein
korrektes `sizes`, der Browser lädt die passende Variante.

### P3 — Reste des entfernten `/login`-Routes

`LoginPanel.tsx` sagt selbst:

> *„The standalone /login route that rendered a second, older full-page variant
> of this panel is gone."*

Zurückgeblieben sind:
- `app/components/LoginModalOverlay.module.css` — Datei wird nirgends importiert
- `LoginPanel.module.css`: `.page`, `.loginGrid`, `.formPanel`, `.form`,
  `.menuList` — nie referenziert
- `LoginPanel.tsx`: ESLint meldet `TOAST_HANDOFF_KEY` und `router` als ungenutzt

Das sind die **einzigen** toten CSS-Klassen im ganzen Projekt (siehe Abschnitt 3).

### P3 — Drei ungenutzte Assets (~293 kB)

```
239 KB  public/pics/about/0477e049b54b21c5fb7ea43d5a97ac2b.webp
 44 KB  public/pics/eat-email.png
 10 KB  public/pics/logo-red.webp
```

Kein Treffer, auch nicht als Template-Fragment. Der Hash-Dateiname deutet auf
einen Import-Rest.

### P3 — Content-Lint: 5 Befunde bei 339 Restaurants

```
hoch    sardinen-bar                  photoCreditUrl fehlt
mittel  larb-koi                      description nur 260 Zeichen
mittel  smashd-eatery-x-forn-simsim   2 Bilder doppelt in gallery
info    larb-koi                      weder website noch instagramHandle
info    larb-koi                      Insider-Tipp fehlt im Map-Popup
```

Das ist Redaktionsarbeit, kein Code. `larb-koi` taucht dreimal auf — ein
halbfertig angelegter Eintrag.

---

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

## 5. Session-Schnitt

Jede Session ist für sich abschließbar und endet mit einem PR nach `staging`.

**Session A — Gate reparieren, Platz schaffen** *(klein, kein Produktionsrisiko)*
P0 `tsconfig`-Fix, Worktree- und Branch-Aufräumen, `.claude/worktrees/nextjs/`
weg, CLAUDE.md-Korrekturen. Abschluss: `build` und `build:isolated` beide grün,
`npx tsc --noEmit` sauber.

**Session B — Auslieferung** *(größter Einzelgewinn, höchstes Risiko)*
P1 CDN-Caching. Cookie-Fix, dann messen, dann ggf. Cache-Header. Braucht
Staging-Verifikation mit und ohne Session. Erfolgsmaß: `cdn-cache-status: hit`
auf `/restaurant/*` und `/news/*`, TTFB dort unter 0,2 s.

**Session C — JS-Sockel** *(Entscheidung vor Code)*
P1 Sentry. Zuerst die Produktfrage klären: wie viel Beobachtbarkeit ist die
Ladezeit wert? Danach Tracing abschalten oder Sentry verzögert laden.
Erfolgsmaß: „First Load JS shared by all" unter 100 kB.

**Session D — Bilder und Daten** *(mittel, gut testbar)*
P2 `HubNearby`-Bildpfad, `<Image sizes>`, OG-PNGs quantisieren, `spotOfDay`-
Query nach GROQ verlagern. Erfolgsmaß: Startseiten-Payload vorher/nachher.

**Session E — Reste** *(klein, angenehm)*
P3 `/login`-Überbleibsel, drei ungenutzte Assets, die fünf Content-Lint-Befunde
in Sanity nachpflegen.

Reihenfolge ist nicht beliebig: A vor allem anderen, weil sonst jeder Push in
den kaputten Typecheck läuft. B vor C, weil TTFB vor Bundle-Größe kommt, solange
das CDN nichts hält.

---

## Anhang: reproduzieren

```bash
# Alles aus nextjs/
npx tsc --noEmit                       # P0 sichtbar machen
npm run build:isolated                 # Bundle-Tabelle
npm test                               # 1156 Tests
npx tsx scripts/content-lint.ts        # Content-Befunde

# Auslieferung (Produktion)
curl -sI https://www.eatthisdot.com/restaurant/cafe-botanico \
  | grep -iE 'cache-control|set-cookie|cdn-cache-status'

# Wie viele Routen laden den Sentry-Chunk
node -e "const m=require('./.next-verify/app-build-manifest.json');
const e=Object.entries(m.pages);
console.log(e.filter(([,v])=>v.some(f=>f.includes('7327-'))).length+' von '+e.length)"
```
