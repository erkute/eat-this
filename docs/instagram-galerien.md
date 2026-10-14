# Eat This: Instagram-Galerien

Stand: 13. Oktober 2026. Arbeitsgedächtnis für neue Sessions; kein Veröffentlichungsauftrag.

## Einstieg für eine neue Session

Diese Datei bei neuen Restaurant-Carousels oder Änderungen am Ari’s-Post lesen. Zuerst die unten verlinkten Vorschauen öffnen, dann den jeweiligen Renderer und das Manifest lesen. Ersans aktuelle Anweisungen haben Vorrang. Die Regeln für redaktionelle Texte stehen in `docs/texte-schreiben.md`; vor neuen Texten vollständig lesen.

## Verbindlicher Arbeitsstand

- Deutsch: `output/aris-connected-v8/`.
- Englisch: `output/aris-connected-en-v4/` – Übersetzung der fertigen deutschen v8, ohne die später nur vorgeschlagenen Textänderungen. EN v4 korrigiert zusätzlich den Cover-Abstand: beide Headline-Zeilen wurden gegenüber v3 um 44 px nach oben gesetzt (Grundlinien 236 und 432 px), entsprechend der zuvor sichtbaren Gazzo-Referenz. EN v3 setzte auf Ersans Wunsch EAT THIS oben links in kleiner weißer Providence wie auf dem Gazzo-Cover. Die grafische Wortmarke aus EN v2 wurde dort wieder entfernt.
- Beide haben acht Slides, 1080 × 1350 px, Reihenfolge über Dateinamen.
- Je Ordner: `render.py`, `manifest.json`, `vorschau.jpg`, `verbundene-slides.jpg`, `png/`, `jpg/`, `svg/`, `assets/` und ZIP.
- ZIP Deutsch: `Aris-Eat-This-8-Slides.zip`; Englisch: `Aris-Eat-This-8-Slides-English.zip`.
- Die englische Fassung wurde gerendert und visuell geprüft. Eine abschließende Freigabe durch Ersan ist noch nicht dokumentiert.
- Frühe v3–v7 sind Zwischenstände, nicht als aktuelle Vorlage ausgeben. Die alte Adobe-Express-Datei ist ebenfalls nicht der finale Stand.

## Gestaltung und Entscheidungen von Ersan

**Providence überall.** Ursprünglich war „032c“/Neue Haas für Beschreibungen vorgesehen; die spätere Anweisung hat das ersetzt. Headlines in Providence Bold, Beschreibung und Bildnachweis in Providence Regular. Nur das bestehende Eat-This-Logo bleibt seine eigene Wortmarke.

Lokale Fontdateien:

- `nextjs/assets/fonts/ProvidenceSansPro-Bold.otf`
- `nextjs/assets/fonts/ProvidenceSansPro-Regular.otf`

Die lizenzierten Fonts werden nicht ins Git-Repository, auf den Server oder in Exportpakete kopiert. Bei fehlenden Fonts nicht still auf eine andere Schrift wechseln. Im Projekt gibt es `npm run sync:brand-font` aus `nextjs/` zum Holen der aktivierten Creative-Cloud-Schrift.

Gestaltungsreferenz ist Ersans Gazzo-Galerie. Randlose Originalfotos, große weiße Handschrift, kontrollierte Freisteller und wiederkehrende Flächen. Alles hat einen klaren Platz. Essen nicht durch erfundene Bilder ersetzen. Interior gehört zur Geschichte. Zwei aufeinanderfolgende Slides dürfen dasselbe Foto nahtlos fortsetzen; das ist ein gemeinsamer Bildausschnitt, keine Wiederholung des Bildes.

Farben aus dem aktuellen Renderer:

- Ink `#15120e`
- Weiß `#fffdf7`
- Rot `#d73526`

Headlines meist 100–182 px, Beschreibung 39–46 px, linker Rand meistens 64 px. Das sind Ausgangswerte: Englisch braucht andere Zeilenumbrüche. Auf Bildflächen liegt bei Bedarf ein dunkler Verlauf für weiße Schrift. Ausrichtung und Textbreite visuell prüfen.

**Freisteller:** Lima Kreuzburger und Salat auf derselben roten Fläche, gleiche weiße Providence-Hierarchie. Salat mit Teller und vollständigem Besteck; Tisch und Umgebung entfernt. Ein Produkt pro Hero-Slide. Für den zweiten Burger das andere Gericht nehmen, hier Trad als Double.

