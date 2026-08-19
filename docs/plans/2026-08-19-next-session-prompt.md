# Nächste Session — Stand 2026-08-19

## Deployment-Stand, in den exakten Worten

- **`rollout succeeded` auf `staging`**, Commit `55496ced`: 2.5 (PR #365),
  toter-Key-Sweep (PR #366) und das vorher offene 2.2 (PR #362).
  Beweis: `build-2026-08-19-012` ist `READY`, `source.codebase.hash` identisch
  mit `origin/staging`.
- **`smoke-tested`: nein.** Nur die Checks ohne Zugangsdaten sind gelaufen —
  Staging 401 mit `Basic realm="Staging"` und `x-robots-tag: noindex, nofollow`,
  Produktion 200 ohne diesen Header. Der funktionale Smoke hinter dem
  Basic-Auth-Gate steht aus (Zugangsdaten:
  `docs/runbooks/2026-05-27-staging-backend-setup.md`).
- **Produktion: unverändert.** Kein `staging → main`. Nichts davon ist live.
- **`PR`, offen:** nur #367 (dieses Dokument + Rollout-Protokoll). #364 ist
  rebased und gemerged; sein 11:06-Smoke-Protokoll steht jetzt im Kopfblock des
  Fund-Dokuments, direkt über dem 13:52-Rollout-Eintrag.
- Der Branch `docs/p13-p21-p22-followups` ist gepusht, hat **keinen PR** und ist
  inhaltlich identisch zum Doc-Stand auf `staging` — vermutlich entbehrlich.

## Gemessene Zahlen (die teure Hälfte)

Alle gegen das Sanity-Projekt `ehwjnjr2`, Dataset `production`, `perspective:
published`, am 2026-08-19. Population durchgehend `isOpen != false`, wie
`mapRestaurantsQuery`.

**Das Free-Tier war der komplette Vorrat, keine Auswahl:**

| | |
| --- | --- |
| Restaurants im Katalog | **339** |
| `mustEat`-Dokumente | **23**, auf **20** Restaurants |
| `tierAnon`-geflaggt | **19**, davon mit Must Eat **12** |
| Anon-Tier vorher → nachher | **20 → 27** |
| davon Must-Eat-Träger | **20 → 20** (unverändert) |
| Frei gesamt (Anon ∪ free-surface) | **28 → 34** |
| Küchen mit ≥1 freiem Spot | **15 → 18** von 33 |
| Geflaggt aber nicht frei | **7 → 0** |

**Küchen-Abdeckung (`cuisineType`), Katalog / frei, vor der Änderung:**
Bakery 16/7 · Café 44/2 · Italian 40/3 · Fine Dining 29/1 · European 27/2 ·
German 21/0 · Japanese 20/0 · French 19/1 · Bar 19/1 · Wine Bar 14/1 ·
Chinese 12/1 · Ice Cream 11/3 · Austrian 9/0 · Middle Eastern 6/0 · Vegan 5/0 ·
Vietnamese 5/1 · Turkish 5/2 · Burgers 2/1.
**23 der 33 Küchen sind für das Anon-Tier strukturell unerreichbar** — in ihnen
trägt kein einziges Restaurant ein Must Eat.

**Kategorie-Slugs (das, was der Kategorie-Filter benutzt), Katalog / frei:**
dinner 224/10 · lunch 204/9 · drinks 68/3 · breakfast 52/6 · coffee 50/3 ·
fine-dining 34/1 · sweets 33/11 · pizza 20/4 · fast-food 9/4.

**free-surface:** 8 zusätzliche freie Spots, **alle 8 mit null Must Eats** —
Tobi ornot ToBe, Curry Baude, Bari, La Miche, Kolo Coffee, Hokey Pokey Mitte,
der Weinlobbyist, Gorilla Bäckerei.

**i18n-Sweep:** `hub.deineWelt` 83 Keys pro Locale = **166 tot**; `hub.nearby`
**5 von 12** Keys tot; `translations.ts` **−178 Zeilen**.

**Rollout-Timing:** Merges 13:38 und 13:43 lokal, `rollout-011` `SUCCEEDED`
13:47, `rollout-012` `SUCCEEDED` 13:51. Rund 5–6 Minuten pro Rollout, seriell.

## Die Fallen, die diese Runde Zeit gekostet haben

1. **Der App-Hosting-Zeitstempel steht in Lokalzeit.** Er las `11:48:34`,
   während die Merges bei `13:38`/`13:43` lokal lagen. Als UTC gelesen liegt er
   vier Minuten in der Zukunft und der Deploy wirkt erledigt — tatsächlich war
   es der zwei Stunden alte Rollout von #362. Nur `rollouts:list` zeigte beide
   eigenen als `QUEUED`.

2. **`TIER_TARGETS.ANON` war nie die Schraube.** 20 Restaurants tragen ein Must
   Eat, das Target ist 20 — die Zahl deckelte nichts. Hochdrehen hätte null
   geändert. Wer an einer Tier-Zahl dreht, sollte vorher den Kandidaten-Pool
   zählen.

3. **Übersetzungs-Keys nicht per Namensgrep löschen.** `mustEatsTitle` gab es
   zweimal (`hub.nearby` tot, `hub.deineWelt` tot, aber daneben lebende
   Nachbarn); `location` und `more` treffen als bloße Namen hundertfach
   (`window.location`, `${more} weitere Spots`). Pro Block löschen, und den
   Namespace über `useTranslations('…')` auflösen, nicht über den Key-Namen.

4. **Ein „toter" Key kann der übersehene sein.** `hub.nearby.location` war
   ungelesen, weil die Komponente `locale === 'en' ? 'Locate' : 'Standort'`
   hartcodierte — dieselbe Falle wie bei `hub.nearby.title` in #359. Vor dem
   Löschen prüfen, ob die Komponente den String stattdessen fest verdrahtet hat.

5. **`HubNearby.tsx` ist schon auf `HEAD` nicht prettier-konform** — ein
   sechstes File zusätzlich zu den fünf in der Hygiene-Notiz. Nicht
   mitformatieren, das begräbt jeden inhaltlichen Diff.

6. **Werkzeug-Kleinkram:** in zsh brauchen `grep --include`-Patterns
   Anführungszeichen; `npx tsx`-Skripte lösen den `@/`-Alias **nicht** auf
   (relative Importe nehmen) und vertragen kein Top-Level-`await` (in
   `async function main()` wickeln).

## Was als Nächstes ansteht

Reihenfolge nach Wirkung pro Aufwand, nicht bindend.

- **2.5, die redaktionelle Hälfte.** Die Code-Hälfte ist erledigt. Was bleibt,
  ist keine Code-Frage: **23 Must Eats auf 339 Restaurants.** 15 Küchen haben
  weiterhin null freie Spots. Solange das so ist, ist jede Tier-Zahl die
  falsche Schraube. Die günstigste nächste Bewegung wären Must Eats auf den
  großen leeren Küchen — German (21 Spots), Japanese (20), Vegan (5).
- **4.1 Filter in die URL.** Filter „Burgers" gesetzt → URL bleibt `/map`.
  Nicht teilbar, nicht bookmarkbar, Zurück macht ihn nicht rückgängig. Der
  Zustand liegt komplett in `lib/map/useMapFilters.ts` (`category`, `search`,
  `bezirk`, `cuisine`, `openOnly`) — fünf `useState`, die in Query-Parameter
  gehören. `?r=` ist seit #337 sauber und zeigt das Muster.
- **1.4 zweite Hälfte: Pins nach Kategorie differenzieren.** Clustering steht
  (#354), aber alle Pins sehen gleich aus — die Karte sagt nicht, was wo ist.
  Icon oder Farbe pro Kategorie. Beim Anfassen die z-index-Regel aus #354 im
  Kopf behalten: MapLibre stapelt Marker nach **Mount**-Reihenfolge, nicht nach
  React-Baum; freie Marker haben deshalb ein eigenes Band (`.markerRootFree`).

Der Kopfblock des Fund-Dokuments trägt jetzt **zwei** Rollout-Einträge — 11:06
bis einschließlich 2.1, 13:52 für 2.2/2.5/Key-Sweep. Wer einen dritten anhängt:
Zeitpunkt und Commit dazuschreiben und sagen, **wie weit** er reicht. Genau das
Fehlen dieser Reichweite hat #364 und #367 in den Konflikt laufen lassen.
