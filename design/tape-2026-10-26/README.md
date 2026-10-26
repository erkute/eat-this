# Gewebeband für die Map · 26.10.2026

In der App: Adobe Stock 336467615 (sechs Stücke schwarzes Gewebeband, von Ersan lizenziert). Das Original liegt nur lokal (`~/Downloads/AdobeStock_336467615.jpeg`) und gehört nicht ins öffentliche Repo.

Daraus in `nextjs/public/pics/tape/` (Stücke 2–6; Stück 1 ist zu stark verknittert):
- Freigestellt per Flutfüllung vom weißen Grund (Schwelle 170), Schattenreste am Rand entfernt, gerade gerichtet (Hauptachse), quer gedreht, auf 180 px Höhe.
- `gaffer-N-black.webp`: Original, Glanz gedämpft (`L > 55 → 55 + (L - 55) * 0.35`), damit weiße Schrift lesbar bleibt.
- `gaffer-N-white.webp`: dieselbe Struktur weiß umgefärbt (`246 + (L - Median) * 0.55`).
- Ränder je Stück gemessen (85. Perzentil), daraus `--et-tape-slice` / `--et-tape-width` in `globals.css` und `MapFilters.module.css`.

Verteilung: Stück 2 Standard (Suche, Menü, Listen, Lasche, Spot-Name), Filter 1–4 = Stücke 3, 5, 4, 6, Bezirk/Küche = Stück 2 gespiegelt (`gaffer-2m-*`, geradeste Unterkante).

Vorher verworfen: weißes Stoffband, Silber-Gaffer, Kassenzettel (Originale nur lokal in diesem Ordner).

Für große Flächen (aufgeklappte Listen, Suchvorschläge): Stück 2 in hoher Auflösung, `gaffer-2-{black,white}-hd.webp` (1280 × 720, Slices `38 27 34 36`), damit nichts pixelig wird.
