# Staging- und Premium-Must-Eat-Isolation

Stand: 14.07.2026

Arbeitsbranch: `codex/staging-premium-isolation`
Basis: `origin/staging` auf `26e0d7e072af8a8dd37ec233bbb1d08e9ef9a037`

## Verifizierter Ist-Zustand

Die folgenden Punkte dokumentieren den Ausgangszustand vor der Isolation; der
aktuelle, getrennte Staging-Stand ist weiter unten protokolliert.

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

## Ausgeführte Staging-Isolation

Am 13.07.2026 wurden die folgenden getrennten Ressourcen angelegt und
verifiziert. In diesem Protokoll stehen bewusst nur öffentliche IDs und
Metadaten, niemals Secret-Werte:

- Firebase-Projekt `eat-this-staging-8a13b` mit eigener Web-App, eigenem
  App-Hosting-Backend `eat-this-staging`, eigenem Compute-Service-Account,
  Firestore `(default)`, Storage und Firebase Auth
- Staging-URL
  `https://eat-this-staging--eat-this-staging-8a13b.us-central1.hosted.app`
- Sanity-Projekt `tqgkp8uc` mit privatem Dataset `staging` und eigenem
  read-only Runtime-Token
- separates Stripe-Test-Webhook, ausschließlich für die Staging-URL, und zehn
  aktive Test-Prices mit den vom Code erwarteten Lookup-Keys
- separater Resend-Key mit reiner Sendeberechtigung, auf die verifizierte
  Absenderdomain beschränkt; alle Staging-E-Mails werden zusätzlich auf einen
  einzigen Test-Sink umgeleitet
- separater Anthropic-Key `Eat This Isolated Staging`, 30 Tage gültig
- separates Voyage-Projekt `Eat This Isolated Staging` mit eigenem Runtime-Key
- separates Sentry-Projekt `javascript-staging` mit eigener DSN und einem auf
  `org:ci` beschränkten Source-Map-/Release-Token

Alle in `apphosting.staging.yaml` referenzierten Staging-Secrets existieren im
neuen Firebase-Projekt und haben eigene Secret-Versionen. Production-Secrets
wurden weder in den Staging-Build übernommen noch als Ersatz für fehlende
Staging-Zugänge verwendet. Die Ausnahme ist der Stripe-Testmodus: Der bereits
vorhandene Test-Key wurde in ein neues Secret-Objekt des neuen Firebase-
Projekts übertragen; ein Live-Key wurde nicht verwendet.

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

1. Eigenes Firebase-Projekt und Backend anlegen und Billing/App Hosting
   aktivieren. Für die erste Verifikation wird das Backend mit dem Feature-
   Branch verbunden; erst nach grünen Gates wird nach `staging` integriert.
2. Eigenes Sanity-Staging-Projekt und privates Dataset vorbereiten. Zuerst die
   Must-Eat-Metadaten importieren, danach die öffentlichen Dokumente und deren
   Assets. Diese Reihenfolge erlaubt Sanity, Restaurant-Referenzen beim Import
   zu stärken.

   Wichtig: Sanity CLI 5.30 schrieb beim typgefilterten Export zwar 785
   Asset-Marker, nahm die Binärdateien aber nicht ins Archiv auf. Ein direkter
   Import dieses Archivs bricht deshalb nach teilweisem Dokumentimport ab. Der
   ausgeführte sichere Clone verwendete folgende Grenzen:

   ```bash
   cd nextjs
   npm run premium:migrate -- export-metadata \
     --source-project ehwjnjr2 --source-dataset production \
     --output ../.private/must-eat-metadata.ndjson

   cd studio
   SANITY_STUDIO_ENV=staging \
   SANITY_STUDIO_PROJECT_ID=<STAGING_SANITY_PROJECT_ID> \
   SANITY_STUDIO_DATASET=staging \
   npx sanity datasets import ../.private/must-eat-metadata.ndjson staging \
     -p <STAGING_SANITY_PROJECT_ID> --replace

   SANITY_STUDIO_ENV=production \
   SANITY_STUDIO_PROJECT_ID=ehwjnjr2 \
   SANITY_STUDIO_DATASET=production \
   npx sanity datasets export production ../.private/sanity-public-docs.tar.gz \
     -p ehwjnjr2 --overwrite \
     --types newsArticle,restaurant,staticPage,bezirk,category,homeWeek

   # Nur lokales Arbeitsartefakt, niemals importieren oder committen:
   npx sanity datasets export production ../.private/sanity-full-working.tar.gz \
     -p ehwjnjr2 --overwrite
   ```

   Aus dem vollständigen Arbeitsarchiv wurden ausschließlich die 785 in den
   erlaubten Dokumenttypen referenzierten Asset-Dateien in das typgefilterte
   Archiv übernommen. Vor dem Import wurden drei Invarianten geprüft:

   - 785 erwartete öffentliche Assets, 785 enthalten, 0 fehlend
   - 0 Überschneidungen mit den 23 Premium-Must-Eat-Asset-Dateinamen aus dem
     privaten Migrationsmanifest
   - kein Must-Eat-Premiumfeld und keine Must-Eat-Asset-Referenz in
     `data.ndjson`

   Das vollständige 1,4-GB-Arbeitsarchiv wurde danach und vor jedem Import
   gelöscht. Nur das bereinigte Archiv wurde importiert:

   ```bash
   SANITY_STUDIO_ENV=staging \
   SANITY_STUDIO_PROJECT_ID=<STAGING_SANITY_PROJECT_ID> \
   SANITY_STUDIO_DATASET=staging \
   npx sanity datasets import ../.private/sanity-public-with-assets.tar.gz staging \
     -p <STAGING_SANITY_PROJECT_ID> --replace
   ```

   Das Metadatenartefakt enthält nur IDs, Restaurant-Referenz, Reihenfolge und
   Demo-Flag. Es enthält weder Dish/Text/Preis noch Asset-Referenzen. Der finale
   Clone enthält 386 öffentliche Dokumente, 785 öffentliche Assets und 23
   Must-Eat-Metadatendokumente.
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

