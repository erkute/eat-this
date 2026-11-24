# Eat This – Ist-Abgleich und Arbeitsplan

**Session 1 abgeschlossen: alle 44 Originalbefunde abgeglichen und 30 kleine Startaufträge vorbereitet.** Stand 23.11.2026, Europe/Berlin. Ausschließlich lokale Dokumentation; kein Produktcode, keine Infrastruktur, kein Commit/Push, keine Veröffentlichung, keine neuen Folgechats.

Referenz ist der **frisch geprüfte Remote-main `aa156ce26bbcd29c9cb16f7227b552465b621366`**, Release [#1415](https://github.com/erkute/eat-this/pull/1415), mit erfolgreichem App-Hosting-Rollout-Check. Die fremde/unfertige Hauptkopie war nicht die Referenz. Die Planung entstand im Branch `claude/bestandsabgleich-plan`.

[Alle 44 Befunde mit Beleg, Restarbeit und Abnahme](befunde.md) · [Quellen, Release-/CI-Nachweise und Grenzen](nachweise.md) · [Nächster konkreter Startauftrag S02](sessions/s02-zaehler-ohne-speicher.md)

## Statusübersicht

| Status | Anzahl |
| --- | ---: |
| erledigt | 2 |
| teilweise | 8 |
| offen | 16 |
| Entscheidung nötig | 10 |
| nicht ausreichend belegt | 7 |
| nicht mehr zutreffend | 1 |
| **Gesamt** | **44** |

**Erledigt im ursprünglichen engen Umfang:** T4 (Mailgrößen), T10 (Notbremse). **Teilweise:** unter anderem T5 Erfassung fertig, Feldurteil offen; T6 belegte JS-Gewinne, verbleibende Performance offen; T7 Upload-/Filterarbeit, echte Symbolikation offen; T9 Konto-E2E vorhanden, Stripe-Rest offen. **Nicht mehr zutreffend:** T8 pauschaler Optimiererumbau ist durch Gegenmessung widerlegt. G6 war im Original zu pauschal: Home-/Map-/Login-axe-Tests existieren bereits. I8: spätere Nutzerentscheidung verlangt Entfernung, Standard-404 ist live, Google-Abschluss noch nicht belegt.

Die Statuszahlen sind keine Erfolgsquote. Ein Befund kann mehrere fachliche Teilfragen enthalten; Entscheidung nötig und nicht ausreichend belegt sind keine automatisch bestätigten Fehler. Aktuelle private Geschäfts-/Nutzungszahlen wurden nicht neu erhoben und werden nicht veröffentlicht.

## Reihenfolge und Zuschnitt

1. **Messung/Grundlagen S02–S03:** verbindlichen Speicherregelverstoß beheben; aktuelle Vitals-/Sentry-Belege lesen. So entstehen weniger verzerrte spätere Vergleiche.
2. **Angebot/Anmeldung S04–S08:** zuerst konkrete Begriffe/Stimme/Zahlen-/Packentscheidungen, dann Hero/Login, Packs/Abbruch, isolierter Stripe-Nachweis und Spot-Angebot. Die gewollte Reveal-Logik bleibt unverändert.
3. **Bedienung/Barrierefreiheit S09–S12:** klar belegte Map-/Lesbarkeits-/Gestaltungsprobleme, danach gezielte Testlücken und manuelle Abnahme. Bereits vorhandene Tests nicht doppeln.
4. **Performance S13–S14:** Diagnose bei stabiler UI, dann genau ein messbar begründetes Paket. Auth bleibt eager; kein globaler Bildoptimiererumbau.
5. **Inhalte/Google S15–S19:** Such-/Indexentscheidungen, zwei Seiten als Pilot, kleine redaktionelle Spot-Kohorte, gemeinsamer I3/W9-Snippetversuch, anschließend echte GSC-Nachbeobachtung. Keine Massenänderung oder Veröffentlichung ohne Freigabe.
6. **Wachstum S20–S25:** bestehendes Sharing verbessern; Kampagnenziel prüfen; Newsletter zuerst als optionales neues Produkt entscheiden. DOI und einzelne Mailvorlage nur bei Ja. Danach beobachtete Wirkung statt historischer Hypothesen auswerten.
7. **Infrastruktur S26–S31:** Remy-Billing, warme Instanz und CDN/Region getrennt entscheiden; nur ausdrücklich freigegebene einzelne Versuche/Änderungen umsetzen; Kosten/Tempo/Fehler gesondert nachbeobachten.

S19/S25/S31 sind eigenständige spätere Lesesessions mit ausreichendem Zeitfenster, keine Wartepflicht während einer Umsetzung. Sie können nach ihrem Messfenster eingeschoben werden. S26 darf bei einem konkret belegten Remy-Ausfall vorgezogen werden; das erteilt keine Billingfreigabe. Bedingte Sessions sind Optionen, keine beschlossenen Maßnahmen und keine automatisch anzulegenden Chats. S29/S30 folgen nur nach positiver eigener Entscheidung; eine Regionmigration ist **nicht** enthalten und verlangt bei späterem Ja einen eigenen konkret begrenzten Migrationsplan.

Jede Umsetzungsrunde endet bei einem begrenzten reviewbaren Paket mit Übergabe. Weitere Kohorten oder Performance-Engpässe werden erst anhand neuer Befunde konkret geplant. Diese Liste soll nicht in einem Chat am Stück umgesetzt werden.

## Nötige Nutzerentscheidungen

| Entscheidung | Vorbereitende Session | Bis dahin gilt |
| --- | --- | --- |
| Begriffe DE/EN, gemeinsame Login-Bezeichnung, Person/Marken-Wir, Tipprolle | S04 | Bestehendes Verhalten bleibt, konkrete Textvarianten zuerst |
| Kartenzahlen zeigen? Gesamt vs. neu? Preise ändern oder bewusst gleich lassen? | S04 | Keine Preisänderung; Zahlen-Kommentare sind bewusster Konflikt, kein Freibrief |
| Freiwillige Pack-Alternative bei Entfernung | S04 | Keine neue Kauf-/Server-Standortpflicht |
| Must-Eats-Erklärseite indexieren? Umgang mit kleinen Bezirksseiten? | S15 | Vorhandenes noindex/Schwellen nicht pauschal umstellen |
| Abweichende Ausnahmen für Pfeile/Cover gewünscht? | S11 nur falls ausdrücklich angefragt | Geltende AGENTS-Regeln sind Standard; keine neue Ausnahme nötig, um sie einzuhalten |
| Einladungsbelohnung erhöhen? | S20 | Eine Karte je Seite bleibt; Sichtbarkeit kann getrennt verbessert werden |
| Kampagnenziel und ggf. Werbebudget/Start | S21 | Keine Anzeige, Ausgabe oder Kampagne starten |
| Newsletter überhaupt? Inhalt/Takt/DOI/Abmeldung/Daten/Kosten? | S22 | Kein Opt-in sammeln, keine Login-Adressen für Marketing, kein Versand |
| Remy-Budget/Auto-Reload/Alarm | S26 | Keine Billing-/Limitänderung und keine kostenpflichtige Probe |
| Monatliche Mehrkosten einer warmen Instanz | S27 | minInstances bleibt 0 |
| CDN-Umbau und erlaubter Staging-Versuch | S28 | Middleware/Cache nicht umbauen |
| Region wechseln? | S28 als **getrennte** Entscheidung | Keine Migration; eigenes späteres Migrationspaket erforderlich |

Preise, Referral-Belohnung, Newsletter, Kampagnen, Remy-Billing, Hostingkosten und Region werden nicht durch eine allgemeine Zustimmung zu diesem Plan mitbeschlossen. Ein Nein ist ein gültiger Abschluss einer Produkthypothese; anschließend Befundstatus samt Begründung aktualisieren.

## Ursprüngliche Rangliste vollständig überführt

Die ursprünglichen zwölf Maßnahmen und zwei größeren Vorhaben sind erhalten, aber wegen heutiger Regeln, Abhängigkeiten und späterer Entscheidungen neu eingeordnet. Die Original-Reihenfolge ist kein heutiger Umsetzungsbefehl.

| Ursprungsrang | Historische Maßnahme | IDs | Heutige Einordnung |
| --- | --- | --- | --- |
| 1 | Preis/Kartenzahl sofort | P2 W3 | S04/S06/S07; Menge/Preise bewusst entscheiden |
| 2 | Konkrete Zusage im Login | P3 W1 | S04/S05 |
| 3 | Angebot im Hero erklären | P1 | S04/S05 |
| 4 | Remy Auto-Reload/Alarm | T1 | S26; separate Billingentscheidung, nicht ungefragt aktivieren |
| 5 | Pack bei Entfernung anbieten | W4 | S04/S08; nur optional und ohne geänderte Reveal-Regeln |
| 6 | Angebot auf Spot-Seiten | W2 | S08 |
| 7 | Entfernte URLs weiterleiten | I8 | Historische Empfehlung verworfen: Nutzer will Entfernung; Produkt-404 erledigt, GSC-Rest S19 |
| 8 | Deutsche Google-Titel | I5 | S17, danach S19; heutige betroffene Menge erst lesen |
| 9 | Messung ohne Browserspeicher | P9 | S02 vorziehen: verbindliche bestehende Produktregel |
| 10 | Begriffe vereinheitlichen | P4 | S04/S05/S06 |
| 11 | Map mobil lesbar | G1 | S09/S12 |
| 12 | Nach Anmeldung in Kontakt bleiben | W7 | S22; neues Newsletterprodukt separat entscheiden |
| Groß A | DE-Bezirks-/Kategorie-Sichtbarkeit | I1 I4 I6 I7 | S15/S16/S18/S19, Pilot plus spätere Messung |
| Groß B | HTML aus Cache/CDN | T2 | S28/S29/S31; Architektur/Budget/Region nicht bündeln |

## Alle IDs mit Zuständigkeit

9 Produkt + 8 Gestaltung + 8 Inhalte + 9 Wachstum + 10 Technik = **44**. Überschneidungen bleiben separate IDs, erhalten aber gemeinsame Pakete: insbesondere P2/W3, P3/W1, I3/W9 und T5/T6. Jede ID ist mindestens einer Folgesession zugeordnet; erledigte/verworfene Punkte sind nur als Regressions-/Prüfgrenze enthalten, nicht als Wiederimplementierung.

| ID | Befund | Status | Folgesessions |
| --- | --- | --- | --- |
| [P1](befunde.md#p1) | Angebot im Startseiten-Hero | offen | S04, S05, S25 |
| [P2](befunde.md#p2) | Pack-Preis und Kartenzahl | Entscheidung nötig | S04, S06, S25 |
| [P3](befunde.md#p3) | Starter-Nutzen je Anmeldeanlass | offen | S04, S05, S25 |
| [P4](befunde.md#p4) | Begriffe für Konto, Deck und Aufdecken | Entscheidung nötig | S04, S05, S06 |
| [P5](befunde.md#p5) | Insider-Tipp und Must-Eat-Gericht | nicht ausreichend belegt | S04, S17 |
| [P6](befunde.md#p6) | Indexierbarkeit von Must Eats und Packs | Entscheidung nötig | S15, S19 |
| [P7](befunde.md#p7) | Persönliche Stimme und Marken-Wir | Entscheidung nötig | S04, S05 |
| [P8](befunde.md#p8) | Spot-Zahl in geteilten Decks | offen | S20 |
| [P9](befunde.md#p9) | Messung verwendet sessionStorage | offen | S02, S25 |
| [G1](befunde.md#g1) | Map-Status und Seitenzoom | offen | S09, S12 |
| [G2](befunde.md#g2) | Starter-Kontrast | offen | S10, S12 |
| [G3](befunde.md#g3) | Kleinsttexte im öffentlichen UI | offen | S10, S12 |
| [G4](befunde.md#g4) | Map-Filter-Löschfläche | offen | S09, S12 |
| [G5](befunde.md#g5) | Live-Region an jeder Listenkarten-Statusangabe | offen | S09, S12 |
| [G6](befunde.md#g6) | Accessibility-Testabdeckung | teilweise | S12 |
| [G7](befunde.md#g7) | Pfeile und abgedunkelte Magazincover | offen | S11, S12 |
| [G8](befunde.md#g8) | Admin-Positionsänderung nur farblich bewertet | offen | S10 |
| [I1](befunde.md#i1) | Deutsche Bezirks-/Kategorieseiten in der Suche | nicht ausreichend belegt | S15, S16, S19 |
| [I2](befunde.md#i2) | Nicht indexierte Seiten | teilweise | S15, S19 |
| [I3](befunde.md#i3) | Spot-Suchklickrate und Meta-Beschreibungen | nicht ausreichend belegt | S18, S19 |
| [I4](befunde.md#i4) | Überlappende Suchabsichten von Bezirken und Artikeln | nicht ausreichend belegt | S15, S16, S19 |
| [I5](befunde.md#i5) | Englische Formulierungen in deutschen Google-Titeln | offen | S17, S19 |
| [I6](befunde.md#i6) | Dünne Bezirksseiten | Entscheidung nötig | S15, S16, S19 |
| [I7](befunde.md#i7) | H1 und englischer Startseitentitel | offen | S05, S15, S16, S19 |
| [I8](befunde.md#i8) | Entfernte Artikel und alte Spot-URL | teilweise | S19 |
| [W1](befunde.md#w1) | Abbruch im Login-Trichter | teilweise | S02, S05, S25 |
| [W2](befunde.md#w2) | Angebot auf Spot-Seiten | offen | S04, S08, S25 |
| [W3](befunde.md#w3) | Pack-Käufe und Angebotsklarheit | nicht ausreichend belegt | S04, S06, S07, S25 |
| [W4](befunde.md#w4) | Pack-Angebot im Entfernungszustand | Entscheidung nötig | S04, S08, S25 |
| [W5](befunde.md#w5) | Instagram-Zielseite | nicht ausreichend belegt | S21, S25 |
| [W6](befunde.md#w6) | Einladen und Belohnung | Entscheidung nötig | S20, S25 |
| [W7](befunde.md#w7) | Freiwillige Neuigkeiten-Mails | Entscheidung nötig | S22, S23, S24, S25 |
| [W8](befunde.md#w8) | Stripe-Abbruchziel | offen | S06, S07 |
| [W9](befunde.md#w9) | Google-Klickrate | nicht ausreichend belegt | S18, S19 |
| [T1](befunde.md#t1) | Remy-Guthaben und Verfügbarkeit | Entscheidung nötig | S26, S31 |
| [T2](befunde.md#t2) | CDN, Middleware und Region | offen | S28, S29, S31 |
| [T3](befunde.md#t3) | Warme Instanz und laufende Kosten | Entscheidung nötig | S27, S30, S31 |
| [T4](befunde.md#t4) | Mail-Bildgrößen | erledigt | S24 |
| [T5](befunde.md#t5) | Web Vitals | teilweise | S03, S13, S14, S31 |
| [T6](befunde.md#t6) | Unnötiges JavaScript | teilweise | S13, S14, S31 |
| [T7](befunde.md#t7) | Sentry-Rauschen und Source Maps | teilweise | S03, S31 |
| [T8](befunde.md#t8) | Pauschaler Umbau des Bildoptimierers | nicht mehr zutreffend | S13 |
| [T9](befunde.md#t9) | Angemeldete Browserwege und Stripe | teilweise | S07 |
| [T10](befunde.md#t10) | Mail-Ratenlimit bei Firestore-Ausfall | erledigt | S23, S31 |

## Alle eigenständigen Startaufträge

Die jeweilige Datei vollständig in einen neuen Chat übernehmen oder sie ausdrücklich lesen lassen. Keine automatische Verfügbarkeit dieses Chats vorausgesetzt. Alle Dateien enthalten Projektregeln, historischen Release-Anker, ID-Ausgangslage, Ziel/Grenzen, Dateien, Entscheidungen/Abhängigkeiten, Prüfungen und Fertig-Kriterien.

| Auftrag | Art | Befund-IDs |
| --- | --- | --- |
| [S02: Messung ohne Browserspeicher](sessions/s02-zaehler-ohne-speicher.md) | Umsetzung, klein | P9, W1 |
| [S03: Feldmessung und Sentry-Nachweise lesen](sessions/s03-messbasis-sentry.md) | Nur Prüfung/Dokumentation | T5, T7 |
| [S04: Angebot, Begriffe und Stimme entscheiden](sessions/s04-produktentscheidungen.md) | Entscheidungsgrundlage, kein Produktcode | P1, P2, P3, P4, P5, P7, W2, W3, W4 |
| [S05: Startseite und Anmelden verständlich machen](sessions/s05-startseite-anmeldung.md) | Umsetzung, Texte/kleines UI | P1, P3, P4, P7, W1, I7 |
| [S06: Pack-Angebot und Checkout-Abbruchziel](sessions/s06-packs-preis-abbruch.md) | Umsetzung, begrenzter Kauf-Einstieg | P2, P4, W3, W8 |
| [S07: Stripe-Wege im Testmodus belegen](sessions/s07-stripe-testmodus.md) | Testarbeit, isoliert | T9, W3, W8 |
| [S08: Angebot auf Spot und Karten-Entfernung](sessions/s08-spot-angebot.md) | Umsetzung, kleines UI-Paket | W2, W4 |
| [S09: Map-Status, Zoom und Filter bedienen](sessions/s09-map-bedienung.md) | Umsetzung, Map-UI | G1, G4, G5 |
| [S10: Kontrast, Kleinsttexte und Admin-Bewertung](sessions/s10-lesbarkeit-kontrast.md) | Umsetzung, begrenzte Typografie/Farbe | G2, G3, G8 |
| [S11: Blättern und Magazincover an Regeln angleichen](sessions/s11-gestaltungsregeln.md) | Umsetzung, zwei vorhandene UI-Muster | G7 |
| [S12: Accessibility-Lücken gezielt absichern](sessions/s12-a11y-abdeckung.md) | Tests und manuelle Prüfung | G1, G2, G3, G4, G5, G6, G7 |
| [S13: Verbleibende Performance-Ursache bestimmen](sessions/s13-performance-diagnose.md) | Nur Messung/Diagnose | T5, T6, T8 |
| [S14: Ein belegtes Performance-Paket umsetzen](sessions/s14-performance-ein-paket.md) | Bedingte Umsetzung, ein Engpass | T5, T6 |
| [S15: Suchabsichten und Indexentscheidungen](sessions/s15-google-seitenplan.md) | Nur Prüfung/Entscheidung | P6, I1, I2, I4, I6, I7 |
| [S16: Einen Bezirks- und Kategorie-Piloten stärken](sessions/s16-bezirks-kategorie-pilot.md) | Umsetzung/Entwürfe, zwei Seiten | I1, I4, I6, I7 |
| [S17: Tipprollen und deutsche Spot-Titel](sessions/s17-redaktionelle-korrekturen.md) | Prüfung und höchstens fünf Inhaltsentwürfe | P5, I5 |
| [S18: Klicknutzen für fünf Spot-Snippets](sessions/s18-google-snippet-pilot.md) | GSC-Prüfung und Inhaltsentwürfe | I3, W9 |
| [S19: Google-Wirkung und entfernte URLs nachprüfen](sessions/s19-google-nachbeobachtung.md) | Nur Messung/Nachbeobachtung | P6, I1, I2, I3, I4, I5, I6, I7, I8, W9 |
| [S20: Deck-Beschreibung und freiwilliges Einladen](sessions/s20-deck-teilen.md) | Umsetzung, vorhandenes Sharing | P8, W6 |
| [S21: Eine mögliche Kampagnen-Zielseite prüfen](sessions/s21-kampagnen-zielseite.md) | Konzept; kleiner Pilot nur nach Entscheidung | W5 |
| [S22: Neuigkeiten-Mails als eigenes Produkt entscheiden](sessions/s22-newsletter-entscheidung.md) | Entscheidung, keine Implementierung | W7 |
| [S23: Freiwillige Anmeldung mit Double-Opt-in](sessions/s23-newsletter-doi.md) | Bedingte Umsetzung, nur Subscription-Lebenszyklus | W7, T10 |
| [S24: Mail-Vorlage und echte Mailclient-Prüfung](sessions/s24-mail-vorlage-clientcheck.md) | Prüfung; Newsletter nur bedingt | T4, W7 |
| [S25: Angebots- und Wachstumswirkung nachbeobachten](sessions/s25-funnel-nachbeobachtung.md) | Nur Messung/Nachbeobachtung | P1, P2, P3, P9, W1, W2, W3, W4, W5, W6, W7 |
| [S26: Remy-Billing und Alarm getrennt entscheiden](sessions/s26-remy-budget.md) | Nur Prüfung/Entscheidung | T1 |
| [S27: Warme Instanz belastbar kalkulieren](sessions/s27-hosting-kosten.md) | Nur Mess-/Kostenentscheidung | T3 |
| [S28: CDN-Varianten und Region getrennt prüfen](sessions/s28-cdn-architektur.md) | Nur Architektur/Messung/Entscheidung | T2 |
| [S29: Einen freigegebenen CDN-Versuch isoliert bauen](sessions/s29-cdn-versuch.md) | Bedingte Umsetzung, nur Staging/isoliert | T2 |
| [S30: Eine warme Instanz nur nach Budgetfreigabe](sessions/s30-warme-instanz.md) | Bedingte Infrastrukturänderung | T3 |
| [S31: Technische Wirkung und Kosten nachbeobachten](sessions/s31-technik-nachbeobachtung.md) | Nur Messung/Nachbeobachtung | T1, T2, T3, T5, T6, T7, T10 |

## Als Nächstes konkret

Starte **S02 – Messung ohne Browserspeicher** mit [diesem vollständigen Auftrag](sessions/s02-zaehler-ohne-speicher.md). Er behebt P9 und klärt die Messgrenzen für W1, ohne Preise, Produktlogik oder Infrastruktur anzufassen. Das ist die einzige empfohlene nächste Umsetzung, keine Aufforderung, alle 30 Sessions sofort anzulegen.

Kurzauftrag: aktuelle AGENTS/Worktrees/Remote prüfen, eigene `claude/`-Kopie von staging erstellen, `trackEventOnce` und die beiden Aufrufer lesen, Browser-Speicherschreibvorgänge der Messung beseitigen, Kauf-Deduplizierungsgrenzen ehrlich nachweisen, gezielte Tests plus typecheck/lint/audit:css-modules/knip, Review und knappe Übergabe. Keine produktiven Käufe, kein GA, keine neue persistente Besucherkennung.

## Abnahme dieser Planung

- 44 eindeutige IDs mit 9/8/8/9/10; alle Originaltitel gegen gerenderten Bericht überprüft.
- Pro ID Originalaussage, aktueller Status, konkreter Beleg, Restarbeit/Grenze und Abnahmekriterium vorhanden.
- Alle zwölf Ursprungsmaßnahmen und beide großen Vorhaben überführt; heutige Regel-/Entscheidungskonflikte markiert.
- 30 eigenständige Startaufträge; ID-Zuordnung in beide Richtungen maschinell geprüft; alle lokalen Dokumentlinks und gepinnten Codepfade geprüft.
- Session-1-Änderungsscope nur dieses Markdown-Verzeichnis, keine AGENTS-/Produkt-/Infrastrukturänderung. Kein Commit/Push/Deploy und keine neuen Folgechats.
- Dokumentprüfung und vorhandene CI-Nachweise verwendet; keine unnötigen Produkt-Tests für reine Dokumentation neu gestartet. Aktueller Ausführungs-/Reviewnachweis siehe `pruefung.md`.
