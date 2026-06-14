# Home: Bezirks-Switcher (Design-Spec)

**Datum:** 2026-06-14
**Status:** Design abgenommen (Mockup), bereit für Implementierungsplan
**Mockup:** `../../eat-this-bezirke-switcher.html` (im Projekt-Root außerhalb des Repos, klickbarer Prototyp mit echten Daten)

## Ziel

Die zwei getrennten Home-Sektionen **„Bezirk der Woche"** (`HubBezirkOfWeek`, dunkel)
und **„weitere Bezirke" Sticker-Wall** (`HubBezirke`, hell) zu **einer**
zusammenhängenden, interaktiven Einheit verschmelzen.

Drei Zielsetzungen (vom User priorisiert):
1. **Entdecken/Browsen** — jeder Bezirk ist ein Tap entfernt statt nur ein Map-Sprung.
2. **Visuell stärker** — ein einziges dunkles Statement-Band statt zwei loser Blöcke.
3. **SEO/interne Verlinkung** — alle Bezirke + Spot-Links im SSR-HTML, CTA auf die
   indexierbaren `/bezirk/[slug]`-Seiten.

## Interaktionskonzept

Ein gerahmter Block „Entdecke Berlin / Nach Bezirken":

- **Tab-Leiste**: alle browsbaren Bezirke als horizontal scrollbare Outline-Pills.
  Der redaktionelle **Bezirk der Woche** steht **vorn**, trägt das Coral-Band
  „★ Diese Woche" und ist beim Laden **aktiv**.
- **Tab-Klick** tauscht das Panel: Bezirksname + Tagline + 4 Restaurant-Kacheln.
  Wechsel als **Translate-Bewegung** (kein Opacity-Fade — Brand-Regel in CLAUDE.md),
  unter `prefers-reduced-motion` ohne Animation.
- **Kacheln** (4, Grid 2×2 mobil / 4× Desktop): Foto mit dunklem Verlauf von unten,
  Rang 01–04 (gelb, oben links), Kategorie (gelb, klein) über dem Namen (creme).
  Verlinkt aufs jeweilige **Restaurant** (`/restaurant/[slug]`).
- **Eine CTA** pro Bezirk: **„Alle Spots in {Bezirk} →"** → `/bezirk/[slug]`.
  (Die frühere zweite Map-CTA entfällt — sie war redundant zur Bezirksseite.)

### Visuelle Entscheide (final)

- **Immer dunkel** (ink `#0a0a0a`/`#181410`, creme `#fbf8ee`, gelb `#ffd84a`,
  coral `#ff5a4d`) — bewusstes Statement-Band, folgt **nicht** dem Seiten-Theme.
- **Keine Spot-Zahlen** (weder an Tabs noch im Panel noch in der CTA).
- **Bilder ohne abgerundete Ecken** (scharfkantig).
- Fonts: Display = **Schoolbell** (`var(--font-ranchers)` → alias auf Schoolbell),
  Body = **Inter** (`var(--font)`). Siehe Memory `eat-this-fonts`.

## Datenmodell & Auswahllogik

Eine einheitliche Liste browsbaren Bezirke. Pro Bezirk:
`{ name, slug, tagline, isFeature, spots: [{ name, slug, image, category }] }`

- **Browsbare Bezirke**: nur solche mit **≥5 offenen Restaurants** (bestehende
  Schwelle aus `getHomeData`). **Sortierung der Tabs**: Feature-Bezirk zuerst,
  danach übrige nach `restaurantCount` desc. Sicherheits-Cap: max. 10 Tabs.
- **Bezirk der Woche (Feature)**: kommt aus `homeWeek` (neuestes `weekStart <= today`).
  - `spots`: kuratierte `bezirkSpots` falls vorhanden, sonst Auto-Picks (s. u.).
  - `tagline`: `bezirkTagline` falls vorhanden, sonst `bezirk.description`.
  - Falls **kein** `homeWeek`-Doc existiert: kein Feature-Band; erster Bezirk nach
    `restaurantCount` wird ohne „★ Diese Woche"-Marker zum aktiven Tab.
- **Nicht-Feature-Bezirke**: Auto-Picks der 4 Spots, sortiert nach
  **`featured` desc, dann Must-Eat-Count desc** (anschließend stabil); nur offene,
  nicht-Draft, mit Bild. `tagline` = `bezirk.description`.
