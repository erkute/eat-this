import { describe, expect, it } from 'vitest';
import { allNewsArticlesQuery, latestNewsArticlesQuery } from '@/lib/queries';

// Jedes Heft trägt eine Nummer, gezählt ab dem ältesten Artikel — auf der
// Startseite aus latestNewsArticlesQuery, im Index und im Artikelkopf aus
// allNewsArticlesQuery. Beide müssen dieselbe Menge in derselben Reihenfolge
// sehen, sonst trägt dasselbe Heft je nach Seite eine andere Nummer.
describe('news issue queries', () => {
  const order = /order\(date desc, _id asc\)/;
  const published = /_type == "newsArticle" && defined\(slug\.current\)/;

  it('count and list the same published articles', () => {
    expect(allNewsArticlesQuery).toMatch(published);
    expect(latestNewsArticlesQuery.match(new RegExp(published.source, 'g'))).toHaveLength(2);
  });

  it('break ties within a day the same way', () => {
    expect(allNewsArticlesQuery).toMatch(order);
    expect(latestNewsArticlesQuery).toMatch(order);
  });
});
