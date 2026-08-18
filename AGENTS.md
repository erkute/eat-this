# AGENTS.md — Eat This (Referenz)

**`CLAUDE.md` ist die Quelle der Wahrheit.** Diese Datei enthält nur Referenzdetail, das dort den
Rahmen sprengen würde: Design System, Code-Konventionen, Sanity-Dokumentmodell, Stripe-Fulfillment
und Brand Voice. Lies sie, wenn du in diesen Bereichen arbeitest.

**Bei Widerspruch gewinnt `CLAUDE.md`** — und diese Datei wird korrigiert, nicht umgekehrt.

Nicht hier, sondern in `CLAUDE.md`: Repo-Layout, Git-Hygiene, Pre-push-Hook, Deployment und
Staging-Grenze, Routing/i18n, Tests und CI, Bildassets, Animationsregeln, Login-Modal und die
Gotchas. Nicht hier und nirgends verbindlich: `docs/` — das sind historische Pläne, Specs und
Runbooks, keine aktuelle Architekturquelle. Versionen stehen in den Lockfiles und `package.json`,
nicht in Prosa.

## Projekt

Eat This ist eine deutschsprachig geführte, englisch lokalisierte Food-Discovery-Plattform für
Berliner:innen und Berlin-Besucher:innen. Die Kernschleife ist: Spots auf der Map finden, exklusive
Must Eats als Karten vor Ort aufdecken und sammeln, weitere Spots/Must Eats über Booster Packs
freischalten und die Sammlung im Profil sehen. Remy ergänzt die kuratierte Suche.

Das Produkt ist ein frühes, von einer Person betriebenes Produktionssystem.

## Projektstruktur

- `nextjs/app/api/`: öffentliche/serverseitige HTTP-Grenzen; keine lokalen Migrations-CLIs.
- `nextjs/app/components/`: wiederverwendbare UI und Feature-Unterordner; keine Admin-SDK-Zugriffe.
- `nextjs/lib/`: server-/clientseitige Fachlogik, Loader, Hooks, Typen und Integrationen; Browser- und
  Server-Abhängigkeiten nicht im selben Modul mischen.
- `nextjs/i18n/`: Routing, Navigation und Request-Konfiguration; Übersetzungstexte bleiben in
  `nextjs/lib/i18n/translations.ts`.
- `nextjs/css/style.css`: handgeschriebene, gemeinsam verlinkte SPA-CSS-Quelle;
  `nextjs/public/css/style.min.css` ist generiert und wird nie direkt editiert.
