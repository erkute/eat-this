/** Ein Guide-Kapitel heisst „Name – wofür": „goldies – für Puristen mit
 *  Prinzipien". Der Artikel setzt den Namen als Überschrift und den Rest als
 *  Unterzeile darunter, wie im Heft; die Kapitel-Leiste nennt nur den Namen.
 *
 *  Geschnitten wird am ersten Gedankenstrich MIT Leerzeichen drumherum — ein
 *  Bindestrich ohne Leerzeichen gehört zum Namen („Five Elephant Kreuzberg",
 *  „Jules Geisberg"). Ohne Trenner („Fazit", „Der Laden") gibt es nichts zu
 *  teilen. `separator` ist der Trenner so, wie er im Text steht: Name,
 *  Trenner und Unterzeile ergeben zusammen wieder die ganze Überschrift. */
export function splitHeading(
  text: string
): { name: string; separator: string; deck: string } | null {
  const match = /\s+[–—-]\s+/.exec(text);
  if (!match) return null;
  const name = text.slice(0, match.index);
  const deck = text.slice(match.index + match[0].length);
  if (!name.trim() || !deck.trim()) return null;
  return { name, separator: match[0], deck };
}
