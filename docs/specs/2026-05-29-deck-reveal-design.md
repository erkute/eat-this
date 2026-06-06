# Deck-Reveal — Profil Must-Eat-Reveal (Design Spec)

**Date:** 2026-05-29
**Status:** Design approved (brainstormed + bestätigt 2026-05-29 in Vor-Session), pre-implementation
**Scope:** Single feature branch → PR into `staging` → smoke → PR into `main`

---

## 1. Goal

Ein frisch eingeloggter User sieht im Profil-Deck heute **0 aufgedeckte
Must-Eats**, obwohl er korrekt im signed-Tier ist (40 Restaurants sichtbar).
Dieses Feature gibt ihm einen **aktiven, haptischen Reveal-Pfad direkt im
Deck**: eine kleine Gruppe Teaser-Karten **zittert** (idle-shake), lädt zum
Antippen ein, **flippt** beim Klick und wird damit dauerhaft freigeschaltet —
auf dem Deck *und* auf der Map.

Alle restlichen Must-Eats bleiben über die **bestehende 50-m-Geofence-Logik**
auf der Map aufdeckbar (nicht in Scope, existiert bereits).

Qualitative Copy in der gesamten UI — **niemals** konkrete Spot-Zahlen nennen
(siehe `feedback_no_spot_counts`).

---

## 2. Root-Cause (warum 0 Reveals heute)

- `/api/map-data` gibt für signed `revealedMustEatIds: []` zurück.
- `ProfileDeck` rendert eine Karte nur dann face-up, wenn ihre `_id` in
  `mapUnlockedIds` liegt (`users/{uid}/unlockedMustEats/*` in Firestore) — bei
  frischem Signup leer.
- Das Welcome-Pack (Vor-Freischaltung) wurde in Plan 2 gerippt; ein
  Reveal-Ersatz für signed wurde nie verdrahtet.
- Der `map-data`-Kommentar verspricht „signed = Firestore + `revealedForAnon`
  client-side", aber der `revealedForAnon`-Teil ist **nie** implementiert
  worden.

Dieses Feature schließt die Lücke **client-side im Deck** (kein
`map-data`-Eingriff nötig): das Deck erkennt Teaser-Karten am
`revealedForAnon`-Flag und macht sie aufdeckbar.

---

## 3. Reveal-Modell (vom User entschieden)

- **Teaser-Karten** = die mit `revealedForAnon === true` markierten Must-Eats.
  Dem Flag vertrauen, konsistent mit `composeRevealedMustEats` der Map. **Kein
  harter 10-Cap** im Deck — wir vertrauen dem Sanity-Flag (Map cappt separat
  auf `TIER_TARGETS.REVEALED = 10` via Tier-Composition; das Deck spiegelt nur,
  was geflaggt ist).
- Teaser zittern (idle-shake) → Klick → Flip-Anim → `unlock(mustEatId,
  restaurantId, dish)` → revealed. Nur diese Karten sind per Deck aufdeckbar.
- **Alle anderen** Must-Eats: über die bestehende 50-m-Geofence-Logik auf der
  Map (`useMustEatDetailState` + `haversineDistance`). Nicht in Scope.
- `unlock()` schreibt nach `users/{uid}/unlockedMustEats/{mustEatId}` — die
  `MapSection` snapshotet diese Collection, also erscheint ein Deck-Reveal
  automatisch auch auf der Map.

---

## 4. Architektur-Überblick

```
Sanity mustEat (revealedForAnon, restaurantRef)
        │  allMustEatsAlbumQuery  (+revealedForAnon, +restaurantId)
        ▼
getAllMustEats()  →  MustEatAlbumCard[] (+revealedForAnon, +restaurantId)
        │  (profile/page.tsx, server)
        ▼
ProfileShell
   ├─ useUnlockedMustEats(uid) → { unlockedIds, unlock }   (jetzt auch unlock!)
   └─ <ProfileDeck mustEats unlockedIds unlock />
        │
        ▼
ProfileDeck  — pro order-Slot drei Zustände:
   ├─ unlocked  → FlipSlot face-up (bestehend, expand-Lightbox)
   ├─ teaser    → TeaserSlot: idle-shake → klick → flip → await unlock() → revealed
   └─ locked    → BackSlot statisch (KEIN idle-shake)
        │  unlock() → setDoc users/{uid}/unlockedMustEats/{id}
        ▼
MapSection onSnapshot(unlockedMustEats) → Reveal erscheint auch auf der Map
```

