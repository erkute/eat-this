# Audit Report — 13.07.2026

## Executive Summary

Die Codebasis hat nach dem Rebuild eine solide Grundlage: Lint, 711 Tests, TypeScript und der isolierte Produktions-Build sind grün; es wurden weder eingecheckte Secrets noch ein bestätigter XSS-Pfad oder komplett unerreichbare Produktions-Komponenten gefunden. Das größte Risiko liegt außerhalb der UI-Gates: Das öffentliche Sanity-Dataset erlaubt den anonymen Direktzugriff auf sämtliche 23 als bezahlt behandelten Must-Eat-Inhalte. Wirtschaftlich relevant sind außerdem mögliche Doppelzahlungen, frei erreichbare Staging-APIs, manipulierbare Heart-Zähler und ein anonym auslesbarer Locked-Katalog. Der größte Aufräumhebel liegt in wenigen verwaisten API-/Script-Pfaden, sichtbar übereinander geschichteten CSS-Umbauten und der zu breit verantwortlichen Map-Orchestrierung.

## Prüfrahmen und Beleglage

- Geprüfter Stand: Branch `staging`, Commit `d61ba396`; der Working Tree war vor dem Audit sauber.
- Umfang: 611 getrackte Dateien, davon 391 TS/TSX/JS-Dateien; 18 Page-Entrypoints, 15 API-Routen, 52 CSS Modules und 110 Testdateien.
- Statische Suche: `rg` über Produktionscode, Tests, Studio und Konfiguration; Importgraph ab allen Next-Entrypoints; gezielte Schema→Query→Renderer- und API→Consumer-Suchen.
- CSS-Prüfung: AST-Scan auf gleiche Selektoren/Eigenschaften im gleichen At-Rule-Kontext, nicht nur Textsuche.
- Read-only-Live-Proben am 13.07.2026: ausschließlich Status, Counts, Payload-Größen und Feldnamen; keine redaktionellen Inhalte wurden ausgegeben oder gespeichert.
- Verifikation: `npm run lint`, `npm test` (110 Dateien/711 Tests), `npx tsc --noEmit` und `npm run build:isolated` bestanden. Der Build erzeugte 817 statische Seiten; First Load JS lag bei 188 kB shared und 323 kB für `/map` vor dem lazy MapLibre-Chunk.

## Bestandsaufnahme

### Routen- und Komponenten-Map

| Oberfläche | Routen | Hauptverantwortliche Komponenten / Datenquellen |
| --- | --- | --- |
| Hub / SPA | `/`, `/en`, `/map`, `/must-eats`, `/news/[slug]`, `/guides/[slug]`, Catch-all für statische Seiten | `HubSection` erhält `getHomeData()` und anonymes Map-SSR parallel (`nextjs/app/[locale]/(spa)/page.tsx:62-88`). `MapSection` erhält `getInitialAnonMapData()` (`nextjs/app/[locale]/(spa)/map/page.tsx:54-68`). `NewsArticleShell` rendert Portable Text und Empfehlungen. |
| Discovery / SEO | `/restaurant/[slug]`, `/bezirk`, `/bezirk/[slug]`, `/kategorie`, `/kategorie/[slug]` | Server Components über `nextjs/lib/sanity.server.ts`; Restaurantseiten kombinieren Detail, Must-Eat-Teaser und Bezirk-/Kategorie-Siblings. |
| Packs / Account | `/packs`, `/pack/[slug]`, `/checkout/success`, `/profile`, `/login`, `/badge`, `/welcome` | `PackBuyButton` → Stripe Checkout; `ProfileAuthGuard` → `ProfileShell` → Spots, Album und Packs; Login-Route und globaler `LoginModalProvider` teilen den Auth-Unterbau. |
| Gemeinsame SPA-Hülle | alle `(spa)`-Routen | `AuthProvider`, `LoginModalProvider`, `UserLocationProvider`, `SiteNav`, `BurgerDrawer`, `CookieConsent`, `BuddyWidget` (`nextjs/app/[locale]/(spa)/layout.tsx:61-89`). |
| Map-Komponenten | `/map`, Teile des Hubs/Profile | `MapSection` → `MapSectionBody` → lazy `MapCanvasLayer`, `RestaurantList`, `MapSheetDetail`; Filter, Kamera, Deep-Links, Favoriten und Reveal-State laufen in Hooks unter `nextjs/lib/map/` bzw. `nextjs/app/components/map/`. |
| System-Routen | `robots`, `sitemap`, `news-sitemap.xml`, `llms.txt`, OG- und E-Mail-Renderer | App-Root-Routen; Sanity-Revalidation invalidiert ausgewählte Tags/Pfade. |