## Bestandene lokale Gates

- `npm test`: 132 Testdateien bestanden, 2 übersprungen; 766 Tests bestanden,
  5 übersprungen
- `npm run lint`: ohne Fehler oder Warnungen
- `npx tsc --noEmit`: bestanden
- `npm run build:isolated`: bestanden; der Pre-Push-Hook wiederholte den
  vollständigen isolierten Build erfolgreich
- `npm run test:rules`: Firestore- und Storage-Emulator, 5 Regeltests
  bestanden; die aktuelle Firebase CLI benötigt dafür JDK 21
- Premium-Migration `backfill --dry-run`: 23 veröffentlichte Dokumente ohne
  Ausgabe von Premium- oder Secret-Werten vollständig validiert
- Premium-Migration `backfill --apply`: 23 private Firestore-Dokumente und 23
  normalisierte private WebP-Objekte im neuen Staging-Projekt geschrieben
- Premium-Migration `verify`: Status `passed`, 23 Dokumente; Datensatz- und
  Byte-Hashes korrekt, direkte GCS-/Firebase-Storage-URLs anonym nicht lesbar
- Sanity-Staging: 23 Must-Eat-Metadatendokumente, 0 Dokumente mit
  Premiumfeldern, 0 Premium-Asset-Referenzen; anonyme Query liefert ein leeres
  Ergebnis. Keiner der 23 bekannten alten Premium-Asset-Pfade ist im neuen
  Sanity-Projekt erreichbar.
- Firestore- und Storage-Rules wurden im neuen Staging-Projekt kompiliert und
  veröffentlicht.
- Voyage-Staging-Key: offizieller Embedding-Endpunkt HTTP 200, ein Vektor mit
  512 Dimensionen für das vom Runtime-Code verwendete Modell
- Anthropic-Staging-Key: offizieller Models-Endpunkt HTTP 200 und zehn Modelle
  sichtbar. Nach der separaten Staging-Aufladung lieferte ein echter Buddy-
  Modellaufruf einen vollständigen Stream ohne Fehler.

## Tatsächliches Staging-Deployment und Negativtests

Das Backend ist mit `erkute/eat-this`, Root `nextjs`, Branch
`codex/staging-premium-isolation` und Environment `staging` verbunden. Die
Firebase-Auth-Domain enthält die App-Hosting-Domain. Die reservierte Firebase-
Konfiguration `/__/firebase/init.json` liefert ausschließlich die Web-App des
Projekts `eat-this-staging-8a13b`. Firestore, Storage, Auth und der App-Hosting-
Service-Account gehören ebenfalls zu diesem Projekt.

App-Hosting-Build `build-2026-07-13-005` baute den exakten Commit
`f9f7f8e90619cf1f54ddb4a36ef246f437f5d43c` und erreichte `READY`. Der
zugehörige Rollout `rollout-2026-07-13-003` erreichte am
13.07.2026 um 21:50:46 UTC `SUCCEEDED`.

Die folgenden Prüfungen wurden gegen die tatsächliche Staging-URL ausgeführt:

| Gate | Ergebnis |
| --- | --- |
| Basic Auth | Ohne Basic Auth HTTP 401; mit Auth HTTP 200 für Home, Map und die geprüften Seiten |
| Robots/Headers | `X-Robots-Tag: noindex, nofollow`, `robots.txt` mit `Disallow: /`, leere Sitemap, HSTS, Frame-, Content-Type-, Referrer-, Permissions- und CSP-Report-Only-Header vorhanden |
| Sanity anonym | Privates Dataset liefert 0 Dokumente; mit Runtime-Token 23 Metadatendokumente und 0 Premiumfelder |
| Sanity Legacy in Staging | Alle 23 bekannten Premium-Asset-Pfade fehlen im getrennten Sanity-Projekt |
| Private Firestore/Storage | 23 Dokumente und 23 Bildobjekte mit verifizierten Hashes; direkte anonyme und Firebase-authentifizierte Reads jeweils HTTP 403 |
| App-Bildroute | Locked-ID ohne Capability HTTP 403, öffentliche Demo HTTP 200 mit `private, no-store`, gekaufte ID mit UID-gebundener Session/Capability HTTP 200; ohne passende UID-Session HTTP 403; nach Logout wieder HTTP 403 |
| Map-Payload | Locked-Karten enthalten 0 Premiumfelder und keine direkten Premium-URLs; erlaubte Bilder verwenden ausschließlich die App-Route |
| Auth/Profile | Firebase-Sign-in, UID-gebundene Session, Premium-Access, Profile-Redirect und Logout geprüft; der temporäre QA-Login wurde danach entfernt |
| Stripe-Testzahlung | Checkout `complete/paid`, signiertes Webhook-Fulfillment und Entitlement im Staging-Projekt bestanden |
| Duplicate/Refund | Zweite Zahlung desselben Gast-/Pack-Paars erzeugte genau einen automatischen `duplicate_entitlement`-Refund; ursprüngliches Entitlement blieb bestehen, Mail wurde nicht erneut ausgegeben |
| Gast-Mail | Ausschließlich Testmodus und Test-Sink; Gast-Auth-User und `guestMagicLink`-Outbox erfolgreich, keine Production-Zustellung |
| Revalidation | Gültige Staging-HMAC invalidierte 7 Oberflächen; fehlende Signatur wurde abgewiesen |
| Provider | Voyage-Embedding HTTP 200/512 Dimensionen; Anthropic-Modellliste HTTP 200; Buddy-Modellaufruf HTTP 200 mit Spot-, Pack-, Text- und `done`-Events, ohne Fehler |

Der zuerst angelegte Stripe-Test-Webhook hatte ein nicht passendes Signing-
Secret. Er wurde gelöscht, durch genau einen neuen Staging-Endpunkt ersetzt und
das Firebase-Secret auf eine neue Version rotiert. Erst danach wurden Zahlung,
Idempotenz und Refund erfolgreich erneut geprüft. Es wurden ausschließlich
Stripe-Testmodus, Testkarten, der Resend-Test-Sink und getrennte Staging-
Provider-Keys verwendet.

Ein reproduzierter React-Hydrationfehler auf `/map` wurde auf die
zeitabhängigen Öffnungsstatus-Badges eingegrenzt: Cloud Run renderte in UTC,
der Browser in Berliner Ortszeit. Der Fix hält das SSR-/Hydration-Markup
deterministisch und berechnet/aktualisiert den Status erst nach dem Mount. Ein
Regressionstest deckt die Grenze ab. Gegen den erfolgreichen Rollout enthielt
das SSR-Markup 0 Öffnungsstatus-Badges, der Browser nach dem Mount 29. Eine
frische authentifizierte Map-Navigation erzeugte nach dem Rollout keinen neuen
React-Hydration- oder sonstigen Konsolenfehler.

Production blieb während aller Schritte unverändert. Der Stand von
`origin/main` und der Production-App-Hosting-Rollout wurden kontrolliert, aber
nicht mutiert.

## Production-Migration

Nach den grünen Staging-Gates wurde PR #296 `staging -> main` geprüft und am
13.07.2026 gemergt. Quality, Lighthouse und der zugehörige isolierte Staging-
Rollout waren erfolgreich. Der Merge-Commit ist
`72940353591223cee0aefe7a34b52c75fc006518`.

Der erste automatische Production-Build desselben Commits schlug fehl. Der
unveränderte Commit wurde anschließend erneut gebaut: App-Hosting-Build
`build-2026-07-13-004` erreichte `READY`, der zugehörige CLI-Rollout
`build-2026-07-13-004` am 13.07.2026 um 22:59:08 UTC `SUCCEEDED`.

