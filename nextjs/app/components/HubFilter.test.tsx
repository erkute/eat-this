// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  SPOT_LIST_ID,
  HubFilterBar,
  HubFilterCard,
  HubFilterGroup,
  HubFilterProvider,
  type HubFacet,
} from './HubFilter';

// jsdom kennt kein scrollIntoView — hier reine Kosmetik, der Filter selbst
// hängt nicht daran.
Element.prototype.scrollIntoView = vi.fn();

/** Kategorie-Chips, wie sie eine Bezirksseite baut. */
const CATEGORIES: HubFacet[] = [
  { slug: 'dinner', label: 'Dinner', status: 'Dinner in Schöneberg · 3 Spots' },
  { slug: 'coffee', label: 'Kaffee', status: 'Kaffee in Schöneberg · 2 Spots' },
  { slug: 'pizza', label: 'Pizza', status: 'Pizza in Schöneberg · 1 Spot' },
];

/** Vier Spots: einer trägt zwei Facetten, einer gar keine — der muss bei jedem
 *  aktiven Filter verschwinden. */
const SPOTS = [
  { slug: 'bar-basta', facets: ['dinner', 'coffee'] },
  { slug: 'gazzo', facets: ['dinner', 'pizza'] },
  { slug: 'kolo', facets: ['coffee'] },
  { slug: 'ohne-facette', facets: [] },
];

function renderList(facets: HubFacet[] = CATEGORIES, queryKey = 'cat') {
  return render(
    <HubFilterProvider queryKey={queryKey} slugs={facets.map((f) => f.slug)}>
      <HubFilterBar
        facets={facets}
        allLabel="Alle"
        allStatus="Alle 4 Spots in Schöneberg"
        groupLabel="In Schöneberg nach Kategorie filtern"
      />
      <section id={SPOT_LIST_ID}>
        <HubFilterGroup slugs={[...new Set(SPOTS.flatMap((s) => s.facets))]}>
          <h2>Wo du essen solltest</h2>
          {SPOTS.map((s) => (
            <HubFilterCard key={s.slug} slugs={s.facets}>
              <a href={`/restaurant/${s.slug}`} data-slug={s.slug}>
                {s.slug}
              </a>
            </HubFilterCard>
          ))}
        </HubFilterGroup>
      </section>
    </HubFilterProvider>
  );
}

/** Sichtbar = keine Hülle auf dem Weg nach oben trägt [hidden]. */
function visibleSpots(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLElement>('a[data-slug]')]
    .filter((a) => !a.closest('[hidden]'))
    .map((a) => a.dataset.slug!);
}

function chip(name: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(name, 'i') });
}

beforeEach(() => {
  window.history.replaceState(null, '', '/bezirk/schoeneberg');
});

afterEach(cleanup);

describe('HubFilter', () => {
  it('zeigt ohne Auswahl jeden Spot und die Gesamtzahl', () => {
    const { container } = renderList();

    expect(visibleSpots(container)).toEqual(['bar-basta', 'gazzo', 'kolo', 'ohne-facette']);
    expect(chip('^Alle$')).toHaveProperty('ariaPressed', 'true');
    expect(screen.getByRole('status').textContent).toBe('Alle 4 Spots in Schöneberg');
  });

  it('behält Spots, die die gewählte Facette unter mehreren tragen', () => {
    const { container } = renderList();

    fireEvent.click(chip('Kaffee'));

    expect(visibleSpots(container)).toEqual(['bar-basta', 'kolo']);
    expect(chip('Kaffee')).toHaveProperty('ariaPressed', 'true');
    expect(screen.getByRole('status').textContent).toBe('Kaffee in Schöneberg · 2 Spots');
    expect(window.location.search).toBe('?cat=coffee');
  });

  it('blendet Spots ohne jede Facette aus, sobald gefiltert wird', () => {
    const { container } = renderList();

    fireEvent.click(chip('Pizza'));

    expect(visibleSpots(container)).toEqual(['gazzo']);
    expect(visibleSpots(container)).not.toContain('ohne-facette');
  });

  it('trägt keine Zahlen in den Chips — die Zählung steht in der Statuszeile', () => {
    renderList();

    for (const c of CATEGORIES) {
      expect(chip(c.label).textContent).toBe(c.label);
    }
  });

  it('versteckt die ganze Sektion, wenn keine ihrer Karten passt', () => {
    const { container } = renderList([
      ...CATEGORIES,
      { slug: 'sweets', label: 'Süßes', status: 'Süßes in Schöneberg · 4 Spots' },
    ]);

    fireEvent.click(chip('Süßes'));

    expect(visibleSpots(container)).toEqual([]);
    // Nicht nur die Karten — auch die Überschrift darüber ist weg. `queryByRole`
    // sucht im Accessibility-Tree, und ein [hidden]-Vorfahre nimmt sie da
    // heraus: es bliebe also keine „Wo du essen solltest"-Zeile über einem
    // leeren Raster stehen. Der Knoten selbst ist noch im DOM.
    expect(screen.queryByRole('heading', { name: 'Wo du essen solltest' })).toBeNull();
    expect(container.querySelector('h2')?.closest('[hidden]')).not.toBeNull();
  });

  it('hebt den Filter auf, wenn der aktive Chip erneut geklickt wird', () => {
    const { container } = renderList();

    fireEvent.click(chip('Dinner'));
    fireEvent.click(chip('Dinner'));

    expect(visibleSpots(container)).toHaveLength(4);
    expect(window.location.search).toBe('');
  });

  it('stellt einen geteilten Link nach dem Mount her', () => {
    window.history.replaceState(null, '', '/bezirk/schoeneberg?cat=pizza');

    const { container } = renderList();

    expect(visibleSpots(container)).toEqual(['gazzo']);
    expect(chip('Pizza')).toHaveProperty('ariaPressed', 'true');
  });

  it('ignoriert einen unbekannten Slug, statt jede Karte zu verstecken', () => {
    window.history.replaceState(null, '', '/bezirk/schoeneberg?cat=gibtsnicht');

    const { container } = renderList();

    expect(visibleSpots(container)).toHaveLength(4);
    expect(chip('^Alle$')).toHaveProperty('ariaPressed', 'true');
  });

  // Die Kategorieseite fährt dasselbe Modul mit der anderen Facette. Der
  // Query-Parameter muss dann `bezirk` heißen, nicht `cat` — sonst schriebe
  // eine Bezirkswahl einen Kategorie-Filter in die URL.
  it('schreibt den Query-Parameter, den die Seite vorgibt', () => {
    const districts: HubFacet[] = [
      { slug: 'mitte', label: 'Mitte', status: 'Frühstück in Mitte · 15 Spots' },
      { slug: 'neukoelln', label: 'Neukölln', status: 'Frühstück in Neukölln · 4 Spots' },
    ];
    render(
      <HubFilterProvider queryKey="bezirk" slugs={districts.map((d) => d.slug)}>
        <HubFilterBar
          facets={districts}
          allLabel="Alle"
          allStatus="Alle 55 Spots in Berlin"
          groupLabel="Frühstück nach Bezirk filtern"
        />
      </HubFilterProvider>
    );

    fireEvent.click(chip('Mitte'));

    expect(window.location.search).toBe('?bezirk=mitte');
    expect(screen.getByRole('status').textContent).toBe('Frühstück in Mitte · 15 Spots');
  });
});
