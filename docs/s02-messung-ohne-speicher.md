# S02 – Messung ohne Browserspeicher

Übergabe vom 23.11.2026. Umfang: P9 beheben, Aussagekraft zu W1 abgrenzen.
Die Prüfungen verwendeten lokale Testdaten.

## Stand und Dateien

- Branch `claude/s02-messung-ohne-speicher`, Basis `70a06a83bdcfcd3b06cc28d2348c48dec76d7232` (`origin/staging`).
- Remote-main unabhängig von der fremden, unfertigen Hauptkopie gelesen: `aa156ce26bbcd29c9cb16f7227b552465b621366`, Release #1415. GitHub-Check „App Hosting - Rollout (eat-this-8a13b/us-central1/eat-this)“ success, abgeschlossen 23.11.2026 16:54:32 UTC. Main und Basis haben denselben Git-Tree `7fa08172044d52b8a5637e67c4dd9a5dc3285101`; keine neue Release-Abweichung zur Auftragsbasis.
- Geändert: `nextjs/lib/analytics.ts`, `nextjs/lib/analytics.test.ts`, `nextjs/lib/map/useMapLocationFeedback.ts` (nur Kommentare); neu: `nextjs/lib/analytics.once.test.tsx` und diese Übergabe.
- Beide Aufrufer gelesen: `CheckoutSuccessAnalytics.tsx` und `useMapLocationFeedback.ts`. Kauf-Komponente und Ereignisnamen bleiben unverändert. Auth-, Theme-, UI-Präferenz- und Zahlungslogik sind nicht bearbeitet.

## P9 – lokal behoben

`trackEventOnce` verwendet ein modulweites Set im Dokument-Arbeitsspeicher. Kein persistenter Besucherbezug, keine Session-ID; Schlüssel bleiben lokal im RAM. Kein Lesen/Schreiben von sessionStorage/localStorage und keine Cookie-Schreibvorgänge durch diesen Helfer. Der gemeinsame Sender liest weiterhin die ausdrückliche Nicht-mitzählen-Präferenz und berücksichtigt seine vorhandenen Ausschlüsse.

- Strict Mode, Rerender, Remount und SPA-Seitenwechsel: gleicher Schlüssel wird im selben Dokument höchstens einmal verarbeitet. Zwei verschiedene Transaktionen zählen jeweils einmal.
- Reload, harte Navigation, neues Tab: neue Modulauswertung, neue Deduplizierung. Dieselbe Kauf-Erfolgsseite kann erneut `purchase` senden; auch Standort-Berechtigung kann erneut gezählt werden. Ein aus dem bfcache wiederhergestelltes Dokument behält seinen RAM-Zustand.
- Es sind einmalige Sendeversuche, keine bestätigten Zustellungen: Netzwerkfehler, Browserfilter und verworfene Beacons können unterzählen; Reloads können überzählen. Ein Unterdrücken durch die bestehenden Ausschlüsse verbraucht den Schlüssel ebenfalls bis zum nächsten Dokument.

## W1 – Messdefinition dokumentiert; Wirkung weiterhin unbelegt

`/api/count` erhöht akzeptierte Ereignisnamen in `analytics_daily.events`. Der Ereigniszweig dedupliziert weder Transaktionen noch Ereignisse nach Besucher. Transaktions-ID, Kaufbetrag und Packparameter werden nicht im Kauf-Beacon übertragen; geprüft sind ausschließlich `path`, `event`, `ua`. Pfade enthalten keine Query-Parameter.

- `purchase`: Clientbeobachtung einer serverseitig als bezahlt verifizierten Erfolgsseite; keine vollständige, eindeutige Zahlungs- oder Umsatzstatistik. Käufe ohne Rückkehr zur Seite fehlen; Refunds werden im Ereigniszähler nicht rückgerechnet.
- `map_location_invite_shown`: erste beobachtete Einladungsberechtigung im Dokument (offene Standortfrage, erkundete aktive Karte/Liste außerhalb Detail, kein laufendes Orten/Standortfehler). Keine garantierte sichtbare Impression: Datenladen/-fehler sowie Verzögerung und separate UI-Präferenz von `useLocationWelcome` können die Hinweiskarte zurückhalten. Diese Produktpräferenz ist keine Messung und wurde nicht geändert.
- `map_location_invite_accepted`: jeder Aufruf von `handleLocateMe`, solange die Einladung berechtigt ist; kein Nachweis erteilter Standortberechtigung oder erfolgreicher Position. Wiederholungen sind möglich. `accepted / shown` ist ein Ereignisverhältnis, keine Personen- oder Sitzungs-Konversion und kann über 100 % liegen.
- `buildFunnel` in `lib/admin/stats.server.ts` teilt aggregierte Summen: `signed_in = login + sign_up`; `login_view_signed = signed_in / login_view`; `checkout_purchase = purchase / begin_checkout`; `visit_purchase = purchase / visitors`. Null Nenner ergibt keine Rate. Besuche werden serverseitig pro Berlin-Tag per vorhandenem IP/UA-Prüfwert angenähert und kurzzeitig getrennt von Seiten gespeichert; daraus entsteht keine verknüpfte Folge individueller Funnel-Schritte. Mehrtageswerte sind keine eindeutigen Personen.
- Keine aktuelle Konversionsrate oder kausale Textwirkung ermittelt. Historische und künftige Werte sind wegen veränderter Deduplizierungsdauer nicht unverändert vergleichbar. Ein Wirksamkeitsnachweis erfordert einen eigenen, fachlich passenden Untersuchungsauftrag.

