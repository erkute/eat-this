# Nachweise und Prüfgrenzen – Session 1

Stand: 23.11.2026 (Europe/Berlin). Reine Prüfung/Planung. Kein Produktcode, keine Infrastruktur, kein Commit/Push, keine Veröffentlichung und keine neuen Folgechats.

## E01 – Referenz, Original und Arbeitskopien

- Der Originalbericht vom 21.11.2026 wurde aus den vollständigen lokalen Quelldaten geprüft. Die fünf Rollen unter `result` und ihre Originalreihenfolge bestimmen P1–P9, G1–G8, I1–I8, W1–W9 und T1–T10.
- Alle 44 Titel im JSON stimmen mit dem gerenderten Bericht überein. Der Generator enthält die zwölf ursprünglichen Maßnahmen und zwei größere Vorhaben. Da der HTML-Bericht nach Schwere sortiert, bleiben die IDs an die Reihenfolge im JSON gebunden.
- Nach der Originalanalyse fiel die Entscheidung, die betreffenden Seiten aus dem Produkt und der Suche zu entfernen. Das hat Vorrang vor der ursprünglichen Weiterleitungsempfehlung.
- Die Arbeitskopie für den Plan entstand über `./scripts/worktree.sh claude/bestandsabgleich-plan main`. Referenz ist `aa156ce26bbcd29c9cb16f7227b552465b621366`. Die Hauptkopie enthielt separate URL-Arbeit.

## E02 – Remote und Releases neu geprüft