---

## 5. Komponenten & Änderungen (verifiziert 2026-05-29)

### 5.1 Datenschicht

**`lib/queries.ts` — `allMustEatsAlbumQuery` (Z. 361)**
Projektion erweitern um:
- `revealedForAnon`
- `"restaurantId": restaurantRef->_id`

(Modell: `lib/map/queries.ts` `mapMustEatsQuery` projiziert beides bereits so.)

**`lib/types.ts` — `MustEatAlbumCard` (Z. 98)**
Zwei optionale Felder ergänzen:
- `revealedForAnon?: boolean`
- `restaurantId?: string`

Beides ist nötig: `revealedForAnon` zum Teaser-Erkennen, `restaurantId` weil
`unlock(mustEatId, restaurantId, dish)` die Restaurant-ID braucht und die
Album-Card heute nur `restaurant` (Name-String) + `restaurantSlug` hat.

`getAllMustEats()` (`lib/sanity.server.ts:76`) braucht keine Signatur-Änderung —
nur die Query liefert mehr Felder.

### 5.2 `ProfileShell.tsx`

- `useUnlockedMustEats(user.uid)` zusätzlich `unlock` destrukturieren
  (aktuell nur `unlockedIds: mapUnlockedIds`, Z. 25).
- An `ProfileDeck` nur `unlock` zusätzlich weiterreichen — die `unlock`-Fn
  schließt `uid` bereits ein, also kein separates `uid`-Prop nötig.
  Bestehendes `mapUnlockedIds`-Prop bleibt.

### 5.3 `ProfileDeck.tsx` — drei Slot-Zustände

Heute: Slot-Auflösung mappt nur `mapUnlockedByOrder` (aus `mapUnlockedIds`) auf
`order`-Slots; alles andere ist `BackSlot`. **Teaser-Karten erscheinen heute
fälschlich als statischer `BackSlot`.**

Neu — pro `order`-Slot (1…TOTAL_SLOTS) die Karte aus `mustEats` per `order`
finden, dann:

1. **revealed** (`order` in lokalem `revealed`-Set ODER Karte in `mapUnlockedIds`)
   → `FlipSlot` face-up (bestehend; flippt + expand-Lightbox). Unverändert.
2. **teaser & nicht-revealed** (`card.revealedForAnon === true` && nicht
   unlocked) → **neuer `TeaserSlot`**:
   - **idle-shake** (CSS-Animation, dauerhaft/loopend, subtil)
   - Klick / Enter / Space → Flip-Anim (rotateY 0→180, bestehende
     `FLIP_DURATION_S`-Kurve) → `await unlock(card._id, card.restaurantId!,
     card.dish)` → bei Erfolg `order` ins `revealed`-Set → wird zu `FlipSlot`.
   - Während des unlock-Calls: optimistisch flippen; bei Fehler zurückdrehen
     (kein Reveal). `restaurantId` kann theoretisch `undefined` sein → solche
     Karten gelten **nicht** als Teaser (defensiv: `revealedForAnon &&
     restaurantId` als Teaser-Bedingung).
