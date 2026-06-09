# Eat This KI-Buddy — Design Spec

**Datum:** 2026-06-08
**Status:** Approved (Brainstorming abgeschlossen)
**Scope:** MVP eines KI-Maskottchens, das auf eat-this.de über Berliner Food berät — Empfehlungen aus eigenen Daten plus Editorial-Talk, mit animiertem (lippensynchronem) Avatar.

---

## 1. Ziel & Produktvision

Ein animiertes KI-Maskottchen als Floating-Widget auf der Eat-This-Seite, mit dem Nutzer
sich über Berliner Essen unterhalten können. Es gibt **fundierte Empfehlungen aus dem
eigenen Sanity-Datenbestand** (Restaurants/Spots, Artikel) und **darf dabei nicht
halluzinieren** — keine erfundenen Orte, Adressen oder Öffnungszeiten. Beispiel-Interaktionen:

- „Ich hab Bock auf eine richtig geile Pizza, was empfiehlst du?" → konkrete Spots
- „Ich bin in Schöneberg, brauch einen Kaffee-Spot in der Nähe." → Bezirks-gefilterte Spots
- „Was macht den Kaffee in Berlin so besonders?" → Editorial-Antwort aus Artikeln

### Festgelegte Produktentscheidungen (aus Brainstorming)

| Aspekt | Entscheidung |
|---|---|
| **Scope** | Empfehlungen **+** Editorial-Talk. **Kein** GPS/Browser-Geolocation im MVP (Bezirks-Filter via `bezirkRef` reicht). |
| **Persona** | Kenntnisreicher Insider — warm, kuratiert, Du-Form, „ich kenn da was". Wenig Slang. |
| **Sprache** | Zweisprachig DE/EN, automatisch nach Frage bzw. Site-Locale. Nutzt die `*En`-Felder. |
| **Platzierung** | Floating-Widget (Avatar-Bubble unten in der Ecke), überall auf der Seite. |
| **Animation** | Rive-Rig: Idle (Blinzeln/Wippen) + `isTalking`-Bool, Mund klappt beim Text-Einlaufen. |
| **Grenzen** | Empfehlungen **strikt** aus eigenen Daten. Allgemeines Food-Wissen (Erklärungen) aus Modellwissen erlaubt — aber keine erfundenen konkreten Orte/Fakten. |
| **Retrieval** | Hybrid: harte GROQ-Filter (Bezirk/Küche/Preis) liefern echtes Kandidatenset; **Claude rankt** nach Vibe (keine Vektor-DB — Sanity-Embeddings sind plan-gesperrt und bei 347 Docs unnötig). |
| **Modell** | Haiku 4.5 + Prompt-Caching + Streaming; per ENV-Flag auf Sonnet 4.6 hochziehbar. |

---

## 2. Ausgangslage (bestehende Codebase)

- **Next.js App Router** (`nextjs/`), deployed via Firebase App Hosting.
- **Sanity Studio** (`studio/`) mit reichem Restaurant-Schema:
  `name`, `slug`, `cuisineType`, `categories`, `bezirkRef` (→ `bezirk`), `lat`/`lng`,
  `priceRange`, `description`/`descriptionEn`, `shortDescription`/`shortDescriptionEn`,
  `tip`/`tipEn`, `hours`/`openingHours`, `address`, `mapsUrl`, `website`,
  `isOpen`, `isClosed`, `tierAnon`/`tierSigned`, `featured`.
  Weitere Typen: `newsArticle` (Editorial), `bezirk`, `category`, `mustEat`.
