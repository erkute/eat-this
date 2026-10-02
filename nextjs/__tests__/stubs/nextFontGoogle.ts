// next/font/google wird nur vom Next-Compiler aufgelöst; in Vitest gibt es die
// Fonts als Funktionen nicht. Jede Schrift liefert hier stabile Klassen, damit
// Komponenten, die eine Font-Variable anhängen, rendern.
type FontOptions = { variable?: string };

const font =
  (name: string) =>
  (options: FontOptions = {}) => ({
    className: `font-${name}`,
    variable: options.variable ? `var-${options.variable.replace(/^--/, '')}` : '',
    style: { fontFamily: name },
  });

export const Inter = font('Inter');
export const Newsreader = font('Newsreader');
export const Anton = font('Anton');
