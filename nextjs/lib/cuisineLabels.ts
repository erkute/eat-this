// DE-Labels für die 33 kanonischen cuisineType-Werte (EN-Seiten nutzen den
// rohen Sanity-Wert). Venue-Typen als Nomen, Küchen als Adjektiv-Tag —
// kurz genug fürs 62-Zeichen-Title-Budget. Unbekannte Werte fallen auf den
// Rohwert zurück.
//
// Die Tabelle deckt den Bestand vollständig ab (Stand 24.08.2026). Kommt in
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
  Japanese: 'Japanisch',
  Korean: 'Koreanisch',
  Mediterranean: 'Mediterran',
  Mexican: 'Mexikanisch',
  'Middle Eastern': 'Orientalisch',
  Peruvian: 'Peruanisch',
  Seafood: 'Seafood',
  'Sri Lankan': 'Sri-lankisch',
  Steakhouse: 'Steakhouse',
  Thai: 'Thai',
  Turkish: 'Türkisch',
  Vegan: 'Vegan',
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
