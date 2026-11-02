// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { VisitorBreakdown, PageTable } from './PageBreakdown';
afterEach(cleanup);
const entries = [
  { key: '/', count: 8 },
  { key: '/en/news/artikel', count: 86 },
  { key: '/restaurant/spot', count: 50 },
  { key: '/kategorie/coffee', count: 32 },
  { key: '/bezirk/mitte', count: 14 },
  { key: '/map', count: 8 },
  { key: '/must-eats', count: 2 },
  { key: '/deck', count: 1 },
];
const props = {
  entryPaths: entries,
  paths: entries.map((row) => ({ ...row, count: row.key === '/' ? 21 : row.count })),
  visitors: 201,
  pageviews: 214,
};
describe('verständlich zwischen Besuchern und Aufrufen unterscheiden', () => {
  it('zeigt alle 201 Besucher, einschließlich Startseite, mit einer nachvollziehbaren Summe', () => {
    render(<VisitorBreakdown {...props} />);
    const row = screen.getByRole('row', { name: 'Startseite 8 21' });
    expect(row).toBeTruthy();
    expect(screen.getByRole('row', { name: 'Gesamt 201 214' })).toBeTruthy();
    expect(screen.getByText(/201 von 201 Tagesbesuchern zugeordnet/)).toBeTruthy();
  });
  it('weist eine Messlücke ausdrücklich aus', () => {
    render(<VisitorBreakdown {...props} visitors={210} />);
    expect(screen.getByRole('row', { name: 'Einstieg nicht gespeichert 9 —' })).toBeTruthy();
    expect(screen.getByText(/Fehlende Daten lassen sich nicht nachträglich zuordnen/)).toBeTruthy();
  });
  it('kennzeichnet unbekannte historische Einstiege statt einer sicheren Null', () => {
    render(
      <PageTable paths={[{ key: '/', count: 1 }]} entryPaths={[]} visitors={1} pageviews={1} />
    );
    expect(screen.getByText(/Einstiegsdaten unvollständig oder widersprüchlich/)).toBeTruthy();
    const table = screen.getByRole('table', { name: 'Jede gezählte Seite im Zeitraum' });
    const row = within(table).getByRole('row', { name: /Startseite/ });
    expect(within(row).queryByText('0')).toBeNull();
    expect(within(row).getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText(/vor dem Filtern/)).toBeTruthy();
  });

  it('macht auch die letzte seltene Seite erreichbar und filtert Artikel nach Sprache', () => {
    const paths = Array.from({ length: 40 }, (_, i) => ({ key: `/news/artikel-${i}`, count: 1 }));
    render(<PageTable {...props} paths={[...props.paths, ...paths]} />);
    expect(screen.getByText('Seite 1 von 4')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Weitere Seiten' }));
    expect(screen.getByText('Seite 2 von 4')).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Seite suchen' }), {
      target: { value: 'artikel-39' },
    });
    expect(screen.getByText('/news/artikel-39')).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Seite suchen' }), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Seitentyp'), { target: { value: 'articles' } });
    fireEvent.change(screen.getByLabelText('Sprache'), { target: { value: 'en' } });
    const table = screen.getByRole('table', { name: 'Jede gezählte Seite im Zeitraum' });
    expect(within(table).getByText('/en/news/artikel')).toBeTruthy();
    expect(within(table).queryByText('/')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('1 von 48 Seiten');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Seite suchen' }), {
      target: { value: 'nichtvorhanden' },
    });
    expect(screen.getByText('Keine gezählte Seite passt zu dieser Auswahl.')).toBeTruthy();
  });
});
