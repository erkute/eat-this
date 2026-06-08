# Buddy Inline-Spot-Karten Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remys Spot-Karten erscheinen inline direkt unter der jeweiligen Restaurant-Vorstellung statt als Block am Ende — gesteuert über Slug-Marker `[[spot:<slug>]]`, die Remy in den Text setzt.

**Architecture:** Reine Parser-Funktion `splitAnswerSegments` zerlegt den gestreamten Antworttext an den Markern in geordnete Text-/Spot-Segmente; `BuddyWidget` rendert sie in Reihenfolge (Text via `FormattedText`, Spot via `SpotCard`). Der Prompt weist Remy an, nach jeder Eat-This-Vorstellung den Marker zu setzen und behördliches Wording zu vermeiden. Kein neues Stream-Event.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest. Dateien unter `nextjs/lib/buddy/` und `nextjs/app/components/buddy/`.

**Working dir:** Alle Pfade relativ zu `/Users/ersane/Downloads/Projekte/eat-this-buddy-preview`. Tests laufen aus `nextjs/`.

---

## Task 1: Parser `splitAnswerSegments`

**Files:**
- Modify: `nextjs/lib/buddy/stream.ts`
- Test: `nextjs/lib/buddy/stream.test.ts`

- [ ] **Step 1: Write the failing tests**

In `nextjs/lib/buddy/stream.test.ts` den Import erweitern und einen neuen Block anfügen:

Import-Zeile ändern zu:
```ts
import { encodeBuddyEvent, sanitizeLinks, splitAnswerSegments } from './stream'
```

Am Dateiende anfügen:
```ts
describe('splitAnswerSegments', () => {
  const allowed = new Set(['zola', 'oliveto'])

  it('interleaves text and spot segments in order', () => {
    const content = 'Pizza-Lust!\n**ZOLA** Neapolitanisch\n[[spot:zola]]\n**Oliveto** Klassiker\n[[spot:oliveto]]'
    const { segments, placedSlugs } = splitAnswerSegments(content, allowed)
    expect(segments.map((s) => s.type)).toEqual(['text', 'spot', 'text', 'spot'])
    expect(segments[1]).toEqual({ type: 'spot', slug: 'zola' })
    expect(segments[3]).toEqual({ type: 'spot', slug: 'oliveto' })
    expect(placedSlugs).toEqual(['zola', 'oliveto'])
  })

  it('drops markers with an unknown slug and keeps the surrounding text', () => {
    const { segments, placedSlugs } = splitAnswerSegments('A [[spot:ghost]] B', allowed)
    expect(segments).toHaveLength(1)
    expect(segments[0].type).toBe('text')
    expect(segments[0]).toMatchObject({ type: 'text' })
    expect((segments[0] as { text: string }).text).toContain('A')
    expect((segments[0] as { text: string }).text).toContain('B')
    expect((segments[0] as { text: string }).text).not.toContain('[[spot')
    expect(placedSlugs).toEqual([])
  })

  it('places a duplicated slug only once', () => {
    const { segments, placedSlugs } = splitAnswerSegments('X [[spot:zola]] Y [[spot:zola]] Z', allowed)
    expect(segments.filter((s) => s.type === 'spot')).toEqual([{ type: 'spot', slug: 'zola' }])
    expect(placedSlugs).toEqual(['zola'])
  })

  it('hides an incomplete trailing marker while streaming', () => {
    const { segments } = splitAnswerSegments('Hier ist ZOLA [[spot:zo', allowed)
    expect(segments).toEqual([{ type: 'text', text: 'Hier ist ZOLA ' }])
  })

  it('returns a single text segment when there are no markers', () => {
    const { segments, placedSlugs } = splitAnswerSegments('Nur Text ohne Marker', allowed)
    expect(segments).toEqual([{ type: 'text', text: 'Nur Text ohne Marker' }])
    expect(placedSlugs).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd nextjs && npx vitest run lib/buddy/stream.test.ts`
Expected: FAIL — `splitAnswerSegments is not a function` / import error.

- [ ] **Step 3: Implement `splitAnswerSegments`**

