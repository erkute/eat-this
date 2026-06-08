# Design: Inline-Spot-Karten unter der Vorstellung (Remy)

Stand: 2026-06-08 · Branch `feature/ki-buddy`

## Problem

Remys Antwort zeigt aktuell oben den Fließtext und **darunter als Block** alle
verifizierten Eat-This-Spot-Karten (verlinkt zur Map). Der Text und die Karten
stehen unverbunden untereinander — der Nutzer muss selbst zuordnen, welche Karte
zu welcher Vorstellung gehört. Im Live-Beispiel stimmten Text-Spots
(„Sorrel, SPINDLER, Distrikt, Father Carpenter") und Karten („Gorilla, Nomad,
SPINDLER, Schneeweiß") nicht überein — nur SPINDLER überschnitt sich.

## Ziel

Jede verifizierte Eat-This-Karte sitzt **direkt unter der Stelle, an der Remy das
Restaurant im Text vorstellt**. Zusätzliche stadtbekannte Tipps (nicht aus der
geprüften Auswahl) bleiben reiner Text ohne Karte und stehen danach.

Gewählte Struktur (mit Nutzer abgestimmt): **Eat-This-Spots zuerst, jeder mit
Karte inline; Extra-Tipps als Text danach.**

## Mechanik: Slug-Marker im Text-Stream

Remy bettet nach jeder Eat-This-Vorstellung einen Marker `[[spot:<slug>]]` ein.
Den Slug kennt das Modell aus dem `search_spots`-Tool-Ergebnis (die Retrieval-
Projektion liefert `"slug": slug.current`, und der Orchestrator gibt die Spots
als JSON-Tool-Result ans Modell zurück). Der Renderer ersetzt den Marker durch
die zugehörige `SpotCard` und blendet den Marker-Text aus.

Begründung der Wahl gegenüber Alternativen: Name-Matching ist fragil, wenn das
Modell den Namen leicht abwandelt; Reihenfolge-Matching bricht, sobald das Modell
Spots zusammenfasst oder umsortiert. Der Slug-Marker ist exakt und lässt Remy die
Platzierung selbst bestimmen — genau das gewünschte Verhalten.

## Komponenten

### 1. Prompt (`lib/buddy/prompt.ts`)

Erweiterung der „So empfiehlst du (gestuft)"-Sektion:

- Stelle die geprüften Eat-This-Spots **zuerst** vor — pro Spot ein kurzer
  Absatz (Name fett + ein knapper Grund).
- Setze **unmittelbar nach jedem Eat-This-Spot, auf eigener Zeile**, den Marker
  `[[spot:<slug>]]` mit dem `slug` aus dem `search_spots`-Ergebnis. Die App macht
  daraus eine klickbare Map-Karte.
- Nutze **nur Slugs aus dem Tool-Ergebnis**; erfinde keine.
- Extra-/stadtbekannte Tipps kommen **danach** als reiner Text **ohne Marker**.
- Bestehende Regel bleibt: keine rohen URLs/Links im Text ausgeben.

Die bestehende Zeile „…erscheinen als verlinkte Karten unter deiner Antwort"
wird entsprechend angepasst (Karten erscheinen jetzt am Marker, nicht pauschal
unten).

### 2. Parser (`lib/buddy/stream.ts`, neue reine Funktion)

```ts
type AnswerSegment =
  | { type: 'text'; text: string }
  | { type: 'spot'; slug: string }

function splitAnswerSegments(
  content: string,
  allowedSlugs: Set<string>,
): { segments: AnswerSegment[]; placedSlugs: string[] }
```

Verhalten:

- Marker-Regex: `/\[\[spot:([a-z0-9-]+)\]\]/g`.
- Teilt `content` in geordnete Segmente: Text vor Marker → `text`, dann `spot`,
  usw. Leere Text-Segmente werden ausgelassen.
- Marker mit Slug **nicht** in `allowedSlugs` → verworfen (kein Segment, der
  Marker verschwindet aus dem Text). Schutz gegen halluzinierte Slugs.
- **Doppelter** Marker für denselben Slug → nur das erste `spot`-Segment; weitere
  werden verworfen. `placedSlugs` listet die tatsächlich platzierten Slugs.
- **Unvollständiger Marker am Ende** (während Streaming, z.B. `…[[spot:zo`): Der
  Text wird am letzten unabgeschlossenen `[[` abgeschnitten, damit nichts
  flackert. Erkennung: ein `[[` nach der letzten vollständigen `]]`-Position
  ohne folgendes `]]`.

### 3. Rendering (`BuddyWidget.tsx`)

Pro Assistant-Nachricht:

- `splitAnswerSegments(m.content, allowedSlugsFür(m))` aufrufen. Die erlaubten
  Slugs sind die Slugs aus `m.spots`.
- Segmente in Reihenfolge rendern: `text` → bestehende `FormattedText`,
  `spot` → bestehende `SpotCard` (Spot per Slug aus `m.spots` nachschlagen).
- **Karten erscheinen progressiv** während des Streamings, da der Marker im
  Stream immer **nach** der Vorstellung kommt. Damit kann eine Karte nie über
  ihrem noch nicht gestreamten Text erscheinen — das frühere „Karte schiebt sich
  unter den Text"-Problem entfällt strukturell (die `!(isStreaming && i===last)`-
  Sonderbehandlung für den unteren Block bleibt nur für den Fallback nötig).
