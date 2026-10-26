# Papierstreifen für die Map · 26.10.2026

In der App: `original-receipt.webp`, zerknitterter weißer Zettel mit gerissener Kante, Vorlage von Ersan (nach seiner Angabe lizenziert, 26.10.2026).

Daraus in `nextjs/public/pics/tape/`:
- `receipt.webp`: Papier oberhalb der Strichellinie (y 150–1255) und unterhalb des Barcodes (y 1650–1850, mit der gerissenen Kante) zusammengesetzt, Naht über 40 px überblendet, um 90° gedreht (Riss rechts), auf 303 × 180 px verkleinert, aufgehellt (`255 - (255 - v) * 0.5`).
- `receipt-black.webp`: dasselbe abgedunkelt (`v * 0.22 + 6`) für gesetzte Filter.
- `-b`: gespiegelt (Riss links), `-c`: gekippt.

Eingesetzt per `border-image` (Slices `2 12 2 2`, Breiten `1px 3px 1px 1px`), Tokens `--et-tape-*` in `globals.css`.

Vorher verworfen: `original-white-tape.png` (weißes Stoffband), `original-silver-tape.png` (Silber-Gaffer).

Für Name, Bezirk und Küche auf den Spot-Fotos: `receipt-white(-b).webp`, so weiß wie möglich (`255 - (255 - v) * 0.3` auf dem Zettel), nur ein Hauch Knitter.
