# Restaurant-Galerie mit KI-Kuration — Design

**Datum:** 2026-06-12
**Status:** vom Maintainer freigegeben (Variante ohne Hero-Tausch)

## Ziel

Die Restaurant-Detail-Ansicht der EatThisMap zeigt heute genau ein Foto
(erstes Google-Places-Foto, beim Import nach Sanity hochgeladen). Künftig
sollen pro Restaurant zusätzlich 3–5 kuratierte Fotos in einer Galerie
erscheinen — automatisiert beschafft, ästhetisch gefiltert, mit sauberer
Attribution. Das bestehende Hero-Bild bleibt unverändert.

## Entscheidungen (vom Maintainer getroffen)

1. **Speicherung in Sanity** (wie heute), kein Live-Proxy. Die
   Attribution pro Foto (`authorAttributions`) ist Pflicht und wird
   vollständig umgesetzt.
2. **Keine KI-generierten Bilder** — nur echte Google-Places-Fotos.
   Restaurants ohne brauchbare Fotos behalten wie bisher nur das Hero.
3. **Kein Hero-Tausch** — die Kuration befüllt ausschließlich `gallery`;
   das bestehende `image`-Feld wird nicht angefasst.

## Architektur

### 1. Foto-Beschaffung (Importer-Erweiterung)

- `nextjs/scripts/import-from-url.ts` (und der enriched-Importweg):
  `importPhoto()` → `importPhotos()`. Statt nur `place.photos[0]` werden
  alle verfügbaren Foto-Referenzen (max. 10) verarbeitet.
- Kandidaten für die Galerie: `place.photos[1..]` — `photos[0]` wird
  weiterhin (nur) als Hero importiert und aus der Galerie ausgeschlossen,
  damit das Hero nicht doppelt erscheint.
- Download wie heute: `https://places.googleapis.com/v1/{photo.name}/media?maxWidthPx=1600&key=…`,
  Upload als Sanity-Asset, pro Foto `credit`/`creditUrl` aus
  `authorAttributions[0]` (Platzhalter-Fallback „Foto: Google Maps" wie im
  bestehenden Code).

### 2. KI-Kuration (Claude Haiku Vision)

- Jedes Kandidaten-Foto wird verkleinert (`maxWidthPx=400`) an Haiku
  geschickt. Strukturiertes Urteil pro Bild:
  - `category`: food | interior | exterior | menu | drink | unusable
    (Selfies, Quittungen, Unscharfes, Parkplätze ⇒ unusable)
  - `score`: 0–10 (Schärfe, Belichtung, Appetitlichkeit/Atmosphäre)
- Behalten: Top-Bilder mit `score >= 6`, max. 4, sortiert nach Score,
  bevorzugt gemischte Kategorien (mind. 1× food wenn vorhanden).
- Nur behaltene Bilder werden in voller Größe geladen und hochgeladen
  (spart Foto-Abrufe und Sanity-Speicher).
- Fallback bei Haiku-Fehler: die ersten 3 Kandidaten ungescort übernehmen.
- Env: nutzt den vorhandenen `ANTHROPIC_API_KEY`. Kosten < 1 Cent pro
  Restaurant.

### 3. Backfill-Skript

- Neu: `nextjs/scripts/backfill-gallery.ts` (Konvention wie
  `generate-de-descriptions.ts`).
- Läuft über alle Restaurants mit `googlePlaceId` und leerer `gallery`,
  holt Foto-Referenzen per Place Details
  (`GET places/{placeId}`, FieldMask `photos`), kuratiert, lädt hoch,
  patcht `gallery`.
- Idempotent (Skip bei befüllter Galerie), `--dry-run`- und
  `--limit`-Flags, moderates Rate-Limiting.
- Einmalige Kosten (Größenordnung 200 Restaurants): ~15–20 USD
  (Place Details + Foto-Media-Abrufe à ~7 USD/1000).

### 4. Sanity-Schema

- `studio/schemaTypes/restaurant.js` hat bereits
  `gallery: array<image{alt, credit, creditUrl}>` — keine Schemaänderung
  nötig. `alt` wird beim Import generisch befüllt
  („{Restaurantname} – Foto {n}" bzw. Kategorie-basiert aus der Kuration).

### 5. Frontend (RestaurantDetail)

- `nextjs/app/components/map/RestaurantDetail.tsx`: unter dem Hero ein
  horizontal scrollbarer Galerie-Streifen.
- Einheitlicher Look: neues Preset `galleryThumb: { w: 400, h: 300,
  fit: 'crop', q: 80 }` in `nextjs/lib/sanity-image-presets.ts` —
  fester 4:3-Crop + `auto=format` über die Sanity-CDN.
- Tap/Klick öffnet eine Lightbox (großes Bild, `detailHero`-Preset) mit
  voll sichtbarem Credit (verlinkt, wenn `creditUrl` vorhanden).
- Daten kommen mit in den bestehenden Lazy-Load der Detail-Felder
  (Galerie wird erst geladen, wenn das Sheet geöffnet ist) — keine
  Regression fürs Map-Initial-Load (Perf-Epic P2–P6 bleibt unangetastet).
- Leere Galerie ⇒ Streifen wird gar nicht gerendert (Status quo).

## Attribution / Rechte

- Pro Galerie-Bild: Credit klein als Overlay im Streifen, voll lesbar in
  der Lightbox. Erfüllt Googles `authorAttributions`-Pflicht.
- Kein Scraping von Restaurant-Websites/Instagram (keine Lizenz).

## Fehlerbehandlung

- Einzelner Foto-Download-Fehler ⇒ Foto überspringen (wie bestehender
  Code), Import läuft weiter.
- Haiku nicht erreichbar ⇒ Fallback „erste 3 ungescort".
- Keine brauchbaren Fotos ⇒ `gallery` bleibt leer, Frontend wie bisher.

## Tests

- Kurationslogik (Auswahl/Sortierung/Schwellwert/Fallback) als reine
  Funktion mit Unit-Tests (gemockte Scores).
- Galerie-Komponente: rendert nicht bei leerer Galerie; rendert Streifen
  + Credits; Lightbox öffnet/schließt (bestehende Test-Konventionen des
  Repos).
- Backfill: `--dry-run` gegen Staging-Datensatz vor dem echten Lauf.