In `nextjs/lib/buddy/stream.ts` ans Dateiende anfügen:
```ts
export type AnswerSegment =
  | { type: 'text'; text: string }
  | { type: 'spot'; slug: string }

const SPOT_MARKER = /\[\[spot:([a-z0-9-]+)\]\]/g

// Splits a (possibly mid-stream) answer into ordered text/spot segments at the
// `[[spot:<slug>]]` markers Remy emits. Unknown or duplicate slugs are dropped
// (their text is kept), and an incomplete trailing marker is hidden so it
// doesn't flash while streaming.
export function splitAnswerSegments(
  content: string,
  allowedSlugs: Set<string>,
): { segments: AnswerSegment[]; placedSlugs: string[] } {
  // Cut a dangling '[[' that has no closing ']]' after it (incomplete marker).
  let text = content
  const lastOpen = text.lastIndexOf('[[')
  const lastClose = text.lastIndexOf(']]')
  if (lastOpen > lastClose) text = text.slice(0, lastOpen)

  const segments: AnswerSegment[] = []
  const placed = new Set<string>()
  let buf = ''
  let lastIndex = 0
  const flush = () => {
    if (buf.trim().length > 0) segments.push({ type: 'text', text: buf })
    buf = ''
  }

  SPOT_MARKER.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = SPOT_MARKER.exec(text)) !== null) {
    buf += text.slice(lastIndex, m.index)
    lastIndex = m.index + m[0].length
    const slug = m[1]
    if (!allowedSlugs.has(slug) || placed.has(slug)) continue // drop marker, keep buffering text
    flush()
    placed.add(slug)
    segments.push({ type: 'spot', slug })
  }
  buf += text.slice(lastIndex)
  flush()

  return { segments, placedSlugs: [...placed] }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd nextjs && npx vitest run lib/buddy/stream.test.ts`
Expected: PASS (all `splitAnswerSegments` tests + existing `sanitizeLinks`/`encodeBuddyEvent`).

- [ ] **Step 5: Commit**

