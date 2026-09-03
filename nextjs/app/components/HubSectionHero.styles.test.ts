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

  /**
   * Seit 03.09.2026 „komplett schwarz", und seit dem Abend trägt den Grund
   * die ganze Seite: der Aufmacher hat deshalb KEINE eigene Fläche mehr —
   * eine hätte dieselbe Farbe und wäre nur eine Kante, die nichts trennt.
   * Gelb ist der Knopf.
   */
  it('steht auf dem Ink-Grund der Seite statt auf einer eigenen Fläche', () => {
    expect(base('hero', 'background')).toBeUndefined();
    expect(base('hero', 'border-radius')).toBeUndefined();
    expect(base('hero', 'align-items')).toBe('center');
    // Den Grund trägt die Seite selbst — nur Regeln, deren Selektor AUF
    // `.page` endet, meinen sie; `base()` fände sonst auch die Knöpfe darin.
    // Die Doppelklasse schlägt `.homeV2` aus css/style.css, das sonst Papier
    // malen würde.
    let pageBackground: string | undefined;
    root.walkRules((rule) => {
      if (rule.parent?.type === 'atrule') return;
      if (!rule.selectors.some((selector) => /\.page$/.test(selector.trim()))) return;
      rule.walkDecls('background', (declaration) => {
        pageBackground = declaration.value;
      });
    });
    expect(pageBackground).toBe('var(--home-ink)');
  });

  /**
   * Papier auf Ink, wie die Versalien jeder Tafel. Die Section-Titel weiter
   * unten stehen auf Weiß und dürfen rot bleiben — diese eine Headline nicht.
   */
  it('setzt die Headline in Papier, nicht in Rot', () => {
    expect(base('heroHeadline', 'color')).toBe('var(--et-home-inverse-text)');
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

describe('Der Flug der Wortmarke', () => {
  /**
   * Solange die Marke fliegt, darf das Original im Aufmacher nicht mitzusehen
   * sein — sonst stehen zwei Wortmarken gleichzeitig auf der Seite, und beim
   * Scrollen schiebt sich die zweite hinter dem Header vorbei.
   *
   * Der Test prüft, dass die Regel am **Attribut** hängt und nicht an einer
   * Klasse: HeroMarkFlight hat das Original früher per `classList.add`
   * versteckt. HubHeroCopy hängt aber an `useAuth`, und sobald der
   * Anmeldezustand steht, rendert React neu und schreibt `className` frisch —
   * die Klasse war damit weg, und genau so kam das zweite Logo zurück. Ein
   * Attribut am <html> überlebt jedes Rendern.
   */
  it('versteckt das Original im Aufmacher über html[data-hero-flight]', () => {
    const selectors: string[] = [];
    root.walkRules((rule) => {
      rule.walkDecls('visibility', (declaration) => {
        if (declaration.value === 'hidden') selectors.push(rule.selector);
      });
    });

    const guard = selectors.find((s) => /heroMark/.test(s));
    expect(guard, 'keine visibility:hidden-Regel für .heroMark gefunden').toBeDefined();
    expect(guard).toContain("data-hero-flight='on'");
    expect(guard).toContain('html');
  });
});
