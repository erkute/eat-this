# Nächste Session — Stand 2026-08-19, nach 4.1

## Deployment-Stand, in den exakten Worten

- **`rollout succeeded` auf `staging`**, Commit `b225a82b`: 4.1 (PR #369),
  obendrauf alles Frühere bis `768300cb`. Beweis: `build-2026-08-19-017` ist
  `READY`, `source.codebase.hash` = `b225a82bd226dea3c3a40d3e037a0bb88aecdd64`
  = `origin/staging`. Backend „Updated Date" `16:03:12` lokal.
- **`smoke-tested`: weiterhin nur bis 2.1** (`73087a33`). Für alles danach
  liegen nur die Checks ohne Zugangsdaten vor: Staging 401 mit
  `WWW-Authenticate: Basic realm="Staging"` und `x-robots-tag: noindex,
  nofollow`, Produktion 200 ohne den Header. Der funktionale Smoke hinter dem
  Gate steht aus (Zugangsdaten:
  `docs/runbooks/2026-05-27-staging-backend-setup.md`).
- **Produktion: unverändert.** Kein `staging → main`. `staging` ist **51**
  Commits vor `main`, nichts davon ist live.
- **Keine offenen PRs.** Außer `main` und `staging` existiert kein Branch,
  lokal wie remote (`origin/chore/prettier-format-everything` war eine
  veraltete Referenz und ist mit `git fetch --prune` weg).

## Die Falle dieser Runde: der Push-Event kam nie an

Das ist die teuerste Erkenntnis der Runde, und sie betrifft **jeden** künftigen
Merge.

PR #369 wurde um `13:41:49Z` gemerged, der Remote-Ref bewegte sich
(`git ls-remote --heads origin staging` → `b225a82b`) — und danach passierte
nichts. Weder App Hosting noch GitHub Actions liefen an.

Was das beweist, und wie man es misst:

- Letzter Rollout `016` um `13:07:24Z`, letzter Actions-Lauf auf `staging` um
  `13:07:25Z`. **Eine Sekunde auseinander** — die beiden hängen am selben
  Push-Webhook. Wenn beide gleichzeitig schweigen, ist nicht App Hosting kaputt,
  sondern der Event fehlt.
- `gh api "repos/erkute/eat-this/actions/runs?branch=staging&created=>2026-08-19T13:40:00Z" --jq '.total_count'`
  → `0`. Das ist die Ein-Zeilen-Frage „ist überhaupt etwas gelaufen?".
- Ausgeschlossen: `quality.yml` hat keinen `paths`-Filter (`push: branches:
  [staging]`, unbedingt), und seine `concurrency`-Gruppe trennt
  `refs/heads/staging` von `refs/pull/369/merge`, kann den Lauf also nicht
  weggecancelt haben. GitHub-Status meldete Actions, Webhooks und Git Ops
  `operational`.
- **Nicht bewiesen, aber auffällig:** alle früheren `staging`-Läufe stammen von
  Merge-Commits („Merge pull request #NNN…") oder direkten Pushes. Meiner war
  der erste **Squash**-Merge im sichtbaren Verlauf. Der billige Test wäre, den
  nächsten PR mit `--merge` statt `--squash` zu mergen und zu sehen, ob der
  Event kommt.

Zwei Konsequenzen fürs Vorgehen:

1. **Nach jedem Merge nachsehen, ob überhaupt etwas gelaufen ist**, statt auf
   den Rollout zu warten. Der Backend-Timestamp beantwortet die Frage nicht: er
   las `15:14:19` und sah frisch aus, gehörte aber zu Rollout 016 und lag damit
   **vor** dem Merge. Frisch heißt „ein Rollout landete", nicht „meiner".
2. **Der Quality-Gate-Lauf auf `staging` fällt dann mit aus.** Hier inhaltlich
   gedeckt, weil der PR-Lauf auf `f7dda608` grün war und denselben Code prüfte —
   aber die Regel „jeder direkte Push auf `staging` wird geprüft" hat
   stillschweigend nicht gegriffen.

Manueller Rollout, wenn es wieder passiert (die Skill-Warnung „kein redundanter
Rollout" gilt für Content-Polls; hier lag der positive Nachweis vor, dass gar
keiner angelegt wurde):

```
firebase apphosting:rollouts:create eat-this-staging -g <voller-sha> -f --project eat-this-staging-8a13b
```

**`rollouts:create` kennt kein `--location`** (`error: unknown option`), anders
als `rollouts:list`, das es verlangt. Der Skill erwähnt das nicht. Der volle SHA
ist Pflicht. Dauer war ~7,5 min (`13:55:46Z` angelegt → Build `READY`
`14:03:11Z`).

## Gemessene Zahlen dieser Runde

**4.1, am 375×812-Viewport, alle fünf Filter gesetzt** (Kategorie Pizza,
Bezirk Kreuzberg, Küche Italian, Geöffnet, Suche „Pizza"):

| | vorher | nachher |
| --- | --- | --- |
| `location.search` | `""` | `?cat=pizza&bezirk=kreuzberg&cuisine=Italian&q=Pizza&open=1` |
| `history.length`, 5 Filter + 5 Anschläge | 2 → 2 | 4 → 5, **ein** Eintrag |
| Reload | vier Chips auf Default, Suchfeld leer | vier Chips + Suchtext zurück |
| Zurück bei aktivem Filter | verlässt `/map`, landet auf `/` | bleibt auf `/map`, Filter weg |

Detail und Filter zusammen: Detail aus der gefilterten Liste öffnen pusht
(`?cat=pizza` → `?cat=pizza&r=slice-society`, `h` 8→9), Zurück schließt das
Detail und **behält** den Filter (`?cat=pizza`, `h` bleibt 9).

Testsuite jetzt **969 passed / 5 skipped** (vorher 953/5, +16 neue). Lint
unverändert 0 Errors / 16 Warnungen.

## Was 4.1 an der Aufgabenstellung korrigiert hat

Der letzte Handoff sprach von „fünf `useState`, die in Query-Parameter gehören".
Die **Leserichtung** gab es für zwei davon längst: `useMapDeepLinks` konsumiert
`?cat=` und `?bezirk=`, und die Kategorie-, Bezirk- und Guide-Seiten verlinken
die Map darüber (`MapPromoCTA`, plus `app/[locale]/kategorie/[slug]/page.tsx`
und `bezirk/[slug]/page.tsx`). Namen und Slug-Werte dieser beiden waren damit
**nicht verhandelbar**. Gefehlt hat die Schreibrichtung für alle fünf plus die
Leserichtung für `cuisine`, `q` und `open`.

Deshalb liegt die Filter-Hoheit jetzt komplett in `lib/map/useMapFilterUrl.ts`
(+ `lib/map/mapFilterParams.ts` für die reinen Lese-/Schreibfunktionen), und
`useMapDeepLinks` behält nur Kamera und Detail — −43 Zeilen, sein
`?cat=`-Effekt entfiel ganz. Zwei Hooks, die beide die URL schreiben, wären
genau das Rennen gewesen, das der Bug unten beschreibt.

**Push-Regel** (steht im Kopfkommentar des Hooks): Der erste aktive Chip pusht
**einen** History-Eintrag, alles danach ersetzt ihn. Zurück landet damit auf der
ungefilterten Map statt außerhalb, und zehn Chip-Wechsel kosten einen
Tastendruck. Die Suche ersetzt immer — ein Suchstring ist ein Strom von
Anschlägen, keine Entscheidung, sonst wären fünf Buchstaben fünf Einträge.

**Der Bug, den der eigene Test gefunden hat: die Effekt-Reihenfolge.** Der erste
Entwurf gatete den Writer mit einem `useRef`. Das Ref kippt aber im selben
Commit, in dem der Reader die URL anwendet — der Writer lief also noch mit den
Default-Props und strippte als Erstes das `?cat=pizza`, das er gerade bekommen
hatte. Als `useState` batcht es mit den Settern. Wer an diesen Hooks etwas
ändert: der Test `does not strip the inbound params it was handed` in
`lib/map/__tests__/useMapFilterUrl.test.tsx` ist die Alarmanlage dafür.

## Was noch offen ist

Reihenfolge nach Wirkung pro Aufwand, nicht bindend.

- **2.5, die redaktionelle Hälfte** — der größte Hebel, und keine Code-Frage:
  **23 Must Eats auf 339 Restaurants.** Weil das Anon-Tier an Must-Eat-Träger
  gebunden ist, sind 23 von 33 Küchen strukturell unerreichbar — darunter
  German (21 Spots im Katalog), Japanese (20), Vegan (5). 15 Küchen haben null
  freie Spots. Jede Tier-Zahl ist hier die falsche Schraube.
- **1.4, zweite Hälfte:** alle Pins sehen gleich aus, die Karte sagt nichts
  darüber, was wo ist. Differenzierung nach Kategorie (Icon oder Farbe). Das
  Clustering (#354) ist fertig und davon unabhängig. Beim Anfassen: MapLibre
  stapelt Marker nach **Mount**-Reihenfolge, nicht nach React-Baum; freie Marker
  haben deshalb ein eigenes z-index-Band (`.markerRootFree`), und
  `MapArchitecture.styles.test.ts` hat eine exakte Klassenliste für
  `MapMarkers.module.css`. `app/components/map/MarkerButton.tsx` ist die Shell —
  Marker nicht von Hand neu bauen.
- **P4, der Rest (4.2–4.5):** Liste ohne Bezug zum Kartenausschnitt und ohne
  Trefferzähler, Listenkarten zu groß und zu leer (252px, 2,5 pro Bildschirm),
  kein Einstieg in die freien `/bezirk/*`-Seiten, Breadcrumb abgeschnitten
  („BUYA RAMEN FACTOR'"). 4.1 ist erledigt.
- **P3 Sprache und Daten (3.1–3.6):** Küchen-Liste komplett englisch auf der
  DE-Seite — beim Messen dieser Runde im Picker gesehen: Bakery, Bar, Burgers,
  Café, Chinese, Coffee, European, Fine Dining, French, German / Fast Food,
  Ice Cream, Israeli, Italian, Japanese, Mexican, Thai, Turkish, Vietnamese,
  Wine Bar. Dazu unsaubere Taxonomie („Café" neben „Coffee", „Lunch" als Küche,
  fehlendes vegan/vegetarisch), Öffnungszeiten in zwei Darstellungen, Pack mit
  zwei Namen, Tippfehler „CROSSAINT" im Hero-Asset, englische Must-Eat-Texte.
  3.5 und 3.6 sind Asset-Neubau, nicht nur Text.
- **P5 Feinschliff:** zwei gestapelte Overlays auf `/must-eats`, leere
  „verdeckte" Must-Eat-Karten, Remy-Placeholder abgeschnitten, Startseite
  9,7 Bildschirmhöhen, „Schon dabei? Einloggen" mit 20px der einzige
  Touch-Target unter 44px auf der Map.
- **Reste aus 1.2:** `restaurantBySlugQuery` und `restaurantMapDetailQuery` sind
  weiter getrennt, die Überlappung hält nur
  `lib/__tests__/restaurantContactFields.test.ts`. Dem Map-Sheet fehlt der
  „Was bestellen?"-Block. Datenlücke: `reservationUrl` hat kein freies
  Restaurant.

## Offene Aufgaben

1. **Funktionaler Smoke für alles ab 2.2** hinter dem Basic-Auth-Gate.
   Zugangsdaten: `docs/runbooks/2026-05-27-staging-backend-setup.md`.
2. **Staging-Gate-Credentials rotieren.** Sie stehen im Klartext im Transcript
   einer früheren Session. Ungefragt nicht rotieren — es sperrt den Nutzer bis
   zum nächsten Lookup aus:
   `openssl rand -hex 16 | firebase apphosting:secrets:set STAGING_BASIC_AUTH_PASS --data-file - --project eat-this-staging-8a13b`
   danach neuer Rollout.
3. **`staging → main`**, falls das Ganze auf Produktion soll — 51 Commits, davon
   nichts live. Davor der Smoke; 51 ungeprüfte Commits auf eine auto-deployende
   Produktion ist die teure Variante.

## Randbedingungen (unverändert)

- Keine Opacity-Fades für Bewegung. App ist light-only. Kein `!important` — drei
  `*.styles.test.ts` prüfen das.
- `npm test` vor dem Push (Soll jetzt **969 passed, 5 skipped**). Der
  Pre-push-Hook baut nur, er testet nicht. Lint sauber = 0 Errors, 16 Warnungen.
- Ein Punkt pro Durchgang, erst messen, dann fixen, dann mit derselben Messung
  gegenprüfen. Feature-Branch → PR in `staging`, keine Sammel-PRs.
- Branch immer mit explizitem Base (`git checkout -b <name> origin/staging`),
  nie `git add .`, immer explizite Pfade. Beim Mergen `--delete-branch`, außer
  ein anderer PR setzt darauf auf.
- Übergabe bei ~40 % Kontext statt den nächsten Punkt noch anzufangen.
- Kürzungs-Pass vor jedem PR, danach die eigene Messung wiederholen, nicht nur
  die Tests.

## Werkzeug-Fallen, die weiter gelten

- Im Browser-Pane ist `requestAnimationFrame` pausiert — MapLibres
  `easeTo`/`flyTo` starten, ticken aber nie; `jumpTo` benutzen. React committet
  nicht im selben Tick: ein per Klick ausgelöster Zustandswechsel zeigt Wirkung
  erst im nächsten Tool-Aufruf. Für Filter-Messungen hieß das: klicken und
  lesen immer in **zwei** Aufrufen.
- Ein React-kontrolliertes `<input>` füllt man über den nativen Value-Setter
  (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set`)
  plus `new Event('input',{bubbles:true})` — ein simples `el.value = …` sieht
  React nicht.
- `curl -w '%{redirect_url}'` gibt `-u`-Credentials im Klartext aus. Nur
  `%{http_code}` benutzen.
- Niemals `rm -rf .next`. `npx tsx`-Skripte lösen den `@/`-Alias nicht auf und
  vertragen kein Top-Level-`await`. In zsh `grep --include`-Patterns quoten.
