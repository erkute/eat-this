# Alle 44 Befunde – Ist-Abgleich

Stand 23.11.2026; Codebasis `aa156ce26bbcd29c9cb16f7227b552465b621366`. [Plan](README.md) · [Nachweise](nachweise.md).

IDs folgen der Originalreihenfolge, nicht einer neuen Priorisierung. Originalaussagen sind sinngemäß wiedergegeben; historische private Nutzungszahlen bleiben in der lokalen Originalquelle. Empfehlungen sind historische Vorschläge und werden nicht automatisch zu heutigen Anforderungen.

Status bedeutet: **erledigt** = ursprünglicher enger Mangel behoben; **teilweise** = Teilnachweis/Teilumsetzung, Rest explizit; **offen** = aktueller belegter Rest; **Entscheidung nötig** = bewusste Produkt-/Budgetwahl vor abhängigem Umbau; **nicht ausreichend belegt** = heutige Wirkung/Daten fehlen; **nicht mehr zutreffend** = pauschale Annahme durch spätere Erkenntnis verworfen. Ein Status ersetzt nicht die angegebenen Grenzen.

## Produkt & Strategie

<a id="p1"></a>

### P1 – Angebot im Startseiten-Hero

**Status: offen.** Ursprüngliche Bewertung: Schwere hoch, Aufwand klein, Sicherheit wahrscheinlich (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Der erste Bereich erklärt das Angebot nicht in der Seitensprache; historisch wurden eine kurze Erklärung und ein Weg zur kostenlosen Map empfohlen.

**Heutiger Abgleich:** Der Hero enthält weiterhin den englischen Slogan und den CTA zu Must Eats. Die Map-Erklärung folgt erst in HubMapIntro. Die wahrgenommene Verständlichkeit wurde in Session 1 nicht im Browser gemessen.

**Konkreter Beleg:** [nextjs/app/components/HubHeroCopy.tsx:32](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/HubHeroCopy.tsx#L32); [nextjs/app/components/HubHeroCopy.tsx:75](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/HubHeroCopy.tsx#L75); [nextjs/app/components/HubMapIntro.tsx:81](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/HubMapIntro.tsx#L81).

**Restarbeit/Grenzen:** DE-/EN-Erklärung und Map-Einstieg nach Produktentscheidung ausarbeiten. Offener statischer Fächer und Remy bleiben erhalten.

**Abnahme:** Angebot im ersten Bereich auf 390/1440 px sofort verständlich und serverseitig vorhanden; keine Wartepflicht auf Hydrierung oder Bewegung.

**Folgesessions:** [S04: Angebot, Begriffe und Stimme entscheiden](sessions/s04-produktentscheidungen.md); [S05: Startseite und Anmelden verständlich machen](sessions/s05-startseite-anmeldung.md); [S25: Angebots- und Wachstumswirkung nachbeobachten](sessions/s25-funnel-nachbeobachtung.md).

<a id="p2"></a>

### P2 – Pack-Preis und Kartenzahl

**Status: Entscheidung nötig.** Ursprüngliche Bewertung: Schwere hoch, Aufwand mittel, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Preis erscheint erst nach Auth-Hydrierung; Kartenzahlen fehlen. Unterschiedlich große Packs kosten gleich viel. Empfehlung: Preis/Kartenzahl zeigen und Preislogik prüfen.

**Heutiger Abgleich:** Die Preiswartephase ist im Code bestätigt. Kartenzahlen dienen nur dem Leer-Prüfwert. Kommentare erklären ausdrücklich, dass das Produkt Zahlen nicht nennt: Das ist ein Konflikt zwischen früherer Produktaussage und historischer Empfehlung, keine Erlaubnis zur stillen Änderung. Preise bleiben unverändert.

**Konkreter Beleg:** [nextjs/app/[locale]/pack/[slug]/PackBuyButton.tsx:109](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/pack/%5Bslug%5D/PackBuyButton.tsx#L109); [nextjs/app/[locale]/pack/[slug]/page.tsx:86](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/pack/%5Bslug%5D/page.tsx#L86); [nextjs/app/[locale]/packs/page.tsx:90](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/packs/page.tsx#L90); [nextjs/lib/stripe-catalog.ts:1](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/stripe-catalog.ts#L1).

**Restarbeit/Grenzen:** Zahlendarstellung, Umgang mit bereits offenen Karten und Preismodell getrennt entscheiden. Preis kann unabhängig vom Besitzstatus im HTML erscheinen. Aktuelle Mengen bei Umsetzung aus Sanity holen; keine Originalmengen übernehmen.

**Abnahme:** Freigegebener Preis und ggf. Gesamtzahl im Server-HTML; Gäste, eingeloggte und Besitzer sehen konsistente Zustände; keine geschützten Kartendaten offengelegt.

**Folgesessions:** [S04: Angebot, Begriffe und Stimme entscheiden](sessions/s04-produktentscheidungen.md); [S06: Pack-Angebot und Checkout-Abbruchziel](sessions/s06-packs-preis-abbruch.md); [S25: Angebots- und Wachstumswirkung nachbeobachten](sessions/s25-funnel-nachbeobachtung.md).

<a id="p3"></a>

### P3 – Starter-Nutzen je Anmeldeanlass

**Status: offen.** Ursprüngliche Bewertung: Schwere mittel, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** FAQ nennt 20 zusätzliche Karten, Login-Texte bleiben vage und passen beim Herz nicht zum Speichern. Empfehlung: konkrete Zusage und eigener Herztext.

**Heutiger Abgleich:** packLead, cardLead und heartLead sind weiterhin gleichartig. FAQ nennt 20. Die tatsächliche einmalige Starter-Vergabe einschließlich Wunschkarte wird inzwischen im Emulator-Browser getestet.

**Konkreter Beleg:** [nextjs/lib/i18n/translations.ts:649](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/i18n/translations.ts#L649); [nextjs/lib/landing/faqs.ts:10](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/landing/faqs.ts#L10); [nextjs/e2e/account-flows.spec.ts:75](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/e2e/account-flows.spec.ts#L75).

**Restarbeit/Grenzen:** Nutzen in DE/EN je Anlass formulieren, bestehende sichere Starter-Logik bewahren. Kein automatisches Erklär-Onboarding.

**Abnahme:** Karte/Starter/Herz liefern passende Texte; 20 aus gültiger Produktkonstante, Wunschkarte und Einmaligkeit bleiben getestet.

**Folgesessions:** [S04: Angebot, Begriffe und Stimme entscheiden](sessions/s04-produktentscheidungen.md); [S05: Startseite und Anmelden verständlich machen](sessions/s05-startseite-anmeldung.md); [S25: Angebots- und Wachstumswirkung nachbeobachten](sessions/s25-funnel-nachbeobachtung.md).

<a id="p4"></a>

### P4 – Begriffe für Konto, Deck und Aufdecken

**Status: Entscheidung nötig.** Ursprüngliche Bewertung: Schwere mittel, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Deck, Sammlung, Album und Stapel sowie Sign up/Sign in werden uneinheitlich verwendet. Empfehlung: ein kleines verbindliches Vokabular.

**Heutiger Abgleich:** Uneinheitlichkeit besteht in sichtbaren DE-/EN-Strings weiter. Die Anwendung verwendet einen passwortlosen gemeinsamen Einstieg; eine künstliche Trennung zwischen neuen und bestehenden Konten darf kein falsches Versprechen schaffen.

**Konkreter Beleg:** [nextjs/lib/i18n/translations.ts:30](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/i18n/translations.ts#L30); [nextjs/app/components/MustEatsSection.tsx:27](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/MustEatsSection.tsx#L27); [nextjs/app/components/MustEatsSection.tsx:43](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/MustEatsSection.tsx#L43); [nextjs/app/[locale]/checkout/success/page.tsx:53](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/checkout/success/page.tsx#L53); [nextjs/lib/stripe-catalog.ts:1](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/stripe-catalog.ts#L1).

**Restarbeit/Grenzen:** Nutzer bestätigt Begriffe und passende gemeinsame Login-Bezeichnung. Danach sichtbare Strings systematisch angleichen; interne Variablennamen nur bei wirklichem Bedarf.

**Abnahme:** Kleine DE-/EN-Begriffsliste freigegeben, alle betroffenen sichtbaren Einstiege und Kaufbestätigungen geprüft; keine widersprüchlichen Zusagen.

**Folgesessions:** [S04: Angebot, Begriffe und Stimme entscheiden](sessions/s04-produktentscheidungen.md); [S05: Startseite und Anmelden verständlich machen](sessions/s05-startseite-anmeldung.md); [S06: Pack-Angebot und Checkout-Abbruchziel](sessions/s06-packs-preis-abbruch.md).

<a id="p5"></a>

### P5 – Insider-Tipp und Must-Eat-Gericht

**Status: nicht ausreichend belegt.** Ursprüngliche Bewertung: Schwere mittel, Aufwand mittel, Sicherheit wahrscheinlich (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Eine historische Stichprobe sah unterschiedliche Gerichte im offenen Tipp und der verdeckten Karte. Empfehlung: Besuchstipp und Gerichtsempfehlung redaktionell unterscheiden.

**Heutiger Abgleich:** Die Spot-Seite rendert den Sanity-Tipp unabhängig von den Karten. Der damalige Vergleich von nur drei Spots ist keine Vollprüfung und wurde heute nicht gegen geschützte Kartendaten wiederholt. Unterschiedliche Empfehlungen können beabsichtigt sein.

**Konkreter Beleg:** [nextjs/app/[locale]/restaurant/[slug]/page.tsx:221](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/restaurant/%5Bslug%5D/page.tsx#L221); [nextjs/app/[locale]/restaurant/[slug]/page.tsx:356](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/restaurant/%5Bslug%5D/page.tsx#L356); [nextjs/app/components/MustEatTeaserSection.tsx:1](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/MustEatTeaserSection.tsx#L1); Originalquelle Rolle Produkt, Befund 5.

**Restarbeit/Grenzen:** Redaktionelle Rollen entscheiden, drei ursprüngliche Beispiele mit autorisiertem Inhaltszugang vergleichen, dann höchstens drei DE-/EN-Entwürfe. Keine geschützten Gerichte in öffentliche Plan-Dokumente kopieren.

**Abnahme:** Tipp und Karte erfüllen bewusst getrennte oder übereinstimmende Rollen; Fakten belegt; Entwürfe geprüft, Veröffentlichung nur ausdrücklich freigegeben.

**Folgesessions:** [S04: Angebot, Begriffe und Stimme entscheiden](sessions/s04-produktentscheidungen.md); [S17: Tipprollen und deutsche Spot-Titel](sessions/s17-redaktionelle-korrekturen.md).

<a id="p6"></a>

### P6 – Indexierbarkeit von Must Eats und Packs

**Status: Entscheidung nötig.** Ursprüngliche Bewertung: Schwere niedrig, Aufwand klein, Sicherheit vermutet (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Must Eats und Packs tragen noindex und fehlen in der Sitemap. Empfehlung: Erklärseite ggf. indexieren; Kaufseiten dürfen noindex bleiben.

**Heutiger Abgleich:** Code und Live-HTTP bestätigen noindex in DE/EN. Für Pack-Details ist Vermeidung der Konkurrenz zu Kategorieseiten im Code begründet. noindex ist daher kein pauschaler Fehler.

**Konkreter Beleg:** [nextjs/app/[locale]/(spa)/must-eats/page.tsx:32](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/%28spa%29/must-eats/page.tsx#L32); [nextjs/app/[locale]/packs/page.tsx:33](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/packs/page.tsx#L33); [nextjs/app/[locale]/pack/[slug]/page.tsx:36](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/pack/%5Bslug%5D/page.tsx#L36); [nextjs/lib/seo/sitemap-entries.ts:34](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/seo/sitemap-entries.ts#L34); E04.

**Restarbeit/Grenzen:** Suchabsicht und bevorzugte Zielseite im SEO-Paket entscheiden; keine alleinige Entfernung eines Meta-Tags ohne Inhalts-/Sitemap-Abgleich.

**Abnahme:** Für jeden Seitentyp dokumentierte Indexentscheidung; robots, Sitemap, Canonical und Sprachverweise konsistent; keine verdeckten Inhalte indexierbar.

**Folgesessions:** [S15: Suchabsichten und Indexentscheidungen](sessions/s15-google-seitenplan.md); [S19: Google-Wirkung und entfernte URLs nachprüfen](sessions/s19-google-nachbeobachtung.md).

<a id="p7"></a>

### P7 – Persönliche Stimme und Marken-Wir

**Status: Entscheidung nötig.** Ursprüngliche Bewertung: Schwere niedrig, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Über-Seite/Navigation sprechen als Person, FAQ und Startseite als wir. Empfehlung: Absenderrolle festlegen.

**Heutiger Abgleich:** Navigation sagt Über mich/About me, die FAQ sagt Wir sind Foodies und HubMapIntro Wo wir essen gehen. Das ist eine Markenentscheidung, kein technischer Defekt.

**Konkreter Beleg:** [nextjs/lib/i18n/translations.ts:145](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/i18n/translations.ts#L145); [nextjs/lib/landing/faqs.ts:23](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/landing/faqs.ts#L23); [nextjs/app/components/HubMapIntro.tsx:81](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/HubMapIntro.tsx#L81).

**Restarbeit/Grenzen:** Person, Marke und Remy-Stimme bewusst abgrenzen. Keine erfundene Redaktion oder unbelegte persönliche Besuche behaupten.

**Abnahme:** Freigegebene Absenderentscheidung wird in den betroffenen DE-/EN-Texten verständlich umgesetzt.

**Folgesessions:** [S04: Angebot, Begriffe und Stimme entscheiden](sessions/s04-produktentscheidungen.md); [S05: Startseite und Anmelden verständlich machen](sessions/s05-startseite-anmeldung.md).

<a id="p8"></a>

### P8 – Spot-Zahl in geteilten Decks

**Status: offen.** Ursprüngliche Bewertung: Schwere niedrig, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Deck-Beschreibungen nennen über hundert Spots, obwohl der öffentliche Bestand damals größer war. Empfehlung: aktuelle oder dauerhaft richtige Angabe.

**Heutiger Abgleich:** Over a hundred/Über hundert steht weiterhin in beiden Deck-Beschreibungen. Die damalige Bestandszahl wird nicht als heutiger Wert verwendet; die Aussage ist nicht zwingend falsch, aber unpräzise.

**Konkreter Beleg:** [nextjs/lib/i18n/translations.ts:172](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/i18n/translations.ts#L172); [nextjs/lib/i18n/translations.ts:516](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/i18n/translations.ts#L516); [nextjs/app/[locale]/deck/[uid]/page.tsx:98](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/deck/%5Buid%5D/page.tsx#L98).

**Restarbeit/Grenzen:** Aktuellen öffentlichen Sanity-Bestand zur Umsetzung prüfen oder eine zeitlose Formulierung wählen. Sichtbaren Text, Metadaten und ggf. Artwork gemeinsam abstimmen.

**Abnahme:** Geteilter DE-/EN-Link zeigt belegbare konsistente Beschreibung. Bei collectLabel/collectBody-/offenen-Karten-Änderung build:deck-og-art ausführen.

**Folgesessions:** [S20: Deck-Beschreibung und freiwilliges Einladen](sessions/s20-deck-teilen.md).

<a id="p9"></a>

### P9 – Messung verwendet sessionStorage

**Status: offen.** Ursprüngliche Bewertung: Schwere niedrig, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Zwei Messpunkte schreiben Sitzungsspeicher trotz Regel Messung ohne Browserspeicher. Empfehlung: Deduplizierung ohne Browserspeicher.

**Heutiger Abgleich:** trackEventOnce liest und schreibt eatthis_analytics_* in sessionStorage; Aufrufer bleiben Kaufabschluss und Standort-Einladung. Dies widerspricht der eindeutigen heutigen Projektregel.

**Konkreter Beleg:** [nextjs/lib/analytics.ts:214](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/analytics.ts#L214); [nextjs/app/[locale]/checkout/success/CheckoutSuccessAnalytics.tsx:20](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/checkout/success/CheckoutSuccessAnalytics.tsx#L20); [nextjs/lib/map/useMapLocationFeedback.ts:81](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/map/useMapLocationFeedback.ts#L81).

**Restarbeit/Grenzen:** Gezielt diese Deduplizierung ersetzen/entfernen und Semantik der Kaufzählung prüfen. In-Memory-Dedupe verhindert nur Duplikate innerhalb eines Dokumentlebens; Refresh-Duplikate nicht als gelöst darstellen. Keine stabile Besucher-ID einführen.

**Abnahme:** Messcode schreibt weder sessionStorage, localStorage noch Cookies/IndexedDB; notwendiger Auth-/Theme-Speicher bleibt fachlich getrennt. Kaufzählung und Reload-Grenze nachvollziehbar getestet/dokumentiert.

**Folgesessions:** [S02: Messung ohne Browserspeicher](sessions/s02-zaehler-ohne-speicher.md); [S25: Angebots- und Wachstumswirkung nachbeobachten](sessions/s25-funnel-nachbeobachtung.md).

## Gestaltung & Bedienung

<a id="g1"></a>

### G1 – Map-Status und Seitenzoom

**Status: offen.** Ursprüngliche Bewertung: Schwere hoch, Aufwand klein, Sicherheit wahrscheinlich (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Map-Status ist 10 px groß; pan-y sperrt Pinch-Zoom auf UI-Flächen. Empfehlung: lesbarere Labels und erlaubtes Seitenzoomen.

**Heutiger Abgleich:** 10-px-Sonderregel und pan-y stehen weiter im Code. Die tatsächliche iOS-Auswirkung ist ohne Gerätetest nicht bewiesen; die Filter-Kopfzeile erlaubt teilweise bereits pinch-zoom.

**Konkreter Beleg:** [nextjs/app/globals.css:1500](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/globals.css#L1500); [nextjs/app/components/map/MapLayout.module.css:17](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/map/MapLayout.module.css#L17); [nextjs/app/components/map/RestaurantDetail.module.css:33](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/map/RestaurantDetail.module.css#L33); [nextjs/app/components/map/MapSheetDetail.module.css:15](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/map/MapSheetDetail.module.css#L15); [nextjs/app/components/map/MapFilters.module.css:133](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/map/MapFilters.module.css#L133).

**Restarbeit/Grenzen:** Statusgröße und betroffene Listen-/Detailflächen gezielt anpassen, MapLibre-Kartengesten erhalten. Zoom auf iPhone/Safari nachprüfen.

**Abnahme:** Status auf Telefon lesbar; UI-Zoom funktioniert, Listen/Panels/Map-Gesten und Desktop bleiben bedienbar, kein Überlauf bei Vergrößerung.

**Folgesessions:** [S09: Map-Status, Zoom und Filter bedienen](sessions/s09-map-bedienung.md); [S12: Accessibility-Lücken gezielt absichern](sessions/s12-a11y-abdeckung.md).

<a id="g2"></a>

### G2 – Starter-Kontrast

**Status: offen.** Ursprüngliche Bewertung: Schwere mittel, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Blasses Weiß auf rotem Starter-Blatt unterschreitet laut historischer Farbrechnung den Textkontrast. Empfehlung: kräftigere Textfarbe.

**Heutiger Abgleich:** Das rote Blatt setzt weiterhin --et-muted auf Weiß mit .82 Alpha; editorial-Login-Texte nutzen es. Der damalige Kontrastwert war rechnerisch, keine heutige Pixelmessung über Textur.

**Konkreter Beleg:** [nextjs/app/globals.css:332](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/globals.css#L332); [nextjs/app/components/LoginBoard.module.css:402](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/LoginBoard.module.css#L402); [nextjs/app/components/StarterPackSignup.tsx:36](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/StarterPackSignup.tsx#L36).

**Restarbeit/Grenzen:** Betroffene Hilfs-/Rechtstexte mit vorhandenen Tokens verbessern und tatsächlich gerenderten Kontrast prüfen; keine Modul-Überschreibung gleicher Spezifität zwischen Modulen.

**Abnahme:** Normaler kleiner Text mindestens 4,5:1, Links/Fokus erkennbar; DE/EN, Hell/Dunkel, Texturen und Login-/Starter-Varianten geprüft.

**Folgesessions:** [S10: Kontrast, Kleinsttexte und Admin-Bewertung](sessions/s10-lesbarkeit-kontrast.md); [S12: Accessibility-Lücken gezielt absichern](sessions/s12-a11y-abdeckung.md).

<a id="g3"></a>

### G3 – Kleinsttexte im öffentlichen UI

**Status: offen.** Ursprüngliche Bewertung: Schwere mittel, Aufwand mittel, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Viele 10–11-px-Texte erschweren das Lesen. Empfehlung: Mindestgröße, zuerst Metadaten/Map.

**Heutiger Abgleich:** Beispiele in Magazin-Metadaten, News, Remy-Prompt und Login sind weiterhin vorhanden. Eine pauschale verbindliche Mindestgröße ist noch keine beschlossene Produktregel; AGENTS.md wird in Session 1 nicht verändert.

**Konkreter Beleg:** [nextjs/app/components/MagazineGrid.module.css:67](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/MagazineGrid.module.css#L67); [nextjs/app/components/NewsSection.module.css:95](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/NewsSection.module.css#L95); [nextjs/app/components/HubFragRemy.module.css:82](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/HubFragRemy.module.css#L82); [nextjs/app/components/LoginBoard.module.css:274](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/LoginBoard.module.css#L274); [nextjs/app/components/map/MustEatDetail.module.css:394](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/map/MustEatDetail.module.css#L394).

**Restarbeit/Grenzen:** Lesbarkeits-Inventar erstellen und funktionale Kleinsttexte in einem begrenzten CSS-Paket anheben; reine Artwork-Typografie gesondert bewerten. Keine bloße Such-Ersetzung aller Zahlen.

**Abnahme:** Genannte funktionale Texte auf 390/1440 px lesbar, 200%-Zoom ohne Verlust; Linebreaks und Texturen geprüft, keine neue unbeauftragte AGENTS-Regel.

**Folgesessions:** [S10: Kontrast, Kleinsttexte und Admin-Bewertung](sessions/s10-lesbarkeit-kontrast.md); [S12: Accessibility-Lücken gezielt absichern](sessions/s12-a11y-abdeckung.md).

<a id="g4"></a>

### G4 – Map-Filter-Löschfläche

**Status: offen.** Ursprüngliche Bewertung: Schwere niedrig, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Filter-x ist nur 24 px breit und liegt dicht an der Picker-Fläche. Empfehlung: größere getrennte Trefffläche.

**Heutiger Abgleich:** 24 px Breite bleibt; mobil erhöht sich nur die Höhe auf 44 px. Der Löschknopf ist bereits ein eigener Geschwisterknopf, keine verschachtelte Schaltfläche.

**Konkreter Beleg:** [nextjs/app/components/map/MapFilters.module.css:82](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/map/MapFilters.module.css#L82); [nextjs/app/components/map/MapFilters.module.css:93](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/map/MapFilters.module.css#L93); [nextjs/app/components/map/MapFilters.module.css:123](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/map/MapFilters.module.css#L123).

**Restarbeit/Grenzen:** Löschziel mobil auf mindestens 44×44 px und Chip-Polster passend abstimmen, ohne überlappende Flächen.

**Abnahme:** Öffnen und Löschen treffen zuverlässig verschiedene Bereiche; schmale Telefone, Tastatur und lange DE-/EN-Filter geprüft.

**Folgesessions:** [S09: Map-Status, Zoom und Filter bedienen](sessions/s09-map-bedienung.md); [S12: Accessibility-Lücken gezielt absichern](sessions/s12-a11y-abdeckung.md).

<a id="g5"></a>

### G5 – Live-Region an jeder Listenkarten-Statusangabe

**Status: offen.** Ursprüngliche Bewertung: Schwere niedrig, Aufwand klein, Sicherheit wahrscheinlich (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** role=status pro Spot könnte beim Laden/Nachladen Ansagenfluten erzeugen. Empfehlung: statische Labels ohne Live-Region.

**Heutiger Abgleich:** RestaurantList verwendet weiterhin role=status und setzt now nach Mount. Die hörbare Wirkung wurde heute nicht mit VoiceOver/TalkBack geprüft; es bleibt ein plausibler semantischer Befund.

**Konkreter Beleg:** [nextjs/app/components/map/RestaurantList.tsx:251](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/map/RestaurantList.tsx#L251); [nextjs/app/components/map/RestaurantList.tsx:336](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/map/RestaurantList.tsx#L336).

**Restarbeit/Grenzen:** Statische Status-Labels von aktionsbezogenen Ansagen trennen; sinnvolle Trefferzahl-/Fehleransagen erhalten.

**Abnahme:** Screenreader liest Status bei Fokus/Navigation, ohne automatische Serienansagen beim Nachladen; Filter-Rückmeldung bleibt vorhanden.

**Folgesessions:** [S09: Map-Status, Zoom und Filter bedienen](sessions/s09-map-bedienung.md); [S12: Accessibility-Lücken gezielt absichern](sessions/s12-a11y-abdeckung.md).

<a id="g6"></a>

### G6 – Accessibility-Testabdeckung

**Status: teilweise.** Ursprüngliche Bewertung: Schwere mittel, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Original prüfte public-pages.spec.ts und schloss daraus, Home, Map und Login seien nicht mit axe abgedeckt.

**Heutiger Abgleich:** Diese pauschale Aussage trifft nicht zu: theme.spec.ts prüft Home und Map im Dunkelmodus, home-musteats die Home-Kartensektion und login-window das Login in DE/EN. Offene Lücken sind die systematische Matrix, incomplete-Kontrastbefunde und angemeldete Zustände. Nicht vorhandene Tests neu erfinden wäre Doppelarbeit.

**Konkreter Beleg:** [nextjs/e2e/public-pages.spec.ts:5](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/e2e/public-pages.spec.ts#L5); [nextjs/e2e/theme.spec.ts:27](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/e2e/theme.spec.ts#L27); [nextjs/e2e/theme.spec.ts:48](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/e2e/theme.spec.ts#L48); [nextjs/e2e/home-musteats.spec.ts:58](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/e2e/home-musteats.spec.ts#L58); [nextjs/e2e/login-window.spec.ts:73](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/e2e/login-window.spec.ts#L73); E03.

**Restarbeit/Grenzen:** Bestehende Abdeckung inventarisieren; nur nachgewiesene Lücken bei DE/EN, Hell/Dunkel, Login/Konto schließen. incomplete-Ausgaben gezielt auswerten, manuelle Bedienung ergänzen.

**Abnahme:** Abdeckungsmatrix mit bestehenden und neuen Tests; keine axe-Verstöße in zugesagten Zuständen, unvollständige Kontrastprüfungen nicht als bestanden ausgegeben.

**Folgesessions:** [S12: Accessibility-Lücken gezielt absichern](sessions/s12-a11y-abdeckung.md).

<a id="g7"></a>

### G7 – Pfeile und abgedunkelte Magazincover

**Status: offen.** Ursprüngliche Bewertung: Schwere niedrig, Aufwand mittel, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Galerien/Blätterknöpfe verwenden Pfeile; Cover verdunkeln Fotos trotz Gestaltungsregeln. Original empfahl Entscheidung zwischen Ausnahmen und Angleichung.

**Heutiger Abgleich:** Pfeil-SVGs und Foto-Scrims sind im aktuellen Stand vorhanden. Die geltende AGENTS-Regel enthält dafür keine Ausnahme. Standardauftrag ist daher Angleichung; eine gewünschte Ausnahme braucht eine ausdrückliche Nutzerentscheidung.

**Konkreter Beleg:** [nextjs/app/components/map/MustEatDetailMobile.tsx:342](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/map/MustEatDetailMobile.tsx#L342); [nextjs/app/components/map/MustEatImageLightbox.tsx:619](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/map/MustEatImageLightbox.tsx#L619); [nextjs/app/components/MagazineCover.module.css:269](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/MagazineCover.module.css#L269); [nextjs/app/components/MagazineCover.tsx:305](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/MagazineCover.tsx#L305); AGENTS.md.

**Restarbeit/Grenzen:** Zugängliches Blättern mit beschrifteten Bedienelementen erhalten, Fotos nicht für Text abdunkeln; vorhandene et-label-Lösungen nutzen. Keine reine Swipe-only-Bedienung.

**Abnahme:** Keine unerlaubten Richtungspfeile/Fototext-Scrims im vereinbarten Paket; Tastatur, Touch, Zähler, Fokus und Kontrast bleiben funktional.

**Folgesessions:** [S11: Blättern und Magazincover an Regeln angleichen](sessions/s11-gestaltungsregeln.md); [S12: Accessibility-Lücken gezielt absichern](sessions/s12-a11y-abdeckung.md).

<a id="g8"></a>

### G8 – Admin-Positionsänderung nur farblich bewertet

**Status: offen.** Ursprüngliche Bewertung: Schwere niedrig, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Bei inverser Kennzahl Position zeigt nur Rot/Grün, ob die Änderung gut ist. Empfehlung: bedeutungstragendes Wort.

**Heutiger Abgleich:** Kpi invert steuert CSS-Farbe, sichtbar bleiben Dreieck und Prozentbetrag ohne besser/schlechter. Die Richtung ist vorhanden, die Bewertung nicht textlich.

**Konkreter Beleg:** [nextjs/app/components/admin/stats/charts.tsx:337](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/admin/stats/charts.tsx#L337); [nextjs/app/components/admin/stats/charts.tsx:351](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/admin/stats/charts.tsx#L351); [nextjs/app/components/admin/stats/reports/Search.tsx:87](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/admin/stats/reports/Search.tsx#L87).

**Restarbeit/Grenzen:** Verbesserung/Verschlechterung auch sprachlich kennzeichnen, inverse/positive/flache/fehlende Veränderung unterscheiden.

**Abnahme:** Bewertung ohne Farbe verständlich, Screenreader-Text eindeutig; keine privaten Adminwerte in Screenshots oder öffentlichen Dokumenten.

**Folgesessions:** [S10: Kontrast, Kleinsttexte und Admin-Bewertung](sessions/s10-lesbarkeit-kontrast.md).

## Inhalte & Google

<a id="i1"></a>

### I1 – Deutsche Bezirks-/Kategorieseiten in der Suche

**Status: nicht ausreichend belegt.** Ursprüngliche Bewertung: Schwere hoch, Aufwand groß, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Historische Search-Console-Daten zeigten schwächere deutsche Rankings gegenüber EN. Empfehlung: gezielte Inhalte, interne und externe Links sowie Verlaufsmessung.

**Heutiger Abgleich:** Der historische Zeitraum ist keine heutige Rankingmessung. Aktuelle Templates können Text und kuratierte Top-Spots darstellen; OpenSEO-Kontext enthält nur eine ältere Recherche vom 12.11.2026. Ein Rankinggewinn oder unveränderte Schwäche ist heute nicht vollständig nachgewiesen.

**Konkreter Beleg:** [nextjs/app/[locale]/bezirk/[slug]/page.tsx:138](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/bezirk/%5Bslug%5D/page.tsx#L138); [nextjs/app/components/DistrictHeader.tsx:28](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/DistrictHeader.tsx#L28); [nextjs/lib/seo/crossLinks.ts:1](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/seo/crossLinks.ts#L1); E06; Original Rolle Inhalte, Befund 1.

**Restarbeit/Grenzen:** Aktuelle Query×Seite×Sprache-Baseline lesen; eine deutsche Bezirks- und eine Kategorieseite als Pilot wählen. Fakten aus Sanity, redaktionelle Top-Spots statt erfundener Bestenlisten. Linkgewinnung nur planen, keine Nachrichten versenden.

**Abnahme:** Pilot erfüllt eigenständige Suchabsicht und belegt Aussagen; DE/EN-Fassung abrufbar nach späterer Freigabe. Wirkung erst mit gleichen Zeitfenstern und Stichproben nachbeobachten.

**Folgesessions:** [S15: Suchabsichten und Indexentscheidungen](sessions/s15-google-seitenplan.md); [S16: Einen Bezirks- und Kategorie-Piloten stärken](sessions/s16-bezirks-kategorie-pilot.md); [S19: Google-Wirkung und entfernte URLs nachprüfen](sessions/s19-google-nachbeobachtung.md).

<a id="i2"></a>

### I2 – Nicht indexierte Seiten

**Status: teilweise.** Ursprüngliche Bewertung: Schwere hoch, Aufwand mittel, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Der Originalbericht meldete einen größeren nicht indexierten Anteil, besonders EN-Spots. Empfehlung: Gründe/Verlinkung/Sprachinhalte untersuchen.

**Heutiger Abgleich:** Eine neue GSC-Stichprobe bestätigt unterschiedliche Zustände: Gazzo DE ist gecrawlt, derzeit nicht indexiert; Gazzo EN wird als indexiert gemeldet. Das Originalgesamtergebnis lässt sich daraus weder bestätigen noch ersetzen. API-Inspektionen spiegeln Googles gespeicherten Stand, keinen Live-Crawl.

**Konkreter Beleg:** E05; [nextjs/lib/seo/sitemap-entries.ts:83](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/seo/sitemap-entries.ts#L83); [nextjs/lib/i18n/pickLocale.ts:1](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/i18n/pickLocale.ts#L1).

**Restarbeit/Grenzen:** Aktuelle priorisierte Sitemap-Stichprobe samt Crawlzeit, Canonical, Inhalts-/Sprachqualität prüfen; Ursachen getrennt behandeln, keine ungeprüften Massenänderungen.

**Abnahme:** Je geprüfter URL dokumentierter Grund und fachlich sinnvolle nächste Maßnahme; Indexierung nur durch GSC-Nachweis, keine Garantie für Aufnahme.

**Folgesessions:** [S15: Suchabsichten und Indexentscheidungen](sessions/s15-google-seitenplan.md); [S19: Google-Wirkung und entfernte URLs nachprüfen](sessions/s19-google-nachbeobachtung.md).

<a id="i3"></a>

### I3 – Spot-Suchklickrate und Meta-Beschreibungen

**Status: nicht ausreichend belegt.** Ursprüngliche Bewertung: Schwere mittel, Aufwand mittel, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Historisch mehr Einblendungen und weniger Klicks, Namenssuchen um die hintere erste Ergebnisseite. Empfehlung: klarere Beschreibungen und laufenden Titletest erst nach ausreichender Laufzeit bewerten.

**Heutiger Abgleich:** Der Menü-/Preise-/Öffnungszeiten-Title-Builder und die redaktionellen Beschreibungsfelder bestehen. Aktuelle CTR und Wirkung wurden in Session 1 nicht neu ermittelt. Der am 13.11. gestartete Test ist am 23.11. noch keine vier Wochen alt.

**Konkreter Beleg:** [nextjs/lib/seo/restaurantMeta.ts:100](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/seo/restaurantMeta.ts#L100); [nextjs/app/[locale]/restaurant/[slug]/page.tsx:85](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/restaurant/%5Bslug%5D/page.tsx#L85); [nextjs/app/[locale]/restaurant/[slug]/page.tsx:119](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/restaurant/%5Bslug%5D/page.tsx#L119); E06.

**Restarbeit/Grenzen:** Mit W9 zusammen bearbeiten: aktuelle Kohorte aus GSC wählen, höchstens fünf belegte DE-/EN-Meta-Entwürfe. Keine verdeckten Gerichte oder unbestätigten Preise verraten.

**Abnahme:** Beschreibungen sagen einen belegten Besuchernutzen zu; Titelkohorte/Kontrolle getrennt; Auswertung frühestens nach sinnvoller Testdauer und dokumentiertem Veröffentlichungsdatum.

**Folgesessions:** [S18: Klicknutzen für fünf Spot-Snippets](sessions/s18-google-snippet-pilot.md); [S19: Google-Wirkung und entfernte URLs nachprüfen](sessions/s19-google-nachbeobachtung.md).

<a id="i4"></a>

### I4 – Überlappende Suchabsichten von Bezirken und Artikeln

**Status: nicht ausreichend belegt.** Ursprüngliche Bewertung: Schwere mittel, Aufwand mittel, Sicherheit wahrscheinlich (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Mehrere Sprach-/Seitentypen erschienen historisch für ähnliche Straßen-/Bezirksabfragen. Empfehlung: Hauptziel pro Suchabsicht und passende Links.

**Heutiger Abgleich:** Bezirksseiten und redaktionelle Artikel bestehen nebeneinander; crossLinks stellt Querverbindungen her. Ob eine schädliche Konkurrenz besteht, ist ohne aktuelle Query×Seite-Auswertung nicht belegt. Mehrere URLs allein beweisen keine Kannibalisierung.

**Konkreter Beleg:** [nextjs/lib/seo/crossLinks.ts:1](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/seo/crossLinks.ts#L1); [nextjs/app/[locale]/bezirk/[slug]/page.tsx:18](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/bezirk/%5Bslug%5D/page.tsx#L18); Original Rolle Inhalte, Befund 4.

**Restarbeit/Grenzen:** Für Mitte/Torstraße/Kantstraße Suchabsichten und Ziele abgrenzen; nur passende Linktexte/Titel in kleinem Pilot ändern. Keine sachfremden Redirects oder Seitenlöschungen.

**Abnahme:** Jedes Pilotthema hat ein begründetes Ziel, Artikel und Hub erfüllen verschiedene Aufgaben; Links und Sprachalternativen korrekt, spätere GSC-Verteilung geprüft.

**Folgesessions:** [S15: Suchabsichten und Indexentscheidungen](sessions/s15-google-seitenplan.md); [S16: Einen Bezirks- und Kategorie-Piloten stärken](sessions/s16-bezirks-kategorie-pilot.md); [S19: Google-Wirkung und entfernte URLs nachprüfen](sessions/s19-google-nachbeobachtung.md).

<a id="i5"></a>

### I5 – Englische Formulierungen in deutschen Google-Titeln

**Status: offen.** Ursprüngliche Bewertung: Schwere mittel, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Original fand zahlreiche gleichlautende DE-/EN-Titel aus Sanity. Empfehlung: deutsche redaktionelle Titel oder vorhandenen Fallback verwenden.

**Heutiger Abgleich:** Live-Stichproben ACID Mitte, Bertie und Arturo bestätigen englische Gattungsbegriffe im DE-Title. Die historische Gesamtzahl wurde nicht neu gezählt. Menü-Title hat Vorrang vor redaktionellem Title, daher Feldänderung nicht blind mit Ausgabe gleichsetzen.

**Konkreter Beleg:** E04; [nextjs/app/[locale]/restaurant/[slug]/page.tsx:98](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/restaurant/%5Bslug%5D/page.tsx#L98); [nextjs/app/[locale]/restaurant/[slug]/page.tsx:119](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/restaurant/%5Bslug%5D/page.tsx#L119); [nextjs/lib/seo/restaurantMeta.ts:15](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/seo/restaurantMeta.ts#L15).

**Restarbeit/Grenzen:** Aktuelle betroffene veröffentlichte Dokumente lesen, höchstens fünf DE-Titel als Sanity-Entwürfe überarbeiten, EN eigenständig erhalten.

**Abnahme:** Entwurf und tatsächlicher Title-Pfad nachvollziehbar, deutsche Gattungsbegriffe passend und Fakten korrekt; Veröffentlichung nur ausdrücklich freigegeben, danach DE/EN abrufen.

**Folgesessions:** [S17: Tipprollen und deutsche Spot-Titel](sessions/s17-redaktionelle-korrekturen.md); [S19: Google-Wirkung und entfernte URLs nachprüfen](sessions/s19-google-nachbeobachtung.md).

<a id="i6"></a>

### I6 – Dünne Bezirksseiten

**Status: Entscheidung nötig.** Ursprüngliche Bewertung: Schwere mittel, Aufwand klein, Sicherheit wahrscheinlich (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Bezirke mit wenigen Empfehlungen sind indexierbar, Map verwendet eine Mindestzahl. Empfehlung: noindex unter Schwelle oder gezielt ergänzen.

**Heutiger Abgleich:** Live nennt Friedenau 2 und Friedrichshain 4 Einträge; Wedding 5, Steglitz 6. Seiten tragen index,follow. Sitemap-Schwelle bleibt >0, Map-Schwelle 5. Daraus folgt kein belegter SEO-Schaden und keine automatische noindex-Pflicht.

**Konkreter Beleg:** E04; [nextjs/lib/seo/sitemap-entries.ts:113](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/seo/sitemap-entries.ts#L113); [nextjs/lib/map/useMapFilters.ts:19](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/map/useMapFilters.ts#L19); [nextjs/app/[locale]/bezirk/[slug]/page.tsx:99](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/bezirk/%5Bslug%5D/page.tsx#L99).

**Restarbeit/Grenzen:** Qualität/Suchnachfrage und bewusste Schwellenentscheidung dokumentieren; bei noindex Sitemap konsistent anpassen. Keine erfundenen Spots zum Auffüllen.

**Abnahme:** Kleine Bezirke haben begründete Indexentscheidung und nützlichen Inhalt; Metadaten, Sitemap und interne Navigation widersprechen sich nicht.

**Folgesessions:** [S15: Suchabsichten und Indexentscheidungen](sessions/s15-google-seitenplan.md); [S16: Einen Bezirks- und Kategorie-Piloten stärken](sessions/s16-bezirks-kategorie-pilot.md); [S19: Google-Wirkung und entfernte URLs nachprüfen](sessions/s19-google-nachbeobachtung.md).

<a id="i7"></a>

### I7 – H1 und englischer Startseitentitel

**Status: offen.** Ursprüngliche Bewertung: Schwere niedrig, Aufwand klein, Sicherheit wahrscheinlich (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** H1 nennt nur Bezirk bzw. englischen Slogan, EN-Home-Title stellt Marke vor Inhalt. Empfehlung: verständlichen Such-/Ortskontext ergänzen.

**Heutiger Abgleich:** DistrictHeader rendert weiterhin nur name als H1; Home EN-Title bleibt Marke zuerst. Ein behaupteter Rankingeffekt dieser Reihenfolge ist nicht gemessen. Home-Teil wird mit P1 gemeinsam umgesetzt.

**Konkreter Beleg:** [nextjs/app/components/DistrictHeader.tsx:28](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/DistrictHeader.tsx#L28); [nextjs/app/[locale]/(spa)/page.tsx:26](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/%28spa%29/page.tsx#L26); [nextjs/app/components/HubHeroCopy.tsx:32](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/HubHeroCopy.tsx#L32).

**Restarbeit/Grenzen:** Semantisch sinnvolle DE-/EN-Überschriften im bestehenden Layout; Suchwort nicht ausschließlich unsichtbar für Ranking einfügen. Home in S05, Bezirke in S16.

**Abnahme:** Genau eine sachlich treffende H1 und konsistenter Title; visuell/vergrößert verständlich; Metadaten- und i18n-Prüfung bestehen.

**Folgesessions:** [S05: Startseite und Anmelden verständlich machen](sessions/s05-startseite-anmeldung.md); [S15: Suchabsichten und Indexentscheidungen](sessions/s15-google-seitenplan.md); [S16: Einen Bezirks- und Kategorie-Piloten stärken](sessions/s16-bezirks-kategorie-pilot.md); [S19: Google-Wirkung und entfernte URLs nachprüfen](sessions/s19-google-nachbeobachtung.md).

<a id="i8"></a>

### I8 – Entfernte Artikel und alte Spot-URL

**Status: teilweise.** Ursprüngliche Bewertung: Schwere niedrig, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Original empfahl Weiterleitungen für zwei entfernte Artikel und einen Spot, weil sie noch bei Google erschienen.

**Heutiger Abgleich:** Die spätere Nutzerentscheidung lautet Seiten vollständig entfernen. Nach #1412/#1414 verwenden die sechs Sprach-URLs die Standard-404 statt Sonder-410. Live am 23.11.: alle 404 + noindex, keine Umleitung. GSC meldet drei der sechs noch als indexiert mit alten Crawlständen. Entfernen im Produkt erledigt, Google-Nachbeobachtung offen; historische Redirect-Empfehlung verworfen.

**Konkreter Beleg:** E02; E04; E05; Commit 3c0f857c; [nextjs/lib/seo/legacyRedirects.ts:69](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/seo/legacyRedirects.ts#L69); spätere Produktentscheidung zur vollständigen Entfernung (E01).

**Restarbeit/Grenzen:** Nur GSC/Sitemap/interne Referenzen nachbeobachten. Fremde URL-Arbeit im Hauptworktree nicht anfassen. Keine Wiederaufnahme, neue 410-Sonderlogik oder sachfremde Redirects als Automatismus.

**Abnahme:** Produkt liefert weiter echte 404/noindex ohne aktiven Inhalt/Link/Sitemap-Eintrag; spätere GSC-Inspektionen belegen Entfernung oder halten den verbleibenden Zustand ausdrücklich offen.

**Folgesessions:** [S19: Google-Wirkung und entfernte URLs nachprüfen](sessions/s19-google-nachbeobachtung.md).

## Wachstum & Einnahmen

<a id="w1"></a>

### W1 – Abbruch im Login-Trichter

**Status: teilweise.** Ursprüngliche Bewertung: Schwere hoch, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Historische Nutzungsdaten zeigten viele Login-Ansichten und wenige neue Konten; unkonkreter Text wurde als möglicher Hebel empfohlen.

**Heutiger Abgleich:** Die Textschwäche aus P3 ist bestätigt; reale lokale Kontoabläufe sind inzwischen getestet. Eine aktuelle Konversionsrate oder kausaler Texteffekt ist nicht belegt. Historische Zähler sind aggregiert und dürfen nicht wie identifizierbare Sitzungsfunnel interpretiert werden.

**Konkreter Beleg:** [nextjs/lib/i18n/translations.ts:649](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/i18n/translations.ts#L649); [nextjs/app/api/count/route.ts:59](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/api/count/route.ts#L59); [nextjs/e2e/account-flows.spec.ts:75](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/e2e/account-flows.spec.ts#L75); E03.

**Restarbeit/Grenzen:** Text mit P3 verbessern, Messdefinitionen und Account-Neuanlage vs. wiederkehrenden Login sauber trennen; später gleiche Zeitfenster lesen.

**Abnahme:** Passende Texte und verlässliche technische Wege; Änderungseffekt mit Zeitraum, Herkunft und Stichprobengrenze dokumentiert, kein Versprechen einer bestimmten Quote.

**Folgesessions:** [S02: Messung ohne Browserspeicher](sessions/s02-zaehler-ohne-speicher.md); [S05: Startseite und Anmelden verständlich machen](sessions/s05-startseite-anmeldung.md); [S25: Angebots- und Wachstumswirkung nachbeobachten](sessions/s25-funnel-nachbeobachtung.md).

<a id="w2"></a>

### W2 – Angebot auf Spot-Seiten

**Status: offen.** Ursprüngliche Bewertung: Schwere hoch, Aufwand mittel, Sicherheit wahrscheinlich (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Historisch wichtige Einstiege auf Spots mit wenig Fortsetzung; verdeckte Karten erklären Zugang kaum. Empfehlung: relevanter Starter-Nutzen und Teilen.

**Heutiger Abgleich:** MustEatTeaserSection nennt Gerichte auf Karten und führt zur Map; ein konkreter Starter-Angebotstext/ShareButton fehlt dort. Der Klickpfad bleibt zunächst ein Map-Link; seine eventuelle Angleichung an direkte Login-Logik muss bewusst und getestet erfolgen.

**Konkreter Beleg:** [nextjs/app/components/MustEatTeaserSection.tsx:35](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/MustEatTeaserSection.tsx#L35); [nextjs/app/components/MustEatTeaserSection.tsx:62](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/MustEatTeaserSection.tsx#L62); [nextjs/app/[locale]/restaurant/[slug]/page.tsx:1](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/restaurant/%5Bslug%5D/page.tsx#L1); [nextjs/app/components/ShareButton.tsx:1](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/ShareButton.tsx#L1).

**Restarbeit/Grenzen:** Ein kleines kontextbezogenes Angebot und bestehendes Teilen auf Spot-Detail prüfen/umsetzen, keine ungeprüfte neue Zwischenstufe. Aktuelle Ausstiegswirkung nicht aus historischen Aggregaten ableiten.

**Abnahme:** Gast erkennt Nutzen und kommt in vorgesehenen Starter-Login; offener Karten-/Besitzerzustand korrekt; DE/EN, Tastatur, Reduced Motion und Teilen geprüft.

**Folgesessions:** [S04: Angebot, Begriffe und Stimme entscheiden](sessions/s04-produktentscheidungen.md); [S08: Angebot auf Spot und Karten-Entfernung](sessions/s08-spot-angebot.md); [S25: Angebots- und Wachstumswirkung nachbeobachten](sessions/s25-funnel-nachbeobachtung.md).

<a id="w3"></a>

### W3 – Pack-Käufe und Angebotsklarheit

**Status: nicht ausreichend belegt.** Ursprüngliche Bewertung: Schwere hoch, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Original meldete keine bezahlten Käufe und vermutete unklare Pack-Inhalte als Ursache. Empfehlung: Preis/Kartenzahl und ggf. Ersparnis zeigen.

**Heutiger Abgleich:** Die aktuelle Kaufzahl wurde nicht abgefragt. Der UI-Mangel aus P2 ist bestätigt; daraus folgt keine belegte Ursache für fehlende Käufe. Ein Funktionsfehler im Stripe-Weg ist ebenfalls nicht bewiesen.

**Konkreter Beleg:** [nextjs/app/[locale]/pack/[slug]/PackBuyButton.tsx:116](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/pack/%5Bslug%5D/PackBuyButton.tsx#L116); [nextjs/app/[locale]/pack/[slug]/page.tsx:86](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/pack/%5Bslug%5D/page.tsx#L86); E02 #1413/#1415; Original Rolle Wachstum, Befund 3.

**Restarbeit/Grenzen:** Mit P2 Angebotsdarstellung, mit T9 Testmodus prüfen. Produktentscheidungen zu Mengen/Preisen abwarten, aktuelle aggregierte Kaufdaten nur privat und zeitbezogen lesen.

**Abnahme:** Vollständiges Angebot und nachgewiesener vereinbarter Testmodusweg; reale Einnahmen nur aus aktuellem Zahlungsnachweis, keine Erfolgsbehauptung aus einem grünen UI-Test.

**Folgesessions:** [S04: Angebot, Begriffe und Stimme entscheiden](sessions/s04-produktentscheidungen.md); [S06: Pack-Angebot und Checkout-Abbruchziel](sessions/s06-packs-preis-abbruch.md); [S07: Stripe-Wege im Testmodus belegen](sessions/s07-stripe-testmodus.md); [S25: Angebots- und Wachstumswirkung nachbeobachten](sessions/s25-funnel-nachbeobachtung.md).

<a id="w4"></a>

### W4 – Pack-Angebot im Entfernungszustand

**Status: Entscheidung nötig.** Ursprüngliche Bewertung: Schwere hoch, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Original empfahl im Zu-weit-weg-Zustand ein passendes Booster-Pack als alternative Öffnung.

**Heutiger Abgleich:** Browser prüft 50 m; der Server gibt angemeldet ohne Kauf und ohne Standortprüfung frei. Diese bewusst geltende Logik hat Vorrang. Ein Pack-Hinweis darf ein Komfortangebot sein, keine neue Bezahlschranke oder behauptete Server-Ortsbindung. proximityHint besteht, mobile/desktop Kartenabläufe sind beteiligt.

**Konkreter Beleg:** [nextjs/lib/i18n/translations.ts:484](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/i18n/translations.ts#L484); [nextjs/app/components/map/MustEatDetail.tsx:135](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/map/MustEatDetail.tsx#L135); [nextjs/app/components/map/MustEatDetailMobile.tsx:1](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/map/MustEatDetailMobile.tsx#L1); [nextjs/app/api/must-eat-reveal/route.ts:1](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/api/must-eat-reveal/route.ts#L1); AGENTS.md.

**Restarbeit/Grenzen:** Entscheiden, ob und wie freiwilliger Kauf im Entfernungszustand angeboten wird. Bei Umsetzung Preise aus Katalog, keine zusätzliche Onboarding-Stufe oder serverseitige Kauf-/Ortsprüfung.

**Abnahme:** Ablehnen/ohne Kauf vor Ort aufdecken funktioniert unverändert; Gast geht direkt in Starter-Login, Browser misst Entfernung, Serverlimits 10/min und 15/Tag bleiben.

**Folgesessions:** [S04: Angebot, Begriffe und Stimme entscheiden](sessions/s04-produktentscheidungen.md); [S08: Angebot auf Spot und Karten-Entfernung](sessions/s08-spot-angebot.md); [S25: Angebots- und Wachstumswirkung nachbeobachten](sessions/s25-funnel-nachbeobachtung.md).

<a id="w5"></a>

### W5 – Instagram-Zielseite

**Status: nicht ausreichend belegt.** Ursprüngliche Bewertung: Schwere mittel, Aufwand mittel, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Historische Kampagne hatte keine nachgewiesene neue Anmeldung; Empfehlung: passende Landingpage vor weiterer Werbung.

**Heutiger Abgleich:** Heutige Kampagnenaktivität, Kosten und Zuordnung wurden nicht geprüft. Startseite erklärt Angebot oben weiterhin knapp (P1), beweist aber keine Kampagnenursache. Remy oder Anmeldung in zehn Sekunden nicht unbelegt versprechen.

**Konkreter Beleg:** [nextjs/app/components/HubHeroCopy.tsx:32](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/HubHeroCopy.tsx#L32); [nextjs/app/components/StarterPackSignup.tsx:1](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/StarterPackSignup.tsx#L1); Original Rolle Wachstum, Befund 5.

**Restarbeit/Grenzen:** Erst nach Angebotsverbesserungen einen vorhandenen Einstieg als kleine Zielseitenvariante planen; keine bezahlte Kampagne, Veröffentlichung oder Werbeausgabe ohne expliziten Auftrag.

**Abnahme:** Zielgruppe, Angebot, URL, datensparsame Messung und Budgetentscheidung getrennt dokumentiert; späterer Pilot technisch geprüft und zeitbezogen ausgewertet.

**Folgesessions:** [S21: Eine mögliche Kampagnen-Zielseite prüfen](sessions/s21-kampagnen-zielseite.md); [S25: Angebots- und Wachstumswirkung nachbeobachten](sessions/s25-funnel-nachbeobachtung.md).

<a id="w6"></a>

### W6 – Einladen und Belohnung

**Status: Entscheidung nötig.** Ursprüngliche Bewertung: Schwere mittel, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Original sah geringe Sichtbarkeit und keine erfolgreiche Einladung; Empfehlung: Teilen nach Erfolg und ggf. höhere Belohnung.

**Heutiger Abgleich:** Einladungs-/Deck-Aktionen bestehen; Belohnung ist weiterhin eine Karte für beide. Kommentar begründet bewusst die begrenzte Belohnung gegen den kleinen Kartenbestand. Aktuelle Nutzung ist nicht neu belegt.

**Konkreter Beleg:** [nextjs/lib/referral/constants.ts:6](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/referral/constants.ts#L6); [nextjs/lib/referral/constants.ts:12](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/referral/constants.ts#L12); [nextjs/app/components/profile/ProfileInvite.tsx:84](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/profile/ProfileInvite.tsx#L84); [nextjs/app/[locale]/deck/[uid]/DeckActions.tsx:40](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/deck/%5Buid%5D/DeckActions.tsx#L40); [nextjs/app/components/SignInRewardPanel.tsx:1](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/SignInRewardPanel.tsx#L1).

**Restarbeit/Grenzen:** Sichtbarkeit bei erfolgreichem Starter prüfen; Belohnungsänderung nur separat entscheiden. Kein automatisches Teilen oder Versenden.

**Abnahme:** Teilen freiwillig und zugänglich; Referral-/Einmaligkeits-/Missbrauchsschutz bleibt; Belohnung ohne ausdrückliche Entscheidung unverändert.

**Folgesessions:** [S20: Deck-Beschreibung und freiwilliges Einladen](sessions/s20-deck-teilen.md); [S25: Angebots- und Wachstumswirkung nachbeobachten](sessions/s25-funnel-nachbeobachtung.md).

<a id="w7"></a>

### W7 – Freiwillige Neuigkeiten-Mails

**Status: Entscheidung nötig.** Ursprüngliche Bewertung: Schwere mittel, Aufwand mittel, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Original sah keine Wiederansprache außer Login-Mails; Empfehlung: freiwilliger Newsletter mit Double-Opt-in und regelmäßiger Mail.

**Heutiger Abgleich:** Im App-Code ist weiterhin nur der transaktionale Auth-Mailversand belegt. Ein vorhandener Anbieterwert oder altes Segment wäre kein Nachweis einer rechtmäßig nutzbaren Liste. Keine aktuelle Wiederkehrquote ermittelt.

**Konkreter Beleg:** [nextjs/lib/auth/sendMagicLink.ts:146](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/auth/sendMagicLink.ts#L146); [nextjs/emails/components/Shell.tsx:1](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/emails/components/Shell.tsx#L1); Suche im App-Code nach newsletter/optIn/contacts.create/broadcasts ohne implementierten Newsletterweg; Original Rolle Wachstum, Befund 7.

**Restarbeit/Grenzen:** Newsletter als neues Produkt separat entscheiden: Inhalte, Takt, Rechtsgrundlage, DOI, Abmeldung, Daten-/Löschkonzept, Kosten und Verantwortliche. Danach Anmeldung und Mailproduktion in getrennten kleinen Sessions.

**Abnahme:** Ohne Zustimmung keine Liste/Broadcasts/Mails. Bei späterem Auftrag: unabhängige freiwillige Einwilligung, bestätigtes DOI, einfache Abmeldung, keine Marketing-Mail an bloße Login-Adressen.

**Folgesessions:** [S22: Neuigkeiten-Mails als eigenes Produkt entscheiden](sessions/s22-newsletter-entscheidung.md); [S23: Freiwillige Anmeldung mit Double-Opt-in](sessions/s23-newsletter-doi.md); [S24: Mail-Vorlage und echte Mailclient-Prüfung](sessions/s24-mail-vorlage-clientcheck.md); [S25: Angebots- und Wachstumswirkung nachbeobachten](sessions/s25-funnel-nachbeobachtung.md).

<a id="w8"></a>

### W8 – Stripe-Abbruchziel

**Status: offen.** Ursprüngliche Bewertung: Schwere niedrig, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Gast-Abbruch führt zur Startseite, angemeldet zur Pack-Übersicht. Empfehlung: zum ursprünglichen Pack zurück.

**Heutiger Abgleich:** cancelPath bestätigt genau diese bestehende Unterscheidung. Die historische Rückkehrzahl wird nicht als heutige Kaufabbruchzahl verwendet.

**Konkreter Beleg:** [nextjs/app/api/stripe/checkout/route.ts:90](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/api/stripe/checkout/route.ts#L90); [nextjs/app/api/stripe/checkout/route.ts:95](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/api/stripe/checkout/route.ts#L95); [nextjs/lib/pack/packDetail.ts:1](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/pack/packDetail.ts#L1).

**Restarbeit/Grenzen:** Sicheres sprachrichtiges Ziel aus bekanntem Katalog/packId ableiten. All Berlin hat keine /pack/all-berlin-Seite: dafür vorhandene Packs-Übersicht verwenden. Kein freier Return-URL-Parameter.

**Abnahme:** Kategorie-Pack kommt in DE/EN zum richtigen Detail zurück; All Berlin zur gültigen Übersicht; Gast/angemeldet und Manipulationsfälle getestet, echte Stripe-Rückkehr separat nachgewiesen.

**Folgesessions:** [S06: Pack-Angebot und Checkout-Abbruchziel](sessions/s06-packs-preis-abbruch.md); [S07: Stripe-Wege im Testmodus belegen](sessions/s07-stripe-testmodus.md).

<a id="w9"></a>

### W9 – Google-Klickrate

**Status: nicht ausreichend belegt.** Ursprüngliche Bewertung: Schwere niedrig, Aufwand mittel, Sicherheit wahrscheinlich (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Historische Wachstumsauswertung meldete sinkende CTR bei mehr Einblendungen; Empfehlung: Meta-Nutzen und Nachmessung.

**Heutiger Abgleich:** Überschneidet sich mit I3, verwendet aber einen anderen historischen Zeitraum. Kein heutiger Trend neu berechnet. Beide IDs bleiben erhalten, Umsetzung und Auswertung werden gemeinsam geführt.

**Konkreter Beleg:** [nextjs/lib/seo/restaurantMeta.ts:100](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/seo/restaurantMeta.ts#L100); [nextjs/app/[locale]/restaurant/[slug]/page.tsx:85](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/%5Blocale%5D/restaurant/%5Bslug%5D/page.tsx#L85); E06; Original Rolle Wachstum, Befund 9.

**Restarbeit/Grenzen:** Gemeinsame CTR-Kohorte und einheitliche vollständige Vergleichszeiträume mit I3; Positions-, Sprach- und Geräteverschiebung berücksichtigen.

**Abnahme:** Ein gemeinsamer dokumentierter Versuch mit getrennten I3-/W9-Statuszeilen; keine additive Doppelzählung des erwarteten Wachstums.

**Folgesessions:** [S18: Klicknutzen für fünf Spot-Snippets](sessions/s18-google-snippet-pilot.md); [S19: Google-Wirkung und entfernte URLs nachprüfen](sessions/s19-google-nachbeobachtung.md).

## Technik, Tempo & Sicherheit

<a id="t1"></a>

### T1 – Remy-Guthaben und Verfügbarkeit

**Status: Entscheidung nötig.** Ursprüngliche Bewertung: Schwere hoch, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Historisch wiederholte Guthabenausfälle; Empfehlung: Auto-Reload und Warnung.

**Heutiger Abgleich:** Guthabenfehler werden als buddy_out_of_credit behandelt; Sitzung/IP/global sind limitiert. Technikprotokoll belegt alten Ausfall, keine aktuelle Verfügbarkeit. Remy bleibt Figur und Chat; Billing wurde nicht verändert oder kostenpflichtig getestet.

**Konkreter Beleg:** [nextjs/app/api/buddy/route.ts:211](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/api/buddy/route.ts#L211); [nextjs/app/api/buddy/route.test.ts:221](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/api/buddy/route.test.ts#L221); [nextjs/lib/buddy/rateLimits.ts:11](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/buddy/rateLimits.ts#L11); E07 2026-11-21T10:19:44.397Z.

**Restarbeit/Grenzen:** Aktuellen Billing-/Alarmzustand lesend prüfen, separates Budget und Auto-Reload entscheiden. Kostenpflichtige Probe erst ausdrücklich freigeben.

**Abnahme:** Budget/Verantwortung/Alarm dokumentiert; ggf. freigegebene Probe und Alarmzustellung nachgewiesen; ohne Probe bleibt aktuelle Funktion offen.

**Folgesessions:** [S26: Remy-Billing und Alarm getrennt entscheiden](sessions/s26-remy-budget.md); [S31: Technische Wirkung und Kosten nachbeobachten](sessions/s31-technik-nachbeobachtung.md).

<a id="t2"></a>

### T2 – CDN, Middleware und Region

**Status: offen.** Ursprüngliche Bewertung: Schwere mittel, Aufwand groß, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Öffentliches HTML werde nicht über CDN bedient; Empfehlung: Middleware-Aufgaben verlagern, ggf. EU-Region.

**Heutiger Abgleich:** Middleware und breiter Matcher bleiben; Code dokumentiert App-Hosting-Cache-Auswirkung und Ausnahmen. Live-TTFB/Cachepfade wurden heute nicht neu gemessen. Weder CDN-Umbau noch Regionswechsel sind freigegeben.

**Konkreter Beleg:** [nextjs/middleware.ts:244](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/middleware.ts#L244); [nextjs/middleware.ts:266](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/middleware.ts#L266); [nextjs/middleware.ts:272](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/middleware.ts#L272); E07 2026-11-21T10:19:44.397Z.

**Restarbeit/Grenzen:** Aufgabeninventar, identische Header-/TTFB-Messungen und Variantenvergleich. Locale, Referral, Staging-Auth, Redirects, Personalisierung und Sanity-Invalidierung schützen. Region separat entscheiden und bei Zustimmung eigenen Migrationsplan erstellen.

**Abnahme:** Gewählte Variante hat überprüfbare Cache-/Datenschutz-/Rollback-Eigenschaften und Messvorteil; keine vertraulichen Antworten im öffentlichen Cache, kein Regionswechsel im CDN-Paket.

**Folgesessions:** [S28: CDN-Varianten und Region getrennt prüfen](sessions/s28-cdn-architektur.md); [S29: Einen freigegebenen CDN-Versuch isoliert bauen](sessions/s29-cdn-versuch.md); [S31: Technische Wirkung und Kosten nachbeobachten](sessions/s31-technik-nachbeobachtung.md).

<a id="t3"></a>

### T3 – Warme Instanz und laufende Kosten

**Status: Entscheidung nötig.** Ursprüngliche Bewertung: Schwere mittel, Aufwand klein, Sicherheit wahrscheinlich (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** minInstances 0 und vermutete Kaltstartlatenz; Empfehlung: eine dauerhaft warme Instanz.

**Heutiger Abgleich:** minInstances bleibt 0 bei 1024 MiB. Historische Warte-/Kostenwerte sind keine aktuelle Messung oder belastbare Rechnung; insbesondere die alte CPU-Annahme war ungeprüft.

**Konkreter Beleg:** [nextjs/apphosting.yaml:4](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/apphosting.yaml#L4); [nextjs/apphosting.yaml:7](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/apphosting.yaml#L7); E07 2026-11-21T13:49:25.096Z.

**Restarbeit/Grenzen:** Tatsächliche Abrechnungsart/CPU/Region lesen, aktuelle Preisquelle verwenden und Kalt-/Warmvergleich ohne Konfigurationsänderung planen. Eigenes monatliches Budget entscheiden.

**Abnahme:** Kostenannahmen und Freigabe explizit; bei späterer Änderung reproduzierbare Erstaufrufmessung und Kosten-/Fehler-Nachbeobachtung. Keine Kostensenkung/-steigerung ohne Beleg behaupten.

**Folgesessions:** [S27: Warme Instanz belastbar kalkulieren](sessions/s27-hosting-kosten.md); [S30: Eine warme Instanz nur nach Budgetfreigabe](sessions/s30-warme-instanz.md); [S31: Technische Wirkung und Kosten nachbeobachten](sessions/s31-technik-nachbeobachtung.md).

<a id="t4"></a>

### T4 – Mail-Bildgrößen

**Status: erledigt.** Ursprüngliche Bewertung: Schwere mittel, Aufwand klein, Sicherheit wahrscheinlich (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Große Mailbilder verursachen viel Download, ggf. beide Layoutvarianten. Empfehlung: passende Kompression bei erhaltener Mailtauglichkeit.

**Heutiger Abgleich:** c748ac0d/#1409 stellt passende Motive auf JPEG. Heutige Dateigrößen in Bytes: Papier 100510, Signup 219961/120042, Login 103894/55561. Testbudget: Papier <200 KB, Artwork <300 KB, HTML <100 KB. Echte Gmail-/Apple-Mail-/Outlook-Abnahme ist nicht neu belegt.

**Konkreter Beleg:** [nextjs/scripts/build-email-art.mts:22](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/scripts/build-email-art.mts#L22); [nextjs/emails/components/Shell.tsx:21](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/emails/components/Shell.tsx#L21); [nextjs/emails/theme.ts:29](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/emails/theme.ts#L29); [nextjs/emails/__tests__/authEmails.test.ts:11](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/emails/__tests__/authEmails.test.ts#L11); E02 #1409; E07 2026-11-21T11:01:47.232Z.

**Restarbeit/Grenzen:** Keine Wiederimplementierung. Historische Mailclient-Lücke bei passender späterer Mail-Session begrenzt prüfen. Markenfont bleibt lokal; keine Laufzeit-Mailbildroute.

**Abnahme:** Größenbudgets und echter CTA mit Alt-Text erhalten; bei späterer Mailänderung build:email-art und freigegebene DE-/EN-Mailclient-Prüfung.

**Folgesessions:** [S24: Mail-Vorlage und echte Mailclient-Prüfung](sessions/s24-mail-vorlage-clientcheck.md).

<a id="t5"></a>

### T5 – Web Vitals

**Status: teilweise.** Ursprüngliche Bewertung: Schwere mittel, Aufwand mittel, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Eigene Felderfassung von LCP/INP/CLS fehlte. Empfehlung: eigener Zähler und Admin-Auswertung.

**Heutiger Abgleich:** 7fb2cc37/#1411 implementiert Reporter, validierte Histogramme und Median/P75 je Seitentyp/Gerät. Quantile sind Stufenobergrenzen. Belastbarer heutiger Feldnachweis bleibt offen; CrUX war zuletzt zu klein. Live-Lighthouse des aktuellen SHA hat deutliche Warnungen (E08).

**Konkreter Beleg:** [nextjs/app/components/WebVitalsReporter.tsx:3](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/WebVitalsReporter.tsx#L3); [nextjs/app/api/count/route.ts:316](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/api/count/route.ts#L316); [nextjs/lib/analytics/webVitals.ts:108](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/analytics/webVitals.ts#L108); [nextjs/app/components/admin/stats/reports/Vitals.tsx:42](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/admin/stats/reports/Vitals.tsx#L42); E02 #1411; E08.

**Restarbeit/Grenzen:** Erfassung/Plausibilität und Stichproben lesend prüfen, Labordiagnose getrennt; nach echten Releases mit denselben Seitentypen nachbeobachten.

**Abnahme:** Zeitraum/Anzahl/Histogrammgrenzen dokumentiert; LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1 anhand ausreichender Felddaten oder ausdrücklich kein Urteil. TBT nie als Feld-INP ausgeben.

**Folgesessions:** [S03: Feldmessung und Sentry-Nachweise lesen](sessions/s03-messbasis-sentry.md); [S13: Verbleibende Performance-Ursache bestimmen](sessions/s13-performance-diagnose.md); [S14: Ein belegtes Performance-Paket umsetzen](sessions/s14-performance-ein-paket.md); [S31: Technische Wirkung und Kosten nachbeobachten](sessions/s31-technik-nachbeobachtung.md).

<a id="t6"></a>

### T6 – Unnötiges JavaScript

**Status: teilweise.** Ursprüngliche Bewertung: Schwere mittel, Aufwand mittel, Sicherheit wahrscheinlich (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Viel JS auch auf Leseseiten; Empfehlung: GSAP und ggf. Firebase-Login später laden, vor/nachher messen.

**Heutiger Abgleich:** f2de1280/#1413/#1415 lädt Herz-/Magazin-/Artikelszenen und bestimmte Prefetches nach Bedarf. Vergleich gleicher Produktionsseiten: Spot 357228→302396 gzip Bytes (−15,35 %), Artikel 327418→294860 (−9,94 %), je 390/1440 px mit drei frischen Läufen. Lokales LCP kaum verändert. Firebase-Auth bleibt bewusst eager.

**Konkreter Beleg:** [nextjs/app/components/HeartDraw.tsx:33](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/HeartDraw.tsx#L33); [nextjs/app/components/MagazineLink.tsx:55](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/MagazineLink.tsx#L55); [nextjs/app/components/ArticleMotion.tsx:20](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/ArticleMotion.tsx#L20); [nextjs/app/components/SiteChrome.tsx:64](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/components/SiteChrome.tsx#L64); [nextjs/e2e/reading-javascript.spec.ts:3](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/e2e/reading-javascript.spec.ts#L3); E02 #1413.

**Restarbeit/Grenzen:** Keine ungeprüfte Auth-Verzögerung oder pauschales weiteres Lazy Loading. Erst verbleibende CPU-/LCP-Ursache bestimmen, dann genau ein belegtes Paket.

**Abnahme:** Gleiche Seiten/Geräte/Buildart vor/nachher; Bytes, LCP, Main-Thread getrennt; Inhalte sofort sichtbar, Sitzung/Herzen/Reduced Motion regressionsfrei.

**Folgesessions:** [S13: Verbleibende Performance-Ursache bestimmen](sessions/s13-performance-diagnose.md); [S14: Ein belegtes Performance-Paket umsetzen](sessions/s14-performance-ein-paket.md); [S31: Technische Wirkung und Kosten nachbeobachten](sessions/s31-technik-nachbeobachtung.md).

<a id="t7"></a>

### T7 – Sentry-Rauschen und Source Maps

**Status: teilweise.** Ursprüngliche Bewertung: Schwere mittel, Aufwand klein, Sicherheit wahrscheinlich (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Minifizierte/fehlende Source-Maps und Fremdrauschen erschweren Diagnose. Empfehlung: Upload prüfen, eng filtern, Issues einzeln bereinigen.

**Heutiger Abgleich:** df4885cf/#1409 verbessert Titel/Filter/Uploadfehler. Später laut übergebenem Nachweis 3 moderne Artifact Bundles/516 Dateien für aa156ce2; dieser Bundle-Nachweis wurde in Session 1 nicht neu direkt aus Sentry gelesen. Echte Symbolikation eines neuen Produktionsfehlers weiterhin unbelegt; keine Issues geschlossen.

**Konkreter Beleg:** [nextjs/sentry.server.config.ts:20](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/sentry.server.config.ts#L20); [nextjs/next.config.ts:221](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/next.config.ts#L221); [nextjs/lib/http/cspReport.ts:22](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/http/cspReport.ts#L22); [nextjs/lib/sentry/beforeSend.ts:42](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/sentry/beforeSend.ts#L42); [nextjs/app/api/csp-report/route.ts:24](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/api/csp-report/route.ts#L24); E02 #1409; E07; E09.

**Restarbeit/Grenzen:** Release-/Debug-ID-Zuordnung und vorhandenes passendes neues Event lesend prüfen. Ohne neues Event Grenze offen lassen; keinen Produktionsfehler ungefragt auslösen. CSP bleibt Report-Only.

**Abnahme:** Neues Event zeigt erwartete Quelldatei/Zeile auf bekanntem Release oder Symbolikation bleibt nicht belegt; Fremdfilter lassen echte Appfehler durch.

**Folgesessions:** [S03: Feldmessung und Sentry-Nachweise lesen](sessions/s03-messbasis-sentry.md); [S31: Technische Wirkung und Kosten nachbeobachten](sessions/s31-technik-nachbeobachtung.md).

<a id="t8"></a>

### T8 – Pauschaler Umbau des Bildoptimierers

**Status: nicht mehr zutreffend.** Ursprüngliche Bewertung: Schwere niedrig, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Original schloss aus Cache-Misses, eigene optimierte Bilder würden nie gecacht, und empfahl direkte WebP-Dateien.

**Heutiger Abgleich:** Technik-Folgesession widerlegte die pauschale Annahme: Optimierte Varianten wurden gecacht; direkte Datei war im Gegenvergleich deutlich schwerer. Optimierer bleibt aktiviert, Mindestcache 86400 s. Heute wurden nicht alle Bildpfade nachgemessen.

**Konkreter Beleg:** [nextjs/next.config.ts:79](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/next.config.ts#L79); [nextjs/next.config.ts:83](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/next.config.ts#L83); E07 2026-11-21T10:19:44.397Z.

**Restarbeit/Grenzen:** Kein globales unoptimized. Nur bei aktuellem konkretem LCP-/Netzwerkbefund einzelne Varianten nach Größe, Qualität, Accept, Erst-/Wiederholungsantwort prüfen.

**Abnahme:** Ohne heutigen Problembeleg kein Umbau; eine spätere Einzeländerung muss responsive Bytes/Qualität/Cache reproduzierbar verbessern.

**Folgesessions:** [S13: Verbleibende Performance-Ursache bestimmen](sessions/s13-performance-diagnose.md).

<a id="t9"></a>

### T9 – Angemeldete Browserwege und Stripe

**Status: teilweise.** Ursprüngliche Bewertung: Schwere mittel, Aufwand mittel, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Original meldete keine echten angemeldeten E2E und empfahl Auth-Emulator plus Kernwege und Stripe-Testmodus.

**Heutiger Abgleich:** 17beaf44/#1413/#1415 deckt echten lokalen E-Mail-Link, Starter/Wunschkarte/Einmaligkeit, Herz-Transaktion/Persistenz und Nearby-Reveal ohne Kauf ab. Auth/Firestore/Storage-Emulatoren echt; Produktionsregeln nur für Firestore, Storage nutzt eigene deny-all-Testregeln und synthetische Daten. HTTPS-Proxy ermöglicht Secure-Cookies in WebKit. Stripe-Kauf/Weiterleitung ist dadurch nicht lückenlos abgedeckt.

**Konkreter Beleg:** [firebase.e2e.json:2](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/firebase.e2e.json#L2); [firebase.e2e.json:3](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/firebase.e2e.json#L3); [nextjs/e2e/storage.rules:5](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/e2e/storage.rules#L5); [nextjs/e2e/account-fixture.ts:9](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/e2e/account-fixture.ts#L9); [nextjs/e2e/account-flows.spec.ts:8](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/e2e/account-flows.spec.ts#L8); [nextjs/e2e/account-flows.spec.ts:75](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/e2e/account-flows.spec.ts#L75); [nextjs/e2e/README.md:29](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/e2e/README.md#L29); E03.

**Restarbeit/Grenzen:** Separate kleine Stripe-Testmodus-Session: zugesagten Weiterleitungs-/Abbruch-/Erfolgs-/Webhook-Umfang ausdrücklich abgrenzen. Reale Zahlungen/Konten ausschließen.

**Abnahme:** Jeder behauptete Stripe-Teil hat Testmodusbeleg; fehlende Credential-/Webhook-Prüfung bleibt offen. Bestehende Konto-E2E und benannte Geräte-Skips bleiben korrekt.

**Folgesessions:** [S07: Stripe-Wege im Testmodus belegen](sessions/s07-stripe-testmodus.md).

<a id="t10"></a>

### T10 – Mail-Ratenlimit bei Firestore-Ausfall

**Status: erledigt.** Ursprüngliche Bewertung: Schwere niedrig, Aufwand klein, Sicherheit sicher (historisch, keine neue Prioritätsbewertung).

**Ursprüngliche Aussage/Empfehlung:** Fail-open-Ratenlimit ließ bei Datenbankausfall Mailanfragen ungebremst. Empfehlung: begrenzte In-Memory-Notbremse.

**Heutiger Abgleich:** 1299c040/#1409 ergänzt begrenzte Zähler je Prozess (maximal 5000 Schlüssel), Fenster/Bereinigung und Tests bei Datenbankausfall. Mailroute limitiert je E-Mail 3/Stunde und IP 10/Stunde. Diese Notbremse ist nicht global instanzübergreifend synchronisiert; kein Produktionsausfalltest erfolgt.

**Konkreter Beleg:** [nextjs/lib/rateLimit.ts:61](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/rateLimit.ts#L61); [nextjs/lib/rateLimit.ts:99](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/rateLimit.ts#L99); [nextjs/lib/rateLimit.test.ts:62](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/lib/rateLimit.test.ts#L62); [nextjs/app/api/auth/send-magic-link/route.ts:108](https://github.com/erkute/eat-this/blob/aa156ce26bbcd29c9cb16f7227b552465b621366/nextjs/app/api/auth/send-magic-link/route.ts#L108); E02 #1409; E07 2026-11-21T11:01:47.232Z.

**Restarbeit/Grenzen:** Keine neue Umsetzung aus dem Altbefund. Regressionstests bei späteren Mail-/Limiteränderungen erhalten, niemals produktive Firestore-Verbindung für eine Probe abschalten.

**Abnahme:** Bei einschlägiger Änderung bestehende Ausfall-/Überschreitungs-/Ablaufprüfungen grün, Grenze pro Instanz bleibt dokumentiert.

**Folgesessions:** [S23: Freiwillige Anmeldung mit Double-Opt-in](sessions/s23-newsletter-doi.md); [S31: Technische Wirkung und Kosten nachbeobachten](sessions/s31-technik-nachbeobachtung.md).