- `nextjs/public/`: öffentlich auslieferbare, optimierte Assets; keine Secrets oder Premium-Bilder.
- `nextjs/scripts/`: lokale Import-, Backfill-, Admin- und Migrations-CLIs; keine öffentlichen APIs.
- `nextjs/__tests__/` und colocated `*.test.*`: Vitest-Tests; Rules-Tests benötigen Emulatoren.
- `studio/schemaTypes/`: alle Sanity-Schemas; `studio/components/` enthält Schema-Inputs.
  `studio/tools/RestaurantImporter.tsx` läuft lokal und im deployten Production-Studio; andere
  Werkzeuge bleiben entsprechend ihrer eigenen Guards lokal.
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`: Firebase-Datenvertrag.
- `.github/workflows/`: Quality und Lighthouse; keine Deployment-Secrets in Workflow-Dateien.
- `.private/`: ignorierte Betriebsartefakte; niemals ausgeben, ins Build laden oder committen.

## Studio-Commands

App-Commands stehen in `CLAUDE.md`. Studio hat ein eigenes Lockfile und eigene Env:

```bash
npm ci --prefix studio
SANITY_STUDIO_ENV=<production|staging> \
SANITY_STUDIO_PROJECT_ID=<project> \
SANITY_STUDIO_DATASET=<dataset> \
npm run dev --prefix studio
```

Studio wird separat und nur auf ausdrücklichen Auftrag mit `npm run deploy --prefix studio`
veröffentlicht. Rules werden mit explizitem Projekt deployt:
`firebase deploy --only firestore:rules,storage --project <project>`.

## Code-Konventionen

### Naming und Format

- React-Komponenten/Contexts: `PascalCase.tsx`; colocated Styles: `Component.module.css`.
- Hooks: `useX.ts`/`useX.tsx`; Funktionen und Variablen `camelCase`; Typen/Interfaces `PascalCase`.
- URL-Segmente sind lowercase/kebab-case; neue Nicht-React-Utilities ebenfalls kebab-case, ohne
  bestehende camelCase-Dateien nebenbei umzubenennen. Next-Dateien nutzen ihre reservierten Namen.
- Server-only Loader dürfen `.server.ts` tragen und importieren bei harter Grenze `server-only`.
- Root-Prettier schreibt für Next Single Quotes, Semikolons, 2 Spaces, 100 Zeichen vor. Studio hat seine
  eigene Config mit Single Quotes und ohne Semikolons. Nie unrelated Code nur dafür umformatieren —
  einzelne Bestandsdateien haben Formatierungs-Drift, die kein Anlass für einen Sammel-Reformat ist.

### Server und Client

- Default ist ein Server Component. Pages/Layout laden Daten, bauen Metadata/JSON-LD und reichen
  serialisierbare Props an kleine Client Islands weiter.
- `'use client'` nur für State, Effects, Events, Context, Browser APIs oder Firebase Web SDK.
- Admin SDK, Stripe, private Must Eats und Sanity-Reads bleiben serverseitig. Client Components
  sprechen Same-Origin-Route-Handler oder dafür vorgesehene Browser-Hooks an.

### Data Fetching und GROQ

Das einzige neue Pattern ist: Query in `lib/queries.ts` oder `lib/<feature>/queries.ts`, typisierter
server-only Loader mit Cache-Policy/Tags, Aufruf aus Server Component oder Route Handler. Keine neue
inline GROQ in Components und kein direkter Sanity-Client im Browser.

Aus `nextjs/lib/sanity.server.ts`:

```ts
export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  return client.fetch<Restaurant | null>(
    restaurantBySlugQuery,
    { slug },
    { next: { revalidate: 3600, tags: [`restaurant:${slug}`] } }
  );
}
```

GROQ nutzt `$parameter`, explizite Projektionen/Aliasse, getypte Resultate, Referenzen statt alter
String-Dualformen und die Helpers aus `sanity-image-presets.ts`. Tags müssen zur Switch-Logik in
`app/api/revalidate/route.ts` passen. Premiumfelder dürfen in keiner öffentlichen Projektion stehen.

### TypeScript und Fehler

- `strict`, `noEmit`, Bundler Resolution und `@/*` gelten; neues App-Produktionscode ist TS/TSX.
- Kein `any` in Produktionscode; SDK-Fehler zunächst als `unknown` behandeln. Der einzige generelle
  ESLint-Relaxer für `any` gilt Testfixtures/SDK-Mocks.
- Erwartbare Route-Fehler validieren und als stabile JSON-Codes mit 4xx zurückgeben; Secrets,
  Tokens, E-Mails und private Inhalte nie in Antworten oder Logs spiegeln.
- Fehlende Seiteninhalte führen zu `notFound()`. Fehlende Pflichtkonfiguration failt geschlossen.
  Unerwartete Produktionsfehler gehen an Sentry und als generisches 500/503 an den Client.
- `[locale]/error.tsx` und `global-error.tsx` sind die React-Grenzen; nicht durch lokale Catch-Alls
  umgehen. Optionale Browserfunktionen dürfen gezielt degradieren, nicht Fehler pauschal schlucken.

## Design System

Visuelle Quelle der Wahrheit ist die Home Page: `app/components/HubSection.tsx`, ihre
Home-Komponenten, `HubSection.module.css` und der `.homeV2`-Block in `css/style.css`. Bei
Widerspruch gewinnt dieses System. Die kanonischen Tokens stehen in `app/globals.css`.

### Farben

- `--et-home-paper: #fff`, `--et-home-inverse-text: #fff`: Seite und Text auf dunklen Flächen.
- `--et-home-ink: #15120e`, `--et-home-inverse-bg: #15120e`: Text, Masthead, starke Controls.
- `--et-home-accent: #ffc600`: gelber Marker, Focus/Akzent; nicht als beliebige Vollfläche.
- `--et-home-red: #d9382a`: Marke, Headlines und aktive/Hover-Zustände.
- `--et-home-photo-rest: #eceae6`: ruhender Bildplatzhalter; `--et-home-quiet: #f2f1ef`: Chips.
- `--et-home-rule: #e4e1dc`: semantische Listen-/FAQ-Regel; keine dekorativen Trenner.
- `--et-home-panel-warm: #fff4cc`: sparsame warme Panel-Fläche.
- `--et-home-muted: rgba(21,18,14,.64)`, `--et-home-muted-soft: rgba(21,18,14,.55)`,
  `--et-home-line: rgba(21,18,14,.2)`: sekundärer Text und zurückhaltende Linien.
- Foto-Text nutzt nur `--et-home-photo-overlay` und `--et-shadow-text-photo`; keine Card-Shadows.

Keine neuen Farben oder rohe Hex-/rgba-Werte. Die vielen älteren `--brand-*`, `--food-*`,
`--collage-*` und Font-Aliasse sind Kompatibilität, kein zweites Token-System.

### Typografie

- Providence (`--et-font-display`, `--et-font-label`, 400/700) für Home-Headlines, Labels, Buttons.
- DM Sans (`--font-body`) für Fließtext; `--et-font-mono` nur für Metadaten/Utility-Sprache;
  `--et-font-condensed` nur in den bereits etablierten Nav-/Footer-/Signed-in-Motiven.
- Skala: Hero `clamp(44px,6.5vw,80px)`, kompakt `clamp(42px,6vw,68px)`, Section
  `clamp(24px,3.4vw,42px)`, Editorial `clamp(34px,4.8vw,72px)`, Card
  `clamp(21px,2.2vw,32px)`, Lead `clamp(16px,1.5vw,21px)`, Body
  `clamp(12px,1.1vw,14px)`, Kicker `10px`, Caption `11px`, Chip `12px`, Button `13px`.
- Headlines: Weight 700, Leading `.9/.92/.95`, Tracking `-.02em` bis `-.025em`; Body Leading `1.5`.
- Moonblossom-/Poster-/Marker-Aliasse und das ungenutzte `Silkscreen` sind nicht für neue Controls.

### Layout, Spacing und Breakpoints

- Wrapper `max-width: 1360px`; Padding `clamp(24px,4vw,56px)`, mobil `16px`.
- Page Top `clamp(40px,5vw,72px)`; Section Gap `clamp(72px,8vw,128px)`, mobil `64px`.
- Head Gap `clamp(16px,2vw,28px)`; Grid Gap `clamp(24px,4vw,56px)`; Rail `14px`,
  Control `8px`, Card `clamp(20px,2.4vw,32px)`.
- Home-Rails wechseln bei `760/761px`; App-Frame/Nav bei `767/768px`. Kleinere lokale Schwellen
  (`520/560/640`) und große Layoutschwellen (`740/900/920/960/1024`) nur dort wiederverwenden,
  wo das jeweilige kanonische Component-Layout sie bereits besitzt.

### Radius, Shadows, Borders und Komponenten

- Fotos `10px`, Controls `7px`, flach `0`, Pills `999px`; Standard ist `box-shadow: none`.
- Borders sind `0`; `1px --et-home-rule` nur für echte Listen-/FAQ-Struktur. Kein Rahmen-Dekor.
- Buttons/Links/Chips: `.hv-btn`, `.hv-link-underline`, `.hv-chip` in `css/style.css`; echte Nutzung
  in `HubSection.tsx` und `CategoriesRail.tsx`. Providence, kompakt, Weight 700, keine Zwangs-
  Uppercase außer bestehende Navigation/Headlines, Hover über Farbe/kleinen Translate.
- Cards: flache Medien-/Editorialkarten in `MagazineGrid.module.css` und
  `CategoriesRail.module.css`; Bildradius 10px, keine Cast-/Sticker-Shadows.
- Inputs: `CategoriesRail.module.css` (`emailInput`, `emailButton`) ist die kanonische Home-Form:
  Providence 700, 7px Radius, Ink-Inset-Ring, sichtbarer Focus und Inline-Fehler.
- Motion nie über Opacity ein-/ausblenden; Translate/Scale/Clip verwenden. `prefers-reduced-motion`
  und sichtbaren `:focus-visible`-Ring erhalten. Die App ist light-only.

## Brand Voice

- Trocken, direkt, minimal; Oatly-inspirierter Berlin-Ton ohne Oatly zu imitieren.
- Deutsch ist primär. Food-Anglizismen wie Must Eats, Spot und Booster Pack sind erlaubt.
- Kein Marketing-Sprech, keine Superlative, keine Ausrufezeichen-Inflation; „entdecke“ und
  „erlebe“ vermeiden.
- Gaming-Vokabular nur für Karten, Reveals, Sammlung, Packs und Freischaltungen einsetzen.
- Kurze Headlines und konkrete Food-Begriffe; Copy muss in DE/EN dieselbe Haltung behalten.

## Sanity

`studio/schemaTypes/index.js` registriert genau sieben Dokumenttypen:

- `restaurant`: Spot-Stammdaten, Geo, Bezirk-/Kategorie-Refs, DE/EN-Copy, Bilder, Öffnung, SEO,
  Map-Tiers und redaktionelle Restaurantempfehlungen.
- `mustEat`: ausschließlich öffentliche Metadaten `restaurantRef`, `order`, `revealedForAnon`.
- `category`: DE/EN-Namen und -Beschreibungen sowie Home-/Pack-Artwork.
- `bezirk`: District-Name, Slug, DE/EN-Beschreibung, SEO und Bild.
- `newsArticle`: DE primär, optional EN, Portable Text; eingebettete `spotCard`/`mustEatCard`
  projizieren öffentlich nur Restaurantbezug, nie Premiuminhalt.
- `staticPage`: lokalisierte Portable-Text-Seiten für About, Kontakt und Rechtliches.
- `homeWeek`: Wochenkuration; aktuell liest `lib/map/free-surface.ts` `bezirkSpots`. Die Home Page
  selbst rotiert Bezirke deterministisch in `lib/home/getHomeData.ts` und liest dieses Doc nicht.

Schemas bleiben in `studio/schemaTypes/`; App-GROQ in `nextjs/lib/queries.ts` oder Feature-Queries.
Eine Schemaänderung umfasst passende App-Typen, Projektionen/Loader, Revalidation-Tags, Tests und
bei Datenformänderung ein explizites Migrationsscript. Studio-Deploy und Datenmigration sind
getrennte Aktionen; nie stillschweigend gemeinsam ausführen.

Premium-Must-Eats liegen in Firestore `privateMustEats` und Storage unter dem server-only Präfix aus
`lib/must-eat/private-store.ts`. Firestore-/Storage-Rules verbieten direkte Browserzugriffe. In
Production hydratisieren/streamen nur `/api/map-data`, `/api/must-eat-reveal` und
`/api/must-eat-image/[id]` nach Entitlement-, Reveal- oder Public-Demo-Policy; `must-eat-demo` ist
dort hart 404. Dish, Beschreibungen, Preis, Bildpfad oder private
Bilder niemals zurück in Sanity, öffentliche GROQ-Projektionen, RSC-Payloads oder Client-Logs legen.

Der Production-Studio-Importer spricht `/api/admin/import-restaurant` mit dem kurzlebigen Sanity-
Session-Token des eingeloggten Users an. Die Route akzeptiert nur bekannte Studio-Origins, erlaubt
nur Administrator/Developer/Editor, limitiert kostenpflichtige Aufrufe und führt Sanity-Reads,
Asset-Uploads und Writes mit genau diesem User-Token aus. Kein Import-/Write-Secret in Studio-Bundles
oder Antworten legen. Staging bleibt hart 404; lokal bleibt die alte `/api/dev/import-restaurant`-
Route ausschließlich als Dev-Fallback verfügbar.

Der AI-News-Assistent ist eine Dokumentaktion auf `newsArticle`. Er spricht
`/api/admin/generate-news-article` ebenfalls mit der aktuellen Sanity-Session an, schreibt aber
nur über den Browser-Client einen prüfbaren Draft und veröffentlicht nie automatisch. Anthropic-
Secrets und Web-Recherche bleiben serverseitig; Staging ist hart 404. Vorhandene Texte und Bilder
bleiben standardmäßig erhalten, und Alt-Texte dürfen nur aus einem expliziten Bildmotiv entstehen.

## Stripe

- `lib/stripe-catalog.ts` ist die serverseitige Wahrheit für Pack, Typ, Slug, Price und Betrag.
  Der Client sendet nur `packId`/Locale und optional ein Firebase-ID-Token; Clientpreise sind nie
  autoritativ.
- `POST /api/stripe/checkout` validiert Pack/Besitz, löst LIVE-Preise direkt und TEST-Preise per
  `lookup_key`, erstellt Stripe Hosted Checkout und serialisiert parallele Auth-Requests über
  `stripeCheckoutAttempts` plus Stripe-Idempotency-Key.
- `lib/stripe-session.ts` lädt die Session serverseitig erneut und prüft Mode, Currency, Metadata,
  exakt ein Line Item, Quantity, Price und Betrag gegen den Checkout-Snapshot/Katalog.
- `POST /api/stripe/webhook` liest den Raw Body, verlangt eine gültige Stripe-Signatur und erfüllt
  nur bezahlte `checkout.session.completed`/`async_payment_succeeded`-Sessions.
- Fulfillment schreibt Entitlements transaktional first-writer-wins. Gleiche Session = idempotenter
  Retry; andere bezahlte Session bei bestehendem Entitlement = vollständiger, idempotenter Refund.
  Guest-Käufe erzeugen/finden den Firebase-User und versenden den Magic Link mit Outbox-Marker.
- Staging verwendet ausschließlich Stripe TEST-Secrets/Prices/Webhook; Production ausschließlich
  LIVE. Secret Keys und Webhook-Signing-Secrets bleiben serverseitig und projektgetrennt.

## Do & Don't

Nur was `CLAUDE.md` nicht schon abdeckt — Routing, Login-Modal, StaticPages, ScrollRestorer,
FOUC-Guards, `CSS_VERSION`, WebP und Light-only/Motion stehen dort.

- Do: Home-Tokens und flache Home-Komponenten wiederverwenden. Don't: rohe `--remy-stage-*`-Farben/starke Shadows aus `HubFragRemy.module.css` oder alte Font-/Palette-Aliasse kopieren.
- Do: Restaurant-Kategorien als Sanity-Referenzen behandeln. Don't: alte String/Ref-Dualpfade oder Migrations-Shims wieder einführen.
- Do: `homeWeek` nur entsprechend seinem belegten Consumer ändern. Don't: es ohne Änderung von `getHomeData.ts` zur vermeintlichen Home-Quelle erklären.
- Do: Premiumdaten über den privaten Firebase-Pfad ausliefern. Don't: Sanity-Assets/-Felder, direkte Firestore/Storage-Reads oder erratbare öffentliche Bildpfade als Abkürzung verwenden.
- Do: Live-Restaurant-Imports mit der aktuellen Sanity-User-Session autorisieren. Don't: einen
  `SANITY_API_WRITE_TOKEN`, Shared Import Secret oder Provider-Key in das Studio-Bundle legen.
- Do: AI-News als redaktionellen Draft erzeugen und vor Publish prüfen. Don't: AI-generierte
  Artikel automatisch veröffentlichen oder Alt-Texte für nicht beschriebene Bilder erfinden.

## Prüftiefe

- Kleine fokussierte Änderungen; ein Thema pro Commit. Vor größeren Umbauten kurzer Plan mit
  überprüfbaren Ergebnissen. Nichts ohne Prüfung aktiver Imports, Routen, Queries und Tests löschen.
  Copy folgt der Brand Voice.
- Bugfix: Reproduktion plus Nachweis. UI: DOM, Computed Styles, A11y, Responsive und Interaktionen.
  Backend/Security: positive/negative Pfade, Projektgrenzen und Datenlecks prüfen.
- Secrets bleiben in Env/Secret Manager; keine `.env.local`, `.private`, Credentials,
  Premium-CDN-URLs oder privaten Manifeste ausgeben, loggen oder committen.