- **Fallback-Block unten:** Spots aus `m.spots`, deren Slug **nicht** in
  `placedSlugs` ist, werden — wie heute — als Karten-Block am Ende der Nachricht
  gerendert, aber erst wenn `!isStreaming` (Streaming fertig), damit ein noch
  ausstehender Marker nicht vorschnell als „unreferenziert" gilt.

Konsequenz: Setzt Remy gar keine Marker (Haiku-Compliance), landen alle Karten
unten → identisch zum heutigen Verhalten. Graceful Degradation.

## Daten-/Kontrollfluss (unverändert außer Rendering)

- `search_spots` → Spots inkl. `slug` → Orchestrator emittiert weiterhin
  `{type:'spots', value: [...]}` **und** das Modell sieht die Spots als
  Tool-Result (Quelle der Slugs für die Marker).
- `useBuddyChat` speichert `m.spots` und `allowedSlugs` wie bisher; `m.content`
  enthält jetzt zusätzlich Marker. `sanitizeLinks` bleibt unverändert und fasst
  die `[[spot:…]]`-Marker nicht an (es matcht nur Markdown-Restaurant-Links).
- **Kein** neues Stream-Event, **keine** Orchestrator-Protokolländerung.

## Edge Cases

| Fall | Verhalten |
|------|-----------|
| Slug nicht in `allowedSlugs` | Marker verworfen, kein Card |
| Selber Slug zweimal markiert | Card nur einmal (erste Position) |
| Unvollständiger Marker beim Streamen | Text bis `[[` abgeschnitten, kein Flackern |
| Keine Marker gesetzt | Alle Spots als Block unten (heutiges Verhalten) |
| Marker mitten im Absatz | Funktioniert; Prompt bittet um eigene Zeile für saubere Absatz-Trennung |

## Tests

Neue Unit-Tests für `splitAnswerSegments` (in `lib/buddy/stream.test.ts`):

- Interleaving: Text + Marker + Text + Marker → korrekte Segment-Reihenfolge.
- Unbekannter Slug → verworfen.
- Doppelter Slug → nur einmal platziert; `placedSlugs` korrekt.
- Unvollständiger Trailing-Marker → Text abgeschnitten, kein `spot`-Segment.
- Kein Marker → ein einzelnes `text`-Segment, `placedSlugs` leer.

Bestehende Buddy-Tests (`prompt.test.ts`, `BuddyWidget.test.tsx`,
`stream.test.ts`, retrieval/orchestrator) müssen grün bleiben; ggf. eine
Prompt-Assertion ergänzen, die den Marker-Hinweis prüft.

## Nicht im Scope

- GROQ-Preis-Filter-Bug (`priceRange == $price`, separat notiert).
- Karten-Design/Styling-Änderungen.
- TTS, Geo, Rive.

## Betroffene Dateien

- `nextjs/lib/buddy/prompt.ts` — Marker-Anweisung.
- `nextjs/lib/buddy/stream.ts` — `splitAnswerSegments` (+ Typ `AnswerSegment`).
- `nextjs/lib/buddy/stream.test.ts` — Tests.
- `nextjs/app/components/buddy/BuddyWidget.tsx` — Inline-Rendering + Fallback.
- ggf. `nextjs/lib/buddy/prompt.test.ts` — Assertion für Marker-Hinweis.
