# Staging- und Premium-Must-Eat-Isolation

Stand: 13.07.2026

Arbeitsbranch: `codex/staging-premium-isolation`
Basis: `origin/staging` auf `26e0d7e072af8a8dd37ec233bbb1d08e9ef9a037`

## Verifizierter Ist-Zustand

- Firebase CLI sieht genau ein Projekt: `eat-this-8a13b`.
- Die Backends `eat-this` und `eat-this-staging` liegen beide in diesem
  Projekt und laufen unter demselben App-Hosting-Service-Account.
- Das Staging-Backend erbt deshalb neben den Production-Defaults auch
  Production-Secret-Referenzen. Nur Basic Auth und Stripe waren explizit
  überschrieben; Resend, Anthropic, Voyage, Sentry, Sanity-Revalidation und
  Firebase-Admin-Credentials waren nicht isoliert.
- Die Browser-Firebase-Konfiguration war fest auf das Production-Projekt
  kompiliert. Ein neues Backend ohne Codeänderung hätte Auth und Firestore
  weiterhin mit Production verbunden.
- Runtime, Studio und mehrere lokale Sanity-Skripte waren fest auf Projekt
  `ehwjnjr2`, Dataset `production` eingestellt.
- Eine anonyme, ausschließlich aggregierte Probe bestätigte 23 veröffentlichte
  Must-Eat-Dokumente. Alle 23 enthalten Dish, DE-/EN-Beschreibung, Preis und
  Bild; 10 sind als anonyme Demo markiert. Eine anonyme Asset-HEAD-Probe
  lieferte HTTP 200. Zwei News-Artikel referenzieren Must-Eats.
- Lokale und remote Secret-Werte wurden weder gelesen noch ausgegeben. Die
  Inventur erfasste ausschließlich Variablennamen und Secret-Metadaten.

## Gewählte Architektur

Sanity bleibt der öffentliche redaktionelle Store, enthält für Must-Eats aber
nur noch nicht-sensitive Metadaten:

- Dokument-ID
- Restaurant-Referenz
- Reihenfolge
- Kennzeichnung der bewusst öffentlichen Demo

Der kanonische Vollinhalt jedes Must-Eats liegt pro Firebase-Umgebung in:

- Firestore `privateMustEats/{mustEatId}` für Dish, DE/EN-Text, Preis,
  Restaurant-Integritätsbindung und privaten Objektpfad
- Cloud Storage `premium/must-eats/{mustEatId}/{sha256}.webp` für das auf
  maximal 1200 px und WebP Q80 normalisierte Kartenbild

Firestore- und Storage-Rules verbieten jeden Browser-Read und -Write. Der
App-Hosting-Service-Account greift über Application Default Credentials auf
das eigene Projekt zu; wiederverwendbare Service-Account-Private-Keys werden
aus App Hosting entfernt.

Texte werden erst nach der bestehenden serverseitigen Reveal-/Entitlement-
Entscheidung in Map-/Reveal-Antworten gemischt. Bilder erscheinen im Payload
nur als stabile App-Route `/api/must-eat-image/{id}`. Die Route streamt Bytes
aus dem privaten Bucket und autorisiert entweder:

1. eine aktuell bewusst öffentliche Demo/Spot-of-the-day-Karte oder
2. eine kurzlebige, signierte `HttpOnly`-Cookie mit den serverseitig bereits
   genehmigten IDs, gebunden an die UID einer separat verifizierten Firebase-
   Session-Cookie.

Damit stehen weder Bucket-URLs noch übertragbare Query-Signaturen in DOM,
RSC-Payload oder Local Storage. Bei jeder Firebase-ID-/Token-Änderung wird die
alte Capability entfernt und die verifizierte Session ersetzt, bevor die neue
Identität im UI freigegeben wird. Map-/Reveal-Antworten stellen anschließend
nur eine zur Session-UID passende Capability aus; Logout löscht beide Cookies.
Die viewer-spezifische `revealedMustEatIds`-Antwort entspricht exakt den
hydratisierten IDs, damit gekaufte und All-Berlin-Karten im Client tatsächlich
face-up sind. Der lokale Metadaten-Cache verwirft diese Viewer-IDs zusammen mit
allen Premium-Feldern und berechnet sie nach Reload wieder live.

Öffentliche News-Artikel rendern Must-Eat-Referenzen künftig als verdeckte
Teaser mit Restaurant-Metadaten. Login-Mails und die serverseitig gerenderten
E-Mail-Karten enthalten keine Premium-Dish-Texte oder -Bilder mehr.

### Warum nicht nur ein privates Sanity-Dataset?

