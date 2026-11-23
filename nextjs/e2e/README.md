# Browserprüfung mit Konten

Die Kontoabläufe laufen gegen Auth, Firestore und Storage im lokalen Projekt
`demo-eat-this-quality`. Das Browser-SDK verwendet dabei ebenfalls die
Emulatoren. Die Firestore-Regeln sind dieselben wie in der App; private
Kartentexte und Bilder stammen aus synthetischen Testdaten. Es werden keine
Mails versendet. Die Demo-Konfiguration wird nur für diesen Build gesetzt;
App Hosting verwendet sie nicht.

Aus `nextjs/`, mit Node aus `.nvmrc` und installierten Chromium/WebKit:

```sh
(
  set -a
  . ./e2e/firebase.env
  set +a
  npm run build:isolated &&
  FIREBASE_ADMIN_PROJECT_ID=demo-eat-this-quality \
  COUNT_SALT=local-browser-emulator-only \
  PREMIUM_ACCESS_SIGNING_KEY=local-browser-emulator-signing-only \
  npx --yes firebase-tools@14.22.0 emulators:exec \
    --only auth,firestore,storage \
    --project demo-eat-this-quality \
    --config ../firebase.e2e.json \
    'npx tsx e2e/seed-firebase.mts && npm run test:e2e'
)
```

Ports 3100 und 3101 müssen frei sein. Playwright startet den Produktionsserver
auf HTTP/3100 und einen lokalen HTTPS-Proxy auf 3101. Das kurzlebige Zertifikat
wird mit `openssl` im temporären Ordner erzeugt und anschließend entfernt.
Nur für die lokale Testadresse akzeptiert Playwright dieses Zertifikat. Auth
und Firestore werden unter derselben HTTPS-Adresse zu den lokalen Emulatoren
weitergereicht, damit WebKit kein Mixed Content blockiert.
So prüft auch WebKit die geschützten Bilder mit echten Secure-Cookies.

Für gezielte Konto-Prüfungen im inneren Befehl
`npm run test:e2e` durch
`npx playwright test account-flows.spec.ts` ersetzen.

`account-flows.spec.ts` prüft Mail-Link-Anmeldung, das einmalige Starter Pack
mit der gewünschten Karte, Herz hinzufügen/entfernen einschließlich
Transaktionszähler, sowie Aufdecken am simulierten Standort ohne Kauf. Die
Schreibvorgänge und das erneute Lesen nach Reload laufen gegen echte
Emulator-Daten. Serverseitige Token- und Widerrufsprüfungen bleiben aktiv.

`reading-javascript.spec.ts` prüft auf Spot und Artikel, dass GSAP vor einer
Animationsabsicht nicht geladen wird. Inhalt bleibt auch ohne JavaScript
sichtbar. Für den Größenvergleich einen normalen Produktions-Build ohne die
Variablen aus `firebase.env` verwenden und exakt dieselben Seiten vor und
nach einer Änderung mit frischem Browser-Cache messen.
