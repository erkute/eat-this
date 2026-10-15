# Must-Eat-Karten: von Figma in die App

Stand 15.10.2026. Gilt für neue Karten und für Änderungen am Kartendesign.

## Wo die Karten liegen

- Figma-Datei **„Eat This“** (`p5XEjPCeGlgtXxhreeIgnB`), Seite **„Must Eats“**.
- Die Komponente **„Main“** ist die Banh-Mi-Karte (001). Jede andere Karte ist eine **Instanz** davon.
- Die Kartennummer unten rechts ist `mustEat.order` in Sanity. Sie läuft fortlaufend, ohne Lücken und ohne Doppelte.
- Eine Karte ist genau ein Must Eat an genau einem Spot. Keine eigenen Datensätze pro Filiale: Sie erscheinen im Profil-Deck mehrfach.

## Die Grundregel: Gestaltung nur in Main

Schrift, Schriftgröße, Positionen, Ecken, Fotorahmen und Ebenen werden **nur in Main** geändert. Dann übernehmen alle Karten die Änderung.

Auf einer einzelnen Karte ändert man nur ihren Inhalt:

| Ebene in der Karte | Inhalt |
| --- | --- |
| `Savoir` | Restaurant |
| `banh mi Vegan` | Gericht (Titel) |
| `Baguette, tofu, …` | Beschreibung, englisch, so wie sie auf der Karte steht |
| `001` | Kartennummer |
| `Schöneberg` | Bezirk |
| `Gemini_Generated_Image…` | Foto (Bildfüllung) |
| `Rectangle 13` / `Rectangle 14` | Rahmenfarbe / Flächenfarbe |

Alles andere auf einer Karte zu ändern, bricht die Vererbung für genau diese Eigenschaft. Das gilt auch für scheinbar harmlose Dinge: eine kleinere Titelgröße für einen langen Namen oder eine andere Schrift beim Eintippen. Danach zieht diese Karte bei einer Änderung an Main nicht mehr mit. Passt ein Titel nicht, wird Main angepasst (für alle) oder der Titel gekürzt.

Am 15.10.2026 hatten deshalb 14 von 38 Karten eine eigene Titelschrift oder -größe und mussten zurückgesetzt werden.

## Neue Karte anlegen

1. **Foto freistellen.** Das macht Ersan selbst in Figma mit „Hintergrund entfernen“. Das ist besser als automatische Freisteller wie `Cards/cutout.swift` (Apple Vision) und lässt sich über die Schnittstelle nicht auslösen. Ablauf: Originalfotos in eine Section legen, Ersan stellt sie frei, danach übernimmt Claude das freigestellte Rohbild in voller Auflösung (`download_assets` → `rawImages`). Es wird die Bildfüllung des Fotorahmens.
2. **Karte als Instanz von Main anlegen.** Eine bestehende Karte duplizieren (⌘D) oder eine Instanz aus Main ziehen. **Nie „Detach instance“.** Neue Karten kommen ans Ende der untersten Reihe.
3. **Inhalt setzen:** die fünf Texte, das Foto, beide Farben. Keine Schrift, keine Größe, keine Position.
4. **Texte tippt Ersan in Figma Desktop.** Claude kann über die Figma-Schnittstelle Karten duplizieren, Fotos und Farben setzen, aber keine Texte: Dort fehlen die Markenschriften (Providence Sans Pro, Profile Pro). Texte, die Claude setzen soll, gehen nur über ein lokales Entwickler-Plugin, das Ersan in Figma startet.

## Prüfen, ob die Vererbung intakt ist

Claude liest die Overrides aller Instanzen von Main über die Figma-Schnittstelle aus. Erlaubt sind nur diese Felder:

- `characters`, `styledTextSegments`: die Texte
- `fills` auf Foto und den beiden Farbflächen
- `exportSettings`, `locked`

Taucht etwas anderes auf (z. B. `fontName`, `fontSize`, `visible`, `opacity`), ist die Karte für diese Eigenschaft abgekoppelt. Einzeln zurücksetzen lässt sich so ein Override nicht, auch wenn der Wert gleich ist wie in Main. Es hilft nur, die Karte zurückzusetzen und den Inhalt neu zu setzen.

## Karten in die App bringen

Die App zeigt nicht die Figma-Datei, sondern exportierte Bilder. **Jede Änderung an Main oder an einer Karte ist erst nach Export und Einspielen live.**

1. **Export:** PNG in doppelter Größe (1026 × 1410), die Export-Einstellung steht auf jeder Karte. Ein Ordner, Dateiname = Kartennummer: `001.png`, `002.png`, …
   Ohne Ersan exportiert Claude so: temporäre, doppelt große Kopien auf einer Hilfsseite, davon Screenshots in voller Größe, danach die Hilfsseite löschen. Der Screenshot der Schnittstelle liefert höchstens die einfache Größe.
2. **Zuordnung:** `nextjs/scripts/data/must-eat-cards.json` hält pro Karte `order`, `file`, `spot`, `dish`, `descriptionEn` (Wortlaut der Karte) und `description` (deutsche Übersetzung).
3. **Neue Karte** (Sanity-Dokument und Firestore-Datensatz gibt es noch nicht): `scripts/curate-must-eats.ts --spec <json> --cards <ordner>`, erst `--dry-run`, dann `--apply`. Das legt Firestore, Storage und einen **Sanity-Draft** an. Publiziert wird nur auf Ersans „setz das live“.
4. **Geänderte Bilder oder Texte** bestehender Karten: aus `nextjs/`
   ```
   npx tsx scripts/replace-must-eat-cards.ts --cards <ordner> --dry-run
   npx tsx scripts/replace-must-eat-cards.ts --cards <ordner> --apply
   ```
   Der Probelauf muss jede Karte zuordnen (z. B. „39 von 39 Karten“). Nach `--apply` meldet ein zweiter Probelauf `changed: 0`.
5. **Aufräumen** (optional): `scripts/prune-must-eat-images.ts --dry-run`, dann `--apply`. Das löscht alte Bilder, auf die nichts mehr zeigt, und prüft danach jede Karte. Danach gibt es keinen schnellen Rückweg zu den alten Bildern mehr.

Alle drei Skripte arbeiten mit `.env.local`, also auf **prod**.

## Nach dem Publizieren

Der Sanity-Webhook wartet, bis das CDN die Spot-Seite der Karte frisch liefert, und erneuert sie dann (seit 15.10.2026). Trotzdem `/restaurant/<slug>` und `/en/restaurant/<slug>` abrufen, bevor „live“ gemeldet wird. Kartenbilder sieht nur, wer angemeldet ist; als Gast bleibt die Karte verdeckt. Bilder können wegen Caching bis zu eine Stunde brauchen, bis sie überall neu sind.

## Schreibweise

„Must Eat“ immer ohne Bindestrich, auch in „Must Eat Karte“. Ein Spot kann mehrere Must Eats haben.