Private Sanity-Datasets schützen Dokumentabfragen, lösen allein aber nicht die
bereits veröffentlichten klassischen Asset-CDN-URLs. Private Asset-Visibility
mit Signed URLs ist eine gesonderte Media-Library-Funktion. Sanity dokumentiert
außerdem, dass Asset-CDN-Inhalte langfristig gecacht werden und Löschungen nicht
sofort verschwinden müssen. Firestore plus privater Cloud Storage liefert daher
mit den vorhandenen Firebase-Komponenten die kleinste überprüfbare Grenze.

## Konfigurationsgrenzen

Das isolierte Staging benötigt ein eigenes Firebase-Projekt mit eigenem App-
Hosting-Backend/Web-App, Firestore, Storage und Auth. Der Code nutzt für
Firebase Admin die automatisch injizierte Projektkonfiguration und ADC. Die
Client-SDK-Konfiguration wird in Staging ebenfalls projektlokal von App Hosting
bezogen; ein teilweiser expliziter `NEXT_PUBLIC_FIREBASE_*`-Satz wird abgelehnt.

Sanity Studio und CLI haben keinen Production-Fallback mehr. Jede Ausführung
muss `SANITY_STUDIO_ENV`, `SANITY_STUDIO_PROJECT_ID` und
`SANITY_STUDIO_DATASET` explizit setzen. `staging` lehnt das Production-Projekt
und Dataset ab; `production` akzeptiert nur den kanonischen Production-Target.

Folgende Staging-Secret-Referenzen müssen ausschließlich im neuen Projekt
existieren und dem neuen Backend gewährt werden:

- `FIREBASE_PROJECT_ID_STAGING` (erwartete, öffentliche Projekt-ID als
  fail-closed Admin-/Browser-Grenze)
- `STAGING_BASIC_AUTH_USER`, `STAGING_BASIC_AUTH_PASS`
- `SANITY_PROJECT_ID_STAGING`, `SANITY_API_READ_TOKEN_STAGING`
- `SANITY_REVALIDATE_SECRET_STAGING`
- `RESEND_API_KEY_STAGING`, `RESEND_FROM_EMAIL_STAGING`,
  `STAGING_EMAIL_RECIPIENT`
- `ANTHROPIC_API_KEY_STAGING`, `VOYAGE_API_KEY_STAGING`
- `BUDDY_IP_SALT_STAGING`, `PREMIUM_ACCESS_SIGNING_KEY_STAGING`
- `STRIPE_SECRET_KEY_STAGING`, `STRIPE_WEBHOOK_SECRET_STAGING`
- `ADMIN_EMAILS_STAGING`
- `NEXT_PUBLIC_APP_URL_STAGING`
- `NEXT_PUBLIC_SENTRY_DSN_STAGING`, `SENTRY_AUTH_TOKEN_STAGING`

Staging-Mail wird unabhängig von der angefragten Gastadresse ausschließlich an
`STAGING_EMAIL_RECIPIENT` zugestellt. Damit kann ein Gastkauf/Magic-Link-Flow
getestet werden, ohne echte Kunden anzuschreiben.

Sentry-Builds laufen zusätzlich in das getrennte Projekt
`javascript-staging`. Staging-Magic-Links akzeptieren keine Production-Origin.
Sie gehen nur an den Test-Sink, enthalten keine dynamischen Spot-Karten und
laden ihre statischen Mail-Assets vom Staging-Host; es gibt keinen Fallback
auf den Production-Host.

## Migration und Backfill

Der lokale Befehl `npm run premium:migrate -- ...` hat vier Modi. Alle Befehle
geben nur Counts/Status aus, nie Inhalte oder Credentials.

### 1. Backfill

`backfill --dry-run` validiert die Quelle. `backfill --apply` lädt jedes Bild,
normalisiert es auf WebP Q80, schreibt ein content-addressed privates Objekt und
das passende Firestore-Dokument. Es erzeugt unter `.private/` ein Manifest mit
IDs, Restaurant-Bindungen, Bild-/Datensatz-Hashes und Legacy-Asset-URLs, aber
ohne Premium-Texte oder Secret-Werte.
Das Verzeichnis ist gitignored und die Datei wird mit Modus 0600 angelegt.
Im selben Apply-Lauf entfernt der Backfill außerdem frühere `dish`-Duplikate
aus owner-lesbaren `users/*/unlockedMustEats/*`-Dokumenten.

Der Backfill ist fail-closed:

- Source- und Target-Projekt werden explizit angegeben.
- Explizite lokale Firebase-Credentials müssen zum Target-Projekt passen.
- Ein fehlendes Feld, Objekt oder eine falsche Restaurant-Zuordnung bricht ab.
- Der App-Code hat keinen Fallback auf öffentliche Sanity-Vollinhalte.

### 2. Öffentlicher Metadatenexport