Vor dem Sanity-Purge waren alle 23 Premium-Must-Eats vollständig in private
Production-Firestore-/Storage-Pfade migriert und die Production-Regeln
veröffentlicht. Danach wurden:

- alle 23 öffentlichen Must-Eat-Dokumente auf Metadaten reduziert,
- alle 23 nicht mehr referenzierten Legacy-Asset-Dokumente gelöscht,
- 0 Premiumfelder und 0 Legacy-Asset-Dokumente am Sanity-Origin bestätigt,
- alle 23 Cache-Buster-Asset-Anfragen mit HTTP 404 bestätigt.

Die klassischen, bereits bekannten Asset-CDN-URLs bilden davon getrennte
Cache-Einträge. Ihre Werte liegen ausschließlich in der lokalen Datei
`.private/sanity-cdn-purge-urls.txt` mit Modus 0600. Die Datei und ihre Inhalte
dürfen nie ausgegeben, öffentlich geteilt oder committed werden.

## Production-Testmatrix

| Gate | Aktueller Stand |
| --- | --- |
| Promotion | PR #296 `staging -> main` gemergt; Quality und Lighthouse erfolgreich |
| App Hosting | Exakter Main-Commit gebaut; Build `READY`, Rollout `SUCCEEDED` |
| Private Store | 23 Must-Eats in privaten Firestore-/Storage-Pfaden; Production-Regeln deployed |
| Sanity-Dokumente | 23 öffentliche Dokumente enthalten nur Metadaten; 0 Premiumfelder |
| Sanity-Origin | 0 Legacy-Asset-Dokumente; 23/23 Cache-Buster-Anfragen HTTP 404 |
| Original-Asset-CDN | Am 14.07.2026 noch 7/23 HTTP 200 und 16/23 HTTP 404; Gate offen |
| Finaler Live-Smoke | Nach geschlossenem CDN-Gate erneut auszuführen |

## Offener Sanity-CDN-Gate

Der anonyme HEAD-Retest vom 14.07.2026 prüfte alle 23 Original-URLs, ohne sie
auszugeben: 7 lieferten weiterhin HTTP 200, 16 HTTP 404. Zuvor waren noch 17
Cache-Einträge erreichbar. Sanity-Origin, Dokumente und Asset-Referenzen sind
weiterhin sauber; ausschließlich verteilte Asset-CDN-Caches bleiben offen.

Die Antwort an `support@sanity.io` war eine automatische Plan-/Support-
Abweisung: dedizierter E-Mail-Support ist nur mit Enterprise beziehungsweise
Growth-Support-Add-on verfügbar. Die vertraulichen URLs werden deshalb
insbesondere nicht im öffentlichen Discord geteilt.

Sanitys offizieller [Responsible-Disclosure-Kanal](https://www.sanity.io/responsible-disclosure)
ist `security@sanity.io`. Sanity sagt dort eine Empfangsbestätigung innerhalb
von drei Werktagen zu und bietet für vertrauliche Inhalte PGP-Verschlüsselung
an. Sanitys [Privacy Policy](https://www.sanity.io/legal/privacy) weist darauf
hin, dass gelöschte Assets bis zum konfigurierten Cache-Ablauf öffentlich
verfügbar bleiben können.

Das Gate bleibt offen, bis alle 23 Original-URLs anonym durchgehend non-2xx
liefern. Der nächste kleine Schritt ist entweder eine vertrauliche Security-
Eskalation oder ein erneuter anonymer Test nach kurzer Wartezeit. Es wird keine
Dataset-Rotation, Dataset-Löschung oder andere riskante Ersatzmigration
gestartet.

Nach 0/23 erreichbaren URLs werden abschließend erneut geprüft:

- Production Start, Map und Profile sowie Sanity-Revalidation,
- gesperrte Nicht-Demo-Bildroute ohne Capability mit erwartetem HTTP 403,
- direkte anonyme Firestore-/Storage-Reads ohne Leserecht,
- Production-Backend, Rollout, Main-Commit und sauberer Git-Status.

## Verbleibende Risiken

- Sieben bekannte CDN-Cache-Einträge sind weiterhin öffentlich erreichbar;
  der Sicherheitsabschluss darf deshalb noch nicht als vollständig gemeldet
  werden.
- Der getrennte Sentry-Build ist erfolgreich, der Source-Map-Upload wurde aber
  nicht unabhängig über die Sentry-Oberfläche bestätigt.
- Weil der Sanity-Purge erfolgt ist, darf Production nicht auf eine Revision
  vor der Private-Store-Architektur zurückgerollt werden.

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