Der aktuelle `main`-SHA wurde am 23.11.2026 per `gh api repos/erkute/eat-this/branches/main` unabhängig vom lokalen Hauptbranch geprüft: `aa156ce26bbcd29c9cb16f7227b552465b621366`. Auch `staging` wurde separat per Branch-API frisch geprüft: `70a06a83bdcfcd3b06cc28d2348c48dec76d7232` (Merge von #1413).
Der GitHub-Connector wurde zuerst für PRs benutzt. Sein Combined-Status-Endpunkt lieferte keine Statuszeilen und ersetzt keine Check-Runs; deshalb gezielter lesender CLI-Fallback.

| PR | Aussage aus aktuellem GitHub-Nachweis | Merge-SHA / Ziel |
| --- | --- | --- |
| [#1409](https://github.com/erkute/eat-this/pull/1409) | Mail-JPEGs, Limiter-Notbremse, lesbare Sentry-Meldungen; #1406–1408 | `3b9b26b1`, main |
| [#1411](https://github.com/erkute/eat-this/pull/1411) | Eigene Web-Vitals-Erfassung aus #1410 | `47f4840d`, main |
| [#1412](https://github.com/erkute/eat-this/pull/1412) | Standardbehandlung fehlender Seiten statt redundanter Sonderfälle | `f955ae51`, staging; Feature `3c0f857c` |
| [#1414](https://github.com/erkute/eat-this/pull/1414) | Release von #1412 | `fbccfc0e`, main |
| [#1413](https://github.com/erkute/eat-this/pull/1413) | Leseseiten-JS und echte lokale angemeldete Browserwege | `70a06a83`, staging; Features `f2de1280`, `17beaf44` |
| [#1415](https://github.com/erkute/eat-this/pull/1415) | Release von #1413 | `aa156ce26bbcd29c9cb16f7227b552465b621366`, main |

Alle sechs PRs wurden als gemergt bestätigt. Am aktuellen main-SHA ist der Check **App Hosting – Rollout (eat-this-8a13b/us-central1/eat-this)** `completed/success`; [Backend-Übersicht](https://console.firebase.google.com/project/eat-this-8a13b/apphosting/backends/eat-this/locations/us-central1/overview). Das belegt den Rollout des Referenzstands. Ein neuer direkter Build-READY-/Rollout-SUCCEEDED-API-Abruf erfolgte in Session 1 nicht; diese detaillierten Werte waren bereits im Übergabekontext belegt. Hier wird kein eigener Deploy durchgeführt.

Nachprüfbare lesende Befehle:

```sh
gh api repos/erkute/eat-this/branches/main --jq '{sha:.commit.sha}'
gh api repos/erkute/eat-this/commits/aa156ce26bbcd29c9cb16f7227b552465b621366/check-runs
gh run view 45220455540 --log
```

## E03 – Tatsächliche CI- und Browsernachweise

[Quality-Run 45193571599](https://github.com/erkute/eat-this/actions/runs/45193571599), Feature-Head `17beaf44959c8a65f8081e854afe7a4b545cee6d`, wurde über den Connector einschließlich Jobs/Logs gelesen:

| Job | Bestanden | Übersprungen | Quelle |
| --- | ---: | ---: | --- |
| E2E mobile | 307 | 38 | [Job 137760333010](https://github.com/erkute/eat-this/actions/runs/45193571599/job/137760333010) |
| E2E mobile-safari | 142 | 4 | [Job 137760333029](https://github.com/erkute/eat-this/actions/runs/45193571599/job/137760333029) |
| E2E desktop | 326 | 19 | [Job 137760333306](https://github.com/erkute/eat-this/actions/runs/45193571599/job/137760333306) |
| Summe E2E | **775** | **61** | Summe der drei obigen Logs |

Der nextjs-Job meldet 370 bestandene/3 übersprungene Testdateien und **3031 bestandene/19 übersprungene Unit-Tests**; die Logzeilen wurden nach Entfernen der ANSI-Farbsequenzen frisch gelesen. PR #1413/#1415 dokumentieren denselben lokalen Unit-Stand und die Reviewkorrektur. Das sind vorhandene, in Session 1 gelesene Nachweise, keine hier neu ausgeführten Testläufe. Quality-Rules/Studio/Build-Jobs sind erfolgreich. Die drei nach main-Push übersprungenen Quality-Jobs sind nicht gleich fehlgeschlagen; PR-Läufe und separater Live-Lighthouse-Lauf haben unterschiedliche Aufgaben.

Kernumfang: E-Mail-Link aus echtem Auth-Emulator, Starter mit Wunschkarte/einmaliger Vergabe, Herz-Admintransaktion und Reload-Persistenz, Nearby-Reveal ohne Kauf. `firebase.e2e.json` benutzt produktive **Firestore**-Regeln; **Storage** hat `nextjs/e2e/storage.rules` (deny-all), synthetische Bilddaten und lokale Testumgebung. Kein Nachweis realer Stripe-Zahlung, lückenloser Stripe-Testmoduswege, realer Mailzustellung oder aller echten Mobilgeräte. HTTPS-Proxy/WebKit prüft Secure-Cookie-Verhalten lokal.

## E04 – Frische HTTP-Stichprobe, ohne Browser-JavaScript

Öffentliche HTTP-Dokumente am 23.11.2026 nur lesend abgerufen; keine Browserbeacons/Anmeldung/Käufe. Es wurden keine Live-Browsertests ausgeführt. Status/Meta-Angaben gelten für die Stichprobe, nicht für alle Seiten.

| Pfadgruppe | Ergebnis |
| --- | --- |
| `/news/tuerkische-restaurants-berlin`, `/news/drei-doener-berlin`, `/restaurant/kuma-ramen-eatery-markthalle-pfefferberg`, jeweils DE und `/en` | Alle sechs HTTP 404, Meta robots `noindex`, finale URL unverändert; keine sachfremde Weiterleitung |
| `/must-eats`, `/en/must-eats` | 200, `noindex,follow` |
| `/packs`, `/en/packs` | 200, `noindex, follow` |
| `/restaurant/acid-mitte`, `/en/restaurant/acid-mitte` | Gleichlautender Title `ACID Mitte – Bakery / Café in Berlin-Mitte` |
| `/restaurant/bertie` | DE-Title `Bertie – American Diner in Berlin-Prenzlauer Berg` |
| `/restaurant/arturo` | DE-Title `Arturo – Dinner & Drinks in Berlin-Neukölln` |
| `/bezirk/friedenau`, `/bezirk/friedrichshain`, `/bezirk/wedding`, `/bezirk/steglitz` | 200, index/follow; numberOfItems 2 / 4 / 5 / 6 |

Codeprüfungen beziehen sich auf gepinnte GitHub-Dateien im Befunddokument. Die Diagnose sichtbarer Probleme basiert in Session 1 auf Code/HTTP und vorhandenen Tests. Kein neuer visueller Vorher-/Nachher-Test; dessen Durchführung ist ausdrücklich Teil späterer Umsetzungssessions.

## E05 – Frische Google-Indexstichprobe

Search-Console-URL-Prüfung über OpenSEO, Property `sc-domain:eatthisdot.com`, abgerufen 23.11.2026. Nur lesend, keine Indexierungs-/Entfernungsanträge und keine Google-Schreibaktionen. Ergebnisse sind Googles gespeicherter Prüfstand, kein neuer Live-Crawl.

| URL-Pfad | GSC-Status beim Abruf | Letzter Crawl (UTC) |
| --- | --- | --- |
| `/news/tuerkische-restaurants-berlin` | Gesendet und indexiert | 12.11.2026 09:24:58 |
| `/en/news/tuerkische-restaurants-berlin` | Nicht gefunden (404) | 22.11.2026 11:31:06 |
| `/news/drei-doener-berlin` | Gecrawlt – zurzeit nicht indexiert | 09.09.2026 09:59:26 |
| `/en/news/drei-doener-berlin` | Gesendet und indexiert | 15.09.2026 15:58:50 |
| `/restaurant/kuma-ramen-eatery-markthalle-pfefferberg` | Gesendet und indexiert | 27.09.2026 18:31:18 |
| `/en/restaurant/kuma-ramen-eatery-markthalle-pfefferberg` | Durch noindex ausgeschlossen | 01.10.2026 18:30:36 |
| `/restaurant/gazzo` | Gecrawlt – zurzeit nicht indexiert | 10.09.2026 07:53:22 |
| `/en/restaurant/gazzo` | Gesendet und indexiert | 11.09.2026 04:39:26 |

[Search Console](https://search.google.com/search-console?resource_id=sc-domain%3Aeatthisdot.com) ist die Primärquelle. Die sechs entfernten URLs sind produktseitig weg, aber bei drei meldet Google weiterhin Indexierung. **„Auch bei Google vollständig entfernt“ ist nicht belegt.** EN-Gazzo ist inzwischen als indexiert gemeldet; historische Gesamtquoten nicht fortschreiben.

## E06 – SEO-/Wachstumsdaten und zeitliche Grenzen

Der Originalbericht verwendete mehrere unterschiedliche Zeitfenster aus Oktober/November 2026. Die historischen absoluten privaten Nutzungs-/Kauf-/Login-/CTR-Zahlen werden hier bewusst nicht reproduziert oder als aktuelle Werte ausgegeben. Es fand keine neue private Vollauswertung von Auth/Firestore/Stripe/Zähler oder Kampagnen statt.

Der lesend abgefragte OpenSEO-Kontext enthält eine Recherche vom **12.11.2026**, teils veralteten PR-Status und leere Kontextfelder. Er ist ein Ausgangspunkt, kein aktueller Release-/Erfolgsnachweis; den dort genannten GA4-Vorschlägen wird wegen AGENTS.md nicht gefolgt. Ranking-/Kampagnen-/Konversionswirkung bleibt ohne neue kohortengerechte Daten unbelegt. I1/I3/I4/W3/W5/W9 sind deshalb konservativ bewertet.

Titelversuch ab 13.11.2026: vier bis sechs Wochen sind frühestens 11.–25.12.2026; tatsächlichen Veröffentlichungs- und Crawlzeitpunkt zusätzlich berücksichtigen. Nicht aus zehn Tagen ein gesichertes Urteil ableiten.

## E07 – Technik-Folgesession und Gegenbelege

Quelle ist das lokale Protokoll der Technik-Folgesession vom 21.11.2026.

- 21.11.2026 10:19:44.397Z: historischer Remy-Guthabenausfall; CDN-/Kostenentscheidungen offen. Gegenmessung widerlegt „Optimierer wird nie gecacht“; direkter Hero-Bildabruf wäre deutlich schwerer. T8 rechtfertigt keinen globalen Umbau.
- 21.11.2026 11:01:47.232Z: Mail-Verkleinerung und Speicher-Notbremse ausgerollt, neue Mailassets damals live abgerufen. Kein produktiver Firestore-Ausfalltest.
- 21.11.2026 11:39:32.029Z: Source-Map-Uploadzugang korrigiert, ab nachfolgendem Build wirksam.
- 21.11.2026 13:49:25.096Z: Web-Vitals-Rollout und Sentry-Release, echte Symbolikation noch nicht bestätigt; Billing/warme Instanz/CDN offen.

Diese zeitlich verankerten Nachweise wurden mit aktuellem Code und Merge-Abstammung abgeglichen. Ein alter Ausfall ist kein heutiger Ausfall, eine alte Kostenschätzung kein heutiger Tarif. Für aktuelle Preis-/Infrastrukturentscheidungen sind neue Primärquellen Pflicht.

## E08 – Live-Lighthouse des Referenz-SHA

[Run 45220455540](https://github.com/erkute/eat-this/actions/runs/45220455540), wartet explizit auf den Rollout von `aa156ce26bbcd29c9cb16f7227b552465b621366`. Log vom 23.11.2026 16:59 UTC: 5 URLs, 15 Läufe. Erfolgreicher Workflow trotz **Warnungen**, kein Budget-Pass.

| Seitentyp | LCP-Warnwert | Weitere Warnung |
| --- | ---: | --- |
| Home `/` | 3,605 s | — |
| Map `/map` | 4,012 s | TBT 4080,5 ms; Performance 64 |
| Spot `/restaurant/engelbecken` | 2,939 s | — |
| Magazin `/news` | 4,763 s | TBT 203 ms; Performance 79 |
| EN-Pizza `/en/kategorie/pizza` | 2,645 s | — |

LCP-Ziel 2,5 s, Labor-TBT-Budget 200 ms, Performance-Budget 80. Das sind die Assertion-Werte des Laufs, keine Feldwerte und nicht frei als Median aller Kennzahlen umzudeuten. TBT ist **nicht** Feld-INP. CrUX war zuletzt nicht ausreichend; in Session 1 keine neue CrUX-/private Vitals-Vollauswertung. PR #1415 nennt daneben Werte des früheren gedrosselten PR-Laufs – diese nicht mit diesem Live-Lauf mischen.

Die Leseseiten-Transfermessung aus #1413 betrifft Engelbecken und den konkreten Chicken-3000-Artikel, je drei frische Produktionsläufe bei 390/1440 px. Sie ist kein direkter Vorher-/Nachher-Vergleich der Magazinübersicht `/news`.

## E09 – Übergebene, nicht frisch direkt verifizierte Nachweise

Der Aufgabenübergabe zufolge wurden für `aa156ce26bbcd29c9cb16f7227b552465b621366` drei moderne Sentry-Artifact-Bundles mit 516 Dateien geprüft. Session 1 hat den Code-/PR-/Protokollteil geprüft, diese Sentry-Abfrage aber nicht erneut ausgeführt. Deshalb Quelle ausdrücklich **Übergabekontext**, nicht neuer Sentry-Livecheck. Uploadartefakte belegen außerdem keine tatsächliche Symbolikation eines neuen Fehlers. S03/S31 führen diesen Restnachweis.

## Nicht neu geprüft und wohin es gehört

| Historische oder aktuelle Prüfgrenze | Folgesession |
| --- | --- |
| Erstansicht/Preis-Wartezeit/Verständlichkeit im gerenderten Browser, Hell/Dunkel und Motion | S05/S06, S08–S12 |
| Echter iPhone-Pinch-Zoom, Screenreader-Ansageflut, Tastaturbedienung der MapLibre-Flächen | S09/S12; echte Geräte bei fehlendem Zugang offen |
| Textur-Kontraste, gerenderte Fokus-/Tapflächen | S10/S12 |
| Ganze Kontoflächen, Deck/Freunde/Einladung; ursprünglich gar nicht geprüft | Kern-Login/Starter/Herz/Reveal inzwischen E03; restliche konkrete Sharing-Fläche S20, A11y S12 |
| Stripe-Testmodus bis Weiterleitung/Abbruch, ggf. Webhook/Entitlement, Gastkauf-Mail | S07 mit ausdrücklich vereinbartem Umfang; keine Behauptung vollständiger Abdeckung |
| Vollabgleich Insider-Tipps/Karten, ursprüngliche Dreier-Stichprobe | S17 klein beginnen; bei weiterem Befund eigenständige weitere Kohorte planen |
| Indexierungsgründe/Crawlstand, Rich-Results-Vollvalidierung, Titelwirkung, Query-Zielkonkurrenz | S15/S18/S19; E05 nur Stichprobe |
| Sanity-Entwürfe, Redaktionsfakten und spätere DE-/EN-Publikation | S16/S17/S18 nur im späteren Auftrag, Veröffentlichung separat |
| Backlinks, Bing, Alt-/Bild-SEO im Detail | Nur gezielt bei S15-Pilotbedarf; kein pauschaler zusätzlicher Audit-/Outreachauftrag |
| Kampagnenkosten, Zielgruppe, Quelle unbekannter Einstiege, Ausstiegszähler-Verzerrung, Remy als Funnel | S21/S25; keine kausalen Erfolgs-/Misserfolgsbehauptungen ohne Beleg |
| Resend-Zustellrate/Spam, reale Gmail/Apple-Mail/Outlook-Downloads | S24 nur autorisierter Test; kein Testmailversand in Session 1 |
| Aktuelles Remy-Guthaben, Alarme, kostenpflichtige Funktionsprobe | S26; Probe/Billing getrennt freigeben |
| Kaltstartdauer, aktuelle Laufzeit-/Speicher-/503-Lage und Kosten | S27/S28/S31; kein Schluss aus altem Kommentar |
| Aktuelle Sentry-Symbolikation und noch aktive alte Issues | S03/S31 lesend; keine pauschale Schließung |
| Rules/Unit/E2E neu ausführen, Staging-/Sanity-Rollen/CORS | E03 vorhandene CI; neue Läufe erst bei relevanter Umsetzung; Staging-Schutz S28/S29, kein breit neuer Rollen-/CORS-Audit |

Nicht jede ursprüngliche Nichtprüfung ist ein Produktmangel. Zusatzprüfungen werden nur bei konkretem Bezug ausgeführt, ansonsten als verbleibende Grenze benannt. Session 1 hat keine Tests neu gestartet: es gibt ausschließlich Dokumentationsänderungen und vorhandene aktuelle CI-Nachweise.