`export-metadata` erzeugt eine importierbare NDJSON-Datei nur mit Must-Eat-ID,
Restaurant-Referenz, Reihenfolge und Demo-Flag. So kann ein neues Sanity-
Staging-Projekt aufgebaut werden, ohne dass Premium-Felder oder deren Assets
auch nur vorübergehend dorthin kopiert werden.

### 3. Sanity-Purge

`purge --apply` verlangt Manifest, Sanity-Schreib-Token und eine exakte
`--confirm-source project/dataset`-Bestätigung. Vor der ersten Sanity-Mutation
prüft es alle privaten Firestore-Dokumente, Objekte und anonyme Storage-
Negativtests. Danach entfernt es Premium-Felder aus veröffentlichten und Draft-
Must-Eats. Nicht mehr referenzierte Legacy-Assets werden gelöscht.

### 4. Verifikation

`verify` prüft:

- vollständige private Firestore-/Storage-Daten
- Hash-Integrität jedes privaten Firestore-Datensatzes und jedes Bild-Bytes
- keine anonym lesbaren direkten GCS- oder Firebase-Storage-URLs
- keine Premium-Felder oder Asset-Referenzen im konfigurierten öffentlichen
  Sanity-Projekt/Dataset
- optional die App-Bildroute ohne Premium-Cookie (erwartet HTTP 403)
- mit `--require-legacy-unreachable` jede im Manifest bekannte alte
  Sanity-CDN-URL (kein 2xx erlaubt)

Die Legacy-URL-Prüfung ist ein harter Production-Gate. Bleibt ein gelöschtes
Asset wegen CDN-Cache erreichbar, ist die Migration nicht abgeschlossen. Dann
muss Sanity den Cache purgen oder das alte Dataset nach vollständiger Migration
gelöscht werden; dieser irreversible externe Schritt darf nicht stillschweigend
übersprungen werden.

## Sichere Rollout-Reihenfolge

### Staging

1. Eigenes Firebase-Projekt und Backend mit Branch `staging` anlegen und
   Billing/App Hosting aktivieren.
2. Eigenes Sanity-Staging-Projekt und Dataset vorbereiten. Damit Premium-Felder
   und -Assets dort zu keinem Zeitpunkt landen, den Sanity-Export auf die
   öffentlichen Dokumenttypen begrenzen:

   ```bash
   cd studio
   SANITY_STUDIO_ENV=production \
   SANITY_STUDIO_PROJECT_ID=ehwjnjr2 \
   SANITY_STUDIO_DATASET=production \
   npx sanity datasets export production ../.private/sanity-public.tar.gz \
     -p ehwjnjr2 --overwrite \
     --types newsArticle,restaurant,staticPage,bezirk,category,homeWeek
   SANITY_STUDIO_ENV=staging \
   SANITY_STUDIO_PROJECT_ID=<STAGING_SANITY_PROJECT_ID> \
   SANITY_STUDIO_DATASET=staging \
   npx sanity datasets import ../.private/sanity-public.tar.gz staging \
     -p <STAGING_SANITY_PROJECT_ID> --replace

   cd ../nextjs
   npm run premium:migrate -- export-metadata \
     --source-project ehwjnjr2 --source-dataset production \
     --output ../.private/must-eat-metadata.ndjson
   cd ../studio
   SANITY_STUDIO_ENV=staging \
   SANITY_STUDIO_PROJECT_ID=<STAGING_SANITY_PROJECT_ID> \
   SANITY_STUDIO_DATASET=staging \
   npx sanity datasets import ../.private/must-eat-metadata.ndjson staging \
     -p <STAGING_SANITY_PROJECT_ID> --replace
   ```

   Das zweite Artefakt enthält nur IDs, Restaurant-Referenz, Reihenfolge und
   Demo-Flag. Es enthält weder Dish/Text/Preis noch Asset-Referenzen.
3. Separate Provider-Testkeys/Webhooks/Secrets setzen und ausschließlich dem
   neuen Backend Zugriff geben.
4. Private Must-Eats in das neue Firebase-Projekt backfillen.
5. Firestore- und Storage-Rules in das neue Projekt deployen und Emulator-
   Negativtests ausführen.
6. Feature-Branch nach `staging` integrieren, tatsächlichen App-Hosting-Rollout
   abwarten und die Testmatrix vollständig ausführen.

Bis zu diesem Punkt gibt es keine Production-Mutation. Dass die alten
Production-Sanity-URLs noch erreichbar sind, bleibt dabei ein ausdrücklich
offenes Production-Gate, kein grüner Staging-Befund.

### Production nach grünen Staging-Gates

1. Production-Private-Store backfillen, ohne Sanity zu verändern.
2. Exakte Commit-Range `origin/main..origin/staging` prüfen; Promotion-PR
   `staging -> main` erstellen, Checks abwarten und Mergeability bestätigen.