- **`@anthropic-ai/sdk`** ist bereits in `nextjs/package.json`; **`ANTHROPIC_API_KEY` ist bereits** in `.env.local` und `apphosting.yaml` konfiguriert.
- **`@sanity/client`** vorhanden — Read-Client exportiert als `client` aus `nextjs/lib/sanity.ts` (projectId `ehwjnjr2`, dataset `production`, apiVersion `2024-01-01`, `useCdn: true`). GROQ-Queries in `nextjs/lib/queries.ts`.
- **API-Routes** unter `app/api/*` laufen **Node** (nicht Edge), mit `export const dynamic = 'force-dynamic'` / `revalidate = 0`, Antworten via `NextResponse.json()`.
- **firebase-admin** vorhanden: `getAdminFirestore()` / `getAdminAuth()` aus `nextjs/lib/firebase/admin.ts` (für Rate-Limiting via Firestore).
- **Tests:** Vitest (`npm test` → `vitest run`), `describe/it/expect`, `environment: 'node'`; Komponenten-Tests via `renderToStaticMarkup` + `NextIntlClientProvider`.
- **TS-Alias** `@/*` → `./*`. Komponenten `.tsx`, Libs `.ts`.
- **next-intl** v4 für Lokalisierung (DE default, EN unter `/en`); Client-Locale via `useLocale()`.
- **Datenbestand (Stand 2026-06-08):** 340 sichtbare `restaurant`-Docs, 7 `newsArticle`-Docs — klein genug, dass Claude direkt über Kandidatensets ranken kann.
- **Sanity-Embeddings-Index-API ist im aktuellen Plan NICHT verfügbar** → die semantische Schicht wird durch Claude-Ranking ersetzt (siehe §4.2).

---

## 3. Gesamtarchitektur & Datenfluss

```
Nutzer tippt  →  BuddyWidget (Frontend)
                      │  POST /api/buddy  (Verlauf + neue Frage + locale)
                      ▼
            app/api/buddy/route.ts   ← Orchestrierung (Claude Tool-Loop)
                      │
         ┌────────────┴─────────────┐
         │  Claude (Haiku 4.5) mit   │
         │  2 Tools + System-Prompt  │
         └────────────┬─────────────┘
            ruft Tool: search_spots / search_articles
                      ▼
        lib/buddy/retrieval.ts  →  Sanity (Standard-GROQ, kein Vektor-Index)
          • harte GROQ-Filter (bezirk/cuisine/price + Sichtbarkeit)
          • optional GROQ-`match` auf Vibe-Stichworte als Soft-Widener
          • Kandidatenset (bis ~30, geordnet featured/lastReviewed) als kompaktes JSON
                      ▼
        Claude rankt nach Vibe & formuliert Antwort NUR aus Treffern (+ allg. Wissen für Erklärungen)
                      │  Stream (Token für Token, SSE)
                      ▼
   BuddyWidget rendert Text  +  BuddyAvatar (Rive) setzt isTalking
```

**Kernidee — Tool-Use statt fest verdrahteter Pipeline:** Claude erhält zwei Werkzeuge und
entscheidet selbst, was es braucht. Das hält die Logik sauber und erweiterbar (später z.B.
ein `get_opening_hours`-Tool).

---

## 4. Komponenten

### 4.1 `app/api/buddy/route.ts` — Orchestrierungs-Endpoint
- **POST**, Request: `{ messages: ChatMessage[], locale: 'de' | 'en' }`.
- Führt den **agentischen Tool-Loop** mit dem Anthropic-SDK:
  1. Claude-Call mit System-Prompt (gecacht) + Tool-Defs + Verlauf.
  2. Bei `tool_use` → entsprechendes Tool ausführen (Retrieval), Ergebnis zurückgeben.
  3. Wiederholen bis `stop_reason: end_turn`.
- **Streaming** der finalen Antwort an den Client (SSE bzw. Web-Stream-Response).
- Ruft `rateLimit()` vor dem ersten Modell-Call.
- **Slug-Verifikation:** Nach der Antwort prüfen, dass alle empfohlenen Spot-Slugs im
  Trefferset des Tool-Ergebnisses lagen; sonst markieren/verwerfen (Sicherheitsnetz).
- Modell-ID aus ENV (`BUDDY_MODEL`, Default `claude-haiku-4-5`).
- `max_tokens` großzügig fürs Streaming; `thinking` aus oder adaptiv (Haiku: kein adaptiv → weglassen).

