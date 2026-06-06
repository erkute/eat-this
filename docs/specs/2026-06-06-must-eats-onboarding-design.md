# Must-Eats-Onboarding + Copy-Fix — Design

**Datum:** 2026-06-06
**Status:** Approved
**Betrifft:** `nextjs/app/components/MustEatsSection.tsx`, neue Komponente `MustEatsOnboarding.tsx`, `lib/i18n/translations.ts`

## Problem

Der Sub-Text der Must-Eats-Seite („Ein paar liegen offen — der Vorgeschmack. Die anderen kommen mit deinen Spots und werden vor Ort aufgedeckt.") setzt drei Konzepte voraus, die ein Erstbesucher nicht kennt:

1. Was ein **Must Eat** ist (Signature-Gericht eines Restaurants als Sammelkarte)
2. Die **Aufdeck-Mechanik** (verdeckte Karten drehen sich vor Ort von selbst um)
3. Der Weg zu **mehr Karten** (Booster Packs bringen neue Spots)

Ziel: Ein Erstbesucher soll alle drei Konzepte kompakt verstehen. Entscheidung: First-Visit-Onboarding im Karten-Flip-Stil **plus** dauerhaft klarerer Sub-Text. Abschluss des Onboardings neutral (kein Packs-CTA — der existiert bereits im Closing-Block der Seite).

## 1. Neuer Sub-Text (immer sichtbar)

In `MustEatsSection.tsx` (`COPY`-Konstante, Zeile ~19/29):

- **DE:** „Jedes Top-Restaurant hat ein Gericht, das du probiert haben musst — sein Must Eat. Ein paar Karten liegen schon offen. Den Rest deckst du vor Ort auf."
- **EN:** "Every top restaurant has one dish you need to try — its Must Eat. A few cards are already face-up. The rest you reveal on site."

Daneben ein dezenter Textlink **„Wie funktioniert's?"** / **"How does it work?"**, der das Onboarding jederzeit wieder öffnet. Da `MustEatsSection` eine Server-Komponente ist, lebt der Link in der neuen Client-Komponente (siehe unten) oder die Onboarding-Komponente rendert ihn selbst.

## 2. Neue Komponente `MustEatsOnboarding.tsx` (Client-Island)

### Trigger & Persistenz

- Beim ersten Besuch der Must-Eats-Seite: `useEffect` prüft `localStorage`-Flag `mustEatsOnboardingSeen`. Fehlt es → Overlay öffnen. Kein SSR-Render, kein Hydration-Risiko.
- Flag wird **beim Schließen** gesetzt (X, Backdrop-Tap oder „Los geht's").
- „Wie funktioniert's?"-Link öffnet das Overlay erneut, unabhängig vom Flag.
- Keine Server-Persistenz (Gerät-lokal genügt — YAGNI).

### Aufbau

- Vollbild-Overlay via Portal (Pattern wie `MustEatImageLightbox` / `MustEatRevealOverlay`).
- Zentrale **Demo-Karte** im Sammelkarten-Format (Aspect 2115/1539 wie das Reveal-Overlay), darunter Schritt-Text, Punkte-Indikator (● ○ ○), „Weiter"-Button. X oben zum Überspringen.
- Body-Scroll-Lock während offen (Pattern der bestehenden Overlays übernehmen).

### Die 3 Schritte

| Schritt | Karte | Text (DE) |
|---|---|---|
| 1 — Was ist ein Must Eat | Offen: echtes Gericht aus den bereits aufgedeckten Karten (`initialMapData.revealedMustEatIds` → erstes offenes Bild) | „Jedes Top-Restaurant hat EIN Gericht, das du probiert haben musst." |
| 2 — Vor Ort aufdecken | Beim Wechsel zu Schritt 2 dreht die Karte auf die Rückseite (`/pics/card-back.webp`); nach kurzer Pause (~800 ms) flippt sie von selbst wieder auf — demonstriert die Vor-Ort-Mechanik live (CSS-3D-rotateY) | „Verdeckte Karten drehen sich von selbst um, wenn du beim Restaurant bist." |
| 3 — Mehr Karten holen | Karte bleibt offen | „Booster Packs bringen dir neue Spots — viele mit einem Must Eat." Button: **„Los geht's"** (schließt nur, neutral) |

EN-Texte analog; alle Strings in `lib/i18n/translations.ts`, Zugriff via `useTranslation` (wie `MustEatsGallery`).

### Motion

- Entry: Karte/Panel fliegt von unten rein (translate) — **kein Opacity-Fade** (Projektregel). Backdrop-Tint via Opacity ist als State-Change erlaubt.
- Flip in Schritt 2: CSS-3D `rotateY`, angelehnt an die `MustEatRevealOverlay`-Choreografie, aber einfacher (einzelner Flip, kein Tornado-Spin).
- `useReducedMotion` → kein Flip, statischer Kartenwechsel; Entry ohne Animation.

### Einbindung

`MustEatsSection.tsx` (Server) rendert `<MustEatsOnboarding initialMapData={...} />` als Client-Child — gleiche Grenze wie `MustEatsGallery`.

## 3. Tests

`MustEatsSection.test.tsx` erweitern:

- Onboarding erscheint, wenn `mustEatsOnboardingSeen` nicht gesetzt ist
- Onboarding erscheint nicht, wenn das Flag gesetzt ist
- Schließen (X / „Los geht's") setzt das Flag
- „Wie funktioniert's?"-Link öffnet das Overlay trotz gesetztem Flag
- Schritt-Navigation: „Weiter" wechselt Schritt + Indikator

## Bewusst weggelassen (YAGNI)

- Kein Swipe-Gesten-Handling (Button reicht für 3 Schritte)
- Keine Server-Persistenz des Onboarding-Flags
- Kein kontextabhängiger oder verkäuferischer Abschluss-CTA
- Keine Änderung am Closing-Block („Mehr aufdecken." / Packs-CTA) — der bleibt wie er ist
