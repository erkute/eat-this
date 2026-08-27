import { Inter } from 'next/font/google';

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
