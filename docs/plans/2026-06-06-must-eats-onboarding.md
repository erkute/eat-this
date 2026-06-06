# Must-Eats-Onboarding + Copy-Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Erstbesucher der Must-Eats-Seite verstehen das Sammelkarten-Prinzip über ein First-Visit-Onboarding mit Karten-Flip plus dauerhaft klareren Sub-Text.

**Architecture:** Neue Client-Island `MustEatsOnboarding.tsx` (Trigger-Link „Wie funktioniert's?" + Portal-Overlay mit 3 Schritten und CSS-3D-Flip-Demo-Karte), eingebunden in die Server-Komponente `MustEatsSection.tsx`. First-Visit via `localStorage`-Flag im `useEffect` (kein SSR-Render, kein Hydration-Risiko). Demo-Karten-Auswahl als pure Funktion in `lib/home/mustEatsGallery.ts`.

**Tech Stack:** Next.js App Router, React Client Island, CSS Modules (kein framer-motion nötig — Flip + Entry sind pure CSS), vitest + @testing-library/react (jsdom per `// @vitest-environment jsdom`).

**Spec:** `docs/specs/2026-06-06-must-eats-onboarding-design.md`

**Branch:** `feat/must-eats-onboarding` (existiert bereits, ab `origin/staging`)

**Wichtige Projektregeln:**
- Kein Opacity-Fade für Bewegung (Entry = translate von unten; Backdrop-Tint ist als State-Change erlaubt)
- Git: nur explizit eigene Dateien stagen, nie `git add .`
- `npm run build` NICHT laufen lassen, solange `npm run dev` aktiv ist
- Alle Befehle laufen in `nextjs/`

---

## Dateistruktur

| Datei | Verantwortung |
|---|---|
| `nextjs/lib/home/mustEatsGallery.ts` (Modify) | + `pickOnboardingDemoCard()` — pure Auswahl der Demo-Karte |
| `nextjs/lib/home/mustEatsGallery.test.ts` (Modify) | + Tests für `pickOnboardingDemoCard` |
| `nextjs/lib/i18n/translations.ts` (Modify) | + Onboarding-Strings im `mustEats`-Block (EN + DE) |
| `nextjs/app/components/MustEatsOnboarding.tsx` (Create) | Client-Island: Trigger-Link + Overlay, Schritt-State, Flip-Choreografie, localStorage-Flag |
| `nextjs/app/components/MustEatsOnboarding.module.css` (Create) | Backdrop, Panel (Entry: translate von unten), 3D-Flip, Dots, Buttons |
| `nextjs/app/components/MustEatsOnboarding.test.tsx` (Create) | jsdom-Interaktionstests |
| `nextjs/app/components/MustEatsSection.tsx` (Modify) | Neuer Sub-Text (DE/EN), rendert `<MustEatsOnboarding />` |
| `nextjs/app/components/MustEatsSection.test.tsx` (Modify) | Mock für Onboarding-Island, Assertion auf neuen Sub-Text |

---

### Task 1: Demo-Karten-Helper `pickOnboardingDemoCard`

**Files:**
- Modify: `nextjs/lib/home/mustEatsGallery.ts`
- Test: `nextjs/lib/home/mustEatsGallery.test.ts`

- [ ] **Step 1: Failing Test schreiben**

In `nextjs/lib/home/mustEatsGallery.test.ts` ans Ende anfügen (die bestehende Test-Datei nutzt bereits `MapMustEat`-Fixtures — vorhandene Helper/Factories wiederverwenden, falls eine `me(...)`-Factory existiert; sonst diese Minimal-Factory oben ergänzen):

```ts
import { pickOnboardingDemoCard } from './mustEatsGallery'

function demoMe(id: string, image: string): MapMustEat {
  return {
    _id: id,
    dish: `Dish ${id}`,
    image,
    restaurant: { _id: `r-${id}`, name: 'R', slug: 'r', lat: 52.52, lng: 13.405 },
  } as MapMustEat
}

describe('pickOnboardingDemoCard', () => {
  it('returns the first face-up must-eat', () => {
    const list = [demoMe('a', 'img-a'), demoMe('b', 'img-b'), demoMe('c', 'img-c')]
    const result = pickOnboardingDemoCard(list, new Set(['b', 'c']))
    expect(result?._id).toBe('b')
  })

  it('falls back to the first card when nothing is face-up', () => {
    const list = [demoMe('a', 'img-a'), demoMe('b', 'img-b')]
    const result = pickOnboardingDemoCard(list, new Set())
    expect(result?._id).toBe('a')
  })

  it('returns null for an empty catalog', () => {
    expect(pickOnboardingDemoCard([], new Set())).toBeNull()
  })
})
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `cd nextjs && npx vitest run lib/home/mustEatsGallery.test.ts`
Expected: FAIL — `pickOnboardingDemoCard` is not exported.

- [ ] **Step 3: Implementierung**

In `nextjs/lib/home/mustEatsGallery.ts` ans Ende anfügen:

```ts
/** Pick the demo card for the Must-Eats onboarding overlay: the first
 *  face-up must-eat (anon view), falling back to the first card at all.
 *  Null when the catalog is empty — the overlay then shows the card back. */
export function pickOnboardingDemoCard(
  mustEats: MapMustEat[],
  unlockedIds: Set<string>,
): MapMustEat | null {
  return mustEats.find((m) => unlockedIds.has(m._id)) ?? mustEats[0] ?? null
}
```

- [ ] **Step 4: Test laufen lassen — muss grün sein**

Run: `cd nextjs && npx vitest run lib/home/mustEatsGallery.test.ts`
Expected: PASS (alle Tests, auch die bestehenden).

- [ ] **Step 5: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This"
git add nextjs/lib/home/mustEatsGallery.ts nextjs/lib/home/mustEatsGallery.test.ts
git commit -m "feat(must-eats): add pickOnboardingDemoCard helper"
```

---

### Task 2: i18n-Strings für das Onboarding

**Files:**
- Modify: `nextjs/lib/i18n/translations.ts` (EN-`mustEats`-Block ~Zeile 98, DE-`mustEats`-Block ~Zeile 436)

- [ ] **Step 1: EN-Block ergänzen**

Im **EN**-`mustEats`-Block (der mit `filterAll: "All"`), nach `covered: "Face-down",` einfügen:

```ts
    howItWorks: "How does it work?",
    onbStep1: "Every top restaurant has ONE dish you need to try.",
    onbStep2: "Face-down cards flip by themselves when you're at the restaurant.",
    onbStep3: "Booster Packs bring you new spots — many with a Must Eat.",
    onbNext: "Next",
    onbStart: "Let's go",
    onbClose: "Close",
```

- [ ] **Step 2: DE-Block ergänzen**

Im **DE**-`mustEats`-Block (der mit `filterAll: "Alle"`), nach `covered: "Verdeckt",` einfügen:

```ts
    howItWorks: "Wie funktioniert's?",
    onbStep1: "Jedes Top-Restaurant hat EIN Gericht, das du probiert haben musst.",
    onbStep2: "Verdeckte Karten drehen sich von selbst um, wenn du beim Restaurant bist.",
    onbStep3: "Booster Packs bringen dir neue Spots — viele mit einem Must Eat.",
    onbNext: "Weiter",
    onbStart: "Los geht's",
    onbClose: "Schließen",
```

- [ ] **Step 3: Typecheck**

Run: `cd nextjs && npx tsc --noEmit`
Expected: keine Fehler (bzw. exakt dieselben Fehler wie vor der Änderung, falls Bestand welche hat — vorher mit `git stash`-freiem Lauf vergleichen ist nicht nötig; nur keine NEUEN Fehler in `translations.ts`).

- [ ] **Step 4: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This"
git add nextjs/lib/i18n/translations.ts
git commit -m "feat(must-eats): onboarding i18n strings (de/en)"
```

---

### Task 3: `MustEatsOnboarding`-Komponente (TDD)

**Files:**
- Create: `nextjs/app/components/MustEatsOnboarding.tsx`
- Create: `nextjs/app/components/MustEatsOnboarding.module.css`
- Test: `nextjs/app/components/MustEatsOnboarding.test.tsx`

- [ ] **Step 1: Failing Tests schreiben**

`nextjs/app/components/MustEatsOnboarding.test.tsx` anlegen. `@/lib/i18n` wird gemockt (t gibt den Key zurück) — das umgeht den next-intl-Router-Kontext, Assertions laufen gegen die Keys:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ lang: 'de', t: (k: string) => k, setLang: () => {} }),
}))

import MustEatsOnboarding, { ONBOARDING_SEEN_KEY } from '@/app/components/MustEatsOnboarding'

const DATA: InitialMapData = {
  restaurants: [],
  lockedRestaurants: [],
  mustEats: [
    {
      _id: 'me-1',
      dish: 'Königsberger Klopse',
      image: 'https://cdn.example/dish.webp',
      restaurant: { _id: 'r-1', name: 'R', slug: 'r', lat: 52.52, lng: 13.405 },
    },
  ],
  categories: [],
  totalCount: 1,
  revealedMustEatIds: ['me-1'],
}

beforeEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('MustEatsOnboarding', () => {
  it('opens on first visit (no localStorage flag)', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('mustEats.onbStep1')).toBeTruthy()
  })

  it('stays closed when the seen flag is set', () => {
    window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1')
    render(<MustEatsOnboarding initialMapData={DATA} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('close button dismisses and sets the flag', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />)
    fireEvent.click(screen.getByLabelText('mustEats.onbClose'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.localStorage.getItem(ONBOARDING_SEEN_KEY)).toBe('1')
  })

  it('"how it works" trigger reopens despite the flag', () => {
    window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1')
    render(<MustEatsOnboarding initialMapData={DATA} />)
    fireEvent.click(screen.getByText('mustEats.howItWorks'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('mustEats.onbStep1')).toBeTruthy()
  })

  it('steps forward through all three steps; last button closes and sets flag', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />)
    fireEvent.click(screen.getByText('mustEats.onbNext'))
    expect(screen.getByText('mustEats.onbStep2')).toBeTruthy()
    fireEvent.click(screen.getByText('mustEats.onbNext'))
    expect(screen.getByText('mustEats.onbStep3')).toBeTruthy()
    fireEvent.click(screen.getByText('mustEats.onbStart'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.localStorage.getItem(ONBOARDING_SEEN_KEY)).toBe('1')
  })

  it('backdrop click closes the overlay', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />)
    fireEvent.click(screen.getByRole('dialog'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.localStorage.getItem(ONBOARDING_SEEN_KEY)).toBe('1')
  })
})
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `cd nextjs && npx vitest run app/components/MustEatsOnboarding.test.tsx`
Expected: FAIL — Modul `MustEatsOnboarding` existiert nicht.

- [ ] **Step 3: Komponente implementieren**

`nextjs/app/components/MustEatsOnboarding.tsx` anlegen:

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/lib/i18n'
import { resolveUnlockedMustEatIds } from '@/lib/map'
import { pickOnboardingDemoCard } from '@/lib/home/mustEatsGallery'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import styles from './MustEatsOnboarding.module.css'

const CARD_BACK = '/pics/card-back.webp?v=5'
export const ONBOARDING_SEEN_KEY = 'mustEatsOnboardingSeen'

// Dwell on the card back in step 2 before it auto-flips open — the live
// demo of the on-site reveal. Keep shorter than the user's reading time.
const STEP2_FLIP_DELAY_MS = 800

const STEP_KEYS = ['mustEats.onbStep1', 'mustEats.onbStep2', 'mustEats.onbStep3'] as const

interface Props {
  initialMapData: InitialMapData
}

// First-visit onboarding for the Must-Eats page: 3 steps around a demo card
// that flips like the on-site reveal. Opens once (localStorage flag, set on
// dismiss), re-openable any time via the "how does it work?" trigger link
// this component renders inline. SSR renders only the trigger — `open` flips
// in an effect, so there is no hydration mismatch and no portal on the server.
export default function MustEatsOnboarding({ initialMapData }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  // Same anon face-up set the gallery shows — the demo card is one the
  // visitor can actually see face-up in the grid below.
  const demo = pickOnboardingDemoCard(
    initialMapData.mustEats,
    resolveUnlockedMustEatIds({
      uid: null,
      storedUnlockedIds: new Set<string>(),
      revealedMustEatIds: new Set<string>(initialMapData.revealedMustEatIds),
    }),
  )

  useEffect(() => {
    let seen: string | null = null
    try {
      seen = window.localStorage.getItem(ONBOARDING_SEEN_KEY)
    } catch {
      /* storage blocked → show once per pageload */
    }
    if (!seen) setOpen(true)
  }, [])

  const close = useCallback(() => {
    try {
      window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1')
    } catch {
      /* ignore */
    }
    setOpen(false)
    setStep(0)
  }, [])

  const reopen = () => {
    setStep(0)
    setOpen(true)
  }

  // Step 2 choreography: card turns face-down on entry, then auto-flips
  // open after a short dwell — demonstrating the on-site reveal.
  const [showBack, setShowBack] = useState(false)
  useEffect(() => {
    if (!open || step !== 1) {
      setShowBack(false)
      return
    }
    setShowBack(true)
    const timer = window.setTimeout(() => setShowBack(false), STEP2_FLIP_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [open, step])

  // Body scroll lock while open (same pattern as MustEatImageLightbox).
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    const prevTouchAction = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.touchAction = prevTouchAction
    }
  }, [open])

  // Escape closes.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  const last = step === STEP_KEYS.length - 1

  return (
    <>
      <button type="button" className={styles.how} onClick={reopen}>
        {t('mustEats.howItWorks')}
      </button>

      {open &&
        createPortal(
          <div className={styles.backdrop} onClick={close} role="dialog" aria-modal="true">
            <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
              <button type="button" className={styles.x} aria-label={t('mustEats.onbClose')} onClick={close}>
                ×
              </button>

              <div className={styles.cardBox}>
                <div className={showBack ? `${styles.flipper} ${styles.flipped}` : styles.flipper}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.face} src={demo?.image ?? CARD_BACK} alt={demo?.dish ?? ''} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={`${styles.face} ${styles.back}`} src={CARD_BACK} alt="" aria-hidden="true" />
                </div>
              </div>

              <p className={styles.text}>{t(STEP_KEYS[step])}</p>

              <div className={styles.dots} aria-hidden="true">
                {STEP_KEYS.map((k, i) => (
                  <span key={k} className={i === step ? `${styles.dot} ${styles.dotOn}` : styles.dot} />
                ))}
              </div>

              {last ? (
                <button type="button" className={styles.next} onClick={close}>
                  {t('mustEats.onbStart')}
                </button>
              ) : (
                <button type="button" className={styles.next} onClick={() => setStep(step + 1)}>
                  {t('mustEats.onbNext')}
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
```

- [ ] **Step 4: CSS-Modul anlegen**

`nextjs/app/components/MustEatsOnboarding.module.css` anlegen. Design-Tokens wie `MustEatsSection.module.css` (Chewy-Display-Font, Ink `#0a0a0a`, Cream `#fbf8ee`, `border-radius: 0`). Entry = translate von unten (Projektregel: kein Opacity-Fade für Bewegung; der Backdrop-Tint ist ein erlaubter State-Change):

```css
/* Must-Eats first-visit onboarding. Tokens match MustEatsSection.module.css:
   ink #0a0a0a · cream #fbf8ee · display font var(--font-chewy) · radius 0. */

/* Trigger link under the section sub copy */
.how {
  background: none;
  border: none;
  padding: 0;
  margin: 6px 0 0;
  font-size: 13px;
  color: #0a0a0a;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

/* Backdrop tint — a state change, not motion (opacity rule exception) */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 10, 0.5);
  padding: 16px;
}

/* Panel flies in from below the viewport — translate, never opacity */
.panel {
  position: relative;
  width: min(92vw, 360px);
  background: #fbf8ee;
  border: 2px solid #0a0a0a;
  border-radius: 0;
  padding: 40px 24px 24px;
  text-align: center;
  animation: onbRise 0.46s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes onbRise {
  from {
    transform: translateY(110vh);
  }
  to {
    transform: translateY(0);
  }
}

.x {
  position: absolute;
  top: 8px;
  right: 10px;
  background: none;
  border: none;
  font-size: 26px;
  line-height: 1;
  color: #0a0a0a;
  cursor: pointer;
  padding: 4px;
}

/* Demo card — same aspect as the freigestellt card art (1539×2115) */
.cardBox {
  width: min(52vw, 190px);
  margin: 0 auto 18px;
  perspective: 900px;
}
.flipper {
  position: relative;
  width: 100%;
  aspect-ratio: 1539 / 2115;
  transform-style: preserve-3d;
  transition: transform 0.8s cubic-bezier(0.4, 0.2, 0.2, 1);
}
.flipped {
  transform: rotateY(180deg);
}
.face {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  backface-visibility: hidden;
}
.back {
  transform: rotateY(180deg);
}

.text {
  font-size: 15px;
  line-height: 1.45;
  color: #0a0a0a;
  margin: 0 0 14px;
  min-height: 3.6em;
}

.dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}
.dot {
  width: 8px;
  height: 8px;
  border: 2px solid #0a0a0a;
  background: transparent;
}
.dotOn {
  background: #0a0a0a;
}

.next {
  background: #0a0a0a;
  color: #fbf8ee;
  border: 2px solid #0a0a0a;
  border-radius: 0;
  font-family: var(--font-chewy);
  font-size: 17px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 10px 22px 11px;
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .panel {
    animation: none;
  }
  .flipper {
    transition: none;
  }
}
```

- [ ] **Step 5: Tests laufen lassen — müssen grün sein**

Run: `cd nextjs && npx vitest run app/components/MustEatsOnboarding.test.tsx`
Expected: PASS (6 Tests).

- [ ] **Step 6: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This"
git add nextjs/app/components/MustEatsOnboarding.tsx nextjs/app/components/MustEatsOnboarding.module.css nextjs/app/components/MustEatsOnboarding.test.tsx
git commit -m "feat(must-eats): first-visit onboarding overlay with card flip"
```

---

### Task 4: Einbindung in `MustEatsSection` + neuer Sub-Text

**Files:**
- Modify: `nextjs/app/components/MustEatsSection.tsx`
- Test: `nextjs/app/components/MustEatsSection.test.tsx`

- [ ] **Step 1: Failing Test schreiben**

In `nextjs/app/components/MustEatsSection.test.tsx`:

Den Mock-Block oben um das Onboarding-Island ergänzen (Client-Island wie Gallery/Footer — wird im Server-Shell-Test gestubbt):

```tsx
vi.mock('@/app/components/MustEatsOnboarding', () => ({
  default: () => null,
}))
```

Und im `describe`-Block einen Test für den neuen Sub-Text anfügen:

```tsx
  it('renders the explanatory sub copy (de)', () => {
    const html = render()
    expect(html).toContain('sein Must Eat')
    expect(html).toContain('Den Rest deckst du vor Ort auf.')
  })

  it('renders the explanatory sub copy (en)', () => {
    const html = render('en')
    expect(html).toContain('its Must Eat')
    expect(html).toContain('The rest you reveal on site.')
  })
```

- [ ] **Step 2: Tests laufen lassen — neue müssen fehlschlagen**

Run: `cd nextjs && npx vitest run app/components/MustEatsSection.test.tsx`
Expected: die 2 neuen FAIL (alter Sub-Text), die 3 bestehenden PASS.

- [ ] **Step 3: `MustEatsSection.tsx` anpassen**

a) Import ergänzen:

```tsx
import MustEatsOnboarding from './MustEatsOnboarding'
```

b) In der `COPY`-Konstante die beiden `sub`-Strings ersetzen:

```tsx
// de:
sub: 'Jedes Top-Restaurant hat ein Gericht, das du probiert haben musst — sein Must Eat. Ein paar Karten liegen schon offen. Den Rest deckst du vor Ort auf.',
// en:
sub: "Every top restaurant has one dish you need to try — its Must Eat. A few cards are already face-up. The rest you reveal on site.",
```

c) Im JSX direkt nach `<p className={styles.sub}>{c.sub}</p>` (innerhalb von `.head`) einfügen:

```tsx
<MustEatsOnboarding initialMapData={initialMapData} />
```

- [ ] **Step 4: Tests laufen lassen — alle grün**

Run: `cd nextjs && npx vitest run app/components/MustEatsSection.test.tsx`
Expected: PASS (5 Tests).

- [ ] **Step 5: Sub-Text-Layout prüfen**

Der neue Sub-Text ist länger als der alte; `.sub` hat `max-width: 30ch`. Visuell checken (Schritt unten, Task 5) — falls der Text zu schmal umbricht, in `MustEatsSection.module.css` die `.sub`-Regel auf `max-width: 44ch` erhöhen. Diese Anpassung gehört dann mit in den Commit.

- [ ] **Step 6: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This"
git add nextjs/app/components/MustEatsSection.tsx nextjs/app/components/MustEatsSection.test.tsx
# falls angepasst:
git add nextjs/app/components/MustEatsSection.module.css
git commit -m "feat(must-eats): clearer sub copy + mount onboarding island"
```

---

### Task 5: Gesamtverifikation + Smoke-Test

**Files:** keine neuen — Verifikation.

- [ ] **Step 1: Volle Test-Suite**

Run: `cd nextjs && npm run test`
Expected: alle Tests PASS, keine Regressionen.

- [ ] **Step 2: Typecheck + Lint**

Run: `cd nextjs && npx tsc --noEmit && npx next lint --dir app --dir lib 2>/dev/null || npx eslint app/components/MustEatsOnboarding.tsx`
Expected: keine neuen Fehler.

- [ ] **Step 3: Manueller Smoke im Dev-Server**

(Nur wenn kein anderer Dev-Server läuft — Projektregel zu `npm run dev` vs. `build` beachten.)

Run: `cd nextjs && npm run dev`

Checks auf `http://localhost:3000/must-eats` (bzw. der SPA-Route der Must-Eats-Seite):

1. **Erstbesuch** (DevTools → Application → Local Storage → `mustEatsOnboardingSeen` löschen, reload): Overlay erscheint, Panel fliegt von unten rein, Schritt 1 zeigt offenes Gericht.
2. **Weiter** → Schritt 2: Karte dreht auf Rückseite, flippt nach ~0,8 s von selbst wieder auf.
3. **Weiter** → Schritt 3: Text zu Booster Packs, Button „Los geht's" schließt.
4. **Reload**: Overlay erscheint NICHT mehr (Flag gesetzt).
5. **„Wie funktioniert's?"**-Link unter dem Sub-Text öffnet das Overlay erneut.
6. **X / Backdrop / Escape** schließen jeweils.
7. **EN** (`/en/...`): Texte auf Englisch.
8. Sub-Text-Umbruch ok (sonst Task 4 Step 5 nachziehen).
9. Dark Mode: Panel lesbar (cream/ink ist theme-unabhängig hart codiert wie die Section selbst — nur sicherstellen, dass nichts vom Theme überschrieben wird).

- [ ] **Step 4: Abschluss-Commit (falls Smoke-Fixes nötig waren)**

Nur tatsächlich geänderte Dateien stagen, Message z. B. `fix(must-eats): onboarding smoke fixes`.

---

## Nicht in diesem Plan (bewusst, per Spec)

- Kein Swipe-Gesten-Handling
- Keine Server-Persistenz des Flags
- Kein Packs-CTA im Onboarding (neutraler Abschluss)
- Keine Änderung am Closing-Block der Seite