3. **locked** (Rest, kein Teaser) → `BackSlot` **statisch, KEIN idle-shake**.
   Der heutige on-click-Shake von `BackSlot` wird **entfernt** — er entwertet
   sonst die Teaser-Einladung (locked-Karten dürfen nicht „antippbar" wirken).

**Flip-Mechanik / Aspect:** Front (Must-Eat-Foto) und Back
(`/pics/card-back.webp`) müssen **gleiches Seitenverhältnis** im Flip-Container
haben, sonst verzerrt es beim Drehen (User-Ask). Safari `preserve-3d`: **kein**
`overflow: hidden` auf dem 3D-Container (siehe `feedback_memory_card_rendering`).

**Teaser-Auswahl als pure Helper** (TDD-bar): z.B.
`selectTeaserOrders(mustEats, unlockedIds): Set<number>` → liefert die
`order`-Werte der Teaser-Slots (revealedForAnon && restaurantId && !unlocked).
Reiner Input→Output, unit-testbar.

### 5.4 First-Visit-Hinweis — SUBTIL

- Kleine, leise Caption nahe dem Deck-Header (z.B. „Tipp die wackelnden Karten
  an" — finale Copy beim Bauen, qualitativ, **keine Zahlen**).
- **Translate-in** (von leicht oben/unten reinschieben) — **KEIN Opacity-Fade**
  (Brand-Regel `feedback_no_opacity_fades`).
- Einmalig: `localStorage`-Flag `deckRevealHintSeen`. Verschwindet nach erstem
  Reveal bzw. sobald gesehen.
- **Kein** Banner / Overlay / Modal. Reine Inline-Caption. Keine
  Magazin-Editorial-Deko (`feedback_no_magazine_decoration`).
- Wird nur gezeigt, wenn es überhaupt Teaser-Slots gibt **und** noch keiner
  aufgedeckt wurde **und** das Flag nicht gesetzt ist.

---

## 6. Datei-Layout (Änderungs-Set)

| Datei | Änderung |
|---|---|
| `lib/queries.ts` | `allMustEatsAlbumQuery`: `+revealedForAnon`, `+"restaurantId": restaurantRef->_id` |
| `lib/types.ts` | `MustEatAlbumCard`: `+revealedForAnon?`, `+restaurantId?` |
| `app/components/profile/ProfileShell.tsx` | `unlock` destrukturieren + an Deck reichen |
| `app/components/profile/ProfileDeck.tsx` | `TeaserSlot` (idle-shake + flip + unlock), 3-State-Slot-Resolution, `selectTeaserOrders`-Helper, BackSlot-on-click-Shake entfernen, First-Visit-Hint |
| `app/components/profile/ProfileDeck.module.css` | idle-shake-Keyframes, Teaser-Slot-Style, Flip-Aspect, Hint-Caption (translate-in) |

Neue Pure-Helper-Datei optional (`selectTeaserOrders`) inline in ProfileDeck
oder als eigene `lib/profile/teasers.ts` mit Test daneben.

---

## 7. Testing

- **TDD (Vitest):** `selectTeaserOrders` — pure Helper. Cases: nur
  `revealedForAnon`-Karten ohne `restaurantId` ausgeschlossen; bereits
  unlocked-Karten ausgeschlossen; nicht-geflaggte ausgeschlossen; leere Liste;
  Mix.
- **Query-Projektion:** optional Snapshot/Shape-Test, dass die neuen Felder
  durchkommen (sonst manuell via Studio verifizieren).
- **Visuell/manuell (Playwright-MCP + Browser):** idle-shake erscheint,
  Klick→Flip→Reveal, Reveal erscheint nach Map-Navigation auch dort,
  Hint-Caption translate-in + verschwindet nach Reveal, locked-Slots zittern
  nicht. Light + Dark.

---

## 8. Nicht in Scope (YAGNI)

- Keine `map-data`-Route-Änderung (Reveal ist rein client-side im Deck).
- Keine Geofence-Logik (existiert bereits, separater Pfad).
- Kein harter 10-Cap im Deck (Sanity-Flag ist die Quelle).
- Keine Server-seitige Pre-Reveal-Liste (kein Welcome-Pack-Revival).

---

## 9. Risiken / Gotchas

- **Safari `preserve-3d`:** kein `overflow: hidden` auf 3D-Flip-Container
  (`feedback_memory_card_rendering`).
- **Opacity-Verbot:** Shake + Flip + Hint-Entry alle translate/transform-based,
  nie Opacity-Fade für Motion (`feedback_no_opacity_fades`). (Lightbox-Backdrop
  bleibt opacity — das ist State-Change, kein Motion, erlaubt.)
- **`restaurantId` undefined:** Karten ohne aufgelöste Restaurant-Referenz
  niemals als Teaser behandeln (sonst `unlock()` mit `undefined`).
- **Optimistic-Flip Rollback:** bei `unlock()`-Fehler Karte zurückdrehen.
- **`order`-Kollisionen:** Slot-Resolution geht von eindeutigem `order` pro
  Slot aus (bestehende Annahme von ProfileDeck — unverändert übernehmen).