```bash
git add nextjs/lib/buddy/stream.ts nextjs/lib/buddy/stream.test.ts
git commit -m "feat(buddy): splitAnswerSegments parser for inline spot markers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Prompt — Marker-Anweisung + natürliches Wording

**Files:**
- Modify: `nextjs/lib/buddy/prompt.ts`
- Test: `nextjs/lib/buddy/prompt.test.ts`

- [ ] **Step 1: Write the failing test**

In `nextjs/lib/buddy/prompt.test.ts` im ersten `it`-Block am Ende ergänzen:
```ts
    // inline cards: a per-spot marker instruction is present
    expect(p).toMatch(/\[\[spot:/)
    // no clinical "geprüfte Auswahl" framing pushed to the user
    expect(p).toMatch(/natürlich/i)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd nextjs && npx vitest run lib/buddy/prompt.test.ts`
Expected: FAIL — prompt does not yet contain `[[spot:` / `natürlich`.

- [ ] **Step 3: Update the prompt**

In `nextjs/lib/buddy/prompt.ts` die `## So empfiehlst du (gestuft)`-Sektion ersetzen. Aktueller Block:
```ts
    '## So empfiehlst du (gestuft)',
    '1. ZUERST IMMER die geprüften Eat-This-Spots aus dem `search_spots`-Ergebnis — das sind unsere kuratierten, gereviewten Empfehlungen, und sie erscheinen als verlinkte Karten unter deiner Antwort. Wähle die 2–4 passendsten und führe sie an.',
    '2. WENN das Ergebnis dünn ist oder nicht wirklich zur Anfrage passt (z.B. kaum echte Treffer für „Burger"), darfst du zusätzlich 1–2 stadtbekannte Berliner Spots aus deinem eigenen Wissen ergänzen — aber kennzeichne sie klar als nicht-geprüft, z.B. mit einer Zeile wie „Nicht aus unserer geprüften Auswahl, aber in Berlin etabliert:". Nenne nur Orte, von deren Existenz du wirklich überzeugt bist.',
```
ersetzen durch:
```ts
    '## So empfiehlst du (gestuft)',
    '1. ZUERST IMMER die Eat-This-Spots aus dem `search_spots`-Ergebnis — unsere eigenen Empfehlungen. Wähle die 2–4 passendsten. Stell jeden in einem kurzen eigenen Absatz vor (Name fett + ein knapper Grund: Küche/Vibe/Tipp).',
    '2. Setze UNMITTELBAR nach jeder dieser Vorstellungen, auf einer EIGENEN ZEILE, den Marker `[[spot:<slug>]]` — den `slug` nimmst du exakt aus dem `search_spots`-Ergebnis. Die App macht daraus eine klickbare Map-Karte direkt unter der Vorstellung. Nutze NUR Slugs aus dem Ergebnis; erfinde keine. Beispiel:\n   **ZOLA** (Kreuzberg) — neapolitanische Pizza am Holzofen, 24h-Teig.\n   [[spot:zola]]',
    '3. WENN das Ergebnis dünn ist oder nicht wirklich passt (z.B. kaum echte Treffer für „Burger"), darfst du DANACH 1–2 stadtbekannte Berliner Spots aus deinem Wissen ergänzen — als reinen Text OHNE Marker, mit einer natürlichen Zeile wie „Kein klassischer Eat-This-Tipp, aber in Berlin etabliert:". Nenne nur Orte, von deren Existenz du wirklich überzeugt bist.',
    '',
    '## Wording',
    '- Stell die Spots NATÜRLICH vor, wie ein Freund, der Tipps gibt. Sag NIE „aus unserer geprüften Auswahl", „aus unserem Bestand", „kuratierte Auswahl" o.Ä. — das klingt behördlich. Einfach direkt empfehlen.',
```

- [ ] **Step 4: Update the anti-hallucination line that mentions auto-linking**

In `nextjs/lib/buddy/prompt.ts` die Zeile
```ts
    '- Halte geprüfte Eat-This-Spots und eigene Ergänzungen klar getrennt. Nur die geprüften Spots werden unten automatisch verlinkt; eigene Ergänzungen bekommen keinen Link.',
```
ersetzen durch:
```ts
    '- Halte Eat-This-Spots und eigene Ergänzungen klar getrennt. Nur Eat-This-Spots bekommen einen `[[spot:<slug>]]`-Marker (= Karte); eigene Ergänzungen NIE.',
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd nextjs && npx vitest run lib/buddy/prompt.test.ts`
Expected: PASS (both `it`-Blöcke, inkl. neuer Marker-/Wording-Assertions).

- [ ] **Step 6: Commit**

```bash
git add nextjs/lib/buddy/prompt.ts nextjs/lib/buddy/prompt.test.ts
git commit -m "feat(buddy): prompt emits per-spot markers, drops clinical wording

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: BuddyWidget — Inline-Rendering + gedeckelter Fallback

**Files:**
- Modify: `nextjs/app/components/buddy/BuddyWidget.tsx`

- [ ] **Step 1: Import the parser**

In `nextjs/app/components/buddy/BuddyWidget.tsx` die Import-Gruppe ergänzen (nach den bestehenden buddy-Imports):
```ts
import { splitAnswerSegments } from '@/lib/buddy/stream'
```

- [ ] **Step 2: Add a `BotMessage` component**

In `nextjs/app/components/buddy/BuddyWidget.tsx` direkt VOR `export default function BuddyWidget()` einfügen:
```tsx
// Renders one assistant message: prose with spot cards interleaved at their
// `[[spot:<slug>]]` markers. Spots Remy didn't place inline fall back to a block
// at the end — but only when he placed NONE (else we'd re-introduce the noise of
// dumping unrelated candidates) and only once streaming for this message ended.
function BotMessage({
  m,
  locale,
  streaming,
  onSpotSelect,
  thinkingLabel,
}: {
  m: BuddyDisplayMessage
  locale: Locale
  streaming: boolean
  onSpotSelect: () => void
  thinkingLabel: string
}) {
  if (!m.content) {
    return streaming ? <TypingDots label={thinkingLabel} /> : null
  }
  const spots = m.spots ?? []
  const allowed = new Set(spots.map((s) => s.slug))
  const bySlug = new Map(spots.map((s) => [s.slug, s]))
  const { segments, placedSlugs } = splitAnswerSegments(m.content, allowed)
  const showFallback = !streaming && placedSlugs.length === 0 && spots.length > 0

  return (
    <>
      {segments.map((seg, si) =>
        seg.type === 'text' ? (
          <FormattedText key={si} text={seg.text} />
        ) : bySlug.has(seg.slug) ? (
          <div key={si} className={styles.spots}>
            <SpotCard spot={bySlug.get(seg.slug)!} locale={locale} onSelect={onSpotSelect} />
          </div>
        ) : null,
      )}
      {showFallback && (
        <div className={styles.spots}>
          {spots.slice(0, 4).map((s) => (
            <SpotCard key={s.slug} spot={s} locale={locale} onSelect={onSpotSelect} />
          ))}
        </div>
      )}
    </>
  )
}
```

Hinweis: `BuddyDisplayMessage` wird bereits aus `./useBuddyChat` importiert? Prüfen — falls nicht, Import ergänzen:
```ts
import { useBuddyChat, type BuddyDisplayMessage } from './useBuddyChat'
```
(Die bestehende Zeile `import { useBuddyChat } from './useBuddyChat'` entsprechend erweitern.)

- [ ] **Step 3: Use `BotMessage` in the message list**

In `nextjs/app/components/buddy/BuddyWidget.tsx` den Assistant-Zweig der `messages.map(...)` ersetzen. Aktuell:
```tsx
              ) : (
                <div key={i} className={styles.msgBot}>
                  {m.content ? (
                    <FormattedText text={m.content} />
                  ) : isStreaming && i === messages.length - 1 ? (
                    <TypingDots label={t.thinking} />
                  ) : null}
                  {m.spots && m.spots.length > 0 && !(isStreaming && i === messages.length - 1) && (
                    <div className={styles.spots}>
                      {m.spots.slice(0, 4).map((s) => (
                        <SpotCard key={s.slug} spot={s} locale={locale} onSelect={() => setOpen(false)} />
                      ))}
                    </div>
                  )}
                </div>
              ),
```
ersetzen durch:
```tsx
              ) : (
                <div key={i} className={styles.msgBot}>
                  <BotMessage
                    m={m}
                    locale={locale}
                    streaming={isStreaming && i === messages.length - 1}
                    onSpotSelect={() => setOpen(false)}
                    thinkingLabel={t.thinking}
                  />
                </div>
              ),
```

- [ ] **Step 4: Run the buddy tests + typecheck**

Run: `cd nextjs && npx vitest run app/components/buddy lib/buddy`
Expected: PASS (29+ tests). `BuddyWidget.test.tsx` rendert weiterhin den Launcher.

Run: `cd nextjs && npx tsc --noEmit`
Expected: keine neuen Fehler in `BuddyWidget.tsx` / `stream.ts`.

- [ ] **Step 5: Commit**

```bash
git add nextjs/app/components/buddy/BuddyWidget.tsx
git commit -m "feat(buddy): render spot cards inline at their markers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Live-Verifikation + Staging-Deploy

**Files:** keine (Verifikation/Deploy)

- [ ] **Step 1: Dev-Server starten (falls nicht aktiv) und im Browser testen**

```bash
cd nextjs && PORT=3002 nohup npm run dev -- -p 3002 > "$CLAUDE_JOB_DIR/tmp/buddy-dev.log" 2>&1 &
```
Im Browser (`http://localhost:3002/`) Remy öffnen, „Ich hab Bock auf richtig gute Pizza" senden. Prüfen:
- Jede Eat-This-Vorstellung hat ihre Karte DIREKT darunter (nicht als Block unten).
- Kein sichtbarer `[[spot:…]]`-Marker im Text.
- Kein „geprüfte Auswahl"/„Bestand"-Wording.
- Während des Streamens kein Marker-Flackern.

- [ ] **Step 2: Volle Test-Suite**

Run: `cd nextjs && npx vitest run lib/buddy app/components/buddy`
Expected: PASS.

- [ ] **Step 3: Dev stoppen, auf Staging deployen**

```bash
cd "/Users/ersane/Downloads/Projekte/eat-this-buddy-preview"
lsof -ti:3002 | xargs kill 2>/dev/null
git push origin feature/ki-buddy feature/ki-buddy:staging
```
Erwartung: Pre-Push-Hook „build clean", `staging` aktualisiert → Firebase rollt aus. (Erst nach User-Freigabe, falls gewünscht.)

- [ ] **Step 4: Memory aktualisieren**

In `eat-this-ki-buddy.md` den Punkt „Inline-Karten via Slug-Marker" als gebaut vermerken.

---

## Notes

- Reihenfolge-Garantie: Der Marker kommt im Stream IMMER nach der Vorstellung, daher erscheint eine Karte nie über ihrem Text — das frühere „Karte schiebt sich unter den Text"-Problem entfällt strukturell.
- `sanitizeLinks` bleibt unverändert; es matcht nur Markdown-Restaurant-Links, nicht die `[[spot:…]]`-Marker.
- Kein neues Stream-Event, keine Orchestrator-Änderung.
