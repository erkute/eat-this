# EAT THIS — SEO & Bildoptimierung

## Bilder optimieren

### Vorbereitung
Stelle sicher, dass die originalen Bilder (JPEG/PNG) im Ordner `pics/` und `pics/food/` vorhanden sind.

### Optimierung ausführen

1. **Bilder zu WebP konvertieren:**
   ```bash
   npm run optimize
   ```
   → Konvertiert alle JPEG/PNG zu WebP (80% Qualität)

2. **HTML-Dateien aktualisieren:**
   ```bash
   npm run update-html
   ```
   → Ersetzt alle Bildpfade auf .webp Endungen

### Warum WebP?
- **50-70% kleinere Dateigröße** bei gleicher Qualität
- **Schnellere Ladezeiten** → besseres Google Ranking
- **Modernes Format** wird von allen Browsern unterstützt

## HTML-Dateien aktualisieren

Die Scripte `scripts/optimize-images.js` und `scripts/update-html-paths.js` sind für die automatische Optimierung zuständig.

### Manuelle Anpassung (optional)
Falls du einzelne Bilder hinzufügen willst:
- Benenne Bilder mit beschreibenden Namen: `ramen-bowl-berlin.webp` statt `IMG_1234.webp`
- Optimiere die Bilder VOR dem Hochladen mit `npm run optimize`

## Deployment
Nach der Optimierung:
1. Commit und push alle Änderungen
2. Die WebP-Bilder ersetzen die alten JPEG/PNG
3. HTML-Dateien referenzieren nun die WebP-Versionen
