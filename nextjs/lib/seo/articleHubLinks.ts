/**
 * Artikel → Hub: der zweite Schritt der Kette „Artikel fängt die Suche, Hub
 * hält das Ranking". Guides zu Themen, für die es einen Kategorie- oder
 * Bezirks-Hub gibt, verweisen prominent dorthin — der Artikel gibt seine
 * Autorität an die Seite weiter, die das Keyword dauerhaft besitzen soll.
 *
 * Bewusst eine Tabelle im Code statt eines Sanity-Felds: die Zuordnung ist
 * redaktionell stabil, und ein Feld, das bei jedem Artikel gepflegt werden
 * muss, wäre bei 21 Bestandsartikeln vor allem eine Fehlerquelle. Artikel
 * ohne Eintrag sind kein Versäumnis — die Lücken-Guides (Italiener,
 * Vietnamesisch, Vegan, …) HABEN keinen Hub, genau deshalb gibt es sie.
 */
export interface ArticleHubLink {
  /** i18n-Pfad, wird durch den `Link` aus i18n/navigation lokalisiert. */
  href: string;
  labelDe: string;
  labelEn: string;
}

const CATEGORY = (slug: string, de: string, en: string): ArticleHubLink => ({
  href: `/kategorie/${slug}`,
  labelDe: de,
  labelEn: en,
});

const BEZIRK = (slug: string, name: string): ArticleHubLink => ({
  href: `/bezirk/${slug}`,
  labelDe: `Die besten Restaurants in ${name}`,
  labelEn: `The best restaurants in ${name}`,
});

const HUB_BY_ARTICLE: Record<string, ArticleHubLink> = {
  'fine-dining-berlin': CATEGORY(
    'fine-dining',
    'Alle Fine-Dining-Spots in Berlin',
    'All fine dining spots in Berlin'
  ),
  'beste-cafes-berlin': CATEGORY(
    'coffee',
    'Alle Kaffee-Spots in Berlin',
    'All coffee spots in Berlin'
  ),
  'beste-cocktailbars-berlin': CATEGORY(
    'drinks',
    'Alle Drinks-Spots in Berlin',
    'All drinks spots in Berlin'
  ),
  'beste-weinbars-berlin': CATEGORY(
    'drinks',
    'Alle Drinks-Spots in Berlin',
    'All drinks spots in Berlin'
  ),
  'bester-brunch-berlin': CATEGORY(
    'breakfast',
    'Alle Frühstücks-Spots in Berlin',
    'All breakfast spots in Berlin'
  ),
  'beste-eisdielen-berlin': CATEGORY(
    'sweets',
    'Alle Spots für Süßes in Berlin',
    'All sweet spots in Berlin'
  ),
  'donuts-berlin': CATEGORY(
    'sweets',
    'Alle Spots für Süßes in Berlin',
    'All sweet spots in Berlin'
  ),
  'beste-baeckereien-berlin': CATEGORY(
    'sweets',
    'Alle Spots für Süßes in Berlin',
    'All sweet spots in Berlin'
  ),
  'beste-burger-berlin': CATEGORY(
    'fast-food',
    'Alle Fast-Food-Spots in Berlin',
    'All fast food spots in Berlin'
  ),
  'drei-doener-berlin': CATEGORY(
    'fast-food',
    'Alle Fast-Food-Spots in Berlin',
    'All fast food spots in Berlin'
  ),
  'restaurants-mitte': BEZIRK('mitte', 'Mitte'),
  'restaurants-kreuzberg': BEZIRK('kreuzberg', 'Kreuzberg'),
  'restaurants-neukoelln': BEZIRK('neukoelln', 'Neukölln'),
  'restaurants-charlottenburg': BEZIRK('charlottenburg', 'Charlottenburg'),
  'restaurants-prenzlauer-berg': BEZIRK('prenzlauer-berg', 'Prenzlauer Berg'),
  'essen-trinken-schoeneberg': BEZIRK('schoeneberg', 'Schöneberg'),
};

export function articleHubLink(articleSlug: string): ArticleHubLink | null {
  return HUB_BY_ARTICLE[articleSlug] ?? null;
}

export function articleHubLabel(link: ArticleHubLink, locale: 'de' | 'en'): string {
  return locale === 'en' ? link.labelEn : link.labelDe;
}