**Finale:** Die originale Gazzo-Slide mit Eat This, Remy, Smartphone-Map und `eatthisdot.com` wurde unverändert übernommen. Auf dem Cover steht EAT THIS in Providence Bold, weiß, 35 px mit 4 px zusätzlichem Buchstabenabstand; x=64, Grundlinie y=82. Referenz ist Gazzo Slide 1. Die grafische Bubble-Wortmarke ist auf dem Cover verworfen, bleibt aber Teil des unveränderten Finales. Kein zusätzliches kleines Eat This am Fuß jeder Foto-Slide. Der Benutzer wollte Eat This als bewusstes Design-Element und auf der letzten Slide, nicht als repetitive Fußzeile.

Verworfen wurde eine abweichende Churros-Seite mit cremefarbigem Titelkasten und rotem runden Schokosoßen-Sticker. Die Churros sind wieder eine randlose Fotoseite mit weißer Schrift und kurzem Beschreibungstext. Auch ein einfaches Salatfoto im roten Rechteck wurde durch den echten Freisteller ersetzt.

## Aktueller Aufbau

| Slide | Inhalt | Layout |
|---|---|---|
| 1 | Ein Abend bei Ari’s / An evening at Ari’s | Randloses Interior, große weiße Headline |
| 2 | Lima. New York. Kreuzberg. | Links Fortsetzung des Interiors, rechts Ink mit Geschichte und Soßen |
| 3 | Diner wie im Kino / A diner from the movies | Pulp-Fiction-Filmbild, Filmnachweis und Bezug aus dem Artikel |
| 4 | Lima Kreuzburger | Freigestellter Burger auf Rot |
| 5 | Trad als Double | Anderes Burgerfoto, randlos, weiße Texte |
| 6 | Spicy Green Goddess | Freigestellter Salatteller auf Rot, drei Beschreibungszeilen |
| 7 | Churros mit Schokosoße | Randloses Foto, weiße Headline, kurzer Ari’s-Text unten |
| 8 | Eat This / Find your next favourite spot | Original-Gazzo-Finale mit Remy und Map |

Für zukünftige Restaurants muss es nicht bei acht Slides bleiben: Ersan hat ausdrücklich mehr Slides erlaubt. Die Geschichte bestimmt die Zahl. Vollständige englische Fassungen sinngemäß übersetzen, ohne neue Aussagen oder neue Pointen. Britisches Englisch; Gerichtenamen bleiben erhalten. „Diner“ ist das Lokal, „dinner“ das Abendessen.

## Redaktionelle Entscheidungen

Ersan möchte natürliches, konkretes Deutsch und keine erzwungenen Sprüche wie „Die Kartoffeln sind schon drin“. Mehr über den Laden erzählen: Raum, Menschen, Herkunft und was die Küche ausmacht. Fakten aus dem tatsächlichen Artikel und den Quellen lesen, keine Geschmacksbeschreibungen erfinden.

Ari’s-Artikel: Arianna Plevisani wuchs in Lima auf, lebte in New York und eröffnete ihr Restaurant in einer ehemaligen Garage in der Glogauer Straße. Amerikanischer Diner mit peruanischen Einflüssen, Ají-Amarillo- und Ají-Verde-Soßen. Trad mit Fleisch/Käse/Tomate/Salat/Hausmayo, Foto als Double. Lima Kreuzburger mit Kartoffelstäbchen und Ají Amarillo. Spicy Green Goddess mit Eisbergsalat, Kräuterdressing, Crispy Chili und Schnittlauch. Der Artikel bewertet den Salat als Höhepunkt. Bei Churros ist nur „mit Schokosoße“ beschrieben; zusätzliche Angaben zu Konsistenz oder Rezept sind nicht belegt.

Nach einer Textprüfung wurden alternative Fassungen für 2, 3 und 7 vorgeschlagen (weniger Wiederholung von Lima/New York). Ersan wollte ausdrücklich die bereits fertigen Slides unverändert auf Englisch. **Diese Vorschläge sind nicht übernommen.** Auch der danach vorgeschlagene neue Kino-Text mit Burgern/Pommes wurde nicht übernommen.

## Quellen und lokale Dateien

Projektwurzel auf diesem Rechner: `/Users/ersane/Downloads/Projekte/Eat This Neu`.

Originalreferenz: `/Users/ersane/Downloads/Eat-This-Gazzo-5-Slides-v5/`; Finale: `png/05-eat-this-map.png`. Die konkrete ursprüngliche Erzeugung dieser Gazzo-Dateien ließ sich nicht vollständig rekonstruieren. Nicht behaupten, den exakten alten Produktionsweg zu kennen.

Ari’s in Sanity:

