import { Anton, Inter, Newsreader } from 'next/font/google';

/**
 * Die Fließtextschrift, einmal geladen.
 *
 * Stand vorher wortgleich in drei Layout-Dateien und war bereits am Driften —
 * in einer war die Schlüsselreihenfolge eine andere. Jede Kopie ist eine
 * Stelle, an der jemand `subsets` oder `display` ändern und die anderen
 * vergessen kann.
 */
export const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

/**
 * Die zwei Schriften der Artikelseite im Kaleidoscope-Look (02.10.2026,
 * Vorbild manifesto.kaleidoscope.media): eine Buchschrift für den Text, eine
 * schmale fette Grotesk für Schlagzeile und Kapitel. Kaleidoscope setzt
 * Bradford LL und Compacta — beides Kaufschriften; Newsreader und Anton sind
 * die freien Gegenstücke. Nur NewsArticleShell hängt die Variablen an, also
 * laden andere Seiten sie nicht.
 */
export const serif = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-serif',
});

export const condensed = Anton({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-condensed',
});
