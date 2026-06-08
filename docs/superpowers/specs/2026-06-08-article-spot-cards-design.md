# Spec: Spot-Karten in News-Artikeln

**Datum:** 2026-06-08
**Kontext:** Listicle-Artikel („Die besten X in Berlin", Epic #139) sollen ihre Spots
nicht als unterstrichene Inline-Textlinks zeigen, sondern als **designte Bildkarten**
(Foto, darüber Bezirk·Küche + Name, klickbar → Restaurant-Detail in der Map) — im
gleichen Look wie die Home-Tiles und die bestehende „Spots im Artikel"-Leiste.

## Problem

Die App hat das Karten-Design bereits (`NewsArticleShell` „Spots im Artikel"-Grid +
sticky Spotrail, `.spotCard` CSS). Es wird aber ausschließlich aus `mustEatCard`-
Blöcken gespeist (`extractArticleSpots`), die ein **mustEat-Doc pro Spot** brauchen.
7 von 12 Listicle-Spots haben keins → die Karten erscheinen nicht.

## Lösung

Neuer Portable-Text-Block **`spotCard`**, der **direkt ein Restaurant** referenziert
(kein mustEat nötig). Parallel-Mechanik zu `mustEatCard`.

### Komponenten

1. **Studio-Schema** (`studio/schemaTypes/newsArticle.js`)
   - Neuer Block `spotCard` in `contentBlocks`: Feld `restaurantRef`
     (`reference → restaurant`, required). Title „📍 Spot einfügen", Preview = Name + Bild.

2. **GROQ** (`nextjs/lib/queries.ts`, `articleContentProjection`)
   - Branch `_type == "spotCard" =>` projiziert `restaurantName/Slug`, `district`
     (`coalesce(district, bezirkRef->name)`), `cuisineType`, `restaurantPhoto`
     (`?w=800&auto=format&q=80`). Analog zur bestehenden `mustEatCard`-Projektion.

3. **Types** (`nextjs/lib/types.ts`)
   - `SpotCardBlock` (restaurantName/Slug/district/cuisineType/restaurantPhoto).

4. **Renderer** (`nextjs/lib/PortableTextRenderer.tsx`)
   - `extractArticleSpots` liest **sowohl** `mustEatCard` **als auch** `spotCard`
     (dedupe by slug, in Reihenfolge des ersten Vorkommens) → speist Grid + Spotrail.
   - Neue Render-Prop `renderSpotCard` (analog `renderMustEatCard`); im Block-Loop
     `_type === "spotCard"` → `renderSpotCard(block)`.

5. **Shell** (`nextjs/app/components/NewsArticleShell.tsx`)
   - `renderSpotCard` rendert eine **breite Inline-Bildkarte** im Artikelfluss:
     Foto-Background, Gradient-Overlay, Kicker `Bezirk · Küche`, großer Name,
     „Auf der Map ansehen →"; `<Link href={/map?r=${slug}} rel="nofollow">`.
   - Die bestehende „Spots im Artikel"-Leiste + Spotrail bleiben unverändert und
     füllen sich jetzt automatisch (über `extractArticleSpots`).

6. **CSS** (`NewsArticleShell.module.css`)
   - `.inlineSpot*`-Klassen (Bildkarte, Overlay, Kicker, Name, CTA), Dark-Mode,
     Sticker-Brand (keine `border-radius`).

7. **Content** (Sanity, Mutations-API-Skript, kein Code)
   - In allen 5 Artikeln: pro Spot-Sektion (H2) einen `spotCard`-Block direkt nach
     der H2 einfügen (Restaurant aus Slug→`_id`-Map). Bestehende `link`-Annotationen
     in den Spot-Namen entfernen → sauberer Fließtext (Karte trägt den Klick).
   - Betrifft 3 publizierte Artikel (Eisdielen/Italiener/Weinbars) + 2 Drafts
     (Bäckereien/Türkisch). Eine Karte pro H2-Sektion (Brand-Primärslug).

## Nicht im Scope (YAGNI)

- Mehrere Karten pro Sektion (Multi-Location-Brands bekommen eine Brand-Karte).
- Auto-Generierung/Backfill bestehender Nicht-Listicle-Artikel.
- Änderungen am `mustEatCard`-Block (bleibt für Dish-Banner).

## Sequencing

Code → Build/Test → Studio-Schema deployen (Block im Studio editierbar) →
Content-Skript (spotCards einfügen + Links strippen) → PR staging → Smoke → main.
Zwischenstand unbedenklich: alter Prod-Renderer skippt unbekannte `spotCard`-Blöcke.

## Verifikation

- Renderer-Unit-Tests: `extractArticleSpots` liest spotCard; `renderSpotCard` rendert
  `/map?r=` + `rel=nofollow`.
- `next build` + Prod-Server-Smoke: Inline-Karten + „Spots im Artikel"-Leiste auf
  `/news/beste-eisdielen-berlin` (DE) und `/en/...`.