### API-Map

| Bereich | Routen | Schutz / Zweck |
| --- | --- | --- |
| Auth / Nutzer | `/api/auth/send-magic-link`, `/api/heart`, `/api/referral/confirm`, `/api/debug/whoami` | Firebase-Tokens bei Heart/Referral; E-Mail- und Heart-Limits; Debug in Production 404. |
| Discovery | `/api/map-data`, `/api/restaurant-detail/[slug]`, `/api/bezirk`, `/api/buddy` | Map-Entitlements serverseitig; Restaurantdetail und Bezirk öffentlich; Buddy mit IP-/Session-Limit. |
| Must Eats | `/api/must-eat-demo`, `/api/must-eat-reveal` | Reveal verlangt Firebase-Token, Sichtbarkeit und Rate Limit; physische Nähe ist technisch nur eine Client-Behauptung. |
| Stripe | `/api/stripe/checkout`, `/api/stripe/webhook`, `/api/stripe/fulfill` | Checkout-Session serverseitig; signierter Raw-Body-Webhook; Fulfill-Fallback ist implementiert, aber ohne Consumer. |
| Betrieb | `/api/revalidate`, `/api/dev/import-restaurant` | Sanity-HMAC-Revalidation; Import-Route durch `NODE_ENV === development` hart auf lokale Entwicklung begrenzt. |

### Datenfluss

1. Sanity ist die redaktionelle Quelle. Server Components und serverseitige APIs lesen über `nextjs/lib/sanity.ts`; öffentliche SEO-Seiten werden überwiegend stündlich regeneriert.
2. Die Map lädt beim SSR ein anonym komponiertes Set. `/api/map-data` verbindet anschließend Sanity-Katalog, Firebase-Entitlements, Referral-Boni und persistierte Must-Eat-Reveals; bezahlte Must-Eat-Felder werden dort pro Nutzer entfernt.
3. Firebase Auth lebt im Client; Firestore-Regeln erlauben Owner-Reads für Profile/Favoriten/Entitlements, während Entitlements, Unlocks und Referral-Boni serverseitig geschrieben werden sollen.
4. Stripe-Checkout verwendet einen serverseitigen Pack-Katalog. Der Webhook schreibt das Entitlement über eine Firestore-Transaktion; Gastkäufe werden per E-Mail einem vorhandenen oder neu angelegten Firebase-Account zugeordnet.
5. Sanity Studio ist operativ getrennt. Die lokale Import-Route und CLI-Skripte verwenden Schreib-Tokens nur in Development.

## Findings

### 🔴 Critical (Sicherheit / kann Geld oder Daten kosten)