- Projekt `ehwjnjr2`, Dataset `production`
- Artikel-ID `3d22a302-9826-4b79-afb9-26c90dc6adc5`
- Slug `aris-berlin-burger-kreuzberg`
- Titel „Ari’s: Ein Stück Amerika, das es so nie gab“
- Restaurant `restaurant-ari-s`
- Restaurantfotos in der Galerie: Credit Eat This, URL `https://www.eatthisdot.com/`

Quellen-Assets unter `https://cdn.sanity.io/images/ehwjnjr2/production/`:

- Interior: `f00a8162a2453db531e3a939718ff8697ec6aec2-3024x4032.jpg`
- Burger-Quelle für Freisteller: `105388443b9ce7e779b267b187e04e4f3583a804-1122x1402.png`
- Trad Double: `7d09ae50deadc366ced7eb2241a16127d7667c6b-1025x1535.webp`
- Lima weiteres Foto: `42591747852250d8e4ab2dab97af4cde2dc45159-1335x2000.webp`
- Salat: `551a1ef4eeef2bc53db1cb7afe129dfd41d35c24-1024x1536.png`
- Churros: `cfc3c27c8d1e2ec0606609567341ecd8058d1a09-1335x2000.webp`

`output/aris-instagram/assets/` enthält die Originalbilder `cover.png`, `lima.webp`, `salat.png`, `churros.webp`. Die aktuellen Renderer greifen für Salat/Churros auf diesen Ordner zu. Den Ordner bei Archivierung mitnehmen.

Der aktuelle `assets/`-Ordner enthält `interior.jpg`, `trad-double.webp`, `burger-only.png`, `salad-cutout.png` und `pulp-fiction.png`. Die Datei `pulp-fiction.png` wurde von Ersan ausdrücklich bereitgestellt und für diese Galerie ausgewählt; Filmnachweis auf Slide 3: Pulp Fiction (1994). Das Filmbild ist kein Eat-This-Restaurantfoto. Bei anderen Posts nicht automatisch wiederverwenden.

## Produktionsweg

1. Aktuelle Referenz-Vorschau ansehen und Artikel vollständig aus Sanity lesen. Nur die benötigten Fakten/Originalfotos übernehmen. Für ein anderes Restaurant Quellen neu prüfen.
2. Adobe MCP für Bildarbeit verwenden. Der Nutzer bevorzugt diesen Weg und hat die Kombination aus Adobe-Freistellern und lokalem Layout ausdrücklich akzeptiert. Nicht wieder die verworfene Adobe-Express-Browserdatei bearbeiten.
3. Nach Tool-Discovery das Adobe-Init gemäß dessen Session-Regeln lesen. Tool-Schemas frisch abrufen. Für vorhandene Bilder Creative Cloud durchsuchen oder lokale Originale hochladen. Asset-IDs sind beständig, signierte URLs nicht.
4. Für Freisteller zuerst Adobe `image_crop_and_resize` mit `fit: extract` und konkretem Objekt-Prompt, danach `image_remove_background`. Beschnitt prüfen, insbesondere Besteck und Tellerrand. Originalfoto-Pixel erhalten; keine erfundenen Gerichte. Adobe-Suchvorschauen können nur 480 px groß sein: für Verarbeitung über `asset_get_presigned_urls` das Original auflösen und die Quellmaße kontrollieren.
5. Bearbeitete Bilder lokal im neuen versionierten Ausgabeordner sichern. Typografie/Komposition über den vorhandenen `render.py` reproduzieren. Ausführen aus der Projektwurzel: `python3 output/<neuer-ordner>/render.py`. Der Renderer erwartet diese Verzeichnistiefe. Er nutzt Pillow ausschließlich für den bereits vereinbarten lokalen Layout-/Exportweg; die Freistellung kommt von Adobe.
6. Neue Version in eigenem Ordner anlegen; vorigen Stand erhalten. PNG/JPG und SVG mit editierbarem Text exportieren. SVG braucht lokal die echten Fonts; keine Fontdateien beilegen. Das Finale ist ein unverändertes Rasterbild.
7. Alle geänderten Slides in voller Größe ansehen, danach die Gesamtübersicht. Textgrenzen, Kontrast, Bildauflösung, Beschnitt und Abstände prüfen. Deutsche/englische Texte auf Vollständigkeit vergleichen. Änderungen an einer Slide dürfen andere Slides nicht unbeabsichtigt ändern.
8. Seam-Test: ein gemeinsames 1440 × 1350 px Interior-Raster wird bei x=1080 geteilt; Slide 2 zeigt die verbleibenden 360 px links. Der Renderer prüft den pixelgenauen Anschluss.
9. PNG/JPG/SVG, Manifest, README und die verbundene Vorschau als ZIP liefern; zusätzlich alle Slides auf Wunsch inline zeigen. Keine Veröffentlichung auf Instagram und keine Änderungen am Sanity-Artikel allein aus einem Gestaltungsauftrag ableiten.