3. Merge durchführen und Production-Rollout abwarten. Der neue Code liest nun
   aus dem bereits vollständigen privaten Store.
4. Erst nach erfolgreichem Live-Smoke-Test die Premium-Felder/Assets aus dem
   alten Sanity-Dataset purgen.
5. Anonyme Sanity-, direkte Storage-, App-Route- und Legacy-CDN-Negativtests
   ausführen. Production gilt erst danach als vollständig migriert.

## Staging-Gate-Testmatrix

| Gate | Erwartung |
| --- | --- |
| Projektgrenze | Staging-App-ID, Auth, Firestore, Storage und Service Account gehören ausschließlich zum neuen Projekt |
| Secret-Grenze | Keine Production-Secret-Referenz oder Production-Provider-Key im Staging-Build/Runtime |
| Basic Auth | Seiten und alle nicht signierten APIs 401 ohne Basic Auth; Stripe- und Sanity-Webhooks bleiben signaturgeschützt erreichbar |
| Robots | `X-Robots-Tag: noindex, nofollow`, `robots.txt` disallowt `/`, Sitemap leer |
| Premium-Sanity | Anonyme Query findet 0 Dish-/Beschreibung-/Preis-/Bildfelder |
| Premium-Storage | Direkte GCS- und Firebase-Storage-URLs liefern kein 2xx |
| Premium-App-Route | Premium-ID ohne Access-Cookie 403; falsche Session-UID 403; öffentliche Demo 200; bezahlte/revealed ID nach Autorisierung 200 |
| Firestore/Storage Rules | Browser kann `privateMustEats/**` und `premium/**` weder lesen noch schreiben |
| Map/Profile | Anonym, signed, purchased und on-site revealed zeigen jeweils nur erlaubte Karten; Logout entzieht die Bild-Cookie |
| Browser-Persistenz | Map-Cache enthält nur Metadaten; Legacy-Caches werden beim Auth-Abgleich entfernt; Logout löscht alle Map-Caches |
| Stripe Test | Test-Checkout, Webhook-Fulfillment, wiederholtes Event, Duplicate-Payment-Lock und automatischer Refund-Pfad bestanden |
| Gast-Mail | Nur Testmodus; Zustellung ausschließlich an `STAGING_EMAIL_RECIPIENT`, Outbox/Idempotenz bestanden |
| Revalidation | Sanity-Metadatenänderung invalidiert Map/Must-Eats; private Daten kommen ohne öffentlichen Cache-Fallback frisch aus Firestore |
| Security Headers | CSP, HSTS, Frame-/Content-Type-Schutz und staging noindex vorhanden |
| Qualität | Lint, vollständige Tests, TypeScript und `build:isolated` grün; Browser-Konsole/Netzwerk ohne Fehler |

## Lokal bestandene Gates

- `npm test`: 130 Testdateien bestanden, 2 übersprungen; 764 Tests bestanden,
  5 übersprungen
- `npm run lint`: ohne Fehler oder Warnungen
- `npx tsc --noEmit`: bestanden
- `npm run build:isolated`: bestanden
- `npm run test:rules`: Firestore- und Storage-Emulator, 5 Regeltests
  bestanden; die aktuelle Firebase CLI benötigt dafür JDK 21
- Premium-Migration `backfill --dry-run`: 23 veröffentlichte Dokumente ohne
  Ausgabe von Premium- oder Secret-Werten vollständig validiert

Externe Stripe-, Resend-, Sanity- und Firebase-Aktionen werden im Testprotokoll
mit Testkonto/Testmodus, Zeitpunkt und Ergebnis markiert. Es werden keine Live-
Zahlungen, Production-Mails oder Production-Provider-Secrets benutzt.

## Rollback

- Vor dem Sanity-Purge ist Rollback einfach: Staging-/Production-Rollout auf
  die vorherige Revision zurückstellen; der Backfill ist additiv und der
  private Store kann liegen bleiben.
- Nach dem Sanity-Purge darf nicht auf eine Revision vor der Private-Store-
  Architektur zurückgerollt werden. Diese Revision würde Vollinhalte wieder in
  Sanity erwarten. Stattdessen wird auf die letzte grüne Private-Store-Revision
  zurückgerollt oder vorwärts gefixt.
- Private Firestore-Dokumente und Storage-Objekte werden beim App-Rollback nicht
  gelöscht. Ein Datenrollback nutzt die Manifest-Hashes und versionierten
  Objektpfade.
- Eine Wiederherstellung der Premium-Felder im öffentlichen Sanity-Dataset ist
  nur ein letzter Notfallweg und würde die geschlossene Sicherheitslücke erneut
  öffnen; sie ist kein normaler Rollback.