### 4.2 `lib/buddy/retrieval.ts` — Hybrid-Suche (GROQ-Filter + Claude-Ranking)
- `searchSpots({ cuisine?, bezirk?, priceRange?, vibeQuery, locale })`:
  1. **Harte Filter** → GROQ auf `restaurant`, immer mit Sichtbarkeits-Constraint
     (`isOpen == true && isClosed != true`; Tier-Logik: im MVP nur öffentlich sichtbare
     Spots, d.h. `tierAnon == true`).
  2. **Optionaler Soft-Widener:** GROQ-`match` auf `vibeQuery`-Stichworte über
     Name/Beschreibung/Tip, nur um die Kandidaten zu erweitern (nicht hart zu filtern).
  3. Rückgabe **bis ~30 Kandidaten**, geordnet nach `featured desc, lastReviewed desc`,
     als kompaktes JSON: `{ name, slug, cuisineType, bezirk, shortDescription, tip,
     priceRange, mapsUrl }` (locale-passend: `*En` bei `en`).
  4. **Claude rankt** das Kandidatenset im Antwort-Schritt nach Vibe und wählt 5–8 aus.
- `searchArticles({ query, locale })`: GROQ-`match`/Volltext über `newsArticle` (nur 7 Docs
  — notfalls alle), Rückgabe `{ title, slug, excerpt }`.
- Datenfelder werden auf das **Nötige reduziert** (Token-Effizienz), volle Texte bleiben in Sanity.
- **Kein Vektor-Index, kein zweiter Provider** — Standard-Sanity-GROQ genügt bei dieser Datengröße.

### 4.3 `lib/buddy/tools.ts` — Tool-Definitionen
- `search_spots`: Parameter `cuisine?`, `bezirk?`, `priceRange?`, `vibe_query` (string, immer).
  Beschreibung prescriptiv: „Nutze dies, wenn der Nutzer nach einem Restaurant/Café/Spot
  fragt. Setze Filter nur, wenn explizit genannt; `vibe_query` immer mit der Stimmung/Art."
- `search_articles`: Parameter `query` (string). Beschreibung: „Nutze dies für Wissens-/
  Editorial-Fragen über Berliner Food-Kultur."

### 4.4 `lib/buddy/prompt.ts` — System-Prompt
- Persona „Kenntnisreicher Insider", Du-Form, DE/EN nach `locale`.
- **Anti-Halluzinations-Regeln** (siehe §5).
- Anweisung, Empfehlungen mit dem `slug`-Link zu versehen.
- Wird als **gecachter** Block übergeben (`cache_control: ephemeral`), zusammen mit Tool-Defs.

### 4.5 `lib/buddy/rateLimit.ts` — Kosten-/Missbrauchsschutz
- Einfacher Limiter pro Session-ID und/oder IP, persistiert in **Firestore** (firebase-admin).
- Schwellen als ENV (z.B. N Nachrichten/Minute, M/Tag pro Session). Bei Überschreitung
  → freundliche Drosselungs-Antwort, kein Modell-Call.

### 4.6 `components/buddy/BuddyWidget.tsx` — Chat-UI
- Floating-Bubble unten in der Ecke (über `(spa)`-Layout global eingebunden).
- Klick öffnet Chat-Panel; Eingabe, Streaming-Antwort (Token-Render), Verlauf im
  **React-Session-State** (keine DB-Persistenz im MVP).
- Sendet `locale` aus next-intl mit.
- Rendert Spot-Empfehlungen als verlinkte Karten — **nur** Links, deren slug im
  Antwort-/Trefferset vorhanden ist.

### 4.7 `components/buddy/BuddyAvatar.tsx` — Rive-Avatar
- Lädt `.riv`, bindet State-Machine.
- Default: Idle-Animation (Blinzeln/leichtes Wippen).
- Während Tokens streamen: `isTalking = true`; bei Stream-Ende: `isTalking = false`.
- Keine Audio-Ausgabe (per Anforderung).

