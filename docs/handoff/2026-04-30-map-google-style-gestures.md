# Map Bottom-Sheet — Google-Maps-Style Gesture Architecture

> **Übergabe für neue Session.** Status, Lernkurve, Mockup, Implementierungsplan.

## TL;DR

Wir haben versucht das Sheet von **überall** draggable zu machen (Handle, Header, Tabs, Liste) mit Direction-Lock-Heuristik. Das hat auf iOS Safari Edge-Cases produziert (vertikale Scroll-Geste innerhalb der Liste wurde mid-touch als Sheet-Drag fehlinterpretiert → Sheet snapt zu peek → `.listAtPeek` opacity:0 → User sieht graue Fläche).

**Plan:** Stattdessen Google-Maps-Style **räumliche Trennung** der Gesture-Zonen. Eine Touch-Position macht genau eine Geste.

## Aktueller Stand auf `main` (Commit `fa52d94`)

**Rollback durchgeführt** — `nextjs/lib/map/useBottomSheet.ts` und `nextjs/app/components/map/MustEatDetail.tsx` sind zurück auf den Stand von Commit `17648f5`. Konkret:

- ✅ Sheet-Snap funktioniert wieder normal (peek/mid/full)
- ✅ Handle-Drag funktioniert (`useBottomSheet`'s pointer-handler auf `handleRef`)
- ✅ Content-Drag funktioniert (auf `contentRef` für peek-overscroll-up)
- ❌ Header-Drag (Count + Buttons + Tabs) — entfernt mit Rollback. Gibt's nicht mehr.
- ❌ Auto-Unlock Must-Eat — entfernt. UNLOCK_RADIUS_METERS zurück auf 200m. User muss zum Aufdecken tippen.
- ✅ Build-Fixes für Firebase (`@parcel/watcher-linux-x64-glibc`, `@swc/core-linux-x64-gnu` als optionalDependencies in `nextjs/package.json`) bleiben drin.
- ✅ FilterDropdown click-only stopPropagation bleibt drin (= clicks fallen nicht mehr durch zur Liste, aber touch-Events können propagieren = Dropdown ist nativ scrollbar).

## Was wir gelernt haben (was NICHT funktioniert)

### 1. Eine Touch-Zone für mehrere Richtungen
Direction-Lock-Heuristik (`if Math.abs(dx) > Math.abs(dy)`) klingt sauber, aber:
- iOS Safari kann mid-Touch nicht zuverlässig die Geste neuklassifizieren
- Diagonale Bewegungen werden falsch interpretiert
- Selbst mit 8px-Threshold konflikten Tab-Scroll und Sheet-Drag

### 2. Auto-Unlock useEffect
Mit `userLocation` als prop und GPS-Jitter feuert die useEffect immer wieder. Auch wenn idempotent, war der UX-Effekt unklar (Karte könnte sich öffnen wenn user kurz im Radius war und dann wieder raus).

### 3. Aggressives stopPropagation auf Touch-Events
`onTouchStart={stopPropagation}` auf dem Filter-Dropdown-Wrapper hat den **nativen Scroll** im Dropdown selbst kaputt gemacht. iOS braucht die touch-Events zum scrollen. Nur `onClick` darf gestoppt werden.

## Google-Maps-Style Architektur — Mockup

```
┌─────────────────────────────────┐
│   [global header — nav icons]   │  ← außerhalb Sheet
├═════════════════════════════════┤  ← Sheet beginnt hier
│                                 │
│        ▬▬▬▬                     │  Zone A — DRAG-ONLY
│                                 │   (handle pip, ~40px tall)
├─────────────────────────────────┤
│                                 │
│  119 Restaurants     [🔍] [⚙]   │  Zone B — DRAG + tap-buttons
│                                 │   (count row, 8px-Schwelle:
│                                 │    drag wenn dy>=8, sonst tap)
├─────────────────────────────────┤
│                                 │
│  [Alle][Dinner][Lunch][...]→    │  Zone C — HORIZONTAL SCROLL ONLY
│                                 │   (CategoryFilter chips,
│                                 │    KEIN sheet-drag-handler
│                                 │    register hier)
├─────────────────────────────────┤
│                                 │
│  📷 Restaurant 1                │  Zone D — VERTICAL SCROLL
│      Bezirk · € · 320m · 4 Min  │   + overscroll-down → snap-peek
│                                 │   (existierender Content-Drag-
│  📷 Restaurant 2                │    Handler, aber nur wenn
│      ...                        │    scrollTop=0 + dy>0)
│                                 │
└─────────────────────────────────┘
```

### Was Google Maps konkret macht

| Zone | Content | Geste |
|------|---------|-------|
| Handle | dünner Pill | Drag in beide vertikalen Richtungen |
| Title-Bar | "Search results" + Filter-Icons | Drag (oben)  |
| Filter-Chip-Row | horizontal scrollbare Kategorien | NUR horizontal scroll, niemals Sheet-Drag |
| Result-Liste | vertikale Liste | Native vertikaler Scroll. Bei `scrollTop===0` + downward-pull: Sheet collapse |
| Detail-Card | Info zum gewählten Result | Sheet drag (oben), inneres scroll bei langem Content |

**Kern-Idee:** Eine Touch-Position kann nur EINE Geste auslösen. Keine Direction-Lock-Heuristik, keine "wir entscheiden das mid-touch".

### Konkrete React/CSS Implementierung

#### 1. JSX in `MapSection.tsx` für die List-View

```tsx
<aside ref={setSheetRef} className={listClasses}>
  {/* Zone A — drag handle (existing) */}
  <div ref={handleRef} className={styles.handle} />

  {/* Zone B — count + filter/search row, NEW dragRef wraps just this */}
  <div ref={setHeaderDragRef} className={styles.listHeaderTopRow}>
    <span>{count} Restaurants</span>
    <div className={styles.listHeaderActions}>
      <SearchButton />
      <FilterButton />
    </div>
  </div>

  {/* Zone C — tabs, NO drag handler, just native horizontal scroll */}
  <CategoryFilter ... />

  {/* Zone D — list, content-drag handler ONLY for peek-collapse */}
  <div ref={setContentRef} className={styles.listScroll}>
    <RestaurantList ... />
  </div>
</aside>
```

#### 2. `useBottomSheet` exposes:

- `handleRef` — pointer-drag handler (existing, kein 8px-Threshold, sofortiger Drag-Start beim Down)
- `setHeaderDragRef` — touch-handler MIT 8px-Threshold (tap-vs-drag), KEIN Direction-Lock (vertikal-only sind die einzigen Touches in dieser Zone)
- `setContentRef` — touch-handler nur für "scrollTop===0 + dy>0" → Sheet snap to peek

**Wichtig:** Der Header-Drag-Handler darf NICHT auf der Tabs-Zone registriert werden. Tabs werden absichtlich AUSGELASSEN von der drag-zone.

#### 3. Tabs (`CategoryFilter`)

Kein touch-listener. Reine native CSS:
```css
.chips {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
}
```

Da kein Drag-Handler dazwischen funkt, scrollt das nativ ohne Konflikt.

## Schritt-für-Schritt Implementierung (für neue Session)

1. **Branch** anlegen: `git checkout -b feat/map-google-gestures` von `main` (HEAD = `fa52d94`).
2. **`useBottomSheet`** erweitern:
   - `setHeaderDragRef` callback ref hinzufügen (parallel zu `setContentRef`)
   - Drag-Handler auf den header-element registrieren mit:
     - `passive: false` auf touchmove
     - 8px-Threshold (tap-vs-drag) — kein Direction-Lock
     - `setDragging(true)` wenn aktiv, `e.preventDefault()` wenn aktiv
     - On touchend: `setSnap(pxToNearestSnap(...))`
   - Die existierende `headerRef`-Zeile aus dem Rollback ist weg, das ist der Punkt von dem aus aufgebaut wird.
3. **`MapSection.tsx`**:
   - JSX restrukturieren so dass die Count-Row + Filter/Search-Buttons in einem eigenen `<div ref={setHeaderDragRef}>` Wrapper sind, GETRENNT vom CategoryFilter-Wrapper.
   - CategoryFilter bekommt KEINE drag-ref, der Tabs-Container ist vollständig native scrollable.
   - List bleibt mit `setContentRef` → Content-Drag-Handler funktioniert für peek-overscroll-collapse.
4. **`MustEatDetail.tsx`**:
   - Auto-Unlock-useEffect NICHT wieder einbauen (wir haben gelernt das ist UX-mäßig unklar mit GPS-Jitter)
   - Stattdessen: deutlicheren Hint im locked-State anzeigen wenn user nahe ist ("Du bist 250m entfernt — innerhalb 200m tippen zum Aufdecken")
5. **Verify auf Mobile-Preview** (375x812 oder 393x852) BEVOR push:
   - Tabs horizontal wischen → kein Sheet-Hop
   - Liste vertikal scrollen → kein Sheet-Hop
   - Vom Top der Liste runter pullen → Sheet collapsed zu peek
   - Header-Row antippen (Filter / Search Button) → Button feuert, kein Drag
   - Header-Row vertikal wischen → Sheet draggt
6. **User testen lassen vor Push** (das hatten wir vorher übersprungen, deswegen kamen die Probleme).

## Wichtige Repo-Realien für die neue Session

- **Worktree:** `.worktrees/feat-map-detail-ux` existiert noch. Branch dort ist `feat/map-detail-ux`. Vor Beginn checken ob's noch in Sync mit main ist; sonst löschen und neuen Worktree anlegen.
- **Pre-Push-Hook in `.git/hooks/pre-push`** läuft `npm run build` automatisch vor jedem Push. Mac-Build crasht NICHT auf @parcel/watcher / @swc/core, deswegen täuscht der Hook über Linux-Probleme. → Nach jedem package.json-change Firebase-Rollout-Status checken (`firebase apphosting:backends:list`).
- **Parallele Sessions:** Die andere Session arbeitet an Profile/Onboarding (commits `4bb7f21`, `c8d8b92` auf main von dort). NICHT deren Files anfassen.
- **CLAUDE.md** im Repo-Root hat detaillierte Git-Hygiene-Regeln — nur eigene Files staged committen, niemals `git add -A`.

## Was an der App SONST schon funktioniert (nicht anfassen!)

| Feature | Status | Datei |
|---|---|---|
| Marker-Cluster bei low zoom | ✅ live | `lib/map/useClusters.ts`, `app/components/map/ClusterMarker.tsx` |
| Onboarding Handle-Ping (1×) | ✅ live | localStorage flag `eatthis-handle-ping-seen` |
| @property --sheet-y für smooth Snap-Animation | ✅ live | `map.module.css` |
| Distanz + Walking-Time in Listen-Rows | ✅ live | `RestaurantList.tsx`, `lib/map/distance.ts` |
| Detail-Close → snap to peek (Marker sichtbar) | ✅ live | `MapSection.tsx` handlers |
| Map-Click → snap to peek (immer) | ✅ live | `handleMapClick` |
| GPS-Button bottom-right, sheet-aware | ✅ live | `map.module.css` `.fab` |
| Loading 4,2s → 1,6s | ✅ live | `MapSection.tsx` `setMinDelayElapsed` |
| Detail-Sheet auto-fit content + dynamic hero shrink | ✅ live | `snapDetailToContent` |
| Filter-Dropdown viewport-aware (scroll, click-only stopProp) | ✅ live | `FilterDropdown.tsx` |
| Fan-Spread für mehrere Must-Eats (18°/card, parent-rotation) | ✅ live | `fanOffset.ts`, `MustEatMarker.tsx` |
| Overnight-Opening-Hours (Bursa "Open" statt "Closed" 11:00-01:00) | ✅ live | `lib/map/openingHours.ts` |
| Pre-Push Hook (full nextjs build) | ✅ aktiv | `.git/hooks/pre-push` |

## Backlog (NICHT mehr nötig laut User-Feedback)

- Persistent Search-Bar oben — User: "kuratierte Auswahl, weniger Such-Bedarf"
- Ratings/Reviews — User: "Kuration > Reviews"

## Open Questions für nächste Session

1. **Soll der Header-Drag (Zone B) immediat-drag haben (wie Handle, Zone A) oder mit 8px-Threshold (tap-as-click)?** Empfehlung: 8px-Threshold weil sonst Filter-Tap nicht mehr funktioniert.
2. **Soll die Liste mit "down-scroll von beliebiger Position" auch zu peek collapsen, oder nur von scrollTop=0?** Google macht's nur von scrollTop=0. Empfehlung: gleich.
3. **Auto-Unlock Must-Eat — gar nicht oder mit Bestätigung?** Mein Vorschlag oben: kein Auto-Unlock, nur klarere UI.

---

**Nächster Schritt:** Mockup oben mit User durchgehen, Architektur bestätigen, dann implementieren.

---

## Erstes Prompt für die neue Session

> Lies `docs/handoff/2026-04-30-map-google-style-gestures.md` und mache mir einen interaktiven HTML-Mockup der Google-Maps-Style Gesture-Zonen so wie da beschrieben. Speicher den Mockup als `docs/handoff/mockup-gesture-zones.html`. Ich öffne den dann lokal und schaue ob ich das so will, dann fangen wir mit der Implementation an.