Adobe-Asset-IDs für erneutes Auflösen:

- Burger-Original: `urn:aaid:sc:EU:868728de-674a-4589-9b99-1a46fcfb0d1c`
- Salat-Original: `urn:aaid:sc:EU:47efd422-c128-4cf8-9b22-e50e496b18f8`

Die vorhandenen lokalen Freisteller sind wiederverwendbar. Der Salat-Crop hat unten zusätzlichen Rand bekommen, damit die Besteckgriffe vollständig bleiben. Die temporären Adobe-Ausgabe-URLs sind kein Archiv.

## Exakte Texte des aktuellen Stands

Die folgenden Texte stammen aus den Manifesten der tatsächlich exportierten Fassungen; Zeilenumbrüche können beim nächsten Format angepasst werden.

### Deutsch

**Slide 1**

Ein Abend  
bei Ari’s  

**Slide 2**

Lima.  
New York.  
Kreuzberg.  
Eine ehemalige Garage  
in der Glogauer Straße,  
Sitznischen und weiße Tische:  
Arianna Plevisani bringt  
hier Lima und New York  
in einem Diner zusammen.  
Zu Burgern und Pommes  
kommen peruanische Soßen:  
Ají Amarillo und Ají Verde  
stehen neben Ranch  
und Knoblauch-Hausmayo.  

**Slide 3**

Diner wie  
im Kino.  
Filmszene: Pulp Fiction (1994)  
Sitzbänke, Ketchup und Kaffeekannen:  
Hollywood hat unser Bild vom Diner  
geprägt. Bei Ari’s trifft diese Kulisse  
auf Ariannas Küche aus Lima  
und New York.  

**Slide 4**

Lima  
Kreuzburger  
Mit knusprigen Kartoffelstäbchen  
und Ají-Amarillo-Soße.  

**Slide 5**

Trad als  
Double  
Zwei Smash-Patties, Käse,  
Tomate, Salat und Hausmayo.  

**Slide 6**

Spicy Green  
Goddess  
Cremiges Kräuterdressing, Crispy Chili  
und Schnittlauch auf knackigem Eisbergsalat.  
Einer der Höhepunkte bei Ari’s.  

**Slide 7**

Churros mit  
Schokosoße  
Bei Ari’s treffen amerikanische  
Diner-Klassiker auf Einflüsse aus Lima.  
Zum süßen Abschluss gibt es Churros  
mit Schokosoße.  

**Slide 8**

EAT THIS  
We tell you what to eat  
Find your next favourite spot  
eatthisdot.com  

### English

**Slide 1**

An evening  
at Ari’s  

**Slide 2**

Lima.  
New York.  
Kreuzberg.  
A former garage on  
Glogauer Straße, booths  
and white tables:  
Arianna Plevisani brings  
Lima and New York  
together in one diner.  
Burgers and fries come  
with Peruvian sauces:  
ají amarillo and ají verde  
alongside ranch and  
house-made garlic mayo.  

**Slide 3**

A diner from  
the movies.  
Film still: Pulp Fiction (1994)  
Booths, ketchup and pots of coffee:  
Hollywood shaped our idea of a diner.  
At Ari’s, that setting meets Arianna’s  
cooking, with its roots in Lima  
and New York.  

**Slide 4**

Lima  
Kreuzburger  
With crispy potato sticks  
and ají amarillo sauce.  

**Slide 5**

Trad as a  
Double  
Two smashed patties, cheese,  
tomato, lettuce and house mayo.  

**Slide 6**

Spicy Green  
Goddess  
Creamy herb dressing, crispy chilli  
and chives on crunchy iceberg lettuce.  
One of the highlights at Ari’s.  

**Slide 7**

Churros with  
chocolate sauce  
At Ari’s, American diner classics  
meet influences from Lima.  
Churros with chocolate sauce  
bring things to a sweet close.  

**Slide 8**

EAT THIS  
We tell you what to eat  
Find your next favourite spot  
eatthisdot.com  

### Cover-Abstand und Archivierung

Beim Ersetzen des großen Cover-Logos durch kleine Providence-Typografie muss der Headline-Abstand mit angepasst werden. Aktueller Cover-Stand EN v4: EAT THIS Grundlinie 82 px, Headline-Grundlinien 236/432 px. Die ursprüngliche Gazzo-Datei ist am alten Downloads-Pfad inzwischen nicht mehr vorhanden; das unveränderte Finale ist deshalb zusätzlich in `output/aris-connected-en-v4/assets/eat-this-map-original.png` gesichert.