## Entscheidung: serverseitige Kauf-Idempotenz als eigener Auftrag

Die vorhandene Admin-Transaktion in `lib/stripe-fulfill.ts` verhindert doppelte Berechtigungen pro `users/{uid}/entitlements/{packId}` und enthält `stripeSessionId`. Es gibt keinen dauerhaften Zählbeleg pro Transaktion. `lib/stripe-revoke.ts` löscht die Berechtigung bei voller Rückerstattung/verlorenem Streit; Checkout-Versuche gelten pro Konto/Pack, werden erneuert und decken Gastkäufe nicht ab. Ein separater Zähleraufruf nach erfolgreichem Fulfillment wäre bei Retry/Abbruch nicht atomar. Ein atomisches Inkrement nur bei Berechtigungsanlage wäre ein Berechtigungszähler, kein dauerhafter Zahlungsbeleg.

Konkreter Folgeauftrag, hier nur beschrieben und nicht begonnen:

1. Eine getrennte serverseitige Kennzahl für bestätigte Zahlungen definieren (Abgrenzung zu Erfolgsseiten-Beobachtung, Duplikat-Erstattungen, späteren Refunds, Testzahlungen und bestehenden Mess-Ausschlüssen).
2. Dauerhaften Transaktionsbeleg nach verifizierter Stripe-Session auf dem Server verwenden; keine neue Besucherkennung im Browser. Beleg und Tagesinkrement in derselben Firestore-Transaktion schreiben, unabhängig vom löschbaren Entitlement. Aufbewahrung, Altbestand und Rückerstattungen ausdrücklich festlegen.
3. Nur aus dem signaturgeprüften Zahlungsweg schreiben, nie aus dem Rendern der Erfolgsseite. Client-Ereignis bei Bedarf getrennt benennen; kein doppeltes Schreiben auf dasselbe `purchase`-Total.
4. Tests für parallele/wiederholte completed/async-Ereignisse, unterschiedliche Transaktionen, Absturz vor/nach Commit, Gastkauf, doppelt bezahltes/refundiertes Pack und Wiederkauf nach Revocation. Keine produktiven Käufe zum Testen.

## Prüfung und Grenzen

- Vor Fix: vier neue Regressionstests rot; Speicher-Spys melden die echten Zugriffe, blockierter Speicher verursacht doppelte Beacons. Nach Fix: alle grün.
- Node `v24.22.3` verwendet (Projekt verlangt >=24.12 <25). Der erste Versuch mit Shell-Standard Node 20 scheiterte zusätzlich im Vitest-Fehlerreporter und zählt nicht als Abnahme.
- `npm test -- lib/analytics.once.test.tsx lib/analytics.test.ts lib/map/__tests__/useMapLocationFeedback.test.tsx lib/map/__tests__/useLocationInvite.test.ts app/api/count/route.test.ts`: 5 Dateien, 126 Tests bestanden.
- Speicher-Spys prüfen Storage-Getter und `getItem`, `setItem`, `removeItem`, `clear` sowie Cookie-Setter. Beide echten Aufrufer und der echte Sender laufen; fremde UI-Präferenz-/Notice-Hooks sind isoliert. Beacon-Inhalte werden geprüft. Blockierte Store-Getter werfen im Test, werden vom Messpfad aber nie aufgerufen.
- Reload-Grenze durch erneute Modulauswertung getestet, kein echter Browser-Reload. Keine sichtbare Änderung; keine Browser-, Build-, Geräte-/Reduced-Motion- oder Vorher/Nachher-Performancemessung durchgeführt. Keine Aussage zu Feld-LCP/INP/CLS.
- `npm run typecheck`, `npm run lint`, `npm run audit:css-modules`, `npx --no-install knip` und `git diff --check`: bestanden, keine Warnungen in diesen Prüfungen. Keine Abhängigkeiten installiert.
- Abschlussreview mit zwei rein lesenden Reviews nach `code-review`: Standards gegen AGENTS.md 0 relevante Befunde; Spec gegen S02-Auftrag 0 relevante Befunde. Eigene abschließende Diff-Prüfung ebenfalls ohne offenen relevanten Befund.

Status: P9 lokal behoben, unveröffentlicht. W1 Messgrenzen geklärt; Konversion und Texteffekt weiterhin unbelegt/teilweise offen.