| # | Datei | Problem | Warum kritisch | Fix-Aufwand |
| --- | --- | --- | --- | --- |
| C1 | `nextjs/lib/sanity.ts:3-8`<br>`nextjs/lib/map/queries.ts:72-92`<br>`nextjs/lib/map/stripCoveredMustEats.ts:3-20` | Die App behandelt `dish`, Bild, Beschreibung und Preis als bezahlte Felder und entfernt sie in `/api/map-data`. Das verwendete Dataset `production` ist jedoch anonym abfragbar. Eine tokenlose Live-GROQ-Probe lieferte HTTP 200, 23 Must-Eats und bei 23/23 die bezahlte Projektion. | Das UI/API-Stripping schützt nur die eigene Response, nicht die Quelle. Ein Besucher kann Texte und Asset-URLs direkt aus Sanity lesen und damit den vollständigen Must-Eat-Paywall umgehen. Sanity dokumentiert, dass [öffentliche Datasets von jedem abgefragt werden können](https://www.sanity.io/docs/content-lake/keeping-your-data-safe). Bezahlte Dokumente und Assets müssen in einen privaten, ausschließlich serverseitig gelesenen Bereich; bereits veröffentlichte Asset-URLs sind bei der Migration gesondert zu behandeln. | L |

### 🟠 High (Bugs, Performance-Killer, große Altlasten)

| # | Datei | Problem | Impact | Fix-Aufwand |
| --- | --- | --- | --- | --- |
| H1 | `nextjs/app/api/stripe/checkout/route.ts:42-54,67-90`<br>`nextjs/lib/stripe-fulfill.ts:52-92`<br>`nextjs/app/api/stripe/webhook/route.ts:100-113` | Der Owned-Check liegt vor der Session-Erstellung und gilt nur für eingeloggte Käufer. Zwei parallele Requests oder ein ausgeloggter Bestandskunde können mehrere bezahlbare Sessions für denselben Pack erzeugen; Fulfillment behält wegen `doc(packId)` nur das erste Entitlement und lässt die weitere Zahlung ohne Gegenwert bestehen. | Reale Doppelbelastung. Stripe-Idempotency allein für einen Request genügt nicht: Es braucht einen transaktionalen Pending-Purchase-/Attempt-Lock und einen Alarm-/Refund-Pfad, wenn eine zweite bezahlte Session auf ein vorhandenes Entitlement trifft. | M/L |
| H2 | `nextjs/middleware.ts:39-49,169-175`<br>`nextjs/apphosting.yaml:20-23,89-112`<br>`nextjs/apphosting.staging.yaml:1-43` | Der Code will alle Staging-Requests außer dem Stripe-Webhook per Basic Auth schützen; der Middleware-Matcher schließt aber **alle** `/api`-Routen aus. Live: Staging `/` → 401, `/api/bezirk` und `/api/map-data` ohne Credentials → 200. | Buddy-, Magic-Link-, Checkout- und weitere APIs umgehen den zugesagten Staging-Schutz. Die Staging-YAML erklärt selbst, dass sie die Production-Defaults erbt, überschreibt aber Resend/Anthropic/Voyage nicht; damit referenziert die Konfiguration auch dort die Production-Secret-Namen. Ob der Staging-Service-Account tatsächlich Zugriff auf diese Secrets hat, ist remote **zu verifizieren**. Ein Fix muss zusätzlich den Konflikt zwischen Basic Auth und Firebase-Bearer-Headern lösen. | M |
| H3 | `firestore.rules:23-26`<br>`nextjs/app/api/heart/route.ts:20-32,74-97` | Die API bezeichnet sich als einzigen Favorite-/Heart-Writer, aber die Rules erlauben dem Owner beliebiges direktes Create/Delete unter `users/{uid}/favorites/**`. Nach API-`add` kann der Client das Favorite direkt löschen und erneut `add` senden; umgekehrt kann er vor API-`remove` direkt anlegen. | `restaurants/{id}.heartCount` lässt sich positiv aufblasen oder unter null drücken; das API-Rate-Limit verlangsamt nur. Direkte Writes verbieten oder ausschließlich ein validiertes `note`-Update zulassen und Rules-Emulator-Tests ergänzen. | S/M |
| H4 | `nextjs/app/api/map-data/route.ts:78-84`<br>`nextjs/lib/map/stripLockedRestaurant.ts:3-20`<br>`nextjs/lib/map/useMapDeepLinks.ts:62-94`<br>`nextjs/app/api/restaurant-detail/[slug]/route.ts:5-31` | Die anonyme Production-Response lieferte 29 sichtbare plus 310 `lockedRestaurants`, inklusive Namen, Slugs, Koordinaten, Kategorien, Öffnungszeiten und Fotos. Locked-Deep-Links werden absichtlich geöffnet; Details sind öffentlich. Gleichzeitig rendert `RestaurantList` Locked-Rows nicht mehr, sondern nutzt nur deren Count (`nextjs/app/components/map/RestaurantList.tsx:161-193`). | Die komplette kuratierte Pack-Auswahl ist mit einem Request exportierbar und auf einer fremden Map rekonstruierbar. **Zu verifizieren:** Öffentliche Restaurant-/Kategorie-SEO-Seiten sind eine bewusste Produktentscheidung; falls Packs nur Komfort plus Must-Eats verkaufen, muss das Versprechen präzisiert werden. Falls die Auswahl selbst Pack-Inhalt ist, widerspricht die aktuelle API/SEO-Architektur der Paywall. | M/L |
| H5 | `nextjs/app/[locale]/checkout/success/page.tsx:29-90`<br>`nextjs/app/[locale]/checkout/success/CheckoutSuccessAnalytics.tsx:13-22`<br>`nextjs/app/api/stripe/fulfill/route.ts:12-49` | Die Success-Seite nutzt den Stripe-Status nur für die maskierte E-Mail. Sie zeigt auch bei fehlender, ungültiger oder unbezahlter Session „Zahlung bestätigt“, nimmt Pack/Wert unabhängig aus `?pack=` und sendet daraus ein GA4-`purchase`. Der kommentierte Success-Page-Fulfill-Poll existiert als Route, hat aber keinen Aufrufer. | Jeder consented Besucher kann mit eindeutigen Query-IDs falsche Käufe/Umsätze erzeugen; echte Käufer sehen bei verzögertem Webhook eine Erfolgsaussage ohne Recovery. Session muss verifiziert/bezahlt sein, Pack und Betrag müssen aus deren Metadata/Line Item stammen; dann Fallback wirklich anbinden oder entfernen. | S/M |
| H6 | `studio/schemaTypes/newsArticle.js:280-300`<br>`nextjs/lib/queries.ts:109-129`<br>`nextjs/app/[locale]/(spa)/news/[slug]/page.tsx:30-35` | Das Studio pflegt `seo.metaTitleEn` und `metaDescriptionEn`, die Query lädt aber nur DE-Felder und Metadata verwendet sie für beide Locales. Live sind alle 7 veröffentlichten Artikel in beiden EN-Feldern befüllt. | Alle englischen News-Seiten bekommen trotz vorhandener Redaktion deutsche SEO-Overrides; das beschädigt EN-Suchergebnis und Sharing. | S |

### 🟡 Medium (Tech Debt, Inkonsistenzen)

| # | Datei | Problem | Impact | Fix-Aufwand |
| --- | --- | --- | --- | --- |
| M1 | `nextjs/app/api/referral/confirm/route.ts:73-84,116-141`<br>`nextjs/lib/referral/constants.ts:20-25` | Das 25er Referral-Cap wird außerhalb der Transaktion gezählt; parallele neue Friend-Dokumente sperren jeweils unterschiedliche Pfade. | Viele gleichzeitige neue Accounts können denselben alten Count sehen und das Cap überschreiten. Gemeinsamen Inviter-Counter/Slots transaktional belegen; IP-/Inviter-Abuse-Limit ergänzen. | M |
| M2 | `nextjs/app/api/stripe/webhook/route.ts:100-113` | Auch wenn `assembleAndWriteEntitlement()` bei einer erneuten Webhook-Zustellung `exists` liefert, wird für Gastkäufe erneut eine Magic-Link-Mail verschickt. | Normale Webhook-Wiederholungen können Spam und Resend-Verbrauch verursachen. Event-/Outbox-Idempotenz oder einen Provider-Idempotency-Key auf Basis der Stripe-Event-ID verwenden. | M |
| M3 | `nextjs/lib/firebase/config.ts:47-52`<br>`nextjs/lib/firebase/useOwnedEntitlements.ts:40-53`<br>`nextjs/lib/map/useFavorites.ts:54-75` | `getDb()` memoisiert auch ein abgelehntes Dynamic-Import-/Init-Promise. Mehrere Hooks starten den Import außerhalb ihrer Fehlerbehandlung; Snapshots haben teils keinen Error-Callback. | Ein transienter Chunk-/Init-Fehler vergiftet alle Firestore-Flows bis zum Reload; Packs können als locked erscheinen, Favoriten leer bleiben und Promise-Rejections unhandled werden. Promise bei Reject zurücksetzen und ein gemeinsames Loading/Error/Retry-Pattern verwenden. | M |
| M4 | `nextjs/lib/map/useMapData.ts:115-116,165-201`<br>`nextjs/app/components/MapSection.tsx:57-65`<br>`nextjs/app/components/profile/ProfileShell.tsx:42-61` | `useMapData` führt `loading` und `error`, aber Map und Profil konsumieren sie nicht. | Ein zahlender Nutzer bleibt bei einer fehlgeschlagenen Auth-Response unbemerkt auf anonymen/gecacheten Daten oder sieht leere Profilzahlen. Sichtbaren Retry/Error-State und eine klare Stale-Data-Kennzeichnung ergänzen. | S/M |
| M5 | `nextjs/app/components/map/useMustEatDetailState.ts:56-74`<br>`nextjs/lib/map/useUnlockedMustEats.ts:70-88`<br>`nextjs/app/components/MapSection.tsx:899-911` | Reveal-Animation und Analytics melden `unlocked`, bevor `onUnlock()` abgeschlossen ist; Promise und `null`-Fehler werden ignoriert. | Bei Token-/Netzwerkfehler sieht der Nutzer Erfolg, die Karte ist danach wieder gesperrt; Rejections können unhandled sein. Erst nach persistiertem Erfolg animieren oder sauber rollbacken/retryen. | S/M |
| M6 | `nextjs/lib/map/useFavorites.ts:24-77` | Bei `uid === null` werden `favoriteIds` und `favorites` nicht geleert; beim Wechsel auf einen Nutzer ohne Cache bleibt der vorherige Zustand bis zum erfolgreichen Firestore-Read stehen. | Auf einem gemeinsam genutzten Browser können Favoriten/Heart-Status des vorherigen Accounts sichtbar bleiben, bei Read-Fehler unbegrenzt. State beim UID-Wechsel atomar reseeden/clearen und den Wechsel testen. | S |
| M7 | `nextjs/app/[locale]/restaurant/[slug]/page.tsx:138-149`<br>`nextjs/lib/queries.ts:140-180` | Für höchstens sechs Sibling-Cards werden komplette Bezirk- und Kategorie-Listen geladen und erst in JS gekürzt. Live-Beispiel `dinner` + `mitte`: 224 + 77 Rows, 463.989 Bytes raw. | Unverhältnismäßige Sanity-Egress-/Parse-Arbeit bei Cold Cache und ISR. Zwei begrenzte, karten-spezifische Queries oder eine deduplizierte kombinierte Query verwenden. | M |
| M8 | `nextjs/app/components/profile/ProfilePacks.tsx:33-69`<br>`nextjs/app/components/profile/ProfileSlim.module.css:410-430`<br>`nextjs/next.config.ts:55-75` | Das Profil rendert Welcome plus neun Pack-Arts als rohe, nicht lazy `<img>`-Dateien: 1.625.624 Bytes für maximal 166×190 px. Dieselben veränderlichen Dateinamen erhalten ein Jahr `immutable`. | 1,55 MiB unnötiger Download auf einer Account-Seite und bei Asset-Austausch bis zu ein Jahr alte Bilder. Responsive `next/image`-Varianten/lazy loading und konsistente Versionierung bzw. Fingerprints einführen. | S/M |
| M9 | `nextjs/app/api/revalidate/route.ts:87-143`<br>`nextjs/app/[locale]/(spa)/map/page.tsx:17`<br>`nextjs/app/[locale]/(spa)/must-eats/page.tsx:8` | Restaurant-/Kategorie-Webhooks invalidieren weder `/map` noch `/must-eats`; das Leeren des Modul-Caches wirkt nur in der gerade bedienten Instanz. Anonyme Clients überspringen außerdem den ersten Korrektur-Fetch (`nextjs/lib/map/useMapData.ts:147-161`). | Neue/geschlossene Spots und Kategorien können bis zur stündlichen Regeneration alt bleiben; andere warme Instanzen behalten bis zu 60 Sekunden ihren Cache. Relevante Pfade/Tags explizit invalidieren und Cache-Ownership vereinheitlichen. | S/M |
| M10 | `nextjs/app/components/map/MapDetails.module.css`<br>`nextjs/app/components/map/MapControls.module.css`<br>`nextjs/app/[locale]/login/login.module.css` | Der AST-Scan fand im selben At-Rule-Kontext 151, 39 und 23 frühere Deklarationen, die später für denselben Einzel-Selektor/dieselbe Property überschrieben werden. Die Dateien haben 4.802, 888 und 1.366 Zeilen; Beispiele sind `.btnPackPromo` (`MapDetails.module.css:2276-2282,2385-2423`) und `.mapSearchBtn` (`MapControls.module.css:502-515,686-701`). | Sichtbare Umbau-Schichten erschweren jede UI-Änderung und enthalten nachweisbare Dead-CSS-Kandidaten. Nicht blind löschen: pro Oberfläche Computed Styles/Responsive States prüfen und danach die finale Regel nach vorne ziehen. | L |
| M11 | `nextjs/app/components/MapSection.tsx:55-1130`<br>`nextjs/app/components/map/MapSectionBody.tsx:150-241` | `MapSection` hat 1.132 Zeilen und reicht mehr als 50 Props an den 726-Zeilen-Body. Data Access, Firestore-Refresh, Filter, Location, Kamera, Deep-Links, URL-Sync, Paging, Favoriten, Reveal und Sheet-State liegen im selben Orchestrator. | Hohe Regressionswahrscheinlichkeit und langsame Feature-Arbeit. An Ownership-Grenzen teilen: Data/Access, Camera/Deep-Link und Sheet/Detail; kein kosmetischer Komplett-Rewrite. | L |
| M12 | `nextjs/scripts/backfill-gallery.ts:1-17,122-160`<br>`nextjs/scripts/import-from-url.ts:483-525`<br>`nextjs/scripts/lib/photo-curation.ts:95-250` | Das Backfill-Skript verspricht Haiku-Kuration, Kosten-/Key-Checks und fängt `HaikuUnavailableError`; tatsächlich ruft es nur `importGalleryPhotos()` auf, das die ersten drei Owner-Fotos nimmt. `judgePhotos()` hat keinen Produktions-Aufrufer. | `--force` kann kuratierte Galerien mit nicht qualitätsgeprüften Bildern überschreiben; Bediener verlassen sich auf falsche Dokumentation. Scoring wieder anbinden oder Pipeline, Catch und Kostenhinweise vollständig entfernen. | M |
| M13 | `studio/schemaTypes/category.js:44-75`<br>`nextjs/lib/home/getHomeData.ts:52-83`<br>`studio/schemaTypes/homeWeek.js:4-53`<br>`nextjs/lib/map/free-surface.ts:102-125` | 8/9 Kategorien haben `homeImage` und `homeImages`, aber das Frontend nutzt ausschließlich statische `categoryArt()`-Assets. Das vorhandene `homeWeek` enthält Bezirk, Tagline und Kategorien; konsumiert werden nur Datum und `bezirkSpots`. | Das CMS verspricht Redakteuren zwei Pflegestrecken, deren Inhalt nicht erscheint. Pro Bereich eine Source of Truth festlegen; befüllte Felder nicht vor dieser Entscheidung löschen. | M |

### 🟢 Low (Kosmetik, Nice-to-have)

- `nextjs/app/api/stripe/fulfill/route.ts:12-49` hat trotz „Success-Page-Polling“-Kommentar keinen internen Consumer. Externe/native Nutzung **zu verifizieren**, dann entweder wirklich anbinden oder Route, Tests und Kommentare entfernen.
- `nextjs/app/api/bezirk/route.ts`, `nextjs/lib/geo/locateBezirk.ts`, dessen Test, `berlin-ortsteile.json` (75.883 Bytes), zwei Übersetzungen und der Kommentar in `UserLocationContext` bilden einen repo-intern verwaisten Cluster. Undokumentierte externe Nutzung **zu verifizieren**.
- Stripe Webhook/Fallback binden Fulfillment nicht noch einmal an `mode`, `currency`, `amount_total` und Price-ID (`nextjs/app/api/stripe/webhook/route.ts:58-105`). Aktuell kein eigenständig externer Exploit, weil die signierte Session serverseitig erstellt wird; als Integrity-Guard gegen Fehlkonfiguration/weitere Session-Creator sinnvoll.
- `AnalyticsPageViews` übermittelt auf der Success-Seite die vollständige URL inklusive Stripe-`session_id` an GA4 (`nextjs/app/components/AnalyticsPageViews.tsx:12-18`). Consent besteht, trotzdem sollte der Parameter vor Analytics entfernt werden.
- Zwei Geolocation-State-Maschinen driften: `nextjs/lib/map/useUserLocation.ts:31-65` für die Map und `nextjs/lib/map/UserLocationContext.tsx:39-82` für Hub/Buddy. Eine gemeinsame Request-Primitive würde doppelte Fehlerkorrekturen vermeiden.
- Restaurant-/Must-Eat-Deep-Link- und Auto-Locate-Polls planen 120-ms-Timer ohne Unmount-/Chunk-Failure-Abbruch (`nextjs/lib/map/useMapDeepLinks.ts:71-146`, `nextjs/app/components/MapSection.tsx:946-970`). Der Bezirk-Poll in derselben Datei zeigt bereits das Cleanup-Pattern.
- 123 von 260 in `nextjs/app/globals.css` definierten Custom Properties haben im CSS-Scan keinen `var()`-Consumer. Das sind Kandidaten, keine pauschale Löschfreigabe: öffentliche Design-API und dynamische JS-Nutzung zuerst ausschließen.
- Die News-Query projiziert `author`, Typ und JSON-LD unterstützen eine Person, aber Studio hat kein Author-Feld und Live-Daten enthalten 0 Referenzen (`nextjs/lib/queries.ts:123,303`; `nextjs/app/[locale]/(spa)/news/[slug]/page.tsx:99-101`).

## Löschliste

### Sicher aus dem aktuellen Repository ableitbar

- `.playwright-mcp/page-2026-07-01T06-09-53-616Z.yml` und `.playwright-mcp/page-2026-07-01T06-14-55-591Z.yml`: zwei identische 18.093-Byte Accessibility-Snapshots; `rg` findet keinerlei Referenz. Danach `.playwright-mcp/` ignorieren.
- Nur von ihren eigenen Tests referenzierte Exporte samt ausschließlich dafür existierender Testfälle:
  - `nextjs/lib/home/nearby.ts:24-40` — `nearbyMustEats`
  - `nextjs/lib/home/mustEatsGallery.ts:5-12` — `splitMustEats`
  - `nextjs/lib/map/mustEatPeek.ts:3-19` — `buildPrimaryMustEatMap`
  - `nextjs/lib/PortableTextRenderer.tsx:102-124` — `extractArticleSpots`, plus `ArticleSpot` in `nextjs/lib/types.ts:123-131`
  - `nextjs/lib/restaurant-prose.ts:17-44` — `buildQuickFacts`
  - `nextjs/lib/env.ts:7` — `isProduction`
- Tote News-Author-Pipeline: Projektionen in `nextjs/lib/queries.ts:123,303`, `NewsArticleAuthor`/`NewsArticle.author` in `nextjs/lib/types.ts:133-154` und der unerreichbare Person-Zweig in `nextjs/app/[locale]/(spa)/news/[slug]/page.tsx:99-101`. Beleg: kein Schemafeld, 0 Live-/Draft-Dokumente mit `author`, keine andere Quelle.
- `studio/schemaTypes/category.js:44-49` — Feld `icon`: keine Frontend-Query/kein Renderer, Live-Count 0.
- `studio/schemaTypes/mustEat.js:19-24` — verstecktes Legacy-Feld `restaurant`: keine aktive Query; 21 Dokumente tragen es noch, aber 0 Must-Eats fehlen `restaurantRef`. Schemafeld entfernen, Legacy-Daten nach Backup separat unsetten.

Es wurde **keine** ganze Produktions-Komponente und **keine** direkte npm-Abhängigkeit gefunden, die belastbar ungenutzt ist. Ebenso gab es keine TODO/FIXME/HACK-Leichen oder deaktivierten Feature-Flags. Scheinbar ungenutzte CSS-Module-Klassen waren bei Stichproben dynamische Namen oder `:global` und stehen deshalb nicht auf der sicheren Liste.

### Zu verifizieren, nicht blind löschen

- Bezirk-Cluster: `nextjs/app/api/bezirk/route.ts`, `nextjs/lib/geo/locateBezirk.ts`, `nextjs/lib/geo/locateBezirk.test.ts`, `nextjs/lib/geo/berlin-ortsteile.json` sowie die zugehörigen Texte/Kommentare. Repository-intern kein Consumer; externe Nutzung kurz ausschließen.
- Stripe-Fallback: `nextjs/app/api/stripe/fulfill/route.ts` plus Route-Test. Vor Löschung entscheiden, ob die im Kommentar versprochene Recovery stattdessen angebunden wird.
- Photo-Curation: `nextjs/scripts/lib/photo-curation.ts` und dessen Tests. Produktentscheidung „wieder anschließen“ versus „vollständig entfernen“.
- `category.homeImage/homeImages`, deren Importer und Studio-Menü sowie `homeWeek.bezirk/bezirkTagline/categories`: Live-Daten sind vorhanden; zuerst die redaktionelle Source of Truth festlegen.
- `newsArticle.alt` ist **nicht** löschbar: Ein veröffentlichtes Dokument benötigt weiterhin `coalesce(image.alt, alt)`.

## Was gut ist

- Die Qualitätsbasis ist stark: alle Standardchecks sind grün, TypeScript enthält im Produktionscode weder `@ts-ignore`/`@ts-expect-error` noch belastbaren `any`-Wildwuchs.
- Stripe-Preise stammen serverseitig aus einem statischen Katalog; der Webhook prüft Raw-Body-Signatur und `payment_status === paid`; das Entitlement-Write ist race-safe und idempotent in einer Firestore-Transaktion.
- Firestore sperrt Entitlements, Unlocks, Referral-Boni und Rate-Limit-Dokumente gegen Client-Writes. Der Heart-Ausreißer ist lokal behebbar und kein grundsätzlich falsches Rules-Modell.
- Kein bestätigtes Sanity-/HTML-XSS: Portable Text erzeugt React-Nodes, Links werden im Studio auf erlaubte Protokolle validiert und JSON-LD escaped schließende Script-Sequenzen.
- Routing, Locale-Prefixe und content-aware Canonicals/Hreflangs sind klar zentralisiert. Statische Seiten werden routenspezifisch gerendert statt als doppelter SSR-Block.
- Die Map-Projektion ist grundsätzlich diszipliniert: Full-All-Berlin maß bei der Probe nur 299.502 Bytes raw/45.817 Bytes gzip; Detailfelder werden on demand geladen und MapLibre liegt hinter einer dynamischen Client-Grenze.
- `useMapData` schützt vor stale async responses, Server-Caches deduplizieren parallele Sanity-Requests, globale/Locale-Error-Boundaries berichten an Sentry.
- Importgraph und Dependency-Suche fanden keine komplett verwaiste Produktions-Komponente und keine sicher ungenutzte direkte Dependency. Das ist nach einem großen Rebuild ein gutes Signal.

## Empfohlene Reihenfolge

1. **Sofort — C1 eindämmen:** Bezahlte Must-Eat-Dokumente und Assets aus dem öffentlichen Sanity-Bereich nehmen; serverseitigen Read-Client/Storage-Vertrag festlegen und danach anonymen Direktzugriff erneut testen.
2. **Quick Win (S/M):** Firestore-Favorite-Writes schließen und Rules-Emulator-Tests für Create/Delete/Note-Update ergänzen (H3).
3. **Quick Win (S/M):** Checkout-Success nur aus einer verifizierten bezahlten Session rendern; Pack/Betrag aus Stripe ableiten, Fake-Analytics schließen und Session-ID aus Pageviews entfernen (H5).
4. **Quick Win (S):** EN-News-SEO-Felder projizieren/typisieren und localeabhängig verwenden (H6).
5. **Vor weiterem Marketing:** Doppelkäufe mit Purchase-Attempt/Pending-Lock verhindern und Duplicate-Payment-Refund/Alert definieren (H1); Webhook-Mail idempotent machen (M2).
6. **Vor weiterem Staging-Test:** API-Schutz so umbauen, dass Basic Auth und Firebase-Bearer koexistieren; Secret-Grants des Staging-Backends prüfen (H2).
7. **Produktentscheidung:** Klar festlegen, ob Restaurant-Auswahl/Koordinaten oder nur Map-Komfort/Must-Eat-Inhalte verkauft werden; danach Locked-Payload und öffentliche SEO-Fläche konsistent machen (H4).
8. **Robustheit:** Firebase-Init retrybar machen, Map/Profile Error States zeigen, Reveal erst nach Persistenz bestätigen und Favorites bei UID-Wechsel löschen (M3–M6).
9. **Messbare Performance-Quick-Wins:** Sibling-Queries begrenzen, Profil-Packbilder optimieren/versionieren und Map-/Must-Eat-Revalidation vervollständigen (M7–M9).
10. **Gezieltes Aufräumen:** sichere Löschliste in kleinen Commits abarbeiten; danach Photo-Curation sowie Category/HomeWeek-Vertrag entscheiden (M12–M13).
11. **Kann warten:** Map an Ownership-Grenzen teilen und CSS pro Oberfläche mit visueller/Responsive Regression-Prüfung konsolidieren; keine Big-Bang-Neuschreibung (M10–M11).

## Abschlussprüfung

- Hauptprüfung: Lint, 711 Tests, TypeScript und isolierter Production-Build bestanden; Live-Proben bestätigten C1, H2 und die Payload-Counts aus H4 ohne schreibende Requests.
- Unabhängiger Zweitpass: `python3 "$HOME/.codex/skills/autoreview/scripts/autoreview" --mode commit --commit HEAD --engine codex --thinking high --prompt '<repository-wide audit prompt>' --stream-engine-output`. Der Helper endete für den engen Commit-Scope mit `autoreview clean: no accepted/actionable findings reported`, klassifizierte aber zwei Repository-Befunde als außerhalb des letzten Commit-Diffs.
- Beide Hinweise wurden unabhängig verifiziert und inhaltlich akzeptiert: unbezahlte/gefälschte Checkout-Success-Signale (H5) und die geerbte Staging-Resend-Konfiguration hinter vom Matcher ausgelassenen APIs (H2). Beim zweiten ist der tatsächliche Remote-Secret-Grant bewusst als **zu verifizieren** markiert. Es gab keine weiteren Autoreview-Findings; vermeintliche öffentliche Firebase-Client-Secrets, ein spekulativer Sanity-XSS und Stripe-Betragsprüfung als aktuell direkter externer Exploit wurden nach Code-/Vertragsprüfung verworfen bzw. nur als Low-Hardening geführt.