> **Hinweis:** Eine separate Embeddings-Index-/Sync-Komponente entfällt — die Sanity-
> Embeddings-API ist plan-gesperrt und bei 347 Docs nicht nötig. Retrieval ist reine
> Standard-GROQ (§4.2); das semantische Ranking macht Claude.

---

## 5. Anti-Halluzination (mehrschichtig)

1. **Grounding:** Empfehlungen entstehen ausschließlich aus Tool-Ergebnissen (echte Sanity-Daten).
2. **System-Prompt-Regel:** „Empfiehl ausschließlich Spots aus dem Tool-Ergebnis. Erfinde
   nie Namen, Adressen oder Öffnungszeiten. Keine Treffer → sag es ehrlich und lenke auf
   Berliner Spots zurück. Allgemeine Food-Erklärungen (z.B. ‚was ist Naturwein') darfst du
   aus eigenem Wissen geben, aber **keine** erfundenen konkreten Orte oder Fakten zu realen Orten."
3. **Link = Beweis:** Jede Spot-Empfehlung trägt den echten `slug`-Link. Das Frontend
   rendert nur Links, deren slug im Trefferset steckt — erfundene Spots haben keinen Link.
4. **Server-Slug-Check:** Sicherheitsnetz im Endpoint — empfohlene Slugs gegen das
   Trefferset prüfen; nicht enthaltene markieren/entfernen.

---

## 6. Modell & Kosten

- **Haiku 4.5** (`claude-haiku-4-5`), ENV-Flag `BUDDY_MODEL` für Wechsel auf `claude-sonnet-4-6`.
- **Prompt-Caching** auf System-Prompt + Tool-Defs (stabiler Präfix → ~0,1× Kosten bei Folgenachrichten).
- **Streaming** für die Antwort (treibt die Lippen-Animation und vermeidet Timeouts).
- **Kosten-Schätzung:** ~2–4 Cent pro Gespräch (6–8 Nachrichten); 1.000 Gespräche/Monat ≈ 20–40 €,
  10.000 ≈ 200–400 €. Embedding-Suche vernachlässigbar.

---

## 7. Verlauf & State

- API ist **zustandslos**: der volle (gekürzte) Verlauf wird pro Turn mitgeschickt.
- Verlauf lebt im **Client-Session-State** (React). **Keine** DB-Persistenz im MVP.

---

## 8. Was du lieferst / was wir bauen

| Du lieferst | Wir bauen |
|---|---|
| Avatar-Artwork in **trennbaren Layern** (SVG/PNG, Mund separat) | Rive-Rigging (Idle + `isTalking`) + Einbau |
| Tonalitäts-Feinschliff (Beispielsätze, Do/Don't) | System-Prompt, Tool-Loop, Hybrid-Retrieval |
| (Anthropic-Key ist bereits gesetzt) | Hybrid-Retrieval (GROQ), Widget-UI, Rate-Limiting |

---

## 9. Bewusst NICHT im MVP (YAGNI)

- Browser-Geolocation / echte „in meiner Nähe"-Distanzberechnung (nur Bezirks-Filter).
- Persistente Gesprächs-Historie / Nutzerkonten-Anbindung.
- Sprachausgabe (TTS) — nur Lippenbewegung zum eingeblendeten Text.
- Viseme-/Silben-genaue Lippensynchronisation.
- Personalisierung/Memory über Sessions hinweg.

---

## 10. Offene Implementierungsdetails (für den Plan)

- Cap-Größe des Kandidatensets (~30) und Ordering-Heuristik final tunen.
- Streaming-Transport (Web-Stream-Response vs. SSE) und Client-Parsing.
- Tier-/Sichtbarkeitslogik exakt (welche Spots gelten als „öffentlich sichtbar").
- Rate-Limit-Schwellen und Firestore-Collection-Shape.
- Rive-State-Machine-Inputs (nur `isTalking`, oder zusätzlich `mouthOpen` für mehr Variation).
