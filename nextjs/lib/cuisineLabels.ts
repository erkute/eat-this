// DE-Labels für die 33 kanonischen cuisineType-Werte (EN-Seiten nutzen den
// rohen Sanity-Wert). Venue-Typen als Nomen, Küchen als Adjektiv-Tag —
// kurz genug fürs 62-Zeichen-Title-Budget. Unbekannte Werte fallen auf den
// Rohwert zurück.
//
// Die Tabelle deckt den Bestand vollständig ab (Stand 09.09.2026 nachgezogen:
// sechs Werte waren seit dem letzten Abgleich dazugekommen und standen auf 13
// Spots englisch auf den deutschen Seiten — aufgefallen in Remys Chat, wo
// „ITALIAN / PIZZA" neben „ITALIENISCH" in derselben Antwort stand). Kommt in
// Sanity ein neuer cuisineType dazu, steht er auf den deutschen Seiten roh und
// damit englisch da — dann gehört hier eine Zeile nach.
export const CUISINE_LABELS_DE: Record<string, string> = {
  American: 'Amerikanisch',
  Austrian: 'Österreichisch',
  Bakery: 'Bäckerei',
  Bar: 'Bar',
  Burgers: 'Burger',
  Café: 'Café',
  Chinese: 'Chinesisch',
  Desserts: 'Desserts',
  Coffee: 'Kaffee',
  European: 'Europäisch',
  'Fine Dining': 'Fine Dining',
  French: 'Französisch',
  German: 'Deutsche Küche',
  'German / Fast Food': 'Imbiss',
  Greek: 'Griechisch',
  'Ice Cream': 'Eisdiele',
  Indian: 'Indisch',
  Indonesian: 'Indonesisch',
  Israeli: 'Israelisch',
  Italian: 'Italienisch',
  // Zusammengesetzte Werte laufen wie „German / Fast Food" auf EIN Nomen
  // hinaus — die Zeile ist ein Tag, kein Verzeichniseintrag.
  'Italian / Pizza': 'Pizza',
  Japanese: 'Japanisch',
  'Japanese / Ramen': 'Ramen',
  Korean: 'Koreanisch',
  Mediterranean: 'Mediterran',
  Mexican: 'Mexikanisch',
  'Middle Eastern': 'Orientalisch',
  Peruvian: 'Peruanisch',
  Sandwiches: 'Sandwiches',
  Seafood: 'Seafood',
  Spanish: 'Spanisch',
  'Sri Lankan': 'Sri-lankisch',
  Steakhouse: 'Steakhouse',
  Thai: 'Thai',
  Turkish: 'Türkisch',
  Vegan: 'Vegan',
  Vegetarian: 'Vegetarisch',
  Vietnamese: 'Vietnamesisch',
  'Wine Bar': 'Weinbar',
};

/**
 * Sichtbares DE/EN-Label für einen `cuisineType`. Die Sanity-Werte sind
 * durchweg englisch ("Mexican", "Wine Bar"), was auf `/en/...` genau richtig
 * ist und auf den deutschen Seiten falsch aussah. Unbekannte Werte — neue
 * Küchen, die noch nicht in der Tabelle stehen — bleiben roh stehen, statt zu
 * verschwinden.
 */
export function localizedCuisine(cuisineType: string, locale: 'de' | 'en'): string {
  if (locale === 'en') return cuisineType;
  return CUISINE_LABELS_DE[cuisineType] ?? cuisineType;
}