- **i18n**: `category`, `tagline` per `select($locale == "en" => ...)`-Coalesce
  (wie in den bestehenden Home-Queries). EN-Bezirksseiten bleiben über
  `hasEnContent` gated — der Switcher verlinkt nur, ändert daran nichts.

### Query

Neue GROQ-Query (in `lib/queries.ts`), pro Bezirk die Top-4-Spots:

```groq
*[_type == "bezirk" && defined(slug.current)]{
  "name": name,
  "slug": slug.current,
  "tagline": select($locale == "en" => coalesce(descriptionEn, description), description),
  "count": count(*[_type=="restaurant" && isOpen==true && !(_id in path("drafts.**")) && references(^._id)]),
  "spots": *[_type=="restaurant" && isOpen==true && defined(image) && !(_id in path("drafts.**")) && references(^._id)]
    | order(featured desc, count(*[_type=="mustEat" && references(^._id)]) desc)[0...4]{
      "name": name,
      "slug": slug.current,
      "image": image.asset->url,
      "category": select($locale == "en" => categories[0]->nameEn, categories[0]->name)
    }
}[count >= 5] | order(count desc)
```

`getHomeData` mergt das mit dem bestehenden `bezirkOfWeek` (Feature voranstellen,
kuratierte Spots/Tagline überschreiben die Auto-Picks für den Feature-Bezirk),
cappt auf 10 und liefert das fertige Array `districts: HubDistrict[]`.
Caching: `revalidate: 3600`, Tags `['bezirk','homeWeek','restaurant','mustEat']`.

## Komponenten

- **Neu:** `app/components/HubBezirke.tsx` (ersetzt die bisherige Sticker-Wall-Variante)
  als **Client-Component** (`'use client'`, `useState` für aktiven Tab).
  - Rendert **alle** Panels ins Markup; inaktive via `hidden`/`display:none`.
    Da Next.js die Client-Component server-rendert, stehen **alle** Bezirks- und
    Restaurant-Links im initialen SSR-HTML → crawlbar (SEO-Ziel).
  - Tabs als `role="tablist"`/`tab`, Panels `role="tabpanel"`, `aria-selected`,
    Pfeiltasten-Navigation; Translate-Swap respektiert `prefers-reduced-motion`.
  - Bilder via `next/image` mit `sizes` (mobil 50vw, Desktop 240–280px), `loading="lazy"`.
- **Neues CSS-Modul** `HubBezirke.module.css` (immer dunkel, kein Light-Override).
- **Entfernt** (CLAUDE.md: aggressives Aufräumen ok): `HubBezirkOfWeek.tsx` +
  `.module.css` + `HubBezirkOfWeek.test.tsx`, alte `HubBezirke`-Sticker-Logik/CSS.
- **`HubSection.tsx`**: die zwei Zeilen `<HubBezirkOfWeek/>` + `<HubBezirke/>`
  durch einen einzigen `<HubBezirke districts={initialData.districts} />` ersetzen
  (Position im Stack bleibt, wo heute `HubBezirkOfWeek` steht).
- **i18n** (`lib/i18n/translations.ts`): `hub.bezirke.title`/`sub`/`featBadge`/`cta`
  (DE „Alle Spots in {name}", EN „All spots in {name}") + Lead-Text.

## Tests

- Unit (`HubBezirke.test.tsx`): rendert alle Tabs; Klick wechselt aktives Panel;
  alle Bezirks-CTAs (`/bezirk/[slug]`) und Restaurant-Links sind **im DOM**
  (auch inaktive Panels) — sichert SEO-Annahme ab.
- `getHomeData`-Logik: Feature zuerst + Marker; Auto-Pick-Sortierung
  (`featured` vor Must-Eat-Count); ≥5-Filter; Cap 10; Fallback ohne `homeWeek`.

## Nicht im Scope (YAGNI)

- Kein Lazy-Load der Nicht-Feature-Spots per API (alles im initialen Payload —
  ~8–10 Bezirke × 4 Spots ist günstig und SEO-relevant).
- Keine neuen Sanity-Schema-Felder (Auto-Picks decken Nicht-Feature-Bezirke ab).
- Keine Spot-Counts, keine Map-CTA.
