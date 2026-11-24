# Eat This Übergabe Angebot und Stimme

24.11.2026. S04 arbeitet ausschließlich an P1 P2 P3 P4 P5 P7 W2 W3 W4. Ergebnis und DE-/EN-Varianten: [Entscheidungsblatt](entscheidungsblatt.md).

- Branch `claude/s04-angebot-begriffe-stimme`, Basis `70a06a83bdcfcd3b06cc28d2348c48dec76d7232`, origin/staging. Remote-main `aa156ce26bbcd29c9cb16f7227b552465b621366`, gleicher Dateistand, Release #1415. Rollout SUCCEEDED, Build READY mit diesem Main-SHA frisch geprüft.
- S04 lieferte das Entscheidungsblatt und diese Übergabe.
- D1 Hero, D2 Anlass-Texte/Begriffe, D3 Zahlenanzeige, D4 Preislogik, D5 Stimme, D6 freiwilliger Entfernungshinweis, D7 Spot-Pfad in diesem Chat getrennt gefragt; Antworten noch ausstehend. Keine Annahmen aus Schweigen.
- Starter: einmal max. 20 noch verdeckte IDs; gültige Wunschkarte darin enthalten. Kleiner Restbestand ergibt weniger, erneute Anmeldung kein zweites Pack. Empfehlung Preise/Rewards unverändert.
- Zahlenanzeige widerspricht bewusst geltenden Kommentaren in beiden Pack-Seiten und packDetail.ts. Erst nach ausdrücklicher Produktentscheidung ändern.
- Pack-Aufteilung muss mit eindeutigen Karten-IDs und tatsächlicher Sichtbarkeit rechnen; Gäste nicht als bekannte Konten behandeln. Kategorie/All Berlin beinhalten später ergänzte Karten. Preiswartephase ist ein UI-Mangel, kein Beleg für Kaufursachen.
- P5 braucht redaktionelle Prüfung je Spot; drei historische Beispiele belegen keinen allgemeinen Fehler. Keine geschützten Kartendaten abgefragt oder kopiert.
- 4 Vitest-Dateien / 43 Tests grün: Starter, Starter-API, Reveal-API, Karten-Interaktion. Mock-Tests, keine Live-Schreibtests. Keine neuen Build-/UI-/Performanceprüfungen bei reinen Dokumenten. S02 unveröffentlicht, S03 abgeschlossen, Feld-Vitals ohne Urteil laut Auftrag.
- Spätere Umsetzung erst im ausdrücklich beauftragten Umfang. Vor Commit/Push Review, Pflichtchecks; sichtbare Änderungen nach Repo-Regeln Telefon/Desktop und Reduced Motion prüfen. Keine Veröffentlichung aus dieser Vorlage ableiten.
