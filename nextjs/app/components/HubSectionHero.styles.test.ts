import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const cssPath = fileURLToPath(new URL('./HubSection.module.css', import.meta.url));
const source = readFileSync(cssPath, 'utf8');
const root = postcss.parse(source, { from: cssPath });

/** Letzter gewinnender Wert einer Eigenschaft für eine Klasse, ohne Media Query. */
function base(className: string, prop: string): string | undefined {
  let winner: string | undefined;
  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule') return;
    if (!rule.selectors.some((s) => new RegExp(`\\.${className}(?![\\w-])`).test(s))) return;
    rule.walkDecls(prop, (declaration) => {
      winner = declaration.value;
    });
  });
  return winner;
}

/** Wert innerhalb einer bestimmten Media-Query-Bedingung. */
function inMedia(params: string, className: string, prop: string): string | undefined {
  let winner: string | undefined;
  root.walkAtRules('media', (atRule) => {
    if (!atRule.params.includes(params)) return;
    atRule.walkRules((rule) => {
      if (!rule.selectors.some((s) => new RegExp(`\\.${className}(?![\\w-])`).test(s))) return;
      rule.walkDecls(prop, (declaration) => {
        winner = declaration.value;
      });
    });
  });
  return winner;
}

describe('Aufmacher der Startseite', () => {
  /**
   * Die Fläche muss gegen `100dvh - 74px` rechnen, nicht gegen volle dvh: ab
   * 768px scrollt `.app-pages`, und das sitzt 74px unter der Oberkante
   * (css/style.css, DESKTOP APP FRAME). Mit vollem dvh ist der Aufmacher um
   * genau eine Navhöhe zu hoch und läuft unten aus dem Bild — sichtbar wird
   * das erst im Browser, nicht im Stylesheet.
   */
  it('füllt den sichtbaren Bereich, ohne die Navhöhe doppelt zu zählen', () => {
    const minHeight = base('hero', 'min-height');
    expect(minHeight).toBeTruthy();
    expect(minHeight).toContain('100dvh');
    expect(minHeight).toContain('74px');
  });

  it('ist gelb und stellt seinen Inhalt mittig', () => {
    expect(base('hero', 'background')).toBe('var(--et-home-accent)');
    expect(base('hero', 'align-items')).toBe('center');
  });

  /**
   * Rot auf Gelb flimmert. Die Section-Titel weiter unten stehen weiter auf
   * Weiß und dürfen rot bleiben — diese eine Headline nicht.
   */
  it('setzt die Headline in Ink, nicht in Rot', () => {
    expect(base('heroHeadline', 'color')).toBe('var(--et-home-ink)');
  });

  /**
   * Die Wortmarke trägt links 120px von 1660px transparenten Rand (7,23 %).
   * Ohne den negativen Einzug steht sie sichtbar eingerückt gegenüber der
   * Headline. Wird das Logo neu exportiert, muss der Faktor nachgemessen
   * werden — dieser Test hält fest, dass es ihn überhaupt gibt.
   */
  it('gleicht den transparenten Rand der Wortmarke aus', () => {
    const margin = base('heroMark', 'margin');
    expect(margin).toBeTruthy();
    expect(margin).toContain('-0.0723');
    expect(base('heroMark', 'width')).toBe('var(--hero-mark-w)');
  });

  /**
   * Auf der bildschirmhohen Fläche muss das Telefonpaar vollständig im Gelb
   * bleiben. Über die Breite gesteuert läuft es auf flachen Fenstern unten
   * heraus — deshalb hängt die Größe an der Höhe.
   */
  it('deckelt die Telefone über die Höhe statt über die Breite', () => {
    expect(base('heroPhones', 'height')).toBe('min(70vh, 660px)');
    expect(base('heroPhones', 'width')).toBe('auto');
  });

  /**
   * Unter 768px scrollt das Fenster selbst und `.app-pages` hält den Platz für
   * die Navigation schon frei. Bildschirmhoch wäre der Aufmacher dort die
   * komplette erste Seite Farbe, bevor ein Spot zu sehen ist.
   */
  it('füllt auf dem Telefon bewusst nicht den Bildschirm', () => {
    expect(inMedia('max-width: 767px', 'hero', 'min-height')).toBe('0');
    expect(inMedia('max-width: 767px', 'heroCopy', 'align-items')).toBe('center');
    // Der Höhendeckel fällt schon eine Stufe früher: ab 920px ist der
    // Aufmacher gestapelt, und gestapelt bestimmt die Breite die Größe.
    expect(inMedia('max-width: 920px', 'heroPhones', 'height')).toBe('auto');
  });
});
